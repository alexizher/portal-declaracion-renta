import { useEffect, useState } from 'react';
import { hayToken, setToken } from './api.js';
import Guia, { GUIA_VISTA_KEY } from './Guia.jsx';
import Login from './vistas/Login.jsx';
import Clientes from './vistas/Clientes.jsx';
import Plantillas from './vistas/Plantillas.jsx';
import Correos from './vistas/Correos.jsx';
import Revision from './vistas/Revision.jsx';
import Calendario from './vistas/Calendario.jsx';
import Liquidador210 from './vistas/Liquidador210.jsx';

const PESTANAS = [
  { id: 'clientes', titulo: 'Clientes', Vista: Clientes },
  { id: 'correos', titulo: 'Correos', Vista: Correos },
  { id: 'revision', titulo: 'Revisión', Vista: Revision },
  { id: 'plantillas', titulo: 'Documentos', Vista: Plantillas },
  { id: 'calendario', titulo: 'Calendario DIAN', Vista: Calendario },
  { id: 'liquidador210', titulo: 'Liquidador 210', Vista: Liquidador210 },
];

export default function App() {
  const [autenticado, setAutenticado] = useState(hayToken());
  const [pestana, setPestana] = useState('clientes');
  const [menuAbierto, setMenuAbierto] = useState(false); // drawer en móvil
  // La guía se abre sola la primera vez; el botón "?" la reabre cuando sea.
  const [guiaAbierta, setGuiaAbierta] = useState(() => !localStorage.getItem(GUIA_VISTA_KEY));

  useEffect(() => {
    const salir = () => setAutenticado(false);
    window.addEventListener('sesion-expirada', salir);
    return () => window.removeEventListener('sesion-expirada', salir);
  }, []);

  if (!autenticado) {
    return <Login onLogin={() => setAutenticado(true)} />;
  }

  const { Vista, titulo } = PESTANAS.find((p) => p.id === pestana);

  return (
    <div className="app">
      <header className="barra">
        <button
          className="hamburguesa"
          aria-label="Abrir menú"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          {menuAbierto ? '✕' : '☰'}
        </button>
        <img src="/logo_DM.svg" alt="DM" className="logo" />
        <h1>
          <span className="marca">Declaración de Renta</span>
          <span className="pestana-actual">{titulo}</span>
        </h1>
        <nav className={menuAbierto ? 'abierto' : ''}>
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              className={pestana === p.id ? 'activo' : ''}
              onClick={() => {
                setPestana(p.id);
                setMenuAbierto(false);
              }}
            >
              {p.titulo}
            </button>
          ))}
        </nav>
        {menuAbierto && <div className="nav-fondo" onClick={() => setMenuAbierto(false)} />}
        <button
          className="ayuda"
          aria-label="Ver guía de los módulos"
          title="Ver la guía de los módulos"
          onClick={() => setGuiaAbierta(true)}
        >
          ?
        </button>
        <button
          className="salir"
          onClick={() => {
            setToken(null);
            setAutenticado(false);
          }}
        >
          Salir
        </button>
      </header>
      <main>
        <Vista />
      </main>
      {guiaAbierta && (
        <Guia onIrPestana={setPestana} onCerrar={() => setGuiaAbierta(false)} />
      )}
    </div>
  );
}
