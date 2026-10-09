<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('routes', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();   // coast, mount, rift, lake
            $table->string('name');             // Mombasa, Mt Kenya...
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('towns', function (Blueprint $table) {
            $table->id();
            $table->foreignId('route_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->boolean('is_satellite')->default(false);
            $table->unsignedInteger('satellite_fee')->default(100); // KSh fee for satellite drop
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
            $table->unique(['route_id', 'name']);
            $table->index(['is_active', 'is_satellite']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('towns');
        Schema::dropIfExists('routes');
    }
};
