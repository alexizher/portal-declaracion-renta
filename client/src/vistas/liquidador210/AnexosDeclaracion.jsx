import React, { useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { construirAnexos } from './anexos.js';

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

// Captura el DOM ya renderizado (mismos estilos que ve el usuario) y lo
// pagina en un PDF — así el documento nunca se desincroniza del diseño en
// pantalla, a diferencia de reconstruirlo aparte con una plantilla de PDF.
async function descargarPDF(nodo, nombreArchivo) {
  const alturaOriginal = nodo.style.maxHeight;
  const overflowOriginal = nodo.style.overflow;
  nodo.style.maxHeight = 'none';
  nodo.style.overflow = 'visible';

  try {
    const canvas = await html2canvas(nodo, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      // El PDF no debe llevar botones ni avisos que solo tienen sentido en
      // pantalla (mismas clases que ya excluye @media print) — se ocultan
      // en el clon que usa html2canvas, no en el DOM real.
      onclone: (clonedDoc) => {
        clonedDoc.querySelectorAll('.no-imprimir').forEach((el) => {
          el.style.display = 'none';
        });
        // html2canvas compone mal el box-shadow difuminado y el clip de las
        // esquinas redondeadas del modal (quedan como un velo translúcido
        // sobre el contenido cercano) — no aportan nada en un documento
        // paginado, así que se apagan en el clon.
        const modalClonado = clonedDoc.querySelector('.anexos-declaracion');
        if (modalClonado) {
          modalClonado.style.boxShadow = 'none';
          modalClonado.style.borderRadius = '0';
        }
      },
    });
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const imgData = canvas.toDataURL('image/jpeg', 0.92);

    let alturaRestante = imgHeight;
    let posicion = 0;
    pdf.addImage(imgData, 'JPEG', 0, posicion, imgWidth, imgHeight);
    alturaRestante -= pageHeight;
    while (alturaRestante > 0) {
      posicion = -(imgHeight - alturaRestante);
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, posicion, imgWidth, imgHeight);
      alturaRestante -= pageHeight;
    }
    pdf.save(nombreArchivo);
  } finally {
    nodo.style.maxHeight = alturaOriginal;
    nodo.style.overflow = overflowOriginal;
  }
}

export default function AnexosDeclaracion({ resultado, estado, cliente, onCerrar }) {
  const anexos = useMemo(() => construirAnexos(resultado, estado, cliente), [resultado, estado, cliente]);
  const contenedorRef = useRef(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);

  async function manejarDescargarPDF() {
    setGenerandoPDF(true);
    try {
      const archivo = `Anexos_${cliente.cedula || 'borrador'}_${cliente.anioGravable}.pdf`;
      await descargarPDF(contenedorRef.current, archivo);
    } finally {
      setGenerandoPDF(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal ancho anexos-declaracion" ref={contenedorRef} onClick={(e) => e.stopPropagation()}>
        <div className="anexos-encabezado">
          <div>
            <h2>Anexos de la declaración de renta</h2>
            <p className="tenue">
              {cliente.nombre || 'Cliente'} · {cliente.cedula || 'sin cédula'} · Año gravable {cliente.anioGravable}
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

        {anexos.secciones.map((s) => (
          <section key={s.id} className={`anexos-seccion${s.destacada ? ' destacada' : ''}`}>
            <h3>{s.titulo}</h3>
            {s.parrafo && <p className="tenue">{s.parrafo}</p>}

            {s.declarado && s.declarado.length > 0 && (
              <div className="anexos-bloque">
                <strong>Qué se declaró</strong>
                <table>
                  <tbody>
                    {s.declarado.map((item, i) => (
                      <tr key={i}>
                        <td>{item.etiqueta}</td>
                        <td className="anexos-valor">{formatoPesos(item.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {s.notaAnticipo && <p className="tenue">{s.notaAnticipo}</p>}

            {s.calculo && s.calculo.length > 0 && (
              <div className="anexos-bloque">
                <strong>Cómo se calculó</strong>
                <table>
                  <tbody>
                    {s.calculo.map((item, i) => (
                      <tr key={i}>
                        <td>{item.etiqueta}</td>
                        <td className="anexos-valor">{formatoPesos(item.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ))}

        <section className="anexos-resumen-final">
          <span>{anexos.resumenFinal.etiqueta}</span>
          <strong>{formatoPesos(anexos.resumenFinal.valor)}</strong>
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
