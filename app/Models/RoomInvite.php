<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RoomInvite extends Model
{
    protected $fillable = ['room_id', 'invited_by', 'token', 'email', 'expires_at', 'used'];

    protected $casts = [
        'expires_at' => 'datetime',
        'used' => 'boolean',
    ];

    public function room()
    {
        return $this->belongsTo(Room::class);
    }

    public function isValid(): bool
    {
        return !$this->used && $this->expires_at->isFuture();
    }
}
