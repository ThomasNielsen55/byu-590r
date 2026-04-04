<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('completion_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('embroidery_id')->unique()->constrained('embroideries')->cascadeOnDelete();
            $table->date('completed_at');
            $table->decimal('hours_spent', 8, 2)->nullable();
            $table->unsignedTinyInteger('satisfaction_rating');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('completion_logs');
    }
};
