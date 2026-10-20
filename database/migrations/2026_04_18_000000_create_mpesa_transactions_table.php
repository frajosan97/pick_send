<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('mpesa_transactions', function (Blueprint $table) {
            $table->id();
            $table->string('merchant_request_id')->nullable()->index();
            $table->string('checkout_request_id')->nullable()->unique();
            $table->string('mpesa_receipt_number')->nullable()->unique();
            $table->string('phone', 15)->index();
            $table->unsignedInteger('amount');
            $table->string('reference')->nullable();
            $table->string('description')->nullable();
            $table->string('status', 20)->default('pending')->index();   // pending|completed|failed
            $table->string('result_code')->nullable();
            $table->string('result_desc')->nullable();
            $table->string('type', 20)->default('stk');                  // stk|c2b|b2c|reversal
            $table->json('request_payload')->nullable();
            $table->json('callback_payload')->nullable();
            $table->nullableMorphs('payer');
            $table->timestamp('completed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mpesa_transactions');
    }
};
