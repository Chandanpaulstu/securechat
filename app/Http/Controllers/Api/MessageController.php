<?php

namespace App\Http\Controllers\Api;

use App\Events\MessageDelivered;
use App\Events\MessageSeen;
use App\Events\UserTyping;
use App\Http\Controllers\Controller;
use App\Models\Message;
use App\Models\Room;
use App\Models\RoomMember;
use App\Events\MessageSent;
use Illuminate\Http\Request;

class MessageController extends Controller
{
    // Fetch last 50 messages (ciphertext only — server never decrypts)
    public function index(Request $request, Room $room)
    {
        $this->authorizeMember($room, $request->user()->id);

        $messages = $room->messages()
            ->with('sender:id,name,email')
            ->latest()
            ->take(50)
            ->get()
            ->reverse()
            ->values();

        return response()->json($messages);
    }

    // Store encrypted message and broadcast to room
    public function store(Request $request, Room $room)
    {
        $this->authorizeMember($room, $request->user()->id);

        $data = $request->validate([
            'ciphertext'      => 'required|string',
            'iv'              => 'required|string',
            'integrity_hash'  => 'required|string',
        ]);

        $message = Message::create([
            'room_id'        => $room->id,
            'user_id'        => $request->user()->id,
            'ciphertext'     => $data['ciphertext'],
            'iv'             => $data['iv'],
            'integrity_hash' => $data['integrity_hash'],
        ]);

        $message->load('sender:id,name,email');

        // Broadcast to all room members via WebSocket
        broadcast(new MessageSent($message, $room->id))->toOthers();

        return response()->json($message, 201);
    }

    private function authorizeMember(Room $room, int $userId): void
    {
        $isMember = RoomMember::where('room_id', $room->id)
            ->where('user_id', $userId)
            ->exists();

        if (!$isMember) {
            abort(403, 'Not a member of this room.');
        }
    }
    public function typing(Request $request, Room $room)
    {
        $this->authorizeMember($room, $request->user()->id);

        $data = $request->validate([
            'is_typing' => 'required|boolean',
        ]);

        broadcast(new UserTyping(
            $room->id,
            $request->user()->id,
            $request->user()->name,
            $data['is_typing']
        ))->toOthers();

        return response()->json(['status' => 'ok']);
    }


public function markDelivered(Request $request, Room $room, $messageId)
{
    $this->authorizeMember($room, $request->user()->id);

    $message = Message::findOrFail($messageId);

    if ($message->room_id !== $room->id) {
        return response()->json(['message' => 'Message not in this room.'], 404);
    }

    if ($message->user_id === $request->user()->id) {
        return response()->json(['message' => 'Cannot mark own message.'], 400);
    }

    $message->update([
        'status'       => 'delivered',
        'delivered_at' => now(),
    ]);

    broadcast(new MessageDelivered(
        $message->id,
        $room->id,
        $message->user_id
    ))->toOthers();

    return response()->json(['status' => 'delivered']);
}

public function markSeen(Request $request, Room $room)
{
    $this->authorizeMember($room, $request->user()->id);

    $messages = Message::where('room_id', $room->id)
        ->where('user_id', '!=', $request->user()->id)
        ->whereIn('status', ['sent', 'delivered'])
        ->get();

    foreach ($messages as $msg) {
        $msg->update([
            'status'  => 'seen',
            'seen_at' => now(),
        ]);

        broadcast(new MessageSeen(
            $msg->id,
            $room->id,
            $msg->user_id
        ))->toOthers();
    }

    return response()->json(['marked' => $messages->count()]);
}

public function destroy(Request $request, Room $room, $messageId)
{
    $this->authorizeMember($room, $request->user()->id);

    $message = Message::findOrFail($messageId);

    if ($message->room_id !== $room->id) {
        return response()->json(['message' => 'Message not in room.'], 404);
    }

    if ($message->user_id !== $request->user()->id) {
        return response()->json(['message' => 'Not your message.'], 403);
    }

    $message->delete();

    broadcast(new \App\Events\MessageDeleted($message->id, $room->id))->toOthers();

    return response()->json(['message' => 'Deleted.']);
}
}
