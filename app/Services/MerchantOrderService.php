<?php

namespace App\Services;

use App\Models\MerchantOrder;
use App\Models\Parcel;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class MerchantOrderService
{
    /**
     * Attach a parcel to a merchant order if the sender is a merchant.
     * Idempotent: repeated calls with the same (parcel, merchant) pair
     * are no-ops.
     */
    public function attachParcel(Parcel $parcel, User $sender): ?MerchantOrder
    {
        // Gate 1: sender must actually have the merchant role.
        if (!$sender->isMerchant()) {
            return null;
        }

        // Gate 2: the sender phone on the parcel must match the user's
        // phone (last 9 digits, so 07…/2547…/+2547… all collapse).
        $parcelPhone = $this->normalise($parcel->sender_phone ?? '');
        $userPhone = $this->normalise($sender->phone ?? '');

        if ($parcelPhone === '' || $parcelPhone !== $userPhone) {
            Log::info('merchant_order.skip_phone_mismatch', [
                'parcel_id' => $parcel->id,
                'user_id' => $sender->id,
                'parcel_phone' => $parcelPhone,
                'user_phone' => $userPhone,
            ]);

            return null;
        }

        // Idempotency: don't duplicate the attachment on retries.
        if ($existing = MerchantOrder::where('parcel_id', $parcel->id)->first()) {
            return $existing;
        }

        $order = MerchantOrder::create([
            'merchant_id' => $sender->id,
            'parcel_id' => $parcel->id,
            'status' => 'open',
        ]);

        Log::info('merchant_order.attached', [
            'parcel_id' => $parcel->id,
            'merchant_id' => $sender->id,
            'order_id' => $order->id,
        ]);

        return $order;
    }

    /**
     * Strip non-digits and compare the last 9 digits.
     */
    private function normalise(string $phone): string
    {
        $digits = preg_replace('/\D/', '', $phone);

        return strlen($digits) >= 9 ? substr($digits, -9) : $digits;
    }
}