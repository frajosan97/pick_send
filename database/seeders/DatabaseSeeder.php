<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RolePermissionSeeder::class,
            UserSeeder::class,
            RouteSeeder::class,
            GeneralPriceSeeder::class,
            ItemSeeder::class,
            PricingConstantSeeder::class,
            FaqSeeder::class,
        ]);
    }
}
