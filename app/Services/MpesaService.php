<?php

namespace App\Services;

use App\Models\User;
use FelixMuhoro\Mpesa\Facades\Mpesa;
use FelixMuhoro\Mpesa\Exceptions\MpesaException;
use Illuminate\Support\Facades\Log;

class MpesaService
{
    /**
     * 发起 STK Push（Lipa Na M-Pesa）
     * 返回 checkoutRequestId 用于后续回调对账
     */
    public function stkPush(
        string $phone,
        int $amount,
        string $reference,
        string $description = ''
    ): array {
        try {
            $response = Mpesa::stkPush(
                phone: $phone,
                amount: $amount,
                reference: $reference,
                description: $description ?: 'Payment'
            );

            if (!$response->accepted()) {
                return [
                    'success' => false,
                    'error' => $response->errorMessage ?? 'STK Push was not accepted',
                ];
            }

            return [
                'success' => true,
                'checkout_request_id' => $response->checkoutRequestId,
                'merchant_request_id' => $response->merchantRequestId,
                'customer_message' => $response->customerMessage,
            ];
        } catch (MpesaException $e) {
            Log::error('M-Pesa STK Push failed', [
                'phone' => $phone,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * 发起 B2C 提现（用于 MerchantService::withdraw）
     */
    public function b2c(
        string $phone,
        int $amount,
        string $remarks = 'Withdrawal'
    ): array {
        try {
            $response = Mpesa::b2c(
                phone: $phone,
                amount: $amount,
                remarks: $remarks,
                occasion: 'Withdrawal'
            );

            return [
                'success' => $response->accepted(),
                'conversation_id' => $response->conversationId,
                'originator_conversation_id' => $response->originatorConversationId,
            ];
        } catch (MpesaException $e) {
            Log::error('M-Pesa B2C failed', [
                'phone' => $phone,
                'amount' => $amount,
                'error' => $e->getMessage(),
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }
}