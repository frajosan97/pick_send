<?php

// database/seeders/ItemSeeder.php

namespace Database\Seeders;

use App\Models\Item;
use App\Models\ItemGroup;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ItemSeeder extends Seeder
{
    /** Pickup fee overrides (KSh). Anything not listed defaults to 50. */
    private array $pickupOverrides = [
        '10' => 100,
        'monitor' => 100,
        'desktop' => 100,
        'printer' => 100,
        'soundbar' => 100,
        'theatre' => 100,
        'burner' => 100,
        'dispenser' => 100,
        'microwave' => 100,
        'tv43' => 100,
        'tv50' => 150,
        'tv55' => 150,
        'tv60' => 200,
        'tv65' => 200,
        'tv85' => 300,
        'cook1' => 300,
        'cook2' => 300,
        'cook3' => 400,
        'fr1' => 200,
        'fr2' => 300,
        'fr3' => 400,
        'fr4' => 500,
        'fr5' => 600,
        'wm1' => 300,
        'wm2' => 400,
        'wm3' => 500,
        'wm4' => 600,
        'wm5' => 700,
    ];

    public function run(): void
    {
        $groups = [
            'Phones and computers' => [
                ['acc', 'Decoder, router or small accessory', 399, 50],
                ['phone', 'Mobile phone or tablet', 599, 50],
                ['laptop', 'Laptop', 649, 100],
                ['monitor', 'Computer monitor', 749, 150],
                ['desktop', 'Desktop computer (tower)', 849, 150],
                ['printer', 'Printer', 849, 150],
            ],
            'Televisions' => [
                ['tv43', 'TV 32 to 43 inch', 649, 200],
                ['tv50', 'TV up to 50 inch', 849, 300],
                ['tv55', 'TV up to 55 inch', 1049, 400],
                ['tv60', 'TV up to 60 inch', 1599, 400],
                ['tv65', 'TV up to 65 inch', 1899, 500],
                ['tv85', 'TV up to 85 inch', 3999, 600],
            ],
            'Sound' => [
                ['soundbar', 'Soundbar or speaker', 599, 100],
                ['theatre', 'Home theatre or subwoofer', 999, 200],
            ],
            'Kitchen' => [
                ['small', 'Blender, kettle, iron or similar', 399, 80],
                ['burner', 'Table-top gas cooker', 599, 150],
                ['dispenser', 'Water dispenser', 649, 300],
                ['microwave', 'Microwave', 749, 150],
            ],
            'Standing cookers' => [
                ['cook1', 'Cooker 50 cm by 50 cm', 1599, 500],
                ['cook2', 'Cooker 50 cm by 60 cm', 1899, 500],
                ['cook3', 'Cooker 60 cm by 60 cm', 2899, 600],
            ],
            'Fridges and freezers, by weight' => [
                ['fr1', 'Fridge up to 19 kg', 1299, 400],
                ['fr2', 'Fridge 20 to 32 kg', 1999, 500],
                ['fr3', 'Fridge 33 to 50 kg', 2599, 600],
                ['fr4', 'Fridge 51 to 60 kg', 2999, 700],
                ['fr5', 'Fridge 61 to 80 kg', 3999, 800],
            ],
            'Washing machines, by weight' => [
                ['wm1', 'Washing machine up to 30 kg', 1999, 500],
                ['wm2', 'Washing machine 31 to 50 kg', 2599, 600],
                ['wm3', 'Washing machine 51 to 60 kg', 2999, 700],
                ['wm4', 'Washing machine 61 to 80 kg', 3999, 800],
                ['wm5', 'Washing machine 81 to 100 kg', 4899, 800],
            ],
        ];

        foreach (array_keys($groups) as $order => $groupName) {
            $group = ItemGroup::updateOrCreate(
                ['slug' => Str::slug($groupName)],
                ['name' => $groupName, 'sort_order' => $order, 'is_active' => true]
            );

            foreach ($groups[$groupName] as $i => [$code, $label, $price, $packaging]) {
                Item::updateOrCreate(
                    ['code' => $code],
                    [
                        'item_group_id' => $group->id,
                        'label' => $label,
                        'price' => $price,
                        'packaging' => $packaging,
                        'pickup_fee' => $this->pickupOverrides[$code] ?? 50,
                        'sort_order' => $i,
                        'is_active' => true,
                    ]
                );
            }
        }
    }
}
