<?php

// database/seeders/PricingConstantSeeder.php

namespace Database\Seeders;

use App\Models\PricingConstant;
use Illuminate\Database\Seeder;

class PricingConstantSeeder extends Seeder
{
    public function run(): void
    {
        $constants = [
            ['key' => 'base10', 'value' => 449, 'description' => 'Base price for the first 10 kg'],
            ['key' => 'per_kg', 'value' => 20, 'description' => 'KSh per extra kg above 10 kg'],
            ['key' => 'max_kg', 'value' => 50, 'description' => 'Maximum general parcel weight'],
            ['key' => 'cod_fee_rate', 'value' => 0.016, 'description' => 'Cash on Delivery fee rate (1.6%)'],
            ['key' => 'points_rate', 'value' => 0.02, 'description' => 'Points earned per KSh spent (2%)'],
            ['key' => 'points_value', 'value' => 1, 'description' => 'KSh value of one point'],
            ['key' => 'points_min', 'value' => 100, 'description' => 'Minimum points required to redeem'],
            ['key' => 'return_days', 'value' => 7, 'description' => 'Days before an uncollected parcel returns'],
            ['key' => 'drop_off_fee', 'value' => 100, 'description' => 'Satellite agent drop-off fee (per day)'],
        ];

        foreach ($constants as $row) {
            PricingConstant::updateOrCreate(['key' => $row['key']], $row);
        }
    }
}
