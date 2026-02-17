<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Room extends Model
{
    protected $fillable = ['name', 'created_by', 'is_private'];

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function members()
    {
        return $this->hasMany(RoomMember::class);
    }

    public function messages()
    {
        return $this->hasMany(Message::class);
    }

    public function invites()
    {
        return $this->hasMany(RoomInvite::class);
    }
}
