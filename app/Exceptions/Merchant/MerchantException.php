<?php

namespace App\Exceptions\Merchant;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use RuntimeException;

abstract class MerchantException extends RuntimeException
{
    /**
     * A short, machine-readable reason for this exception.
     * Used by the controller and by API clients to branch without
     * sniffing the message string.
     */
    public string $reason = 'merchant_error';

    /**
     * Extra structured data (e.g. retry_after, withdrawal_id).
     * Never contains secrets; safe to log and to serialize.
     *
     * @var array<string, mixed>
     */
    public array $context = [];

    /**
     * The form field this error should attach to, so the controller
     * can do `withErrors([$e->field => $e->getMessage()])` generically.
     */
    public string $field = 'merchant';

    public function __construct(
        string $message = '',
        array $context = [],
        ?\Throwable $previous = null,
    ) {
        parent::__construct($message, 0, $previous);
        $this->context = $context;
    }

    /**
     * Fallback renderer — used only if the exception escapes the
     * controller (jobs, commands, unexpected paths). Controllers
     * still catch these and return their own flash/redirect.
     */
    public function render(Request $request): JsonResponse|RedirectResponse
    {
        if ($request->expectsJson()) {
            return response()->json([
                'message' => $this->getMessage(),
                'reason' => $this->reason,
                'context' => $this->context,
            ], 422);
        }

        return back()
            ->withInput()
            ->withErrors([$this->field => $this->getMessage()]);
    }
}