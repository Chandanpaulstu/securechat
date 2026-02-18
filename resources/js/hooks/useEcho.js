import { useEffect, useRef } from 'react';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echoInstance = null;

function getEcho() {
    if (!echoInstance) {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: Number(import.meta.env.VITE_REVERB_PORT),
            forceTLS: false,
            enabledTransports: ['ws'],
            authorizer: (channel) => {
                return {
                    authorize: (socketId, callback) => {
                        axios.post('http://localhost:8000/api/broadcasting/auth', {
                            socket_id: socketId,
                            channel_name: channel.name,
                        }, {
                            headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`,
                                Accept: 'application/json',
                            },
                        })
                        .then(res => callback(false, res.data))
                        .catch(err => callback(true, err));
                    },
                };
            },
        });
    }
    return echoInstance;
}

export function disconnectEcho() {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
}

export function useRoomChannel(roomId, onMessage, onJoin, onLeave, onTyping) {
    const channelRef = useRef(null);

    useEffect(() => {
        if (!roomId) return;

        const echo    = getEcho();
        const channel = echo.join(`room.${roomId}`);

        channel
            .here(() => {})
            .joining((member) => onJoin?.(member))
            .leaving((member) => onLeave?.(member))
            .listen('.message.sent', (e) => onMessage?.(e))
            .listen('.user.typing', (e) => onTyping?.(e));

        channelRef.current = channel;

        return () => {
            echo.leave(`room.${roomId}`);
        };
    }, [roomId]);

    return channelRef;
}
