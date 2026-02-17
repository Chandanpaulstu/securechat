import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './bootstrap';
import App from './App';
import '../css/app.css';

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <App />
    </StrictMode>
);
