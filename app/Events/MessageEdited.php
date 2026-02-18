<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageEdited implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $messageId,
        public int $roomId,
        public string $ciphertext,
        public string $iv,
        public string $integrity_hash
    ) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel('room.' . $this->roomId)];
    }

    public function broadcastAs(): string
    {
        return 'message.edited';
    }

    public function broadcastWith(): array
    {
        return [
            'message_id'     => $this->messageId,
            'ciphertext'     => $this->ciphertext,
            'iv'             => $this->iv,
            'integrity_hash' => $this->integrity_hash,
        ];
    }
}
