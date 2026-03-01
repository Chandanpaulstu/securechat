import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/js/app.jsx'],
            refresh: true,
        }),
        react(),
        tailwindcss(),
    ],

    // Docker Hot Reload Config
    server: {
        host: '0.0.0.0',       // listen on all interfaces inside Docker
        port: 5173,
        strictPort: true,

        // Tell browser where to connect for HMR
        hmr: {
            host: 'localhost', // browser connects to localhost (Windows machine)
            port: 5173,
        },

        // Allow requests coming through nginx proxy
        cors: true,

        watch: {
            // Use polling — required on Windows/WSL Docker volumes
            usePolling: true,
            interval: 500,
        },
    },
});
