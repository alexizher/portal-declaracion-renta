import React from 'react';
import Wizard from './liquidador210/Wizard.jsx';

// Liquidador del Formulario 210 (renta personas naturales) — solo lo usa
// Daniela desde el panel. El cálculo corre 100% en el navegador (ver
// docs/reglas-tributarias-AG2025.md); el progreso se guarda cifrado en el
// servidor por cédula del cliente (AES-256-GCM, ver server/src/cifrado.js)
// para poder continuar la misma declaración desde cualquier PC, con
// localStorage como caché local y respaldo si falla la conexión.
export default function Liquidador210() {
  return (
    <div>
      <p className="tenue" style={{ marginTop: 0 }}>
        Borrador prediligenciado del F210 a partir de la exógena y los soportes del cliente — tú revisas,
        ajustas y firmas. El progreso se guarda cifrado en el servidor para que puedas continuar desde
        cualquier PC.
      </p>
      <Wizard />
    </div>
  );
}
