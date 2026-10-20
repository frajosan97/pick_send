<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        /*
         |------------------------------------------------------------------
         | payments (parent)
         |------------------------------------------------------------------
         | One parcel -> many payments.
         | A payment is the *intent* to move money (delivery fee, COD, etc.).
         | One payment -> many mpesa_transactions (retries, manual claims).
         */
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            $table->foreignId('parcel_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();

            $table->enum('type', ['delivery', 'cod', 'withdrawal', 'refund', 'points']);
            $table->unsignedInteger('amount');

            // Denormalised "latest/winning" receipt for quick display.
            // Authoritative link is mpesa_transactions.payment_id.
            $table->string('mpesa_code')->nullable()->index();

            $table->string('phone')->nullable();

            // Own correlation id (e.g. parcel tracking_no, withdrawal id).
            $table->string('reference')->nullable()->index();

            $table->enum('status', ['pending', 'success', 'failed'])->default('pending');
            $table->timestamp('confirmed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index(['parcel_id', 'type', 'status']); // recalculateParcel()
        });

        /*
         |------------------------------------------------------------------
         | mpesa_transactions (child of payments)
         |------------------------------------------------------------------
         | One payment -> many transactions (STK retries, C2B confirmations,
         | manual receipt claims, B2C payouts, reversals).
         */
        Schema::create('mpesa_transactions', function (Blueprint $table) {
            $table->id();

            $table->foreignId('payment_id')
                ->nullable()
                ->constrained('payments')
                ->nullOnDelete();

            $table->string('merchant_request_id')->nullable()->index();
            $table->string('checkout_request_id')->nullable()->unique();
            $table->string('mpesa_receipt_number')->nullable()->unique();

            $table->string('phone', 15)->index();
            $table->unsignedInteger('amount');
            $table->string('reference')->nullable();
            $table->string('description')->nullable();

            $table->string('status', 20)->default('pending')->index(); // pending|completed|failed
            $table->string('result_code')->nullable();
            $table->string('result_desc')->nullable();
            $table->string('type', 20)->default('stk');                // stk|c2b|b2c|reversal

            $table->json('request_payload')->nullable();
            $table->json('callback_payload')->nullable();
            $table->nullableMorphs('payer');

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['payment_id', 'created_at']);
        });

        /*
         |------------------------------------------------------------------
         | wallets
         |------------------------------------------------------------------
         */
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('balance')->default(0); // KSh, integer
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('type'); // cod_credit, withdrawal, points_redeem
            $table->bigInteger('amount');                    // signed
            $table->unsignedBigInteger('balance_after');
            $table->string('reference')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['wallet_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
        Schema::dropIfExists('mpesa_transactions'); // child of payments
        Schema::dropIfExists('payments');           // parent
    }
};