<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('embroidery_pattern', function (Blueprint $table) {
            $table->id();
            $table->foreignId('embroidery_id')->constrained('embroideries')->cascadeOnDelete();
            $table->foreignId('pattern_id')->constrained('patterns')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['embroidery_id', 'pattern_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('embroidery_pattern');
    }
};
