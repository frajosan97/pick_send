<?php

namespace App\Services;

use App\Models\MpesaTransaction;
use Exception;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MpesaService
{
    protected string $baseUrl;
    protected string $shortcode;
    protected string $passkey;
    protected string $key;
    protected string $secret;
    protected string $initiator;
    protected string $initiatorPassword;
    protected string $b2cShortcode;
    protected string $stkCallbackUrl;
    protected string $b2cResultUrl;
    protected string $timeoutUrl;
    protected string $securityCredential;
    protected string $certificatePath;

    public function __construct()
    {
        $this->certificatePath = config('services.mpesa.env') === 'production'
            ? database_path('certs/ProductionCertificate.cer')
            : database_path('certs/SandboxCertificate.cer');

        $this->baseUrl = config('services.mpesa.env') === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';

        $this->shortcode = config('services.mpesa.shortcode');
        $this->passkey = config('services.mpesa.passkey');
        $this->key = config('services.mpesa.consumer_key');
        $this->secret = config('services.mpesa.consumer_secret');
        $this->initiator = config('services.mpesa.initiator_name');
        $this->initiatorPassword = config('services.mpesa.initiator_password');
        $this->b2cShortcode = config('services.mpesa.b2c_shortcode');
        $this->stkCallbackUrl = config('services.mpesa.callback_url');
        $this->b2cResultUrl = config('services.mpesa.result_url');
        $this->timeoutUrl = config('services.mpesa.queue_timeout_url');

        $this->securityCredential = $this->generateCredential($this->initiatorPassword);
    }

    /*
    |--------------------------------------------------------------------------
    | SECURITY CREDENTIAL GENERATION
    |--------------------------------------------------------------------------
    | Encrypts the initiator password using public key from Safaricom certificate
    | for secure B2C transactions (PKCS#1 padding)
    */
    protected function generateCredential(string $initiatorPassword): string
    {
        $cert = file_get_contents($this->certificatePath);
        if (!$cert) {
            throw new Exception("Unable to read certificate file at: {$this->certificatePath}");
        }

        $publicKey = openssl_pkey_get_public($cert);
        if (!$publicKey) {
            throw new Exception("Invalid public key in certificate.");
        }

        $encrypted = '';
        $success = openssl_public_encrypt($initiatorPassword, $encrypted, $publicKey, OPENSSL_PKCS1_PADDING);
        if (!$success) {
            throw new Exception("Failed to encrypt initiator password.");
        }

        openssl_free_key($publicKey);

        return base64_encode($encrypted);
    }

    /*
    |--------------------------------------------------------------------------
    | OAUTH TOKEN GENERATION
    |--------------------------------------------------------------------------
    | Generates OAuth access token using consumer key and secret for API authorization
    */
    public function generateToken(): ?string
    {
        try {
            $credentials = base64_encode($this->key . ':' . $this->secret);

            $response = Http::withHeaders([
                'Authorization' => 'Basic ' . $credentials
            ])->get("$this->baseUrl/oauth/v1/generate?grant_type=client_credentials");

            return $response->successful() ? $response->json()['access_token'] : null;
        } catch (\Throwable $e) {
            Log::error('M-PESA Token Generation Failed: ' . $e->getMessage());
            return null;
        }
    }

    /*
    |--------------------------------------------------------------------------
    | STK PUSH INITIATION
    |--------------------------------------------------------------------------
    | Initiates STK push to customer's phone for deposit payment processing
    */
    public function stkPush(
        $phone,
        float $amount,
        string $reference,
        string $description
    ): array {
        $token = $this->generateToken();

        if (!$token) {
            return [
                'success' => false,
                'message' => 'Failed to generate authentication token'
            ];
        }

        $phone = formatPhoneNumber($phone);
        $timestamp = now()->format('YmdHis');
        $password = base64_encode($this->shortcode . $this->passkey . $timestamp);

        $payload = [
            'BusinessShortCode' => $this->shortcode,
            'Password' => $password,
            'Timestamp' => $timestamp,
            'TransactionType' => 'CustomerPayBillOnline',
            'Amount' => $amount,
            'PartyA' => $phone,
            'PartyB' => $this->shortcode,
            'PhoneNumber' => $phone,
            'CallBackURL' => $this->stkCallbackUrl,
            'AccountReference' => $reference ?? substr($phone, -9),
            'TransactionDesc' => $description ?? 'Pick and Send delivery',
        ];

        $response = Http::withToken($token)
            ->timeout(30)
            ->post($this->baseUrl . '/mpesa/stkpush/v1/processrequest', $payload);

        if ($response->successful()) {
            return [
                'success' => true,
                'message' => 'Transaction initiated successfully',
                'transaction' => $response->json()
            ];
        }

        return [
            'success' => false,
            'message' => 'Error initiating transaction, please try again!'
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | B2C PAYMENT PROCESSING
    |--------------------------------------------------------------------------
    | Processes Business to Customer payment for user withdrawals
    */
    public function processB2C(
        $phone,
        float $amount,
        ?string $transactionId = null
    ): array {
        $token = $this->generateToken();

        if (!$token) {
            return [
                'success' => false,
                'message' => 'Failed to generate authentication token'
            ];
        }

        $payload = [
            'InitiatorName' => $this->initiator,
            'SecurityCredential' => $this->securityCredential,
            'CommandID' => config('mpesa.b2c_command_id', 'BusinessPayment'),
            'Amount' => round($amount, 2),
            'PartyA' => $this->b2cShortcode,
            'PartyB' => formatPhoneNumber($phone),
            'Remarks' => 'B2C - Withdrawal',
            'QueueTimeOutURL' => $this->timeoutUrl,
            'ResultURL' => $this->b2cResultUrl,
            'Occasion' => 'Payout',
        ];

        $response = Http::withToken($token)
            ->timeout(30)
            ->post($this->baseUrl . '/mpesa/b2c/v1/paymentrequest', $payload);

        if ($response->successful()) {
            $responseData = $response->json();

            if ($transactionId) {
                MpesaTransaction::where('transaction_id', $transactionId)
                    ->update([
                        'conversation_id' => $responseData['ConversationID'] ?? null,
                        'originator_conversation_id' => $responseData['OriginatorConversationID'] ?? null,
                        'status' => 'processing',
                    ]);
            }

            return [
                'success' => true,
                'message' => 'B2C initiated successfully',
            ];
        }

        return [
            'success' => false,
            'message' => 'Error initiating B2C, please try again!',
        ];
    }
}