<?php

// database/seeders/GeneralPriceSeeder.php

namespace Database\Seeders;

use App\Models\GeneralPrice;
use Illuminate\Database\Seeder;

class GeneralPriceSeeder extends Seeder
{
    public function run(): void
    {
        // [code, label, price, packaging, pickup_fee, per_kg, sort_order]
        $rows = [
            ['1', 'Up to 1 kg', 199, 30, 50, false, 1],
            ['2', '1 to 2 kg', 249, 50, 50, false, 2],
            ['5', '2 to 5 kg', 349, 80, 50, false, 3],
            ['10', '5 to 10 kg', 449, 100, 100, false, 4],
            ['kg', 'Above 10 kg', 0, 150, 150, true, 5], // price derived from base10 + per_kg
        ];

        foreach ($rows as [$code, $label, $price, $packaging, $pu, $perKg, $order]) {
            GeneralPrice::updateOrCreate(
                ['code' => $code],
                [
                    'label' => $label,
                    'price' => $price,
                    'packaging' => $packaging,
                    'pickup_fee' => $pu,
                    'per_kg' => $perKg,
                    'sort_order' => $order,
                    'is_active' => true,
                ]
            );
        }
    }
}
