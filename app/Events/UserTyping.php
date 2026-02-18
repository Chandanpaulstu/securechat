<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class UserTyping implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(
        public int $roomId,
        public int $userId,
        public string $userName,
        public bool $isTyping
    ) {}

    public function broadcastOn(): array
    {
        return [new PresenceChannel('room.' . $this->roomId)];
    }

    public function broadcastAs(): string
    {
        return 'user.typing';
    }

    public function broadcastWith(): array
    {
        return [
            'user_id'   => $this->userId,
            'user_name' => $this->userName,
            'is_typing' => $this->isTyping,
        ];
    }
}
