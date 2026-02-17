import { useEffect, useRef } from 'react';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echoInstance = null;

function getEcho() {
    if (!echoInstance) {
        echoInstance = new Echo({
            broadcaster:  'reverb',
            key:          import.meta.env.VITE_REVERB_APP_KEY,
            wsHost:       import.meta.env.VITE_REVERB_HOST,
            wsPort:       import.meta.env.VITE_REVERB_PORT,
            forceTLS:     false,
            enabledTransports: ['ws'],
            authEndpoint: '/broadcasting/auth',
            auth: {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                },
            },
        });
    }
    return echoInstance;
}

export function useRoomChannel(roomId, onMessage, onJoin, onLeave) {
    const channelRef = useRef(null);

    useEffect(() => {
        if (!roomId) return;

        const echo    = getEcho();
        const channel = echo.join(`room.${roomId}`);

        channel
            .here((members) => {})
            .joining((member) => onJoin?.(member))
            .leaving((member) => onLeave?.(member))
            .listen('.message.sent', (e) => onMessage?.(e));

        channelRef.current = channel;

        return () => {
            echo.leave(`room.${roomId}`);
        };
    }, [roomId]);

    return channelRef;
}
