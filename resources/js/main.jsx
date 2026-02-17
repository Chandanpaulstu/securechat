import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import '../css/app.css';

createRoot(document.getElementById('app')).render(
    <StrictMode>
        <App />
    </StrictMode>
);
