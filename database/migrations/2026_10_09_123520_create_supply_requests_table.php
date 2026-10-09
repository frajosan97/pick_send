<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('supply_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('name');
            $table->string('phone')->index();
            $table->foreignId('town_id')->constrained()->restrictOnDelete();
            $table->text('what');
            $table->text('pickup_from');
            $table->string('supplier_phone')->nullable();
            $table->enum('frequency', [
                'Once',
                'Daily',
                'Weekly',
                'Monthly',
            ])->default('Once');
            $table->enum('status', [
                'pending',
                'confirmed',
                'in_progress',
                'done',
                'cancelled',
            ])->default('pending');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('supply_requests');
    }
};
