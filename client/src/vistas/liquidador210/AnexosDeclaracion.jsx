import { useMemo, useState } from 'react';
import { pdf } from '@react-pdf/renderer';
import { construirAnexos } from './anexos.js';
import AnexosPDF, { FIRMA_ASESORA } from './AnexosPDF.jsx';

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatoFecha(fecha) {
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

// Misma cabecera de tabla en color que el PDF (ver TablaBloque en
// AnexosPDF.jsx): franja dorada con la etiqueta y "Valor", filas a rayas.
function BloqueTabla({ etiqueta, items }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="anexos-bloque">
      <div className="anexos-bloque-cabecera">
        <span>{etiqueta}</span>
        <span>Valor</span>
      </div>
      <table>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td>{item.etiqueta}</td>
              <td className="anexos-valor">{formatoPesos(item.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function AnexosDeclaracion({ resultado, estado, cliente, onCerrar }) {
  const anexos = useMemo(() => construirAnexos(resultado, estado, cliente), [resultado, estado, cliente]);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  async function manejarDescargarPDF() {
    setGenerandoPDF(true);
    try {
      const archivo = `Anexos_${cliente.cedula || 'borrador'}_${cliente.anioGravable}.pdf`;
      const blob = await pdf(<AnexosPDF anexos={anexos} cliente={cliente} />).toBlob();
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = archivo;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    } finally {
      setGenerandoPDF(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal ancho anexos-declaracion" onClick={(e) => e.stopPropagation()}>
        <div className="anexos-encabezado">
          <img src="/logo_DM.svg" alt="DM" className="anexos-logo" />
          <div className="anexos-encabezado-texto">
            <h2>Anexos de la declaración de renta</h2>
            <p className="tenue">
              {cliente.nombre || 'Cliente'} · {cliente.cedula || 'sin cédula'} · Año gravable {cliente.anioGravable}
            </p>
            <p className="tenue anexos-firma">
              {FIRMA_ASESORA} · Generado el {formatoFecha(anexos.generado)}
            </p>
          </div>
          <div className="fila-botones no-imprimir">
            <button type="button" disabled={generandoPDF} onClick={manejarDescargarPDF}>
              {generandoPDF ? 'Generando…' : 'Descargar PDF'}
            </button>
            <button type="button" onClick={onCerrar}>Cerrar</button>
          </div>
        </div>

        {anexos.advertencias.length > 0 && (
          <div className="tarjeta aviso no-imprimir">
            <strong>Advertencias — revisar antes de enviar:</strong>
            <ul>
              {anexos.advertencias.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="anexos-resumen-ejecutivo">
          {anexos.resumenEjecutivo.map((item, i) => (
            <div key={i} className={`anexos-stat${item.enfasis ? ' enfasis' : ''}`}>
              <span>{item.etiqueta}</span>
              <strong>{formatoPesos(item.valor)}</strong>
            </div>
          ))}
        </div>

        <nav className="anexos-indice">
          <strong>Contenido</strong>
          <ol>
            {anexos.secciones.map((s) => (
              <li key={s.id}>{s.titulo}</li>
            ))}
            <li>Conclusiones de la renta</li>
          </ol>
        </nav>

        {anexos.secciones.map((s) => (
          <section key={s.id} className={`anexos-seccion${s.destacada ? ' destacada' : ''}`}>
            <h3>{s.titulo}</h3>
            {s.parrafo && <p className="tenue">{s.parrafo}</p>}

            <BloqueTabla etiqueta="Qué se declaró" items={s.declarado} />
            {s.notaAnticipo && <p className="tenue">{s.notaAnticipo}</p>}
            <BloqueTabla etiqueta="Cómo se calculó" items={s.calculo} />
          </section>
        ))}

        <section className="anexos-resumen-final">
          <span>{anexos.resumenFinal.etiqueta}</span>
          <strong>{formatoPesos(anexos.resumenFinal.valor)}</strong>
        </section>

        <section className="anexos-seccion anexos-conclusiones">
          <h3>Conclusiones de la renta</h3>
          <p className="tenue">
            Cierre de la declaración de renta persona natural — año gravable {cliente.anioGravable}
          </p>
          {anexos.conclusiones.map((parrafo, i) => (
            <p key={i}>{parrafo}</p>
          ))}
          <p className="anexos-conclusiones-nota">{anexos.notaConclusiones}</p>
        </section>

        <p className="tenue no-imprimir">
          ⚠️ Borrador de trabajo prediligenciado por algoritmos. Verifica cada cifra contra los certificados y
          soportes antes de firmar y presentar la declaración — este aviso es solo para tu revisión, no sale en el
          PDF ni si se envía por correo.
        </p>
      </div>
    </div>
  );
}
