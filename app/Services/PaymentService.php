<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\ParcelEvent;

class PaymentService
{
    public function __construct(
        protected SmsService $sms,
        protected MpesaService $mpesa
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

        if (!$result['success']) {
            return $result;
        }

        $parcel->payments()->create([
            'type' => 'delivery',
            'amount' => $parcel->delivery_fee,
            'checkout_request_id' => $result['checkout_request_id'],
            'status' => 'pending',
            'phone' => $phone,
        ]);

        return $result;
    }

    public function recordMpesaCode(Parcel $parcel, string $code): void
    {
        $code = strtoupper(trim($code));

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
    }

    public function recordStkSuccess($payment, $receipt, $amount)
    {
        // 
    }

    public function recordStkFailure($payment, $resultDesc)
    {
        // 
    }
}
