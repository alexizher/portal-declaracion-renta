import React, { useEffect, useState } from 'react';
import { hayToken, setToken } from './api.js';
import Login from './vistas/Login.jsx';
import Clientes from './vistas/Clientes.jsx';
import Plantillas from './vistas/Plantillas.jsx';
import Correos from './vistas/Correos.jsx';
import Calendario from './vistas/Calendario.jsx';

const PESTANAS = [
  { id: 'clientes', titulo: 'Clientes', Vista: Clientes },
  { id: 'correos', titulo: 'Correos', Vista: Correos },
  { id: 'plantillas', titulo: 'Documentos', Vista: Plantillas },
  { id: 'calendario', titulo: 'Calendario DIAN', Vista: Calendario },
];

export default function App() {
  const [autenticado, setAutenticado] = useState(hayToken());
  const [pestana, setPestana] = useState('clientes');

  useEffect(() => {
    const salir = () => setAutenticado(false);
    window.addEventListener('sesion-expirada', salir);
    return () => window.removeEventListener('sesion-expirada', salir);
  }, []);

  if (!autenticado) {
    return <Login onLogin={() => setAutenticado(true)} />;
  }

  const { Vista } = PESTANAS.find((p) => p.id === pestana);

  return (
    <div className="app">
      <header className="barra">
        <img src="/logo_DM.svg" alt="DM" className="logo" />
        <h1>Declaración de Renta · Notificador</h1>
        <nav>
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              className={pestana === p.id ? 'activo' : ''}
              onClick={() => setPestana(p.id)}
            >
              {p.titulo}
            </button>
          ))}
        </nav>
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
    </div>
  );
}
