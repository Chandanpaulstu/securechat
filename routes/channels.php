<?php

use App\Models\RoomMember;
use Illuminate\Support\Facades\Broadcast;

Broadcast::channel('room.{roomId}', function ($user, $roomId) {
    $member = RoomMember::where('room_id', $roomId)
        ->where('user_id', $user->id)
        ->first();

    if (!$member) return false;

    // Return user data for presence channel
    return [
        'id'   => $user->id,
        'name' => $user->name,
    ];
});
