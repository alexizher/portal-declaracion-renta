import React from 'react';
import Wizard from './liquidador210/Wizard.jsx';

// Liquidador del Formulario 210 (renta personas naturales) — solo lo usa
// Daniela desde el panel. Corre 100% en el navegador: la exógena, el
// patrimonio y las cifras del cliente NUNCA salen de este dispositivo ni
// tocan el servidor (ver docs/reglas-tributarias-AG2025.md). El progreso se
// autoguarda en localStorage por cédula del cliente.
export default function Liquidador210() {
  return (
    <div>
      <p className="tenue" style={{ marginTop: 0 }}>
        Borrador prediligenciado del F210 a partir de la exógena y los soportes del cliente — tú revisas,
        ajustas y firmas. Nada de lo digitado aquí sube al servidor.
      </p>
      <Wizard />
    </div>
  );
}
