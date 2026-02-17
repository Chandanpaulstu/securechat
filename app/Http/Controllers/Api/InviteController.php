<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Room;
use App\Models\RoomInvite;
use App\Models\RoomMember;
use App\Services\BrevoMailService;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class InviteController extends Controller
{
    public function __construct(private BrevoMailService $mailer) {}

    public function send(Request $request, Room $room)
    {
        $member = RoomMember::where('room_id', $room->id)
            ->where('user_id', $request->user()->id)
            ->first();

        if (!$member || $member->role !== 'admin') {
            return response()->json(['message' => 'Only admins can invite.'], 403);
        }

        $data = $request->validate([
            'email' => 'required|email',
        ]);

        RoomInvite::where('room_id', $room->id)
            ->where('email', $data['email'])
            ->where('used', false)
            ->delete();

        $invite = RoomInvite::create([
            'room_id'    => $room->id,
            'invited_by' => $request->user()->id,
            'token'      => Str::random(64),
            'email'      => $data['email'],
            'expires_at' => now()->addHours(24),
            'used'       => false,
        ]);

        $inviteUrl = config('app.url') . '/invite/' . $invite->token;

        $html = view('emails.room-invite', [
            'inviterName' => $request->user()->name,
            'roomName'    => $room->name,
            'inviteUrl'   => $inviteUrl,
        ])->render();

        $this->mailer->send(
            toEmail: $data['email'],
            toName: $data['email'],
            subject: 'You are invited to join ' . $room->name . ' on SecureChat',
            htmlContent: $html,
        );

        return response()->json(['message' => 'Invite sent.']);
    }

    public function accept(Request $request, string $token)
    {
        $invite = RoomInvite::where('token', $token)->first();

        if (!$invite || !$invite->isValid()) {
            return response()->json(['message' => 'Invalid or expired invite.'], 422);
        }

        $userId = $request->user()->id;

        $already = RoomMember::where('room_id', $invite->room_id)
            ->where('user_id', $userId)
            ->exists();

        if ($already) {
            return response()->json(['message' => 'Already a member.'], 409);
        }

        RoomMember::create([
            'room_id'    => $invite->room_id,
            'user_id'    => $userId,
            'public_key' => '',
            'role'       => 'member',
        ]);

        $invite->update(['used' => true]);

        return response()->json(['message' => 'Joined room successfully.']);
    }
}
