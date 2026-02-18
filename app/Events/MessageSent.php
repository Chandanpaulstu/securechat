<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
    public int $id,
    public int $roomId,
    public int $userId,
    public string $ciphertext,
    public string $iv,
    public string $integrity_hash,
    public object $sender,
    public string $created_at,
    public ?int $reply_to = null
    ) {}

    public function broadcastOn(): array
    {
        return [
            new PresenceChannel('room.' . $this->roomId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    // Only send safe fields — never expose raw data structure
    public function broadcastWith(): array
    {
        return [
            'id'             => $this->id,
            'room_id'        => $this->roomId,
            'user_id'        => $this->userId,
            'ciphertext'     => $this->ciphertext,
            'iv'             => $this->iv,
            'integrity_hash' => $this->integrity_hash,
            'sender'         => $this->sender,
            'created_at'     => $this->created_at,
            'reply_to'       => $this->reply_to,
        ];
    }
}
