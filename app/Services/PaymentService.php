<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\ParcelEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function __construct(
        protected SmsService $sms,
        protected MpesaService $mpesa,
        protected NotificationService $notifier,
    ) {
    }

    /**
     * Kick off an STK push for a parcel and persist a pending payment row.
     */
    public function initiateParcelPayment(Parcel $parcel, string $phone): array
    {
        $result = $this->mpesa->stkPush(
            phone: $phone,
            amount: (int) $parcel->delivery_fee,
            reference: 'PARCEL-' . $parcel->id,
            description: 'Parcel delivery payment'
        );

        if (!($result['success'] ?? false)) {
            // Let the customer know the push failed so they can retry
            $this->notifier->notify(
                $phone,
                "We couldn't initiate payment for parcel {$parcel->tracking_no}. "
                . "Please try again or contact support."
            );

            return $result;
        }

        $parcel->payments()->create([
            'type' => 'delivery',
            'amount' => $parcel->delivery_fee,
            'checkout_request_id' => $result['checkout_request_id'],
            'status' => 'pending',
            'phone' => $phone,
        ]);

        // Notify customer to complete the STK prompt on their phone
        $this->notifier->notify(
            $phone,
            "An M-PESA prompt for KES {$parcel->delivery_fee} has been sent to your phone "
            . "for parcel {$parcel->tracking_no}. Enter your PIN to complete payment."
        );

        return $result;
    }

    /**
     * Record a manually-entered M-PESA code (e.g. from SMS forwarder or user input).
     */
    public function recordMpesaCode(Parcel $parcel, string $code): void
    {
        $code = strtoupper(trim($code));

        DB::transaction(function () use ($parcel, $code) {
            $parcel->update([
                'mpesa_code' => $code,
                'paid_at' => now(),
                'status' => 'paid',
            ]);

            $parcel->payments()
                ->where('type', 'delivery')
                ->where('status', 'pending')
                ->update([
                    'mpesa_code' => $code,
                    'status' => 'success',
                    'confirmed_at' => now(),
                ]);

            ParcelEvent::create([
                'parcel_id' => $parcel->id,
                'status' => 'paid',
                'label' => 'Payment received',
                'description' => 'M-PESA code ' . $code,
                'happened_at' => now(),
            ]);
        });

        // Fan-out payment confirmation to SMS + WhatsApp
        $this->notifier->parcelPaid($parcel->fresh(), $code);
    }

    /**
     * Called from the M-PESA STK callback when payment succeeds.
     */
    public function recordStkSuccess($payment, string $receipt, $amount): void
    {
        DB::transaction(function () use ($payment, $receipt, $amount) {
            $payment->update([
                'mpesa_code' => $receipt,
                'amount' => $amount,
                'status' => 'success',
                'confirmed_at' => now(),
            ]);

            $parcel = $payment->parcel;

            if ($parcel) {
                $parcel->update([
                    'mpesa_code' => $receipt,
                    'paid_at' => now(),
                    'status' => 'paid',
                ]);

                ParcelEvent::create([
                    'parcel_id' => $parcel->id,
                    'status' => 'paid',
                    'label' => 'STK payment confirmed',
                    'description' => "Receipt {$receipt}",
                    'happened_at' => now(),
                ]);
            }
        });

        if ($payment->parcel) {
            $this->notifier->parcelPaid($payment->parcel->fresh(), $receipt);
        }
    }

    /**
     * Called from the M-PESA STK callback when payment fails or is cancelled.
     */
    public function recordStkFailure($payment, string $resultDesc): void
    {
        $payment->update([
            'status' => 'failed',
            'failure_reason' => $resultDesc,
        ]);

        Log::info('STK payment failed', [
            'payment_id' => $payment->id,
            'reason' => $resultDesc,
        ]);

        if ($payment->parcel && $payment->phone) {
            $this->notifier->notify(
                $payment->phone,
                "Payment for parcel {$payment->parcel->tracking_no} was not completed. "
                . "Reason: {$resultDesc}. Reply or tap to retry."
            );
        }
    }
}