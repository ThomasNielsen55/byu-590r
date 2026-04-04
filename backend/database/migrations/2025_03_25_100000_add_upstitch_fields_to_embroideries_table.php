<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('embroideries', function (Blueprint $table) {
            $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->date('start_date')->nullable()->after('embroidery_picture');
            $table->string('status')->default('not_started')->after('start_date');
            $table->string('difficulty_level')->nullable()->after('status');
            $table->string('fabric_type')->nullable()->after('difficulty_level');
            $table->text('visibility_notes')->nullable()->after('fabric_type');
        });
    }

    public function down(): void
    {
        Schema::table('embroideries', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
            $table->dropColumn([
                'user_id',
                'start_date',
                'status',
                'difficulty_level',
                'fabric_type',
                'visibility_notes',
            ]);
        });
    }
};
