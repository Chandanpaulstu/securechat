<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('room_invites', function (Blueprint $table) {
        $table->id();
        $table->foreignId('room_id')->constrained()->cascadeOnDelete();
        $table->foreignId('invited_by')->constrained('users')->cascadeOnDelete();
        $table->string('token', 64)->unique();
        $table->string('email');
        $table->timestamp('expires_at');
        $table->boolean('used')->default(false);
        $table->timestamps();
    });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('room_invites');
    }
};
