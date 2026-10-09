<?php

// database/seeders/RouteSeeder.php

namespace Database\Seeders;

use App\Models\Route;
use App\Models\Town;
use Illuminate\Database\Seeder;

class RouteSeeder extends Seeder
{
    public function run(): void
    {
        /* -------------------------------------------------
         | 1. Delivery routes (upcountry towns)
         * -------------------------------------------------*/
        $routes = [
            'coast' => [
                'name' => 'Mombasa route',
                'towns' => ['Mtito Andei', 'Voi', 'Mariakani', 'Mombasa'],
            ],
            'mount' => [
                'name' => 'Mt Kenya loop',
                'towns' => [
                    "Murang'a",
                    'Sagana',
                    'Kerugoya',
                    'Karatina',
                    'Nyeri',
                    'Nanyuki',
                    'Isiolo',
                    'Meru',
                    'Chuka',
                    'Embu',
                ],
            ],
            'rift' => [
                'name' => 'North Rift',
                'towns' => ['Naivasha', 'Nakuru', 'Eldoret', 'Kitale'],
            ],
            'lake' => [
                'name' => 'Kisumu route',
                'towns' => ['Kericho', 'Kisumu'],
            ],
        ];

        foreach ($routes as $slug => $data) {
            $route = Route::updateOrCreate(
                ['slug' => $slug],
                ['name' => $data['name'], 'is_active' => true]
            );

            foreach ($data['towns'] as $i => $town) {
                Town::updateOrCreate(
                    ['route_id' => $route->id, 'name' => $town],
                    [
                        'is_satellite' => false,
                        'satellite_fee' => 0,
                        'sort_order' => $i,
                        'is_active' => true,
                    ]
                );
            }
        }

        /* -------------------------------------------------
         | 2. Nairobi satellites (same table, flagged)
         * -------------------------------------------------*/
        $nairobi = Route::updateOrCreate(
            ['slug' => 'nairobi'],
            ['name' => 'Nairobi', 'is_active' => true]
        );

        $satellites = [
            // name => drop-off fee (KSh)
            'Kahawa West' => 100,
            'Kikuyu' => 100,
            'Kitengela' => 100,
            'Ruai' => 100,
            'Ruiru' => 100,
            'Thika' => 100,
        ];

        foreach ($satellites as $name => $fee) {
            Town::updateOrCreate(
                ['route_id' => $nairobi->id, 'name' => $name],
                [
                    'is_satellite' => true,
                    'satellite_fee' => $fee,
                    'sort_order' => 0,
                    'is_active' => true,
                ]
            );
        }
    }
}
