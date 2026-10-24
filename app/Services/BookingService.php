<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\ParcelEvent;
use App\Models\Town;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class BookingService
{
    public function __construct(private PricingService $pricing)
    {
    }

    /* =================================================================
     | CREATE
     | ================================================================= */

    public function create(array $data, array $price, ?User $sender = null): Parcel
    {
        return DB::transaction(function () use ($data, $price, $sender) {
            [, $townName] = array_pad(explode('|', $data['rtown']), 2, null);
            $town = Town::where('name', $townName)->firstOrFail();

            $cod = (int) ($data['cod'] ?? 0);

            $parcel = $this->createWithUniqueCodes([
                'sender_id' => $sender?->id,
                'sender_name' => $data['sname'],
                'sender_phone' => formatPhoneNumber($data['sphone']),
                'handover_mode' => $price['mode'],
                'drop_point' => $data['point'] ?? null,
                'pickup_address' => $data['addr'] ?? null,
                'parcel_count' => $price['n'],
                'shared_drop_fee' => !empty($data['same']),
                'recipient_name' => $data['rname'],
                'recipient_phone' => formatPhoneNumber($data['rphone']),
                'town_id' => $town->id,
                'contents_description' => $data['what'],
                'estimated_worth' => (int) $data['worth'],
                'kind' => $data['kind'] === 'e' ? 'electronics' : 'general',
                'weight_code' => $data['size'] ?? null,
                'weight_kg' => $data['kg'] ?? null,
                'electronic_code' => $data['item'] ?? null,
                'needs_packaging' => !empty($data['pack']),
                'delivery_fee' => $price['base'],
                'pack_fee' => $price['pack'],
                'drop_off_fee' => $price['mode'] === 'out' ? $price['coll'] : 0,
                'cod_amount' => $cod,
                'cod_fee' => (int) round(
                    $cod * $this->pricing->buildConfig()['constants']['codFeeRate']
                ),
                'total' => $price['total'],
                'points_earned' => 0, // awarded by PointsService when paid
                'payer_phone' => formatPhoneNumber($data['paynum'] ?? null),
                // tracking_no & handover_code are injected by createWithUniqueCodes()
            ]);

            ParcelEvent::create([
                'parcel_id' => $parcel->id,
                'status' => 'booked',
                'label' => 'Booked',
                'description' => 'Booked by ' . $data['sname'] . ' via web',
                'happened_at' => now(),
            ]);

            return $parcel;
        });
    }

    /* =================================================================
     | UNIQUE CODE GENERATION
     | ================================================================= */

    private function createWithUniqueCodes(array $attributes): Parcel
    {
        $attempts = 0;
        $maxAttempts = 5;

        while (true) {
            $attempts++;

            try {
                return Parcel::create(array_merge($attributes, [
                    'tracking_no' => $this->generateTrackingNo(),
                    'handover_code' => $this->generateHandoverCode(),
                ]));
            } catch (QueryException $e) {
                if (!$this->isDuplicateEntry($e) || $attempts >= $maxAttempts) {
                    throw $e;
                }

                Log::warning('Parcel code collision, retrying', [
                    'attempt' => $attempts,
                    'message' => $e->getMessage(),
                ]);
            }
        }
    }

    private function isDuplicateEntry(QueryException $e): bool
    {
        // MySQL: 1062, PostgreSQL: 23505, SQLite: 19
        return in_array($e->errorInfo[1] ?? null, [1062, 23505, 19], true)
            || str_contains($e->getMessage(), 'Duplicate entry');
    }

    private function generateTrackingNo(): string
    {
        return sprintf(
            'PS%s%05d',
            now()->format('ymd'),
            random_int(0, 99999),
        );
    }

    private function generateHandoverCode(): string
    {
        for ($i = 0; $i < 10; $i++) {
            $code = str_pad((string) random_int(0, 9999), 4, '0', STR_PAD_LEFT);

            if (!$this->handoverCodeTaken($code)) {
                return $code;
            }
        }

        return str_pad((string) random_int(0, 999999), 6, '0', STR_PAD_LEFT);
    }

    private function handoverCodeTaken(string $code): bool
    {
        return Parcel::query()
            ->where('handover_code', $code)
            ->whereIn('status', [
                Parcel::STATUS_DRAFT,
                Parcel::STATUS_BOOKED,
                Parcel::STATUS_AWAITING_PAYMENT,
                Parcel::STATUS_PAYMENT_ON_DELIVERY,
                Parcel::STATUS_PAID,
                Parcel::STATUS_RECEIVED,
                Parcel::STATUS_IN_TRANSIT,
                Parcel::STATUS_AT_PICKUP,
            ])
            ->exists();
    }

    /* =================================================================
     | SUMMARY / RECEIPT
     | ================================================================= */

    public function summary(Parcel $parcel): array
    {
        return [
            'tracking_no' => $parcel->tracking_no,
            'handover_code' => $parcel->handover_code,
            'total' => (int) $parcel->total,
            'status' => $parcel->status,
            'payment_option' => $parcel->payment_option,
            'payer_phone' => $parcel->payer_phone,

            'recipient_name' => $parcel->recipient_name,
            'recipient_phone' => $parcel->recipient_phone,
            'recipient_town' => $parcel->town?->name ?? '',

            'is_paid' => $parcel->isPaid(),
            'is_cod' => $parcel->isCod(),
            'balance_due' => $parcel->balanceDue(),
        ];
    }

    public function receiptRows(Parcel $parcel): array
    {
        return [
            ['From', $parcel->sender_name . ', ' . $parcel->sender_phone],
            [
                'Handover',
                $parcel->handover_mode === 'collect'
                ? 'Picked up from ' . $parcel->pickup_address . ' (CBD)'
                : 'Brought to ' . $parcel->drop_point,
            ],
            ['Delivery', $this->fmt($parcel->delivery_fee)],
            ['To', $parcel->recipient_name . ', ' . $parcel->recipient_phone],
            ['Collect at', 'Pick&Send pickup station, ' . $parcel->town->name],
            ['Parcel', $parcel->contents_description],
            [
                'Packaging',
                $parcel->pack_fee > 0
                ? 'Packed, ' . $this->fmt($parcel->pack_fee)
                : 'Not needed',
            ],
            [
                'Cash on Delivery',
                $parcel->cod_amount > 0
                ? $this->fmt($parcel->cod_amount) . ' to pay at collection'
                : 'None',
            ],
            ['Total', $this->fmt($parcel->total)],
            ['Tracking number', $parcel->tracking_no],
            ['Handover code', $parcel->handover_code],
            ['Points earned', (string) $parcel->points_earned],
        ];
    }

    public function receiptText(Parcel $parcel): string
    {
        $lines = collect($this->receiptRows($parcel))
            ->map(fn($r) => $r[0] . ': ' . $r[1])
            ->implode("\n");

        return "PICK&SEND RECEIPT\n" . $lines
            . "\n\nThe recipient gets an SMS code when the parcel is ready to collect.\nQuestions: call 0718 819 413";
    }

    public function who(Parcel $parcel): array
    {
        if ($parcel->handover_mode === 'collect') {
            return [
                'Who is coming to collect',
                'Rider Kevin M.',
                'Staff ID PS-R014',
                'Hand your parcel only to this rider.',
            ];
        }

        return [
            'Who receives your parcel',
            'Agent Mary W.',
            'Agent ID PS-A007',
            'Hand only to this agent at the counter.',
        ];
    }

    private function fmt(int|float $n): string
    {
        return 'KSh ' . number_format(round($n));
    }
}