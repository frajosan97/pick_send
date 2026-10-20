<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class MpesaCallbackController extends Controller
{
    public function __construct(
        protected PaymentService $payments
    ) {
    }

    /**
     * STK Push callback — Lipa Na M-Pesa.
     */
    public function stk(Request $request): JsonResponse
    {
        try {
            $payload = $request->all();
            Log::channel('mpesa')->info('STK Callback Received', $payload);

            if (empty($payload['Body']['stkCallback'])) {
                Log::warning('M-Pesa STK callback missing Body.stkCallback', $payload);
                return $this->ack();
            }

            // PaymentService::handleCallback owns its own transaction + error handling.
            $this->payments->handleCallback($payload);
        } catch (\Throwable $e) {
            Log::error('M-Pesa STK callback processing failed', [
                'error' => $e->getMessage(),
                'payload' => $request->all(),
            ]);
        }

        return $this->ack();
    }

    /**
     * C2B Validation — Safaricom asks "should I accept this payment?"
     *
     * We accept everything that has a plausible account reference.
     * Rejecting a genuine payment loses money; accepting a bogus one
     * is harmless because the Confirmation is authoritative.
     */
    public function c2bValidation(Request $request): JsonResponse
    {
        Log::channel('mpesa')->info('C2B Validation', $request->all());

        $ref = $request->input('BillRefNumber');
        $msisdn = $request->input('MSISDN');

        if (!is_string($ref) || trim($ref) === '') {
            return response()->json([
                'ResultCode' => 'C2B00016',
                'ResultDesc' => 'Rejected: missing account reference',
            ]);
        }

        if (\App\Support\PhoneNumber::ke($msisdn) === null) {
            return response()->json([
                'ResultCode' => 'C2B00012',
                'ResultDesc' => 'Rejected: invalid MSISDN',
            ]);
        }

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted',
        ]);
    }

    /**
     * C2B Confirmation — the actual money landed. Process it.
     *
     * This is THE handler for direct paybill/till payments with no STK.
     * Must be idempotent: Safaricom retries on non-200 or timeout.
     */
    public function c2bConfirmation(Request $request): JsonResponse
    {
        try {
            $payload = $request->all();
            Log::channel('mpesa')->info('C2B Confirmation', $payload);

            $this->payments->handleC2bConfirmation($payload);
        } catch (\Throwable $e) {
            // Still ACK — Safaricom retrying won't fix our bug, and we've
            // persisted whatever we could. Admin sees the log + orphan rows.
            Log::error('M-Pesa C2B confirmation processing failed', [
                'error' => $e->getMessage(),
                'payload' => $request->all(),
            ]);
        }

        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted',
        ]);
    }

    /**
     * B2C result — withdrawal succeeded or failed.
     */
    public function b2cResult(Request $request): JsonResponse
    {
        try {
            $result = $request->input('Result');
            if ($result) {
                Log::info('M-Pesa B2C result', [
                    'conversation_id' => $result['ConversationID'] ?? null,
                    'result_code' => $result['ResultCode'] ?? null,
                ]);
            }
        } catch (\Throwable $e) {
            Log::error('M-Pesa B2C result handler failed', ['error' => $e->getMessage()]);
        }

        return $this->ack();
    }

    public function b2cTimeout(Request $request): JsonResponse
    {
        Log::warning('M-Pesa B2C timeout', $request->all());
        return $this->ack();
    }

    protected function ack(): JsonResponse
    {
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted',
        ]);
    }
}