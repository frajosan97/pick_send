<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\ParcelEvent;

class PaymentService
{
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
            'description' => 'M-PESA code '.$code,
            'happened_at' => now(),
        ]);
    }
}
