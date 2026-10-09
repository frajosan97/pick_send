<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchant_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('merchant_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('parcel_id')->constrained()->cascadeOnDelete();
            $table->string('customer_name');
            $table->string('customer_phone');
            $table->unsignedInteger('cod_amount')->default(0);
            $table->enum('status', [
                'waiting',
                'moving',
                'done',
                'returned',
            ])->default('waiting');
            $table->timestamps();
            $table->softDeletes();
            $table->unique('parcel_id'); // one order per parcel
            $table->index(['merchant_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchant_orders');
    }
};
