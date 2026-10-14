<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\ClientException;
use GuzzleHttp\Exception\RequestException;
use GuzzleHttp\Exception\ServerException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Psr\Http\Message\ResponseInterface;

class WhatsAppService
{
    protected Client $client;
    protected string $apiBaseUrl;
    protected ?string $apiKey;
    protected ?string $phoneNumberId;

    /**
     * Meta requires an EXACT match to the approved template's locale.
     * Never use bare "en" — always "en_US".
     */
    public const DEFAULT_LANG = 'en_US';

    /**
     * Your template names, exactly as approved in the WABA.
     */
    public const TEMPLATE_PARCEL_BOOKED = 'parcel_booked_v2';
    public const TEMPLATE_PARCEL_PAID = 'parcel_paid';
    public const TEMPLATE_PARCEL_IN_TRANSIT = 'parcel_in_transit';
    public const TEMPLATE_PARCEL_DELIVERED = 'parcel_delivered';

    public function __construct()
    {
        $this->apiBaseUrl = rtrim(config('services.whatsapp.base_url', 'https://graph.facebook.com/v25.0'), '/');
        $this->apiKey = config('services.whatsapp.token');
        $this->phoneNumberId = config('services.whatsapp.phone_number_id');

        $this->client = new Client([
            'timeout' => 30,
            'connect_timeout' => 10,
            'verify' => app()->environment('production'),
        ]);
    }

    // -----------------------------------------------------------------
    //  Low-level senders
    // -----------------------------------------------------------------

    /**
     * Free-form text — only valid inside the 24h customer service window.
     */
    public function sendText(string $mobile, string $message): array|bool
    {
        return $this->dispatch($mobile, [
            'messaging_product' => 'whatsapp',
            'to' => formatPhoneNumber($mobile),
            'type' => 'text',
            'text' => ['preview_url' => false, 'body' => $message],
        ]);
    }

    /**
     * Pre-approved template — required outside the 24h window.
     *
     * @param string $template  Exact approved template name in your WABA.
     * @param array  $params    Positional body parameters, in {{1}}, {{2}}, {{3}} order.
     * @param string $lang      Must match the approved locale EXACTLY (default en_US).
     */
    public function sendTemplate(
        string $mobile,
        string $template,
        array $params = [],
        string $lang = self::DEFAULT_LANG
    ): array|bool {
        $components = [];

        if (!empty($params)) {
            $components[] = [
                'type' => 'body',
                'parameters' => array_map(
                    fn($p) => ['type' => 'text', 'text' => (string) $p],
                    $params
                ),
            ];
        }

        return $this->dispatch($mobile, [
            'messaging_product' => 'whatsapp',
            'to' => formatPhoneNumber($mobile),
            'type' => 'template',
            'template' => [
                'name' => $template,
                'language' => ['code' => $lang],
                'components' => $components,
            ],
        ]);
    }

    // -----------------------------------------------------------------
    //  Parcel-specific helpers — call these from your app
    // -----------------------------------------------------------------

    /**
     * parcel_booked body: "Hi {{1}}, your parcel {{2}} has been booked.
     *                      Total: KES {{3}}. Handover code: {{4}}."
     */
    public function sendParcelBooked(
        string $mobile,
        string $customerName,
        string $trackingNo,
        string $total,
        string $handoverCode
    ): array|bool {
        return $this->sendTemplate($mobile, self::TEMPLATE_PARCEL_BOOKED, [
            $customerName,
            $trackingNo,
            $total,
            $handoverCode,
        ]);
    }

    /**
     * parcel_paid body: "Payment received for parcel {{1}}.
     *                    M-PESA: {{2}}. Amount: KES {{3}}."
     */
    public function sendParcelPaid(
        string $mobile,
        string $trackingNo,
        string $mpesaCode,
        string $amount
    ): array|bool {
        return $this->sendTemplate($mobile, self::TEMPLATE_PARCEL_PAID, [
            $trackingNo,
            $mpesaCode,
            $amount,
        ]);
    }

    /**
     * parcel_in_transit body: "Parcel {{1}} is now in transit."
     */
    public function sendParcelInTransit(string $mobile, string $trackingNo): array|bool
    {
        return $this->sendTemplate($mobile, self::TEMPLATE_PARCEL_IN_TRANSIT, [
            $trackingNo,
        ]);
    }

    /**
     * parcel_delivered body: "Parcel {{1}} has been delivered.
     *                         Handover code: {{2}}."
     */
    public function sendParcelDelivered(
        string $mobile,
        string $trackingNo,
        string $handoverCode
    ): array|bool {
        return $this->sendTemplate($mobile, self::TEMPLATE_PARCEL_DELIVERED, [
            $trackingNo,
            $handoverCode,
        ]);
    }

    // -----------------------------------------------------------------
    //  HTTP dispatch
    // -----------------------------------------------------------------

    protected function dispatch(string $mobile, array $payload): array|bool
    {
        $validator = Validator::make(
            ['mobile' => $mobile],
            ['mobile' => ['required', 'string', 'min:9', 'max:20']]
        );

        if ($validator->fails()) {
            throw new ValidationException($validator);
        }

        try {
            $response = $this->client->post(
                "{$this->apiBaseUrl}/{$this->phoneNumberId}/messages",
                [
                    'headers' => [
                        'Authorization' => "Bearer {$this->apiKey}",
                        'Accept' => 'application/json',
                        'Content-Type' => 'application/json',
                    ],
                    'json' => $payload,
                ]
            );

            $body = json_decode($response->getBody()->getContents(), true) ?? [];

            Log::info('WhatsApp message sent', [
                'mobile' => $mobile,
                'type' => $payload['type'] ?? null,
                'template' => $payload['template']['name'] ?? null,
                'message_id' => $body['messages'][0]['id'] ?? null,
            ]);

            return $body;
        } catch (ClientException | ServerException $e) {
            // 4xx / 5xx — response body is available
            $body = $this->extractBody($e);

            Log::error('WhatsApp API rejected the request', [
                'mobile' => $mobile,
                'payload' => $payload,
                'status' => $e->getResponse()?->getStatusCode(),
                'error' => $e->getMessage(),
                'body' => $body,
            ]);

            // Friendly hint for the common template-not-found case
            if ($body && str_contains($body, '132001')) {
                Log::warning(
                    'WhatsApp template name/language mismatch. ' .
                    'Check that the template exists and language is exactly "en_US".',
                    [
                        'template' => $payload['template']['name'] ?? null,
                        'language' => $payload['template']['language']['code'] ?? null,
                    ]
                );
            }

            return false;
        } catch (RequestException $e) {
            // Transport error — no response object exists
            Log::error('WhatsApp transport error', [
                'mobile' => $mobile,
                'error' => $e->getMessage(),
            ]);

            return false;
        }
    }

    protected function extractBody(RequestException $e): ?string
    {
        if (!$e->hasResponse()) {
            return null;
        }

        $response = $e->getResponse();

        if (!$response instanceof ResponseInterface) {
            return null;
        }

        return (string) $response->getBody();
    }
}