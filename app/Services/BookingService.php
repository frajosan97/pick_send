<?php

namespace App\Services;

use App\Models\Parcel;
use App\Models\ParcelEvent;
use App\Models\Payment;
use App\Models\Town;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class BookingService
{
    public function __construct(private PricingService $pricing) {}

    public function create(array $data, array $price, ?User $sender = null): Parcel
    {
        return DB::transaction(function () use ($data, $price, $sender) {
            [$routeSlug, $townName] = array_pad(explode('|', $data['rtown']), 2, null);
            $town = Town::where('name', $townName)->firstOrFail();

            $parcel = Parcel::create([
                'sender_id' => $sender?->id,
                'sender_name' => $data['sname'],
                'sender_phone' => $this->normPhone($data['sphone']),
                'handover_mode' => $price['mode'],
                'drop_point' => $data['point'] ?? null,
                'pickup_address' => $data['addr'] ?? null,
                'parcel_count' => $price['n'],
                'shared_drop_fee' => ! empty($data['same']),
                'recipient_name' => $data['rname'],
                'recipient_phone' => $this->normPhone($data['rphone']),
                'town_id' => $town->id,
                'contents_description' => $data['what'],
                'estimated_worth' => (int) $data['worth'],
                'kind' => $data['kind'] === 'e' ? 'electronics' : 'general',
                'weight_code' => $data['size'] ?? null,
                'weight_kg' => $data['kg'] ?? null,
                'electronic_code' => $data['item'] ?? null,
                'needs_packaging' => ! empty($data['pack']),
                'delivery_fee' => $price['base'],
                'pack_fee' => $price['pack'],
                'drop_off_fee' => $price['mode'] === 'out' ? $price['coll'] : 0,
                'cod_amount' => (int) ($data['cod'] ?? 0),
                'cod_fee' => (int) round(((int) ($data['cod'] ?? 0)) * $this->pricing->buildConfig()['constants']['codFeeRate']),
                'total' => $price['total'],
                'points_earned' => $price['points'],
                'payer_phone' => $this->normPhone($data['paynum']),
                'status' => 'awaiting_payment',
            ]);

            ParcelEvent::create([
                'parcel_id' => $parcel->id,
                'status' => 'booked',
                'label' => 'Booked and awaiting payment',
                'description' => 'Booked by '.$data['sname'].' via web',
                'happened_at' => now(),
            ]);

            Payment::create([
                'parcel_id' => $parcel->id,
                'user_id' => $sender?->id,
                'type' => 'delivery',
                'amount' => $parcel->total,
                'phone' => $this->normPhone($data['paynum']),
                'status' => 'pending',
            ]);

            return $parcel;
        });
    }

    private function normPhone(string $p): string
    {
        $s = preg_replace('/\D/', '', $p);

        return str_starts_with($s, '0') ? '254'.substr($s, 1) : $s;
    }

    /* -------- Receipt / WhatsApp payload builders (mirror frontend) -------- */

    public function receiptRows(Parcel $parcel): array
    {
        return [
            ['From', $parcel->sender_name.', '.$parcel->sender_phone],
            [
                'Handover',
                $parcel->handover_mode === 'collect'
                ? 'Picked up from '.$parcel->pickup_address.' (CBD)'
                : 'Brought to '.$parcel->drop_point,
            ],
            ['Delivery', $this->fmt($parcel->delivery_fee)],
            ['To', $parcel->recipient_name.', '.$parcel->recipient_phone],
            ['Collect at', 'Pick&Send pickup station, '.$parcel->town->name],
            ['Parcel', $parcel->contents_description],
            // ['Estimated worth', $this->fmt($parcel->estimated_worth)],
            ['Packaging', $parcel->pack_fee > 0 ? 'Packed, '.$this->fmt($parcel->pack_fee) : 'Not needed'],
            ['Cash on Delivery', $parcel->cod_amount > 0 ? $this->fmt($parcel->cod_amount).' to pay at collection' : 'None'],
            ['Total', $this->fmt($parcel->total)],
            ['Tracking number', $parcel->tracking_no],
            ['Handover code', $parcel->handover_code],
            ['Points earned', (string) $parcel->points_earned],
        ];
    }

    public function receiptText(Parcel $parcel): string
    {
        $lines = collect($this->receiptRows($parcel))
            ->map(fn ($r) => $r[0].': '.$r[1])->implode("\n");

        return "PICK&SEND RECEIPT\n".$lines
            ."\n\nThe recipient gets an SMS code when the parcel is ready to collect.\nQuestions: call or WhatsApp 0718 819 413";
    }

    public function receiptHref(Parcel $parcel): string
    {
        return 'https://wa.me/?text='.urlencode($this->receiptText($parcel));
    }

    public function bookingHref(Parcel $parcel): string
    {
        $wa = config('services.pick_and_send.whatsapp');

        return "https://wa.me/{$wa}?text=".urlencode($this->receiptText($parcel));
    }

    public function custHref(Parcel $parcel): string
    {
        if ($parcel->payer_phone === $parcel->sender_phone) {
            return '';
        }
        $msg = "Hi, {$parcel->sender_name} is sending a parcel with Pick&Send to {$parcel->town->name} for {$parcel->recipient_name}.\n\n"
            .'Please pay '.$this->fmt($parcel->total).': M-PESA, Lipa na M-PESA, Buy Goods, Till [TILL NO.].';

        return "https://wa.me/{$parcel->payer_phone}?text=".urlencode($msg);
    }

    public function who(Parcel $parcel): array
    {
        if ($parcel->handover_mode === 'collect') {
            return ['Who is coming to collect', 'Rider Kevin M.', 'Staff ID PS-R014', 'Hand your parcel only to this rider.'];
        }

        return ['Who receives your parcel', 'Agent Mary W.', 'Agent ID PS-A007', 'Hand only to this agent at the counter.'];
    }

    private function fmt(int|float $n): string
    {
        return 'KSh '.number_format(round($n));
    }
}
