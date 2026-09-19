import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import Portal from './vistas/Portal.jsx';
import { Terminos, Privacidad } from './vistas/Legal.jsx';
import Baja from './vistas/Baja.jsx';
import './styles.css';

// /portal/{token} es la página de los clientes (sin login del panel) y
// /portal a secas es "recuperar mi enlace" con la cédula; /terminos y
// /privacidad son páginas públicas sin login; /baja/{token} es la baja de los
// correos de captación; cualquier otra ruta carga el panel de administración.
const ruta = window.location.pathname;
const portal = ruta.match(/^\/portal(?:\/([^/]+))?\/?$/);
const baja = ruta.match(/^\/baja\/([^/]+)\/?$/);

let vista;
if (portal) vista = <Portal token={portal[1] || null} />;
else if (baja) vista = <Baja token={baja[1]} />;
else if (/^\/terminos\/?$/.test(ruta)) vista = <Terminos />;
else if (/^\/privacidad\/?$/.test(ruta)) vista = <Privacidad />;
else vista = <App />;

createRoot(document.getElementById('root')).render(vista);
