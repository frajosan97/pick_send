<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\ParcelEvent;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PaymentService
{
    public function __construct(
        protected MpesaService $mpesa,
        protected NotificationService $notifier,
    ) {
    }

    public function initiateParcelPayment(Parcel $parcel, string $phone): array
    {
        $result = $this->mpesa->stkPush(
            phone: $phone,
            amount: (int) $parcel->delivery_fee,
            reference: 'PARCEL-' . $parcel->id,
            description: 'Parcel delivery payment'
        );

        if (!($result['success'] ?? false)) {
            $this->notifier->paymentInitFailed($phone, $parcel);

            return $result;
        }

        $parcel->payments()->create([
            'type' => 'delivery',
            'amount' => $parcel->delivery_fee,
            'checkout_request_id' => $result['checkout_request_id'],
            'status' => 'pending',
            'phone' => $phone,
        ]);

        $this->notifier->paymentPromptSent($phone, $parcel);

        return $result;
    }

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

        $this->notifier->parcelPaid($parcel->fresh(), $code);
    }

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
            $this->notifier->paymentFailed(
                $payment->phone,
                $payment->parcel,
                $resultDesc
            );
        }
    }
}