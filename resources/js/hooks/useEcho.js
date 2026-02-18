import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

let echoInstance = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

function getEcho() {
    if (!echoInstance) {
        echoInstance = new Echo({
            broadcaster: 'reverb',
            key: import.meta.env.VITE_REVERB_APP_KEY,
            wsHost: import.meta.env.VITE_REVERB_HOST,
            wsPort: Number(import.meta.env.VITE_REVERB_PORT),
            forceTLS: false,
            enabledTransports: ['ws'],
            authEndpoint: 'http://localhost:8000/api/broadcasting/auth',
            auth: {
                headers: {
                    Authorization: `Bearer ${localStorage.getItem('token')}`,
                    Accept: 'application/json',
                },
            },
        });

        // Connection state listeners
        echoInstance.connector.pusher.connection.bind('connected', () => {
            console.log('[Echo] Connected to WebSocket');
            reconnectAttempts = 0;
        });

        echoInstance.connector.pusher.connection.bind('disconnected', () => {
            console.warn('[Echo] Disconnected from WebSocket');
        });

        echoInstance.connector.pusher.connection.bind('unavailable', () => {
            console.error('[Echo] Connection unavailable');
            attemptReconnect();
        });

        echoInstance.connector.pusher.connection.bind('failed', () => {
            console.error('[Echo] Connection failed');
            attemptReconnect();
        });
    }
    return echoInstance;
}

function attemptReconnect() {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[Echo] Max reconnection attempts reached');
        return;
    }

    reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);

    console.log(`[Echo] Attempting reconnect ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

    setTimeout(() => {
        if (echoInstance) {
            echoInstance.connector.pusher.connect();
        }
    }, delay);
}

export function disconnectEcho() {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
        reconnectAttempts = 0;
    }
}

export function useRoomChannel(roomId, onMessage, onJoin, onLeave, onTyping, onHere, onMessageDelivered, onMessageSeen, onMessageDeleted) {
    const channelRef = useRef(null);
    const [connectionState, setConnectionState] = useState('connecting');

    useEffect(() => {
        if (!roomId) return;

        const echo = getEcho();

        // Monitor connection state
        const pusher = echo.connector.pusher;
        pusher.connection.bind('state_change', (states) => {
            setConnectionState(states.current);
        });

        const channel = echo.join(`room.${roomId}`);

        channel
            .here((members) => onHere?.(members))
            .joining((member) => onJoin?.(member))
            .leaving((member) => onLeave?.(member))
            .listen('.message.sent', (e) => onMessage?.(e))
            .listen('.user.typing', (e) => onTyping?.(e))
            .listen('.message.delivered', (e) => onMessageDelivered?.(e))
            .listen('.message.seen', (e) => onMessageSeen?.(e))
            .listen('.message.deleted', (e) => onMessageDeleted?.(e))
            .listen('.message.edited', (e) => onMessageEdited?.(e));


        channelRef.current = channel;

        return () => {
            echo.leave(`room.${roomId}`);
        };
    }, [roomId]);

    return { channel: channelRef, connectionState };
}
