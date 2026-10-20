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

        // Only create a delivery payment row when there is something to pay.
        $delivery = null;
        if ($dueNow > 0) {
            $delivery = Payment::create([
                'parcel_id' => $parcel->id,
                'user_id' => $parcel->sender_id,
                'type' => 'delivery',
                'amount' => $dueNow,
                'phone' => $parcel->payer_phone ?: $parcel->sender_phone,
                'status' => 'pending',
                'confirmed_at' => null,
            ]);
        }

        if ($codOutstanding > 0) {
            Payment::create([
                'parcel_id' => $parcel->id,
                'user_id' => $parcel->sender_id,
                'type' => 'cod',
                'amount' => $codOutstanding,
                'phone' => $parcel->recipient_phone,
                'status' => 'pending',
            ]);
        }

        if ($dueNow <= 0) {
            $this->recalculateParcel($parcel);

            return ['mpesa_tx' => null, 'error' => null];
        }

        return $this->fireStkFor($parcel, $delivery, $dueNow);
    }

    public function handleCallback(array $callback): ?MpesaTransaction
    {
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

        $tx = MpesaTransaction::where('checkout_request_id', $checkoutId)
            ->where('type', 'stk')
            ->first();

        if (!$tx) {
            Log::warning('M-PESA callback for unknown checkout', [
                'checkout' => $checkoutId,
            ]);
            return null;
        }

        // Idempotency: Safaricom retries callbacks. Ignore duplicates.
        if (
            in_array($tx->status, ['completed', 'failed'], true)
            && $tx->completed_at !== null
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

        if ($success) {
            $this->applyPaymentSuccess($tx);
        } else {
            $this->applyPaymentFailure($tx);
        }

        return $tx;
    }

    public function recordMpesaCodeClaim(Parcel $parcel, string $code): void
    {
        $code = strtoupper(trim($code));

        $payment = Payment::where('parcel_id', $parcel->id)
            ->where('type', 'delivery')
            ->where('status', 'pending')
            ->latest()
            ->first();

        if (!$payment) {
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

    public function recalculateParcel(Parcel $parcel): void
    {
        $paid = (int) Payment::where('parcel_id', $parcel->id)
            ->where('status', 'success')
            ->whereIn('type', ['delivery', 'cod'])
            ->sum('amount');

        $fullyPaid = (int) $parcel->total > 0
            && $paid >= (int) $parcel->total;

        $parcel->markPaidState($paid, $fullyPaid);
    }

    private function fireStkFor(
        Parcel $parcel,
        Payment $delivery,
        int $dueNow
    ): array {
        $phone = $parcel->payer_phone ?: $parcel->sender_phone;

        $tx = MpesaTransaction::create([
            'phone' => formatPhoneNumber($phone),
            'amount' => $dueNow,
            'reference' => $parcel->tracking_no,
            'description' => 'Pick&Send delivery ' . $parcel->tracking_no,
            'status' => 'pending',
            'type' => 'stk',
        ]);

        $response = $this->mpesa->stkPush(
            phone: $phone,
            amount: $dueNow,
            reference: $parcel->tracking_no,
            description: 'Pick&Send delivery ' . $parcel->tracking_no,
        );

        // MpesaService returns stdClass — normalise to array once.
        $resp = is_object($response) ? (array) $response : (array) $response;

        if (!($resp['success'] ?? false)) {
            $tx->update([
                'status' => 'failed',
                'result_desc' => $resp['message'] ?? 'STK Push was not accepted',
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
                'phone' => formatPhoneNumber($phone),
                'amount' => $dueNow,
                'reference' => $parcel->tracking_no,
                'description' => 'Pick&Send delivery ' . $parcel->tracking_no,
            ],
        ]);

        $delivery->update([
            'mpesa_transaction_id' => $tx->id,
            'reference' => $parcel->tracking_no,
        ]);

        $this->notifier->paymentPromptSent($phone, $parcel);

        return [
            'mpesa_tx' => $tx->fresh(),
            'error' => null,
        ];
    }

    private function applyPaymentSuccess(MpesaTransaction $tx): void
    {
        // 1) Match by mpesa_transaction_id (STK flow).
        $payment = Payment::where('mpesa_transaction_id', $tx->id)->first();

        // 2) Fallback: manual code claim with the same receipt.
        if (!$payment && $tx->mpesa_receipt_number) {
            $payment = Payment::where('mpesa_code', $tx->mpesa_receipt_number)
                ->where('status', 'pending')
                ->first();
        }

        if (!$payment) {
            Log::warning('M-PESA success with no matching payment', [
                'checkout' => $tx->checkout_request_id,
                'reference' => $tx->reference,
                'receipt' => $tx->mpesa_receipt_number,
            ]);
            return;
        }

        DB::transaction(function () use ($payment, $tx) {
            $payment->update([
                'mpesa_code' => $tx->mpesa_receipt_number,
                'mpesa_transaction_id' => $tx->id,
                'amount' => (int) $tx->amount,
                'status' => 'success',
                'confirmed_at' => now(),
            ]);

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
        // Match by transaction id, or by the claimed receipt (manual claim path).
        $payment = Payment::where('mpesa_transaction_id', $tx->id)
            ->where('status', 'pending')
            ->first();

        if (!$payment && $tx->mpesa_receipt_number) {
            $payment = Payment::where('mpesa_code', $tx->mpesa_receipt_number)
                ->where('status', 'pending')
                ->first();
        }

        if (!$payment) {
            return;
        }

        $payment->update([
            'status' => 'failed',
            'mpesa_code' => null,
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
}