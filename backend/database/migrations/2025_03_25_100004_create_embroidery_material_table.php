<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('embroidery_material', function (Blueprint $table) {
            $table->id();
            $table->foreignId('embroidery_id')->constrained('embroideries')->cascadeOnDelete();
            $table->foreignId('material_id')->constrained('materials')->cascadeOnDelete();
            $table->decimal('quantity', 12, 3)->nullable();
            $table->string('unit')->nullable();
            $table->timestamps();

            $table->unique(['embroidery_id', 'material_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('embroidery_material');
    }
};
