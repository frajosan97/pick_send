<?php

namespace App\Services;

use App\Models\OtpCode;
use App\Models\User;

class MerchantService
{
    public function sendOtp(string $phone): void
    {
        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // OtpCode::create([
        //     'phone' => $phone,
        //     'code' => $code,
        //     'expires_at' => now()->addMinutes(10),
        // ]);

        // TODO: integrate SMS provider. For now, log it.
        logger()->info("OTP for {$phone}: {$code}");
    }

    public function verifyOtp(string $phone, string $code): bool
    {
        // $otp = OtpCode::where('phone', $phone)
        //     ->where('code', $code)
        //     ->whereNull('used_at')
        //     ->where('expires_at', '>', now())
        //     ->first();

        // if (!$otp)
        //     return false;

        // $otp->update(['used_at' => now()]);
        return true;
    }

    public function withdraw(User $merchant): void
    {
        $wallet = $merchant->walletOrCreate();
        $amount = $wallet->balance;

        if ($amount <= 0) {
            return;
        }

        $wallet->debit($amount, 'withdrawal', 'M-PESA payout');
        // TODO: integrate Daraja B2C to actually send the money.
    }
}
