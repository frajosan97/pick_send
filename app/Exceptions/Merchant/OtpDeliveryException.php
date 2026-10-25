<?php

namespace App\Exceptions\Merchant;

class OtpDeliveryException extends MerchantException
{
    public string $reason = 'otp_delivery';
    public string $field = 'phone';

    public static function smsFailed(?string $providerError = null): self
    {
        return new self(
            message: 'We could not send your code. Please try again.',
            context: ['provider_error' => $providerError],
        );
    }

    public static function fromThrowable(\Throwable $e): self
    {
        return new self(
            message: 'We could not send your code. Please try again.',
            context: ['exception' => $e::class],
            previous: $e,
        );
    }
}