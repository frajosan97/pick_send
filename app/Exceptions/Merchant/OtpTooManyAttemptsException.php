<?php

namespace App\Exceptions\Merchant;

class OtpTooManyAttemptsException extends MerchantException
{
    public string $reason = 'otp_too_many';
    public string $field = 'code';

    public function __construct()
    {
        parent::__construct('Too many attempts. Request a new code.');
    }
}