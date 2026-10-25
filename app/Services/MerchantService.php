<?php

namespace App\Services;

use App\Exceptions\Merchant\OtpCooldownException;
use App\Exceptions\Merchant\OtpDeliveryException;
use App\Exceptions\Merchant\OtpInvalidException;
use App\Exceptions\Merchant\OtpTooManyAttemptsException;
use App\Exceptions\Merchant\WithdrawalException;
use App\Models\User;
use App\Models\Wallet;
use App\Models\Withdrawal;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class MerchantService
{
    private const OTP_TTL_MINUTES = 10;
    private const MAX_ATTEMPTS = 5;
    private const RESEND_COOLDOWN_SECONDS = 60;
    private const WITHDRAWAL_PENDING_TTL = 15;

    public function __construct(
        protected SmsService $sms,
        protected MpesaService $mpesa,
    ) {
    }

    /* ============================================================
     | OTP
     |============================================================ */

    /**
     * @throws OtpCooldownException
     * @throws OtpDeliveryException
     */
    public function sendOtp(string $phone): void
    {
        $this->assertPhoneIsMerchant($phone);

        if (($seconds = $this->cooldownRemaining($phone)) > 0) {
            throw new OtpCooldownException($seconds);
        }

        $code = $this->generateCode();

        // Cache first so a code we sent can never be un-verifiable.
        $this->storeOtp($phone, $code);

        try {
            $sent = $this->sms->sendSms(
                mobile: $phone,
                message: $this->otpMessage($code),
                clientSmsId: 'otp_' . Str::uuid(),
            );
        } catch (\Throwable $e) {
            $this->clearOtp($phone);

            Log::error('merchant.otp.delivery_exception', [
                'phone_hash' => $this->hashPhone($phone),
                'exception' => $e::class,
                'message' => $e->getMessage(),
            ]);

            throw OtpDeliveryException::fromThrowable($e);
        }

        if ($sent === false) {
            $this->clearOtp($phone);

            Log::warning('merchant.otp.delivery_failed', [
                'phone_hash' => $this->hashPhone($phone),
            ]);

            throw OtpDeliveryException::smsFailed();
        }

        $this->startCooldown($phone);

        Log::info('merchant.otp.sent', [
            'phone_hash' => $this->hashPhone($phone),
        ]);

        if (app()->environment('local')) {
            logger()->info("[merchant OTP] {$phone} => {$code}");
        }
    }

    /**
     * @throws OtpInvalidException
     * @throws OtpTooManyAttemptsException
     */
    public function verifyOtp(string $phone, string $code): void
    {
        $payload = Cache::get($this->otpKey($phone));

        if (!is_array($payload) || !isset($payload['code'])) {
            throw OtpInvalidException::missing();
        }

        // Atomic increment *before* comparison — kills the parallel-guess race.
        $attempts = (int) Cache::increment($this->attemptsKey($phone));

        if ($attempts > self::MAX_ATTEMPTS) {
            $this->clearOtp($phone);
            throw new OtpTooManyAttemptsException();
        }

        if (!hash_equals((string) $payload['code'], $code)) {
            throw OtpInvalidException::wrong();
        }

        $this->clearOtp($phone);

        Log::info('merchant.otp.verified', [
            'phone_hash' => $this->hashPhone($phone),
        ]);
    }

    /* ============================================================
     | Withdrawal
     |============================================================ */

    /**
     * @throws WithdrawalException
     */
    public function withdraw(User $merchant): Withdrawal
    {
        $this->assertMerchantCanWithdraw($merchant);

        return DB::transaction(function () use ($merchant) {
            $wallet = Wallet::where('user_id', $merchant->id)
                ->lockForUpdate()
                ->first();

            if (!$wallet) {
                $wallet = $merchant->walletOrCreate();
                $wallet = Wallet::whereKey($wallet->id)->lockForUpdate()->firstOrFail();
            }

            $amount = (int) $wallet->balance;

            if ($amount <= 0) {
                throw WithdrawalException::nothingToWithdraw();
            }

            if ($this->hasPendingWithdrawal($merchant->id)) {
                throw WithdrawalException::alreadyInProgress();
            }

            $withdrawal = Withdrawal::create([
                'merchant_id' => $merchant->id,
                'wallet_id' => $wallet->id,
                'amount' => $amount,
                'status' => 'pending',
                'reference' => 'wd_' . Str::uuid(),
            ]);

            try {
                $result = $this->mpesa->processB2C(
                    phone: (string) $merchant->phone,
                    amount: $amount,
                    reference: $withdrawal->reference,
                );
            } catch (\Throwable $e) {
                $withdrawal->update([
                    'status' => 'failed',
                    'failure_note' => mb_substr($e->getMessage(), 0, 250),
                ]);

                Log::error('merchant.withdraw.b2c_exception', [
                    'withdrawal_id' => $withdrawal->id,
                    'exception' => $e::class,
                    'message' => $e->getMessage(),
                ]);

                throw WithdrawalException::b2cException($e);
            }

            if (!($result['success'] ?? false)) {
                $withdrawal->update([
                    'status' => 'failed',
                    'failure_note' => mb_substr((string) ($result['error'] ?? 'Unknown error'), 0, 250),
                ]);

                Log::warning('merchant.withdraw.b2c_failed', [
                    'withdrawal_id' => $withdrawal->id,
                    'error' => $result['error'] ?? null,
                ]);

                throw WithdrawalException::b2cFailed($result['error'] ?? null);
            }

            $wallet->debit(
                amount: $amount,
                type: 'withdrawal',
                note: 'M-PESA payout',
                reference: $withdrawal->reference,
            );

            $withdrawal->update([
                'status' => 'paid',
                'paid_at' => now(),
                'mpesa_receipt' => $result['receipt'] ?? null,
            ]);

            Log::info('merchant.withdraw.paid', [
                'withdrawal_id' => $withdrawal->id,
                'amount' => $amount,
                'receipt' => $result['receipt'] ?? null,
            ]);

            return $withdrawal->fresh();
        });
    }

    /* ============================================================
     | Guards
     |============================================================ */

    private function assertPhoneIsMerchant(string $phone): void
    {
        $user = User::where('phone', $phone)->first();

        if (!$user?->isMerchant()) {
            // Silent: never reveal existence. Only log for observability.
            Log::info('merchant.otp.non_merchant_phone', [
                'phone_hash' => $this->hashPhone($phone),
            ]);
        }
    }

    /**
     * @throws WithdrawalException
     */
    private function assertMerchantCanWithdraw(User $merchant): void
    {
        if (blank($merchant->phone)) {
            throw WithdrawalException::missingPhone();
        }

        if (!$merchant->hasVerifiedPhone()) {
            throw WithdrawalException::phoneNotVerified();
        }

        if (!$merchant->isMerchant()) {
            throw WithdrawalException::notMerchant();
        }
    }

    private function hasPendingWithdrawal(int $merchantId): bool
    {
        return Withdrawal::where('merchant_id', $merchantId)
            ->where('status', 'pending')
            ->where('created_at', '>', now()->subMinutes(self::WITHDRAWAL_PENDING_TTL))
            ->exists();
    }

    /* ============================================================
     | OTP internals
     |============================================================ */

    private function generateCode(): string
    {
        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function otpMessage(string $code): string
    {
        return "Your verification code is {$code}. It expires in "
            . self::OTP_TTL_MINUTES
            . " minutes. Do not share it with anyone.";
    }

    private function storeOtp(string $phone, string $code): void
    {
        $ttl = now()->addMinutes(self::OTP_TTL_MINUTES);

        Cache::put($this->otpKey($phone), [
            'code' => $code,
            'created_at' => now()->getTimestamp(),
            'expires_at' => $ttl->getTimestamp(),
        ], $ttl);

        Cache::put($this->attemptsKey($phone), 0, $ttl);
    }

    private function clearOtp(string $phone): void
    {
        Cache::forget($this->otpKey($phone));
        Cache::forget($this->attemptsKey($phone));
        Cache::forget($this->cooldownKey($phone));
    }

    private function startCooldown(string $phone): void
    {
        Cache::put(
            $this->cooldownKey($phone),
            now()->getTimestamp() + self::RESEND_COOLDOWN_SECONDS,
            self::RESEND_COOLDOWN_SECONDS,
        );
    }

    private function cooldownRemaining(string $phone): int
    {
        $expiresAt = Cache::get($this->cooldownKey($phone));

        if (!$expiresAt) {
            return 0;
        }

        return max(0, (int) $expiresAt - now()->getTimestamp());
    }

    private function otpKey(string $phone): string
    {
        return "otp:{$phone}";
    }

    private function attemptsKey(string $phone): string
    {
        return "otp:attempts:{$phone}";
    }

    private function cooldownKey(string $phone): string
    {
        return "otp:cooldown:{$phone}";
    }

    private function hashPhone(string $phone): string
    {
        return hash('sha256', $phone);
    }
}