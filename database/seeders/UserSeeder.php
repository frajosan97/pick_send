<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

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
                'type' => 'admin',
                'business_name' => 'Pick & Send HQ',
                'password' => Hash::make($password),
                'email_verified_at' => now(),
            ]
        );

        // Ensure an admin wallet exists (balance 0)
        $admin->walletOrCreate();

        $this->command->info("✅ Admin user ready: {$admin->email}");
        $this->command->warn("   Password: {$password}  (change this after first login!)");
    }
}