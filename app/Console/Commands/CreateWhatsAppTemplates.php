<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;

class CreateWhatsAppTemplates extends Command
{
    protected $signature = 'whatsapp:create-templates {--list : Only list existing templates}';
    protected $description = 'Create parcel templates in the WhatsApp Business Account';

    protected array $templates = [
        'parcel_booked_v2' => [
            'text'    => 'Hi {{1}}, your parcel {{2}} has been booked. Total: KES {{3}}. Handover no: {{4}}. We will notify you when it is on the way.',
            'samples' => ['Francis Kioko', 'PS261013108', '249.00', '8243'],
        ],
        'parcel_paid_v2' => [
            'text'    => 'Payment received for parcel {{1}}. M-PESA Trans ID: {{2}}. Amount: KES {{3}}. Thank you!',
            'samples' => ['PS261013108', 'SJK4L8P2Q1', '249.00'],
        ],
        'parcel_in_transit_v2' => [
            'text'    => 'Parcel {{1}} is now in transit. We will let you know once it arrives.',
            'samples' => ['PS261013108'],
        ],
        'parcel_delivered_v2' => [
            'text'    => 'Parcel {{1}} has been delivered. Handover no: {{2}}. Thank you for choosing us.',
            'samples' => ['PS261013108', '8243'],
        ],
    ];

    public function handle(): int
    {
        $token  = config('services.whatsapp.token');
        $wabaId = config('services.whatsapp.waba_id');
        $base   = rtrim(config('services.whatsapp.base_url', 'https://graph.facebook.com/v25.0'), '/');

        if (!$token || !$wabaId) {
            $this->error('Missing WHATSAPP_TOKEN or WHATSAPP_MESSAGING_ACCOUNT_ID in .env');
            return self::FAILURE;
        }

        if ($this->option('list')) {
            $response = Http::withToken($token)
                ->get("{$base}/{$wabaId}/message_templates", [
                    'fields' => 'name,status,language,category,rejected_reason',
                    'limit'  => 100,
                ]);

            $rows = collect($response->json('data', []))->map(fn ($t) => [
                $t['name']            ?? '-',
                $t['language']        ?? '-',
                $t['category']        ?? '-',
                $t['status']          ?? '-',
                $t['rejected_reason'] ?? '-',
            ])->all();

            $this->table(['Name', 'Language', 'Category', 'Status', 'Rejected Reason'], $rows);

            return self::SUCCESS;
        }

        foreach ($this->templates as $name => $config) {
            $this->info("▶ Creating {$name}...");

            $response = Http::withToken($token)
                ->post("{$base}/{$wabaId}/message_templates", [
                    'name'             => $name,
                    'language'         => 'en_US',
                    'category'         => 'UTILITY',
                    'parameter_format' => 'positional',
                    'components' => [
                        [
                            'type'    => 'BODY',
                            'text'    => $config['text'],
                            'example' => ['body_text' => [$config['samples']]],
                        ],
                    ],
                ]);

            if ($response->successful()) {
                $this->info("  ✓ Submitted (id: {$response->json('id')}, status: {$response->json('status')})");
            } else {
                $this->error("  ✗ Failed: " . $response->body());
            }
        }

        $this->newLine();
        $this->info('Check status later with: php artisan whatsapp:create-templates --list');

        return self::SUCCESS;
    }
}