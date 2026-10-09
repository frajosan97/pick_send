<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pricing_constants', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();      // base10, per_kg, max_kg, drop_off_fee, cod_rate
            $table->decimal('value', 12, 2);
            $table->string('description')->nullable();
            $table->timestamps();
        });

        Schema::create('general_prices', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique();       // '1', '2', '5', '10', 'kg'
            $table->string('label');                // "Up to 1 kg"
            $table->unsignedInteger('price');       // delivery KSh
            $table->unsignedInteger('packaging');   // packaging KSh
            $table->unsignedInteger('pickup_fee')->default(50);
            $table->boolean('per_kg')->default(false);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('item_groups', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');                  // "Phones and computers"
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_group_id')->constrained()->cascadeOnDelete();
            $table->string('code')->unique();        // acc, phone, tv43
            $table->string('label');
            $table->unsignedInteger('price');
            $table->unsignedInteger('packaging');
            $table->unsignedInteger('pickup_fee')->default(50);
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->index(['item_group_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
        Schema::dropIfExists('item_groups');
        Schema::dropIfExists('general_prices');
        Schema::dropIfExists('pricing_constants');
    }
};
