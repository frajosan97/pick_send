<?php

namespace App\Exceptions\Merchant;

class OtpInvalidException extends MerchantException
{
    public string $reason = 'otp_invalid';
    public string $field = 'code';

    public static function expired(): self
    {
        return new self('Your code has expired. Request a new one.');
    }

    public static function wrong(): self
    {
        return new self('Wrong or expired code.');
    }

    public static function missing(): self
    {
        return new self('Your code has expired. Request a new one.');
    }
}