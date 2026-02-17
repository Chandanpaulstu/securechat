import axios from 'axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

window.Echo = new Echo({
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
                .then(response => callback(false, response.data))
                .catch(error => callback(true, error));
            },
        };
    },
});
