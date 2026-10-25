<?php

// database/migrations/xxxx_create_merchant_orders_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('merchant_orders', function (Blueprint $table) {
            $table->id();

            $table->foreignId('merchant_id')
                ->constrained('users')
                ->cascadeOnDelete();

            $table->foreignId('parcel_id')
                ->constrained('parcels')
                ->cascadeOnDelete();

            $table->timestamps();
            $table->softDeletes();

            // One parcel belongs to one merchant's ledger, once.
            $table->unique(['merchant_id', 'parcel_id']);
            $table->index(['merchant_id', 'created_at']);
            $table->index('parcel_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_orders');
    }
};