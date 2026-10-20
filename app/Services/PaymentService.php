<?php

namespace App\Services;

use App\Models\MpesaTransaction;
use App\Models\Parcel;
use App\Models\ParcelEvent;
use App\Models\Payment;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function __construct(
        protected MpesaService $mpesa,
        protected NotificationService $notifier,
        protected PointsService $points,
    ) {
    }

    /* =================================================================
     | PRICING — intent only, no rows
     | ================================================================= */

    public function amountDueNow(string $option, int $total, int $cod): int
    {
        return match ($option) {
            Parcel::PAYMENT_PREPAID => $total,
            Parcel::PAYMENT_COD_FEE => max(0, $total - $cod),
            Parcel::PAYMENT_COD_FULL => 0,
            default => throw new \InvalidArgumentException("Unknown payment option: {$option}"),
        };
    }

    /**
     * Set payment intent on a freshly-booked parcel. No Payment rows.
     */
    public function primeBooking(Parcel $parcel, string $option): void
    {
        $dueNow = $this->amountDueNow(
            $option,
            (int) $parcel->total,
            (int) $parcel->cod_amount,
        );

        $parcel->forceFill([
            'payment_option' => $option,
            'amount_due_now' => $dueNow,
            'amount_paid' => 0,
            'status' => $dueNow > 0
                ? Parcel::STATUS_AWAITING_PAYMENT
                : Parcel::STATUS_PAYMENT_ON_DELIVERY,
        ])->save();
    }

    /* =================================================================
     | INITIATION (STK)
     | ================================================================= */

    public function initiateForParcel(Parcel $parcel, string $option): array
    {
        $this->primeBooking($parcel, $option);

        $parcel->refresh();
        $dueNow = (int) $parcel->amount_due_now;

        if ($dueNow <= 0) {
            $this->recalculateParcel($parcel);
            return ['mpesa_tx' => null, 'error' => null];
        }

        // Reuse a pending STK payment (retry path) OR open a fresh one.
        $payment = $this->pendingStkPayment($parcel)
            ?? $this->openPendingStkPayment($parcel, $dueNow);

        return $this->fireStkFor($parcel, $payment, (int) $payment->amount);
    }

    public function retryStkFor(Parcel $parcel, Payment $payment): array
    {
        if (
            $payment->type !== Payment::TYPE_DELIVERY
            || $payment->status !== Payment::STATUS_PENDING
        ) {
            return ['mpesa_tx' => null, 'error' => 'Only pending delivery payments can be retried.'];
        }

        if ($payment->mpesaTransaction()->where('status', 'pending')->exists()) {
            return ['mpesa_tx' => null, 'error' => 'An M-PESA prompt is already pending on this payment.'];
        }

        if ($payment->mpesaTransaction()->where('status', 'completed')->exists()) {
            return ['mpesa_tx' => null, 'error' => 'This payment already has a completed receipt.'];
        }

        return $this->fireStkFor($parcel, $payment, (int) $payment->amount);
    }

    /* =================================================================
     | STK CALLBACK
     | ================================================================= */

    public function handleCallback(array $callback): ?MpesaTransaction
    {
        try {
            $stk = $callback['Body']['stkCallback'] ?? null;
            if (!$stk) {
                Log::warning('M-PESA callback missing stkCallback', $callback);
                return null;
            }

            $checkoutId = $stk['CheckoutRequestID'] ?? null;
            $resultCode = (string) ($stk['ResultCode'] ?? '-1');

            if (!$checkoutId) {
                Log::warning('M-PESA callback missing CheckoutRequestID', $stk);
                return null;
            }

            $tx = MpesaTransaction::query()
                ->stk()
                ->where('checkout_request_id', $checkoutId)
                ->first();

            if (!$tx) {
                $this->persistOrphanStkCallback($stk, $callback);
                return null;
            }

            if (
                $tx->callback_payload !== null
                && in_array($tx->status, ['completed', 'failed'], true)
            ) {
                Log::info('M-PESA duplicate callback ignored', [
                    'checkout' => $checkoutId,
                    'status' => $tx->status,
                ]);
                return $tx;
            }

            $meta = collect($stk['CallbackMetadata']['Item'] ?? [])
                ->keyBy('Name')
                ->map(fn($item) => $item['Value'] ?? null);

            $success = $resultCode === '0';

            $tx->update([
                'status' => $success ? 'completed' : 'failed',
                'result_code' => $resultCode,
                'result_desc' => $stk['ResultDesc'] ?? null,
                'mpesa_receipt_number' => $meta['MpesaReceiptNumber'] ?? $tx->mpesa_receipt_number,
                'callback_payload' => $callback,
                'completed_at' => $success ? now() : null,
            ]);

            $tx = $tx->fresh();

            $success
                ? $this->applyPaymentSuccess($tx)
                : $this->applyPaymentFailure($tx);

            return $tx;
        } catch (\Throwable $e) {
            Log::error('M-PESA callback error', [
                'callback' => $callback,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);
            return null;
        }
    }

    /* =================================================================
     | C2B CONFIRMATION
     | ================================================================= */

    public function handleC2bConfirmation(array $payload): ?MpesaTransaction
    {
        $transId = trim((string) ($payload['TransID'] ?? ''));
        if ($transId === '') {
            Log::warning('C2B confirmation missing TransID', $payload);
            return null;
        }

        if (
            $existing = MpesaTransaction::query()
                ->where('mpesa_receipt_number', $transId)
                ->first()
        ) {
            Log::info('C2B duplicate confirmation ignored', [
                'trans_id' => $transId,
                'tx_id' => $existing->id,
            ]);
            return $existing;
        }

        $rawMsisdn = (string) ($payload['MSISDN'] ?? '');
        $phone = $this->normaliseC2bMsisdn($rawMsisdn);
        $amount = (int) round((float) ($payload['TransAmount'] ?? 0));
        $ref = $this->cleanReference(
            (string) ($payload['BillRefNumber'] ?? $payload['AccountReference'] ?? ''),
        );

        if ($amount <= 0) {
            Log::warning('C2B confirmation with unusable amount', $payload);
        }

        return DB::transaction(function () use ($payload, $transId, $phone, $rawMsisdn, $amount, $ref) {
            $tx = MpesaTransaction::create([
                'payment_id' => null,
                'checkout_request_id' => null,
                'merchant_request_id' => null,
                'mpesa_receipt_number' => $transId,
                'phone' => $phone ?? ($rawMsisdn !== '' ? $rawMsisdn : 'unknown'),
                'amount' => $amount,
                'reference' => $ref,
                'description' => $payload['TransactionType'] ?? 'C2B',
                'status' => 'completed',
                'result_code' => '0',
                'result_desc' => 'C2B confirmation',
                'type' => 'c2b',
                'callback_payload' => $payload,
                'completed_at' => now(),
            ]);

            $parcel = $this->resolveParcelForC2b($tx, $ref);
            if (!$parcel) {
                Log::warning('C2B confirmation orphaned — no matching parcel', [
                    'trans_id' => $transId,
                    'ref' => $ref,
                    'phone' => $phone,
                    'hashed_msisdn' => $phone === null,
                    'amount' => $amount,
                ]);
                return $tx;
            }

            // One receipt = one payment row, always.
            $payment = $this->openSettledPayment(
                parcel: $parcel,
                amount: $amount,
                channel: Payment::CHANNEL_MPESA,
                phone: $tx->phone,
            );

            $this->attachReceipt($tx, $payment, 'M-PESA receipt ' . $transId);

            return $tx->fresh();
        });
    }

    /* =================================================================
     | CORE — attach a receipt to a payment and finalize
     | ================================================================= */

    /**
     * The payment is created by the caller with its FINAL `amount`. This
     * method only:
     *  - enforces one M-PESA tx per payment,
     *  - links the tx,
     *  - flips status to success, stamps confirmed_at,
     *  - writes the ParcelEvent,
     *  - recomputes the parcel,
     *  - awards points on first full payment.
     *
     * It NEVER mutates `payment.amount`.
     */
    private function attachReceipt(
        ?MpesaTransaction $tx,
        Payment $payment,
        ?string $label = null,
    ): void {
        if ($tx !== null) {
            if ($tx->payment_id !== null && $tx->payment_id !== $payment->id) {
                throw new \DomainException('M-PESA transaction is already linked to another payment.');
            }
            if ($payment->mpesaTransaction()->where('id', '!=', $tx->id)->exists()) {
                throw new \DomainException('This payment already has an M-PESA transaction; open a new payment.');
            }
        }

        DB::transaction(function () use ($tx, $payment, $label) {
            $payment->update([
                'status' => Payment::STATUS_SUCCESS,
                'channel' => $tx !== null
                    ? Payment::CHANNEL_MPESA
                    : $payment->channel,   // caller set channel explicitly
                'confirmed_at' => now(),
            ]);

            if ($tx && $tx->payment_id !== $payment->id) {
                $tx->update(['payment_id' => $payment->id]);
            }

            $parcel = $payment->parcel;
            if (!$parcel) {
                return;
            }

            $this->recalculateParcel($parcel);

            ParcelEvent::create([
                'parcel_id' => $parcel->id,
                'status' => 'payment',
                'label' => $label ?? $this->receiptLabel($payment),
                'description' => $this->receiptDescription($payment, $tx),
                'happened_at' => now(),
            ]);
        });

        $payment->refresh();

        if ($payment->status === Payment::STATUS_SUCCESS && $payment->parcel) {
            $this->notifier->parcelPaid(
                $payment->parcel->fresh(),
                $tx?->mpesa_receipt_number ?? '',
            );
        }
    }

    private function receiptLabel(Payment $payment): string
    {
        return $payment->type === Payment::TYPE_COD
            ? 'Cash on Delivery payment received'
            : 'Delivery payment received';
    }

    private function receiptDescription(Payment $payment, ?MpesaTransaction $tx): string
    {
        $source = $tx?->mpesa_receipt_number
            ? "M-PESA receipt {$tx->mpesa_receipt_number}"
            : 'Cash';
        return sprintf('%s: KSh %s', $source, number_format((int) $payment->amount));
    }

    /* =================================================================
     | SUCCESS / FAILURE (STK)
     | ================================================================= */

    private function applyPaymentSuccess(MpesaTransaction $tx): void
    {
        $payment = $tx->payment;

        // Orphan STK success — open a fresh payment with the exact amount.
        if (!$payment && $tx->reference) {
            $parcel = Parcel::where('tracking_no', $tx->reference)->first();
            if ($parcel) {
                $payment = $this->openSettledPayment(
                    parcel: $parcel,
                    amount: (int) $tx->amount,
                    channel: Payment::CHANNEL_MPESA,
                    phone: $tx->phone,
                );
            }
        }

        if (!$payment) {
            Log::warning('M-PESA success with no matching payment', [
                'tx' => $tx->id,
                'checkout' => $tx->checkout_request_id,
                'reference' => $tx->reference,
                'receipt' => $tx->mpesa_receipt_number,
            ]);
            return;
        }

        $this->attachReceipt($tx, $payment);
    }

    private function applyPaymentFailure(MpesaTransaction $tx): void
    {
        $payment = $tx->payment;
        if (!$payment) {
            return;
        }

        $payment->update([
            'status' => Payment::STATUS_FAILED,
            'confirmed_at' => null,
        ]);

        if ($payment->parcel && $payment->phone) {
            $this->notifier->paymentFailed(
                $payment->phone,
                $payment->parcel,
                $tx->result_desc ?? 'Payment failed',
            );
        }
    }

    /* =================================================================
     | CASH — one payment row per handover
     | ================================================================= */

    public function recordCashCod(
        Parcel $parcel,
        int $amountReceived,
        int $staffId,
        ?string $note = null,
    ): Payment {
        if ($amountReceived <= 0) {
            throw new \DomainException('Cash amount must be greater than zero.');
        }

        $parcel->refresh();
        $outstanding = (int) $parcel->balanceDue();
        if ($outstanding <= 0) {
            throw new \DomainException('This parcel is already fully paid.');
        }

        $applied = min($amountReceived, $outstanding);
        if ($applied < $amountReceived) {
            Log::warning('Cash collection exceeded remaining balance — capping', [
                'parcel_id' => $parcel->id,
                'received' => $amountReceived,
                'applied' => $applied,
                'remaining' => $outstanding,
            ]);
        }

        $note ??= sprintf(
            'KSh %s cash collected by staff #%d',
            number_format($amountReceived),
            $staffId,
        );

        // One cash handover = one payment row with its own amount.
        $payment = $this->openSettledPayment(
            parcel: $parcel,
            amount: $applied,
            channel: Payment::CHANNEL_CASH,
            phone: $parcel->recipient_phone,
        );

        $this->attachReceipt(null, $payment, 'Cash collected');

        $parcel->events()
            ->where('status', 'payment')
            ->latest('id')
            ->first()
                ?->update([
                'staff_id' => $staffId,
                'description' => $note,
            ]);

        return $payment->fresh();
    }

    /* =================================================================
     | ROLLUP — sum of successful amount is the parcel's real money
     | ================================================================= */

    public function recalculateParcel(Parcel $parcel): void
    {
        $wasPaid = $parcel->isPaid();

        $paid = (int) Payment::query()
            ->where('parcel_id', $parcel->id)
            ->whereIn('type', [Payment::TYPE_DELIVERY, Payment::TYPE_COD])
            ->where('status', Payment::STATUS_SUCCESS)
            ->sum('amount');

        $fullyPaid = (int) $parcel->total > 0
            && $paid >= (int) $parcel->total;

        $parcel->markPaidState($paid, $fullyPaid);

        // Award points exactly once, when the parcel first becomes paid.
        if ($fullyPaid && !$wasPaid && (int) $parcel->points_earned === 0) {
            $this->points->awardForParcel(
                $parcel,
                $this->pointsForAmount((int) $parcel->total),
            );
        }
    }

    private function pointsForAmount(int $total): int
    {
        // 1 point per 100 KSh. Tune to business rule.
        return intdiv($total, 100);
    }

    /* =================================================================
     | STK PUSH
     | ================================================================= */

    private function fireStkFor(Parcel $parcel, Payment $delivery, int $dueNow): array
    {
        $phone = $parcel->payer_phone ?: $parcel->sender_phone;
        $stkPhone = formatPhoneNumber((string) $phone);

        if (!preg_match('/^254[17]\d{8}$/', $stkPhone)) {
            return ['mpesa_tx' => null, 'error' => 'Invalid phone number for M-PESA.'];
        }

        $tx = MpesaTransaction::create([
            'payment_id' => $delivery->id,
            'phone' => $stkPhone,
            'amount' => $dueNow,
            'reference' => $parcel->tracking_no,
            'description' => 'Pick&Send delivery ' . $parcel->tracking_no,
            'status' => 'pending',
            'type' => 'stk',
        ]);

        try {
            $response = $this->mpesa->stkPush(
                phone: $stkPhone,
                amount: $dueNow,
                reference: $parcel->tracking_no,
                description: 'Pick and Send delivery ' . $parcel->tracking_no,
            );
        } catch (\Throwable $e) {
            $tx->update([
                'status' => 'failed',
                'result_desc' => 'STK transport error: ' . $e->getMessage(),
                'completed_at' => now(),
            ]);
            $this->notifier->paymentInitFailed($phone, $parcel);
            Log::error('STK push transport error', [
                'parcel' => $parcel->id,
                'tx' => $tx->id,
                'error' => $e->getMessage(),
            ]);
            return [
                'mpesa_tx' => $tx->fresh(),
                'error' => 'We could not send the M-PESA prompt automatically. '
                    . 'Please pay manually using the instructions below.',
            ];
        }

        $resp = (array) $response;
        if (!($resp['success'] ?? false)) {
            $tx->update([
                'status' => 'failed',
                'result_desc' => $resp['message'] ?? 'STK Push was not accepted',
                'completed_at' => now(),
            ]);
            $this->notifier->paymentInitFailed($phone, $parcel);
            return [
                'mpesa_tx' => $tx->fresh(),
                'error' => 'We could not send the M-PESA prompt automatically. '
                    . 'Please pay manually using the instructions below.',
            ];
        }

        $transaction = (array) ($resp['transaction'] ?? []);
        $tx->update([
            'checkout_request_id' => $transaction['CheckoutRequestID'] ?? null,
            'merchant_request_id' => $transaction['MerchantRequestID'] ?? null,
            'request_payload' => [
                'phone' => $stkPhone,
                'amount' => $dueNow,
                'reference' => $parcel->tracking_no,
                'description' => 'Pick&Send delivery ' . $parcel->tracking_no,
            ],
        ]);

        $this->notifier->paymentPromptSent($phone, $parcel);

        return ['mpesa_tx' => $tx->fresh(), 'error' => null];
    }

    /* =================================================================
     | MANUAL CLAIM / ORPHANS / RECONCILE
     | ================================================================= */

    public function recordMpesaCodeClaim(Parcel $parcel, string $code): void
    {
        $code = strtoupper(trim($code));

        // Idempotent: reject duplicate claims of the same code.
        if (MpesaTransaction::where('mpesa_receipt_number', $code)->exists()) {
            Log::info('M-PESA claim duplicate ignored', [
                'parcel_id' => $parcel->id,
                'code' => $code,
            ]);
            return;
        }

        $liveStk = $parcel->payments()
            ->where('status', Payment::STATUS_PENDING)
            ->whereHas('mpesaTransaction', fn($q) => $q->where('status', 'pending'))
            ->exists();

        if ($liveStk) {
            Log::info('M-PESA manual claim deferred — STK still pending', [
                'parcel_id' => $parcel->id,
                'code' => $code,
            ]);
            return;
        }

        // Record the claim as an unlinked tx. Attach later via reconcile.
        MpesaTransaction::create([
            'payment_id' => null,
            'mpesa_receipt_number' => $code,
            'phone' => formatPhoneNumber(
                (string) ($parcel->payer_phone ?: $parcel->sender_phone)
            ),
            'amount' => (int) $parcel->balanceDue(),
            'reference' => $parcel->tracking_no,
            'description' => 'Manual M-PESA code claim',
            'status' => 'pending',
            'result_desc' => 'Awaiting verification',
            'type' => 'c2b',
        ]);

        ParcelEvent::create([
            'parcel_id' => $parcel->id,
            'status' => 'payment_claim',
            'label' => 'Payment code submitted',
            'description' => "Claimed M-PESA code {$code} — pending verification",
            'happened_at' => now(),
        ]);
    }

    private function persistOrphanStkCallback(array $stk, array $callback): void
    {
        $meta = collect($stk['CallbackMetadata']['Item'] ?? [])
            ->keyBy('Name')
            ->map(fn($item) => $item['Value'] ?? null);

        $success = (string) ($stk['ResultCode'] ?? '-1') === '0';

        MpesaTransaction::create([
            'payment_id' => null,
            'checkout_request_id' => $stk['CheckoutRequestID'] ?? null,
            'merchant_request_id' => $stk['MerchantRequestID'] ?? null,
            'mpesa_receipt_number' => $meta['MpesaReceiptNumber'] ?? null,
            'phone' => isset($meta['PhoneNumber'])
                ? formatPhoneNumber((string) $meta['PhoneNumber'])
                : 'unknown',
            'amount' => (int) ($meta['Amount'] ?? 0),
            'status' => $success ? 'completed' : 'failed',
            'result_code' => (string) ($stk['ResultCode'] ?? '-1'),
            'result_desc' => $stk['ResultDesc'] ?? null,
            'type' => 'stk',
            'callback_payload' => $callback,
            'completed_at' => $success ? now() : null,
        ]);

        Log::warning('M-PESA orphan STK callback persisted for reconciliation', [
            'checkout' => $stk['CheckoutRequestID'] ?? null,
            'receipt' => $meta['MpesaReceiptNumber'] ?? null,
        ]);
    }

    public function reconcileOrphan(MpesaTransaction $tx, Parcel $parcel): void
    {
        if ($tx->payment_id !== null) {
            throw new \DomainException('Transaction is already reconciled.');
        }
        if (!in_array($tx->type, ['c2b', 'stk'], true)) {
            throw new \DomainException('Unsupported transaction type for reconciliation.');
        }

        // One receipt = one payment row.
        $payment = $this->openSettledPayment(
            parcel: $parcel,
            amount: (int) $tx->amount,
            channel: Payment::CHANNEL_MPESA,
            phone: $tx->phone,
        );

        $this->attachReceipt($tx, $payment, 'Reconciled M-PESA payment');
    }

    /* =================================================================
     | HELPERS
     | ================================================================= */

    private function pendingStkPayment(Parcel $parcel): ?Payment
    {
        return $parcel->payments()
            ->where('type', Payment::TYPE_DELIVERY)
            ->where('status', Payment::STATUS_PENDING)
            ->whereHas('mpesaTransaction', fn($q) => $q->where('status', 'pending'))
            ->latest()
            ->first();
    }

    private function openPendingStkPayment(Parcel $parcel, int $amount): Payment
    {
        return Payment::create([
            'parcel_id' => $parcel->id,
            'user_id' => $parcel->sender_id,
            'type' => Payment::TYPE_DELIVERY,
            'status' => Payment::STATUS_PENDING,
            'amount' => $amount,
            'channel' => Payment::CHANNEL_PENDING,
            'phone' => formatPhoneNumber(
                (string) ($parcel->payer_phone ?: $parcel->sender_phone)
            ),
            'reference' => $parcel->tracking_no,
        ]);
    }

    /**
     * Open a payment row that WILL be settled by the caller (cash, C2B,
     * reconciliation). Its `amount` is final at creation. Status starts
     * pending and is flipped to success by attachReceipt().
     */
    private function openSettledPayment(
        Parcel $parcel,
        int $amount,
        string $channel,
        ?string $phone,
    ): Payment {
        $type = $parcel->payment_option === Parcel::PAYMENT_COD_FULL
            ? Payment::TYPE_COD
            : Payment::TYPE_DELIVERY;

        return Payment::create([
            'parcel_id' => $parcel->id,
            'user_id' => $parcel->sender_id,
            'type' => $type,
            'status' => Payment::STATUS_PENDING,
            'amount' => max(0, $amount),
            'channel' => $channel,
            'phone' => $phone !== null
                ? formatPhoneNumber($phone)
                : formatPhoneNumber((string) $parcel->recipient_phone),
            'reference' => $parcel->tracking_no,
        ]);
    }

    private function normaliseC2bMsisdn(string $raw): ?string
    {
        $raw = trim($raw);
        if ($raw === '') {
            return null;
        }
        if (preg_match('/^[a-f0-9]{64}$/i', $raw)) {
            return null;
        }
        $normalised = formatPhoneNumber($raw);
        if (!preg_match('/^254[17]\d{8}$/', $normalised)) {
            return null;
        }
        return $normalised;
    }

    private function resolveParcelForC2b(MpesaTransaction $tx, string $cleanRef): ?Parcel
    {
        if ($cleanRef !== '') {
            $parcel = Parcel::query()->where('tracking_no', $cleanRef)->first();
            if ($parcel) {
                return $parcel;
            }
        }

        if ($tx->phone === null || !preg_match('/^254[17]\d{8}$/', $tx->phone)) {
            return null;
        }

        return Parcel::query()
            ->where(function ($q) use ($tx) {
                $q->where('sender_phone', $tx->phone)
                    ->orWhere('payer_phone', $tx->phone)
                    ->orWhere('recipient_phone', $tx->phone);
            })
            ->whereNotIn('status', [Parcel::STATUS_PAID, Parcel::STATUS_CANCELLED])
            ->where('created_at', '>=', now()->subDays(14))
            ->latest()
            ->first();
    }

    private function cleanReference(string $raw): string
    {
        $ref = strtoupper(trim($raw));
        $ref = preg_replace('/[^A-Z0-9\-]/', '', $ref);
        $ref = trim(preg_replace('/-+/', '-', $ref), '-');
        return $ref;
    }
}