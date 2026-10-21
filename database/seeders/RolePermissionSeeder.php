<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        // Reset cached roles and permissions
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        /* -------------------------------------------------
         | 1. Define permissions
         ------------------------------------------------- */
        $permissions = [
            // Users
            'users.view',
            'users.create',
            'users.edit',
            'users.delete',

            // Parcels
            'parcels.view',
            'parcels.create',
            'parcels.edit',
            'parcels.delete',
            'parcels.assign',
            'parcels.track',

            // Recipients
            'recipients.view',
            'recipients.create',
            'recipients.edit',
            'recipients.delete',

            // Wallet / payments
            'wallet.view',
            'wallet.topup',
            'wallet.withdraw',
            'payments.view',
            'payments.refund',

            // Points
            'points.view',
            'points.adjust',

            // Supply requests
            'supply-requests.view',
            'supply-requests.create',
            'supply-requests.approve',
            'supply-requests.reject',

            // Merchant orders
            'merchant-orders.view',
            'merchant-orders.create',
            'merchant-orders.fulfill',
            'merchant-orders.cancel',

            // Settings
            'settings.view',
            'settings.edit',

            // Reports
            'reports.view',
            'reports.export',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        /* -------------------------------------------------
         | 2. Define roles and attach permissions
         ------------------------------------------------- */
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $adminRole->syncPermissions(Permission::all());

        $staffRole = Role::firstOrCreate(['name' => 'staff', 'guard_name' => 'web']);
        $staffRole->syncPermissions([
            'parcels.view',
            'parcels.edit',
            'parcels.assign',
            'parcels.track',
            'recipients.view',
            'recipients.edit',
            'wallet.view',
            'points.view',
            'supply-requests.view',
            'merchant-orders.view',
            'merchant-orders.fulfill',
            'reports.view',
        ]);

        $merchantRole = Role::firstOrCreate(['name' => 'merchant', 'guard_name' => 'web']);
        $merchantRole->syncPermissions([
            'parcels.view',
            'parcels.create',
            'parcels.track',
            'recipients.view',
            'recipients.create',
            'recipients.edit',
            'wallet.view',
            'wallet.topup',
            'points.view',
            'supply-requests.view',
            'supply-requests.create',
            'merchant-orders.view',
            'merchant-orders.create',
            'merchant-orders.cancel',
            'reports.view',
        ]);

        $customerRole = Role::firstOrCreate(['name' => 'customer', 'guard_name' => 'web']);
        $customerRole->syncPermissions([
            'parcels.view',
            'parcels.create',
            'parcels.track',
            'recipients.view',
            'recipients.create',
            'recipients.edit',
            'wallet.view',
            'wallet.topup',
            'points.view',
            'supply-requests.view',
            'supply-requests.create',
        ]);
    }
}