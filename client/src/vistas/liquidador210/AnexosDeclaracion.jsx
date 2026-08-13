import React, { useMemo, useRef, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { construirAnexos } from './anexos.js';

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatoFecha(fecha) {
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

const FIRMA_ASESORA = 'Daniela Molina Foronda · Contadora Pública · Asesora Tributaria · 311 780 9709';

// Márgenes de la página impresa, en pt. ALTURA_PIE reserva el espacio donde
// se dibuja la línea + firma + numeración; MARGEN_SUPERIOR reserva además el
// encabezado corrido (título + cliente) que se repite desde la página 2 —
// para que el cuerpo nunca invada esas franjas (sin esto, el contenido
// llegaba hasta el borde de la página y el pie quedaba dibujado encima del
// texto).
const MARGEN_LATERAL = 40;
const MARGEN_SUPERIOR = 54;
const ALTURA_PIE = 50;

// Elementos que nunca deben quedar cortados a la mitad por un salto de
// página, de mayor a menor alcance: la sección completa (.anexos-seccion,
// para que "verse junta" incluya el título y todas sus tablas siempre que
// quepan en una página), el índice y la tira de resumen ejecutivo, la
// tarjeta de resumen y el total final, el bloque "etiqueta + tabla"
// (.anexos-bloque, para que el rótulo "Qué se declaró"/"Cómo se calculó"
// nunca quede huérfano separado de su tabla), cada fila de tabla,
// encabezados, párrafos y el glosario (dt/dd). Cuando un contenedor no cabe
// entero en la página, el algoritmo de paginado cae al siguiente nivel más
// chico que sí describe esta lista (ver selección de "corte" más abajo).
const SELECTOR_BLOQUES_ATOMICOS =
  '.anexos-seccion, .anexos-indice, .anexos-resumen-ejecutivo, tr, .anexos-stat, ' +
  '.anexos-resumen-final, .anexos-bloque, h3, p, dt, dd, li';

// Captura el DOM ya renderizado (mismos estilos que ve el usuario) y lo
// pagina en un PDF — así el documento nunca se desincroniza del diseño en
// pantalla, a diferencia de reconstruirlo aparte con una plantilla de PDF.
// El pie de página (firma + numeración) se dibuja aparte con pdf.text():
// el cuerpo es una sola imagen larga cortada en páginas, así que un pie
// que deba repetirse en cada una no puede venir "horneado" en esa imagen.
async function descargarPDF(nodo, nombreArchivo, metadatos) {
  const alturaOriginal = nodo.style.maxHeight;
  const overflowOriginal = nodo.style.overflow;
  nodo.style.maxHeight = 'none';
  nodo.style.overflow = 'visible';

  try {
    // Antes de capturar: dónde está cada fila/tarjeta en el documento, para
    // no partirlas al paginar (se mide sobre el nodo real, con las mismas
    // coordenadas relativas que tendrá el canvas capturado).
    const nodoRect = nodo.getBoundingClientRect();
    const bloques = Array.from(nodo.querySelectorAll(SELECTOR_BLOQUES_ATOMICOS)).map((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top - nodoRect.top, bottom: r.bottom - nodoRect.top };
    });

    const canvas = await html2canvas(nodo, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      onclone: (clonedDoc) => {
        // El PDF no debe llevar botones ni avisos que solo tienen sentido en
        // pantalla (mismas clases que ya excluye @media print) — se ocultan
        // en el clon que usa html2canvas, no en el DOM real.
        clonedDoc.querySelectorAll('.no-imprimir').forEach((el) => {
          el.style.display = 'none';
        });
        const modalClonado = clonedDoc.querySelector('.anexos-declaracion');
        if (modalClonado) {
          // html2canvas compone mal el box-shadow difuminado y el clip de
          // las esquinas redondeadas del modal (quedan como un velo
          // translúcido sobre el contenido cercano) — no aportan nada en un
          // documento paginado, así que se apagan en el clon.
          modalClonado.style.boxShadow = 'none';
          modalClonado.style.borderRadius = '0';
          // El modal tiene una animación de entrada (opacidad 0→1); al
          // clonar el nodo, html2canvas reinicia esa animación y captura a
          // mitad de la transición — todo el documento salía "lavado" a una
          // opacidad intermedia. Se anula solo en el clon.
          modalClonado.style.animation = 'none';
          modalClonado.style.opacity = '1';
          modalClonado.style.transform = 'none';
        }
      },
    });
    const pdf = new jsPDF('p', 'pt', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    // El contenido se dibuja dentro de un rectángulo con margen a los cuatro
    // lados; el margen inferior es más alto que los demás porque además
    // reserva la franja del pie de página (línea + firma + numeración).
    const imgWidth = pageWidth - MARGEN_LATERAL * 2;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const alturaUtilPagina = pageHeight - MARGEN_SUPERIOR - ALTURA_PIE;
    // PNG, no JPEG: el submuestreo de croma del JPEG apaga los colores en
    // bordes finos y texto (justo el tipo de contenido de este documento),
    // aunque la compresión sea alta calidad — se veía "lavado" en el PDF.
    const imgData = canvas.toDataURL('image/png');

    // Puntos de corte prohibidos, en el mismo espacio de coordenadas que
    // imgHeight/alturaUtilPagina (pt de PDF, no píxeles del canvas).
    const ptPorPx = imgHeight / nodoRect.height;
    const bloquesPt = bloques.map((b) => ({ top: b.top * ptPorPx, bottom: b.bottom * ptPorPx }));

    let posicion = 0;
    let pagina = 0;
    while (posicion < imgHeight - 0.5) {
      let corte = Math.min(posicion + alturaUtilPagina, imgHeight);
      // querySelectorAll devuelve primero los contenedores (.anexos-seccion)
      // y luego sus hijos (tr, p...) en orden de documento. Si nos
      // quedáramos con el primer bloque que cruza "corte" (como hacía antes
      // con .find), una sección entera que no cabe en la página ganaría
      // sobre sus hijos y el corte caería crudo a mitad de una fila. En vez
      // de eso, entre TODOS los bloques cruzados que sí pueden evitarse
      // (top > posicion) tomamos el que empieza más temprano — el nivel más
      // chico y protector que sí resuelve el corte.
      const candidatos = bloquesPt.filter(
        (b) => b.top < corte - 0.5 && corte < b.bottom - 0.5 && b.top > posicion
      );
      if (candidatos.length > 0) {
        corte = Math.min(...candidatos.map((b) => b.top));
      }
      if (pagina > 0) pdf.addPage();
      // Recorte explícito hasta "corte": sin esto, la página física seguiría
      // mostrando la imagen completa hasta su borde inferior, exponiendo el
      // trocito de fila que el ajuste de arriba quiso evitar.
      // El último argumento (null) es obligatorio: sin él, rect() pinta el
      // trazo del rectángulo (operador "S" de PDF) y esa pintura CIERRA la
      // ruta — el clip() + discardPath() de abajo ya no tienen una ruta
      // abierta sobre la cual actuar. El margen superior/inferior quedaba
      // bien en la página 1 (donde por casualidad no había nada debajo)
      // pero se perdía por completo desde la página 2 en adelante: el
      // contenido volvía a llenar toda la página sin respetar los márgenes.
      pdf.saveGraphicsState();
      pdf.rect(MARGEN_LATERAL, MARGEN_SUPERIOR, imgWidth, corte - posicion, null);
      pdf.clip();
      pdf.discardPath();
      pdf.addImage(imgData, 'PNG', MARGEN_LATERAL, MARGEN_SUPERIOR - posicion, imgWidth, imgHeight);
      pdf.restoreGraphicsState();
      posicion = corte;
      pagina++;
    }

    pdf.setProperties({
      title: metadatos.titulo,
      subject: 'Anexos de la declaración de renta',
      author: 'Daniela Molina Foronda',
      creator: 'Daniela Molina Foronda — Contadora Pública',
    });

    const totalPaginas = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      pdf.setPage(i);

      // Encabezado corrido: la primera página ya trae su propio título
      // grande "horneado" en la imagen capturada (logo + nombre del
      // cliente), así que este encabezado chico solo se dibuja desde la
      // página 2 en adelante, para no duplicarlo.
      if (i > 1 && metadatos.encabezadoIzquierda) {
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(30, 41, 59);
        pdf.text(metadatos.encabezadoIzquierda, MARGEN_LATERAL, 24);
        if (metadatos.encabezadoDerecha) {
          pdf.setFont(undefined, 'normal');
          pdf.text(metadatos.encabezadoDerecha, pageWidth - MARGEN_LATERAL, 24, { align: 'right' });
        }
        pdf.setDrawColor(195, 154, 59);
        pdf.setLineWidth(1.2);
        pdf.line(MARGEN_LATERAL, 32, pageWidth - MARGEN_LATERAL, 32);
      }

      pdf.setDrawColor(195, 154, 59);
      pdf.setLineWidth(0.5);
      pdf.line(MARGEN_LATERAL, pageHeight - 32, pageWidth - MARGEN_LATERAL, pageHeight - 32);
      pdf.setFontSize(8);
      pdf.setTextColor(120, 128, 138);
      pdf.text(FIRMA_ASESORA, MARGEN_LATERAL, pageHeight - 18);
      pdf.text(`Página ${i} de ${totalPaginas}`, pageWidth - MARGEN_LATERAL, pageHeight - 18, { align: 'right' });
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
      await descargarPDF(contenedorRef.current, archivo, {
        titulo: `Anexos de la declaración de renta — ${cliente.nombre || 'Cliente'} — ${cliente.anioGravable}`,
        encabezadoIzquierda: `ANEXOS DECLARACIÓN DE RENTA ${cliente.anioGravable}`,
        encabezadoDerecha: cliente.nombre || 'Cliente',
      });
    } finally {
      setGenerandoPDF(false);
    }
  }

  return (
    <div className="modal-fondo" onClick={onCerrar}>
      <div className="tarjeta modal ancho anexos-declaracion" ref={contenedorRef} onClick={(e) => e.stopPropagation()}>
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
            <li>Notas y términos</li>
          </ol>
        </nav>

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

        <section className="anexos-seccion anexos-glosario">
          <h3>Notas y términos</h3>
          <dl>
            {anexos.glosario.map((g) => (
              <React.Fragment key={g.termino}>
                <dt>{g.termino}</dt>
                <dd>{g.definicion}</dd>
              </React.Fragment>
            ))}
          </dl>
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
