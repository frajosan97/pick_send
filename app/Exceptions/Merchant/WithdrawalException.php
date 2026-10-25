<?php

namespace App\Exceptions\Merchant;

class WithdrawalException extends MerchantException
{
    public string $reason = 'withdrawal';
    public string $field = 'withdraw';

    public static function nothingToWithdraw(): self
    {
        return new self('There is nothing to withdraw.');
    }

    public static function alreadyInProgress(): self
    {
        return new self('A withdrawal is already in progress. Please wait.');
    }

    public static function missingPhone(): self
    {
        return new self('Add an M-PESA number to your account first.');
    }

    public static function phoneNotVerified(): self
    {
        return new self('Verify your phone before withdrawing.');
    }

    public static function notMerchant(): self
    {
        return new self('This account is not a merchant.');
    }

    public static function b2cFailed(?string $providerError = null): self
    {
        return new self(
            message: 'Withdrawal could not be completed. Your balance is unchanged.',
            context: ['provider_error' => $providerError],
        );
    }

    public static function b2cException(\Throwable $e): self
    {
        return new self(
            message: 'Withdrawal could not be completed. Your balance is unchanged.',
            context: ['exception' => $e::class],
            previous: $e,
        );
    }

    public static function insufficientBalance(int $balance, int $requested): self
    {
        return new self(
            message: 'Insufficient wallet balance.',
            context: ['balance' => $balance, 'requested' => $requested],
        );
    }
}