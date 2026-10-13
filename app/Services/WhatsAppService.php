<?php

namespace App\Services;

use GuzzleHttp\Client;
use GuzzleHttp\Exception\RequestException;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class WhatsAppService
{
    protected Client $client;
    protected string $apiBaseUrl;
    protected ?string $apiKey;
    protected ?string $phoneNumberId;

    public function __construct()
    {
        $this->apiBaseUrl = rtrim(config('services.whatsapp.base_url', 'https://graph.facebook.com/v20.0'), '/');
        $this->apiKey = config('services.whatsapp.token');
        $this->phoneNumberId = config('services.whatsapp.phone_number_id');

        $this->client = new Client([
            'timeout' => 30,
            'connect_timeout' => 10,
            'verify' => app()->environment('production'),
        ]);
    }

    /**
     * Send a free-form text message (only valid inside 24h customer service window).
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
     * Send a pre-approved template message (required outside 24h window).
     */
    public function sendTemplate(string $mobile, string $template, array $params = [], string $lang = 'en'): array|bool
    {
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

            return json_decode($response->getBody()->getContents(), true) ?? [];
        } catch (RequestException $e) {
            Log::error('WhatsApp send failed', [
                'mobile' => $mobile,
                'payload' => $payload,
                'error' => $e->getMessage(),
                // 'body' => $e->hasResponse() ? (string) $e->getResponse()->getBody() : null,
            ]);

            return false;
        }
    }
}