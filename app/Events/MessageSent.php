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
        public Message $message,
        public int $roomId
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
            'id'             => $this->message->id,
            'room_id'        => $this->message->room_id,
            'sender'         => $this->message->sender,
            'ciphertext'     => $this->message->ciphertext,
            'iv'             => $this->message->iv,
            'integrity_hash' => $this->message->integrity_hash,
            'created_at'     => $this->message->created_at,
        ];
    }
}
