import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Portal from './vistas/Portal.jsx';
import './styles.css';

// /portal/{token} es la página de los clientes (sin login del panel) y
// /portal a secas es "recuperar mi enlace" con la cédula; cualquier otra
// ruta carga el panel de administración.
const portal = window.location.pathname.match(/^\/portal(?:\/([^/]+))?\/?$/);

createRoot(document.getElementById('root')).render(
  portal ? <Portal token={portal[1] || null} /> : <App />
);
