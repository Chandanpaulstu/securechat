<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Message extends Model
{
    protected $fillable = ['room_id', 'user_id', 'ciphertext', 'iv', 'integrity_hash','status',
        'delivered_at','seen_at', ];

    public function sender()
    {
        return $this->belongsTo(User::class, 'user_id');
    }
    public function repliedMessage()
    {
        return $this->belongsTo(Message::class, 'reply_to');
    }
}
