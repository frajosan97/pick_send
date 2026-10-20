<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/*
 |====================================================================
 | COMBINED MIGRATION — fresh installs only.
 |
 | If you are applying this on top of an older schema (where payments
 | had mpesa_code / amount_paid and mpesa_transactions.payment_id was
 | non-unique), run the backfill + dedupe script FIRST, then migrate.
 | Otherwise the UNIQUE(payment_id) on mpesa_transactions will fail on
 | any payment that currently has more than one transaction attached.
 |====================================================================
 */
return new class extends Migration {
    public function up(): void
    {
        Schema::create('parcels', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_no')->unique();
            $table->string('handover_code', 4)->nullable();

            // sender
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sender_name');
            $table->string('sender_phone');
            $table->enum('handover_mode', ['drop', 'collect', 'out']);
            $table->string('drop_point')->nullable();
            $table->string('pickup_address')->nullable();
            $table->unsignedSmallInteger('parcel_count')->default(1);
            $table->boolean('shared_drop_fee')->default(false);

            // recipient
            $table->foreignId('recipient_id')->nullable()->constrained()->nullOnDelete();
            $table->string('recipient_name');
            $table->string('recipient_phone');
            $table->foreignId('town_id')->constrained()->restrictOnDelete();

            // contents
            $table->string('contents_description');
            $table->decimal('estimated_worth', 12, 2)->default(0);
            $table->enum('kind', ['general', 'electronics']);
            $table->string('weight_code')->nullable();
            $table->decimal('weight_kg', 8, 2)->nullable();
            $table->string('electronic_code')->nullable();
            $table->boolean('needs_packaging')->default(false);

            // money
            $table->unsignedInteger('delivery_fee')->default(0);
            $table->unsignedInteger('pack_fee')->default(0);
            $table->unsignedInteger('drop_off_fee')->default(0);
            $table->unsignedInteger('cod_amount')->default(0);
            $table->unsignedInteger('cod_fee')->default(0);
            $table->enum('payment_option', [
                'prepaid',
                'cod_fee',
                'cod_full',
            ])->default('prepaid');

            // NOTE: amount_due_now and amount_paid are BOTH derived from
            // SUM(payments.amount WHERE status='success'). They are stored
            // here purely so list views don't have to join every time, and
            // MUST be refreshed together by Parcel::markPaidState().
            $table->unsignedInteger('amount_due_now')->default(0);
            $table->unsignedInteger('amount_paid')->default(0);
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('points_earned')->default(0);

            // payment hints (receipt lives on mpesa_transactions)
            $table->string('payer_phone')->nullable();
            $table->timestamp('paid_at')->nullable();

            // status
            $table->enum('status', [
                'draft',
                'booked',
                'awaiting_payment',
                'payment_on_delivery',
                'paid',
                'received',
                'in_transit',
                'at_pickup',
                'collected',
                'returned',
                'cancelled',
            ])->default('draft');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['recipient_phone', 'status']);
            $table->index('status');
            $table->index('sender_phone');
            $table->index('created_at');
        });

        Schema::create('parcel_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parcel_id')->constrained()->cascadeOnDelete();
            $table->string('status');
            $table->string('label');
            $table->text('description')->nullable();
            $table->foreignId('staff_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('location')->nullable();
            $table->timestamp('happened_at');
            $table->timestamps();
            $table->index(['parcel_id', 'happened_at']);
            $table->index(['parcel_id', 'status']); // FIXED: timeline filter
        });

        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // A payment is an audit record. Do not silently detach it from
            // its parcel/user on delete — force-delete should be a
            // deliberate, logged action.
            $table->foreignId('parcel_id')->nullable()->constrained()->restrictOnDelete(); // FIXED
            $table->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();   // FIXED

            $table->enum('type', [
                'delivery',
                'cod',
                'withdrawal',
                'refund',
                'points',
            ]);

            // Real money for this collection event. One payment = one
            // receipt / one cash handover. There is NO amount_paid.
            $table->unsignedInteger('amount')->default(0);

            // How the money physically arrived. `pending` = STK in flight.
            // FIXED: enum so bad values can't be written from code.
            $table->enum('channel', [
                'pending',
                'mpesa',
                'cash',
                'wallet',
                'manual',
            ])->default('pending');

            $table->string('phone')->nullable();
            $table->string('reference')->nullable()->index();
            $table->enum('status', [
                'pending',
                'success',
                'failed',
            ])->default('pending');

            $table->timestamp('confirmed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index(['parcel_id', 'type', 'status']);   // recalculateParcel()
            $table->index(['parcel_id', 'status']);           // "is there a pending STK?"
        });

        Schema::create('mpesa_transactions', function (Blueprint $table) {
            $table->id();

            // One payment <-> at most one M-PESA transaction.
            // NULLs remain distinct, so unlinked (orphan) transactions are
            // still allowed until reconciliation attaches them.
            // FIXED: restrictOnDelete instead of nullOnDelete — receipts of
            // truth must not silently become orphans on payment hard-delete.
            $table->foreignId('payment_id')
                ->nullable()
                ->constrained('payments')
                ->restrictOnDelete();

            $table->string('merchant_request_id')->nullable()->index();
            $table->string('checkout_request_id')->nullable()->unique();
            $table->string('mpesa_receipt_number')->nullable()->unique();

            $table->string('phone', 15)->index();
            $table->unsignedInteger('amount')->default(0);
            $table->string('reference')->nullable();
            $table->string('description')->nullable();

            // FIXED: enum for status & type.
            $table->enum('status', ['pending', 'completed', 'failed'])
                ->default('pending')
                ->index();
            $table->string('result_code')->nullable();
            $table->string('result_desc')->nullable();
            $table->enum('type', ['stk', 'c2b', 'b2c', 'reversal'])
                ->default('stk');

            $table->json('request_payload')->nullable();
            $table->json('callback_payload')->nullable();
            $table->nullableMorphs('payer');

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            // FIXED: split into the two queries that actually run:
            //  - "all tx for a payment"        -> payment_id + created_at
            //  - "is there a pending STK?"     -> payment_id + status
            $table->index(['payment_id', 'created_at']);
            $table->index(['payment_id', 'status']);

            // FIXED: resolvePayment() fallback does reference+phone+amount.
            $table->index(['reference', 'phone', 'amount']);

            // FIXED: the invariant lives here as a first-class statement.
            $table->unique('payment_id');
        });

        /* wallets — unchanged */
        Schema::create('wallets', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('balance')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('wallet_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('wallet_id')->constrained()->cascadeOnDelete();
            $table->string('type');
            $table->bigInteger('amount');
            $table->unsignedBigInteger('balance_after');
            $table->string('reference')->nullable();
            $table->text('note')->nullable();
            $table->timestamps();
            $table->index(['wallet_id', 'created_at']);
        });

        Schema::create('point_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('phone')->index();
            $table->foreignId('parcel_id')->nullable()->constrained()->nullOnDelete();
            $table->integer('points');
            $table->string('reason');
            $table->timestamps();
            $table->index(['phone', 'created_at']);

            // FIXED: prevent double-awarding points for the same parcel
            // and reason. If legitimately needed, drop this and enforce
            // in PricingService with an idempotency key.
            $table->unique(['phone', 'parcel_id', 'reason']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('point_ledgers');
        Schema::dropIfExists('wallet_transactions');
        Schema::dropIfExists('wallets');
        Schema::dropIfExists('mpesa_transactions');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('parcel_events');
        Schema::dropIfExists('parcels');
    }
};