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
 |====================================================================
 */
return new class extends Migration {
    public function up(): void
    {
        /* ============================================================
         | parcels
         |============================================================ */
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
            $table->enum('payment_option', ['prepaid', 'cod_fee', 'cod_full'])->default('prepaid');

            $table->unsignedInteger('amount_due_now')->default(0);
            $table->unsignedInteger('amount_paid')->default(0);
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('points_earned')->default(0);

            $table->string('payer_phone')->nullable();
            $table->timestamp('paid_at')->nullable();

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

        /* ============================================================
         | parcel_events
         |============================================================ */
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
            $table->index(['parcel_id', 'status']);
        });

        /* ============================================================
         | supply_requests
         |
         |  - quoted_amount / quoted_at : admin-entered price after pickup
         |  - parent_id / scheduled_for / recurring : daily/weekly/monthly
         |    series. A "master" row has parent_id = NULL and
         |    recurring = true. Each generated occurrence has
         |    parent_id = master.id, recurring = false, and its own
         |    scheduled_for date. Statuses flow independently.
         |============================================================ */
        Schema::create('supply_requests', function (Blueprint $table) {
            $table->id();

            // Recurring series link
            $table->foreignId('parent_id')->nullable()
                ->constrained('supply_requests')->nullOnDelete();
            $table->date('scheduled_for')->nullable();
            $table->boolean('recurring')->default(false);

            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone')->index();
            $table->foreignId('town_id')->constrained()->restrictOnDelete();
            $table->text('what');
            $table->text('pickup_from');
            $table->string('supplier_phone')->nullable();

            $table->enum('frequency', ['once', 'daily', 'weekly', 'monthly'])->default('once');

            // Quote fields — filled by admin after pickup
            $table->unsignedInteger('quoted_amount')->nullable();
            $table->timestamp('quoted_at')->nullable();

            $table->enum('status', [
                'pending',
                'confirmed',
                'awaiting_payment',
                'in_progress',
                'done',
                'cancelled',
            ])->default('pending');

            $table->timestamps();
            $table->softDeletes();

            $table->index(['status', 'scheduled_for']);
            $table->index('user_id');
            $table->index('frequency');

            // One occurrence per (master, date). Prevents double-clones if
            // the scheduler runs twice.
            $table->unique(['parent_id', 'scheduled_for']);
        });

        /* ============================================================
         | payments
         |
         | A payment belongs to exactly one payable — either a parcel or
         | a supply request (and, later, anything else you attach).
         | parcel_id is kept for legacy queries and admin dashboards but
         | is null for supply payments. Every payment sets BOTH
         | payable_id + payable_type (polymorphic) and, when the target
         | is a parcel, also populates parcel_id for back-compat.
         |============================================================ */
        Schema::create('payments', function (Blueprint $table) {
            $table->id();

            // Legacy + fast-path parcel link. Null for supply payments.
            $table->foreignId('parcel_id')->nullable()->constrained()->restrictOnDelete();

            // Polymorphic payable — supports parcels, supplies, and
            // future payable types without schema changes.
            $table->nullableMorphs('payable');

            $table->foreignId('user_id')->nullable()->constrained()->restrictOnDelete();

            $table->enum('type', [
                'delivery',
                'cod',
                'withdrawal',
                'refund',
                'points',
                'supply',          // NEW — supply request payment
            ]);

            $table->unsignedInteger('amount')->default(0);

            $table->enum('channel', [
                'pending',
                'mpesa',
                'cash',
                'wallet',
                'manual',
            ])->default('pending');

            $table->string('phone')->nullable();
            $table->string('reference')->nullable()->index();

            $table->enum('status', ['pending', 'success', 'failed'])->default('pending');

            $table->timestamp('confirmed_at')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index(['parcel_id', 'type', 'status']);
            $table->index(['parcel_id', 'status']);
            // polymorphic index is created automatically by nullableMorphs
        });

        /* ============================================================
         | mpesa_transactions
         |============================================================ */
        Schema::create('mpesa_transactions', function (Blueprint $table) {
            $table->id();

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

            $table->enum('status', ['pending', 'completed', 'failed'])->default('pending')->index();
            $table->string('result_code')->nullable();
            $table->string('result_desc')->nullable();
            $table->enum('type', ['stk', 'c2b', 'b2c', 'reversal'])->default('stk');

            $table->json('request_payload')->nullable();
            $table->json('callback_payload')->nullable();
            $table->nullableMorphs('payer');

            $table->timestamp('completed_at')->nullable();
            $table->timestamps();

            $table->index(['payment_id', 'created_at']);
            $table->index(['payment_id', 'status']);
            $table->index(['reference', 'phone', 'amount']);

            $table->unique('payment_id');
        });

        /* ============================================================
         | wallets, wallet_transactions, point_ledgers — unchanged
         |============================================================ */
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
        Schema::dropIfExists('supply_requests');
        Schema::dropIfExists('parcel_events');
        Schema::dropIfExists('parcels');
    }
};