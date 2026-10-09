<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Support\Facades\Cache;

class MerchantService
{
    private const OTP_TTL_MINUTES = 10;
    private const MAX_ATTEMPTS = 5;
    private const RESEND_COOLDOWN_SECONDS = 60;

    public function __construct(
        protected SmsService $sms,
        protected MpesaService $mpesa
    ) {
    }

    public function sendOtp(string $phone): void
    {
        $key = $this->otpKey($phone);

        // Prevent spamming: one send per cooldown window
        if (Cache::has($this->cooldownKey($phone))) {
            throw new \RuntimeException('Please wait before requesting another OTP.');
        }

        $code = str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $message = "Your verification code is {$code}. It expires in "
            . self::OTP_TTL_MINUTES . " minutes. Do not share it with anyone.";

        $result = $this->sms->sendSms(
            mobile: $phone,
            message: $message,
            clientSmsId: 'otp_' . uniqid(),
        );

        // If SMS failed, don't leave a dangling OTP in cache
        if ($result === false) {
            throw new \RuntimeException('Failed to send OTP. Please try again.');
        }

        Cache::put($key, [
            'code' => $code,
            'attempts' => 0,
        ], now()->addMinutes(self::OTP_TTL_MINUTES));

        Cache::put($this->cooldownKey($phone), true, self::RESEND_COOLDOWN_SECONDS);

        // Local-only log so you can test without spending SMS credits
        if (app()->environment('local')) {
            logger()->info("OTP for {$phone}: {$code}");
        }
    }

    public function verifyOtp(string $phone, string $code): bool
    {
        $key = $this->otpKey($phone);
        $payload = Cache::get($key);

        if (!$payload) {
            return false; // expired or never sent
        }

        if ($payload['attempts'] >= self::MAX_ATTEMPTS) {
            Cache::forget($key);
            return false;
        }

        if (!hash_equals($payload['code'], $code)) {
            $payload['attempts']++;

            // Preserve remaining TTL instead of resetting it
            $ttl = Cache::getStore() instanceof \Illuminate\Cache\TtlStore
                ? null
                : self::OTP_TTL_MINUTES;

            Cache::put($key, $payload, now()->addMinutes($ttl ?? self::OTP_TTL_MINUTES));

            return false;
        }

        // Success → invalidate immediately (one-time use)
        Cache::forget($key);
        Cache::forget($this->cooldownKey($phone));

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

        $result = $this->mpesa->b2c(
            phone: $merchant->phone,
            amount: $amount
        );

        if (!$result['success']) {
            $wallet->credit($amount, 'withdrawal_refund', 'B2C failed');
            throw new \RuntimeException('Withdrawal failed: ' . ($result['error'] ?? 'Unknown error'));
        }
    }

    private function otpKey(string $phone): string
    {
        return "otp:{$phone}";
    }

    private function cooldownKey(string $phone): string
    {
        return "otp:cooldown:{$phone}";
    }
}