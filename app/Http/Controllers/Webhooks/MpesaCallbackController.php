<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

class MpesaCallbackController extends Controller
{
    public function __construct(
        protected PaymentService $payments
    ) {
    }

    /**
     * STK Push callback — Lipa Na M-Pesa.
     * Safaricom expects ResultCode + ResultDesc + HTTP 200.
     * We always ACK; retries only make duplicate work.
     */
    public function stk(Request $request)
    {
        try {
            $payload = $request->all();

            if (empty($payload['Body']['stkCallback'])) {
                Log::warning('M-Pesa STK callback missing Body.stkCallback', $payload);
                return $this->ack();
            }

            DB::transaction(function () use ($payload) {
                $this->payments->handleCallback($payload);
            });
        } catch (\Throwable $e) {
            // Never let Safaricom retry forever on our bug.
            Log::error('M-Pesa STK callback processing failed', [
                'error' => $e->getMessage(),
                'payload' => $request->all(),
            ]);
        }

        return $this->ack();
    }

    /**
     * B2C result — withdrawal succeeded or failed.
     */
    public function b2cResult(Request $request)
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
            Log::error('M-Pesa B2C result handler failed', [
                'error' => $e->getMessage(),
            ]);
        }

        return $this->ack();
    }

    public function b2cTimeout(Request $request)
    {
        Log::warning('M-Pesa B2C timeout', $request->all());
        return $this->ack();
    }

    public function c2bValidation(Request $request)
    {
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted',
        ]);
    }

    public function c2bConfirmation(Request $request)
    {
        Log::info('M-Pesa C2B confirmation', $request->all());
        return $this->ack();
    }

    protected function ack(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted',
        ]);
    }
}