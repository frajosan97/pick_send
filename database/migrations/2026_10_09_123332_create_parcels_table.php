<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parcels', function (Blueprint $table) {
            $table->id();
            $table->string('tracking_no')->unique();       // PS27010873
            $table->string('handover_code', 4)->nullable(); // 4-digit pickup code

            // sender
            $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('sender_name');
            $table->string('sender_phone');
            $table->enum('handover_mode', ['drop', 'collect', 'out']);
            $table->string('drop_point')->nullable();
            $table->string('pickup_address')->nullable();
            $table->unsignedSmallInteger('parcel_count')->default(1); // for "how many today"
            $table->boolean('shared_drop_fee')->default(false);       // already paid today

            // recipient
            $table->foreignId('recipient_id')->nullable()->constrained()->nullOnDelete();
            $table->string('recipient_name');
            $table->string('recipient_phone');
            $table->foreignId('town_id')->constrained()->restrictOnDelete();

            // contents
            $table->string('contents_description');
            $table->decimal('estimated_worth', 12, 2)->default(0);
            $table->enum('kind', ['general', 'electronics']);
            $table->string('weight_code')->nullable();      // general tier code
            $table->decimal('weight_kg', 8, 2)->nullable();
            $table->string('electronic_code')->nullable();  // item code
            $table->boolean('needs_packaging')->default(false);

            // money
            $table->unsignedInteger('delivery_fee')->default(0);
            $table->unsignedInteger('pack_fee')->default(0);
            $table->unsignedInteger('drop_off_fee')->default(0);
            $table->unsignedInteger('cod_amount')->default(0);
            $table->unsignedInteger('cod_fee')->default(0);
            $table->unsignedInteger('total')->default(0);
            $table->unsignedInteger('points_earned')->default(0);

            // payment
            $table->string('payer_phone')->nullable();
            $table->string('mpesa_code')->nullable();
            $table->timestamp('paid_at')->nullable();

            // status
            $table->enum('status', [
                'draft',
                'booked',
                'awaiting_payment',
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
            $table->index('tracking_no');
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
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('parcel_events');
        Schema::dropIfExists('parcels');
    }
};
