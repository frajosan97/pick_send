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
    ) {
    }

    /* -----------------------------------------------------------------
     | Pricing helpers
     | ----------------------------------------------------------------- */

    public function amountDueNow(string $option, int $total, int $cod): int
    {
        return match ($option) {
            Parcel::PAYMENT_PREPAID => $total,
            Parcel::PAYMENT_COD_FEE => max(0, $total - $cod),
            Parcel::PAYMENT_COD_FULL => 0,
            default => throw new \InvalidArgumentException(
                "Unknown payment option: {$option}"
            ),
        };
    }

    /* -----------------------------------------------------------------
     | Entry point — create/reuse payments, fire STK if needed
     | ----------------------------------------------------------------- */

    public function initiateForParcel(Parcel $parcel, string $option): array
    {
        $dueNow = $this->amountDueNow(
            $option,
            (int) $parcel->total,
            (int) $parcel->cod_amount
        );

        $codOutstanding = match ($option) {
            Parcel::PAYMENT_COD_FULL => (int) $parcel->total,
            Parcel::PAYMENT_COD_FEE => (int) $parcel->cod_amount,
            default => 0,
        };

        $parcel->forceFill([
            'payment_option' => $option,
            'amount_due_now' => $dueNow,
            'amount_paid' => 0,
            'status' => $dueNow > 0
                ? Parcel::STATUS_AWAITING_PAYMENT
                : Parcel::STATUS_PAYMENT_ON_DELIVERY,
        ])->save();

        // Reuse the existing pending delivery payment if one exists —
        // prevents duplicate rows when a retry hits this method twice.
        $delivery = null;
        if ($dueNow > 0) {
            $delivery = Payment::firstOrCreate(
                [
                    'parcel_id' => $parcel->id,
                    'type' => 'delivery',
                    'status' => 'pending',
                ],
                [
                    'user_id' => $parcel->sender_id,
                    'amount' => $dueNow,
                    'phone' => $parcel->payer_phone ?: $parcel->sender_phone,
                    'reference' => $parcel->tracking_no,
                    'confirmed_at' => null,
                ]
            );
        }

        if ($codOutstanding > 0) {
            Payment::firstOrCreate(
                [
                    'parcel_id' => $parcel->id,
                    'type' => 'cod',
                    'status' => 'pending',
                ],
                [
                    'user_id' => $parcel->sender_id,
                    'amount' => $codOutstanding,
                    'phone' => $parcel->recipient_phone,
                    'reference' => $parcel->tracking_no,
                ]
            );
        }

        if ($dueNow <= 0) {
            $this->recalculateParcel($parcel);

            return ['mpesa_tx' => null, 'error' => null];
        }

        return $this->fireStkFor($parcel, $delivery, $dueNow);
    }

    /* -----------------------------------------------------------------
     | Callback — safely idempotent, resolves the parent payment
     | ----------------------------------------------------------------- */

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
                // Orphan callback — persist it for reconciliation instead of dropping.
                $this->persistOrphanCallback($stk, $callback);
                return null;
            }

            // Idempotency: Safaricom retries callbacks. callback_payload is set
            // exactly once, on first successful processing (success OR failure).
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
                'mpesa_receipt_number' => $meta['MpesaReceiptNumber']
                    ?? $tx->mpesa_receipt_number,
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

    /* -----------------------------------------------------------------
     | Manual receipt claim
     | ----------------------------------------------------------------- */

    public function recordMpesaCodeClaim(Parcel $parcel, string $code): void
    {
        $code = strtoupper(trim($code));

        /** @var Payment|null $payment */
        $payment = Payment::query()
            ->where('parcel_id', $parcel->id)
            ->where('type', 'delivery')
            ->where('status', 'pending')
            ->latest()
            ->first();

        if (!$payment) {
            return;
        }

        // Don't stomp a claim while a live STK transaction is in flight —
        // otherwise a user who pays manually *and* accepts the prompt ends
        // up with two competing receipts on the same Payment.
        $liveStk = $payment->mpesaTransactions()
            ->whereIn('status', ['pending'])
            ->exists();

        if ($liveStk) {
            Log::info('M-PESA manual claim deferred — STK still pending', [
                'payment_id' => $payment->id,
                'code' => $code,
            ]);
            return;
        }

        $payment->update([
            'mpesa_code' => $code,
            'reference' => $parcel->tracking_no,
        ]);

        ParcelEvent::create([
            'parcel_id' => $parcel->id,
            'status' => 'payment_claim',
            'label' => 'Payment code submitted',
            'description' => "Claimed M-PESA code {$code} — pending verification",
            'happened_at' => now(),
        ]);
    }

    /* -----------------------------------------------------------------
     | Rollup — recompute denormalised parcel money state
     | ----------------------------------------------------------------- */

    public function recalculateParcel(Parcel $parcel): void
    {
        $paid = (int) Payment::query()
            ->where('parcel_id', $parcel->id)
            ->where('status', 'success')
            ->whereIn('type', ['delivery', 'cod'])
            ->sum('amount');

        $fullyPaid = (int) $parcel->total > 0
            && $paid >= (int) $parcel->total;

        $parcel->markPaidState($paid, $fullyPaid);
    }

    /* -----------------------------------------------------------------
     | STK push
     | ----------------------------------------------------------------- */

    private function fireStkFor(
        Parcel $parcel,
        Payment $delivery,
        int $dueNow
    ): array {
        $phone = $parcel->payer_phone ?: $parcel->sender_phone;
        $e164 = formatPhoneNumber($phone);

        // Create the transaction **already linked** to the payment.
        // This is what makes applyPaymentSuccess() crash-proof: no more
        // `payments.mpesa_transaction_id` reverse lookup.
        $tx = MpesaTransaction::create([
            'payment_id' => $delivery->id,
            'phone' => $e164,
            'amount' => $dueNow,
            'reference' => $parcel->tracking_no,
            'description' => 'Pick&Send delivery ' . $parcel->tracking_no,
            'status' => 'pending',
            'type' => 'stk',
        ]);

        try {
            $response = $this->mpesa->stkPush(
                phone: $phone,
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
                'phone' => $e164,
                'amount' => $dueNow,
                'reference' => $parcel->tracking_no,
                'description' => 'Pick&Send delivery ' . $parcel->tracking_no,
            ],
        ]);

        $this->notifier->paymentPromptSent($phone, $parcel);

        return [
            'mpesa_tx' => $tx->fresh(),
            'error' => null,
        ];
    }

    /* -----------------------------------------------------------------
     | Payment resolution (shared by success & failure)
     | ----------------------------------------------------------------- */

    /**
     * Resolve the Payment a completed/failed M-PESA transaction belongs to.
     *
     * Priority:
     *   1. explicit FK            (STK flow — how fireStkFor() created it)
     *   2. manual receipt claim   (user typed a code; callback later matched)
     *   3. reference+phone+amount (orphan C2B reconciled manually)
     */
    private function resolvePayment(MpesaTransaction $tx): ?Payment
    {
        if ($tx->payment_id) {
            return $tx->payment;   // belongsTo — null if deleted
        }

        if ($tx->mpesa_receipt_number) {
            $claimed = Payment::query()
                ->where('mpesa_code', $tx->mpesa_receipt_number)
                ->where('status', 'pending')
                ->first();

            if ($claimed) {
                return $claimed;
            }
        }

        return Payment::query()
            ->where('reference', $tx->reference)
            ->where('phone', $tx->phone)
            ->where('amount', $tx->amount)
            ->where('status', 'pending')
            ->first();
    }

    /* -----------------------------------------------------------------
     | Success / failure handlers
     | ----------------------------------------------------------------- */

    private function applyPaymentSuccess(MpesaTransaction $tx): void
    {
        $payment = $this->resolvePayment($tx);

        if (!$payment) {
            Log::warning('M-PESA success with no matching payment', [
                'tx' => $tx->id,
                'checkout' => $tx->checkout_request_id,
                'reference' => $tx->reference,
                'receipt' => $tx->mpesa_receipt_number,
            ]);
            return;
        }

        DB::transaction(function () use ($payment, $tx) {
            $payment->update([
                'mpesa_code' => $tx->mpesa_receipt_number,
                'amount' => (int) $tx->amount,
                'status' => 'success',
                'confirmed_at' => now(),
            ]);

            // Back-fill the FK for the fallback paths (manual claim / C2B).
            if ($tx->payment_id !== $payment->id) {
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
                'label' => $payment->type === 'cod'
                    ? 'Cash on Delivery received'
                    : 'Delivery payment confirmed',
                'description' => "M-PESA receipt {$tx->mpesa_receipt_number}",
                'happened_at' => now(),
            ]);
        });

        $payment->refresh();

        if ($payment->parcel) {
            $this->notifier->parcelPaid(
                $payment->parcel->fresh(),
                $tx->mpesa_receipt_number ?? ''
            );
        }
    }

    private function applyPaymentFailure(MpesaTransaction $tx): void
    {
        $payment = $this->resolvePayment($tx);

        if (!$payment) {
            return;
        }

        // NOTE: we do **not** null out `mpesa_code` here anymore. If a receipt
        // was stored by recordMpesaCodeClaim() and then a *different* STK for
        // the same payment fails, wiping the code would destroy the claim.
        $payment->update([
            'status' => 'failed',
            'confirmed_at' => null,
        ]);

        if ($payment->parcel && $payment->phone) {
            $this->notifier->paymentFailed(
                $payment->phone,
                $payment->parcel,
                $tx->result_desc ?? 'Payment failed'
            );
        }
    }

    /* -----------------------------------------------------------------
     | Orphan callback persistence
     | ----------------------------------------------------------------- */

    private function persistOrphanCallback(array $stk, array $callback): void
    {
        $meta = collect($stk['CallbackMetadata']['Item'] ?? [])
            ->keyBy('Name')
            ->map(fn($item) => $item['Value'] ?? null);

        $success = (string) ($stk['ResultCode'] ?? '-1') === '0';

        MpesaTransaction::create([
            'payment_id' => null,     // ← unlinked; admin reconciles
            'checkout_request_id' => $stk['CheckoutRequestID'] ?? null,
            'merchant_request_id' => $stk['MerchantRequestID'] ?? null,
            'mpesa_receipt_number' => $meta['MpesaReceiptNumber'] ?? null,
            'phone' => isset($meta['PhoneNumber'])
                ? (string) $meta['PhoneNumber']
                : 'unknown',
            'amount' => (int) ($meta['Amount'] ?? 0),
            'status' => $success ? 'completed' : 'failed',
            'result_code' => (string) ($stk['ResultCode'] ?? '-1'),
            'result_desc' => $stk['ResultDesc'] ?? null,
            'type' => 'stk',
            'callback_payload' => $callback,
            'completed_at' => $success ? now() : null,
        ]);

        Log::warning('M-PESA orphan callback persisted for reconciliation', [
            'checkout' => $stk['CheckoutRequestID'] ?? null,
            'receipt' => $meta['MpesaReceiptNumber'] ?? null,
        ]);
    }
}