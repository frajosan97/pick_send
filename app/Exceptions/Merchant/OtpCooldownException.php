<?php

namespace App\Exceptions\Merchant;

class OtpCooldownException extends MerchantException
{
    public string $reason = 'otp_cooldown';
    public string $field = 'phone';

    public function __construct(public readonly int $retryAfterSeconds)
    {
        parent::__construct(
            message: "Please wait {$retryAfterSeconds}s before requesting another code.",
            context: ['retry_after' => $retryAfterSeconds],
        );
    }
}