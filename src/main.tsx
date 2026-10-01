import 'jquery';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap';
import '@fortawesome/fontawesome-free/css/all.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import '/src/index.css';

import App from './App';

const root = document.getElementById('root');

if (!root) {
    throw new Error('Root element was not found');
}

createRoot(root).render(
    <StrictMode>
        <App />
    </StrictMode>
);
