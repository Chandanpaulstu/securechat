<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
   public function up()
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->string('status')->default('sent'); // sent, delivered, seen
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('seen_at')->nullable();
        });
    }

    public function down()
    {
        Schema::table('messages', function (Blueprint $table) {
            $table->dropColumn(['status', 'delivered_at', 'seen_at']);
        });
    }
};
