<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $email = env('ADMIN_EMAIL', 'admin@picksend.co.ke');
        $password = env('ADMIN_PASSWORD', 'Admin@12345');

        $admin = User::firstOrCreate(
            ['email' => $email],
            [
                'name' => 'System Administrator',
                'phone' => env('ADMIN_PHONE', '+254700000000'),
                'business_name' => 'Pick & Send HQ',
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        // Assign role (must exist — RolePermissionSeeder must run first)
        $admin->syncRoles(['admin']);

        // Ensure wallet exists
        $admin->walletOrCreate();
    }
}