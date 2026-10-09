<?php

namespace App\Http\Controllers\Webhooks;

use App\Http\Controllers\Controller;
use App\Models\Parcel;
use App\Models\Payment;
use App\Services\PaymentService;
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
     * Safaricom expects a JSON body with ResultCode + ResultDesc, and a 200 status.
     */
    public function stk(Request $request)
    {
        $data = $request->input('Body.stkCallback');

        if (!$data) {
            Log::warning('M-Pesa STK callback missing Body.stkCallback', $request->all());
            return $this->ack();
        }

        $checkoutRequestId = $data['CheckoutRequestID'] ?? null;
        $resultCode = $data['ResultCode'] ?? null;
        $resultDesc = $data['ResultDesc'] ?? null;

        // Find the pending payment created when we initiated the STK push
        $payment = Payment::where('checkout_request_id', $checkoutRequestId)->first();

        if (!$payment) {
            Log::warning('M-Pesa STK callback for unknown CheckoutRequestID', [
                'checkout_request_id' => $checkoutRequestId,
            ]);
            return $this->ack();
        }

        if ($resultCode === 0) {
            // Success — extract the receipt from CallbackMetadata
            $meta = collect($data['CallbackMetadata']['Item'] ?? []);
            $receipt = $meta->firstWhere('Name', 'MpesaReceiptNumber')['Value'] ?? null;
            $amount = $meta->firstWhere('Name', 'Amount')['Value'] ?? null;

            $this->payments->recordStkSuccess($payment, $receipt, $amount);
        } else {
            $this->payments->recordStkFailure($payment, $resultDesc);
        }

        return $this->ack();
    }

    /**
     * B2C result — withdrawal succeeded or failed.
     */
    public function b2cResult(Request $request)
    {
        $result = $request->input('Result');

        if (!$result) {
            return $this->ack();
        }

        $conversationId = $result['ConversationID'] ?? null;
        $resultCode = $result['ResultCode'] ?? null;

        // Look up the withdrawal by conversation_id (stored when we initiated B2C)
        // $this->payments->recordB2CResult($conversationId, $resultCode, $result);

        Log::info('M-Pesa B2C result', [
            'conversation_id' => $conversationId,
            'result_code' => $resultCode,
        ]);

        return $this->ack();
    }

    public function b2cTimeout(Request $request)
    {
        Log::warning('M-Pesa B2C timeout', $request->all());
        return $this->ack();
    }

    public function c2bValidation(Request $request)
    {
        // Return Accept/Reject to Safaricom. For most apps, always accept
        // (validation is for cases like validating account numbers).
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted',
        ]);
    }

    public function c2bConfirmation(Request $request)
    {
        // Customer paid via Paybill/Till outside of STK Push.
        // Save and reconcile here.
        Log::info('M-Pesa C2B confirmation', $request->all());
        return $this->ack();
    }

    /**
     * Standard ack — Safaricom expects this shape.
     */
    protected function ack(): \Illuminate\Http\JsonResponse
    {
        return response()->json([
            'ResultCode' => 0,
            'ResultDesc' => 'Accepted',
        ]);
    }
}