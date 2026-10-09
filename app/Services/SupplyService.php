<?php

namespace App\Services;

use App\Models\SupplyRequest;

class SupplyService
{
    public function waText(SupplyRequest $s): string
    {
        $s->loadMissing('town');

        return "Hi Pick&Send, please pick something for me in Nairobi.\n\n"
            ."Name: {$s->name}, {$s->phone}\n"
            ."Send to: Pick&Send pickup station, {$s->town->name}\n"
            ."Pick: {$s->what}\n"
            ."From: {$s->pickup_from}".($s->supplier_phone ? ", {$s->supplier_phone}" : '')."\n"
            ."How often: {$s->frequency}";
    }

    public function waHref(SupplyRequest $s): string
    {
        $wa = config('services.pick_and_send.whatsapp');

        return "https://wa.me/{$wa}?text=".urlencode($this->waText($s));
    }
}
