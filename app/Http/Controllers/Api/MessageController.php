<?php

namespace App\Http\Controllers\Api;

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
}
