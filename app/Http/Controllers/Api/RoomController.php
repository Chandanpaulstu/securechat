<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomMember;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class RoomController extends Controller
{
    // List rooms the authenticated user belongs to
    public function index(Request $request)
    {
        $rooms = Room::whereHas('members', fn($q) => $q->where('user_id', $request->user()->id))
            ->withCount('members')
            ->latest()
            ->get();

        return response()->json($rooms);
    }

    // Create a room — creator automatically joins as admin
    public function store(Request $request)
    {
        $data = $request->validate([
            'name'       => 'required|string|max:100',
            'is_private' => 'boolean',
        ]);

        $room = Room::create([
            'name'       => $data['name'],
            'created_by' => $request->user()->id,
            'is_private' => $data['is_private'] ?? true,
        ]);

        RoomMember::create([
            'room_id'    => $room->id,
            'user_id'    => $request->user()->id,
            'public_key' => '', // will be updated after ECDH key generation on frontend
            'role'       => 'admin',
        ]);

        return response()->json($room, 201);
    }

    public function show(Request $request, Room $room)
    {
        $this->authorizeMember($room, $request->user()->id);

        return response()->json($room->load('creator:id,name,email'));
    }

    public function destroy(Request $request, Room $room)
    {
        if ($room->created_by !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $room->delete();

        return response()->json(['message' => 'Room deleted.']);
    }

    // Join a public room directly
    public function join(Request $request, Room $room)
    {
        if ($room->is_private) {
            return response()->json(['message' => 'Use an invite link to join this room.'], 403);
        }

        $already = RoomMember::where('room_id', $room->id)
            ->where('user_id', $request->user()->id)
            ->exists();

        if ($already) {
            return response()->json(['message' => 'Already a member.'], 409);
        }

        RoomMember::create([
            'room_id'    => $room->id,
            'user_id'    => $request->user()->id,
            'public_key' => '',
            'role'       => 'member',
        ]);

        return response()->json(['message' => 'Joined successfully.']);
    }

    // Frontend sends ECDH public key after generating the key pair
    public function storePublicKey(Request $request, Room $room)
    {
        $this->authorizeMember($room, $request->user()->id);

        $data = $request->validate([
            'public_key' => 'required|string',
        ]);

        RoomMember::where('room_id', $room->id)
            ->where('user_id', $request->user()->id)
            ->update(['public_key' => $data['public_key']]);

        return response()->json(['message' => 'Public key stored.']);
    }

    // Return all members + their public keys (needed for ECDH on the client)
    public function members(Request $request, Room $room)
    {
        $this->authorizeMember($room, $request->user()->id);

        $members = $room->members()->with('user:id,name,email')->get()
            ->map(fn($m) => [
                'user'       => $m->user,
                'public_key' => $m->public_key,
                'role'       => $m->role,
            ]);

        return response()->json($members);
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
