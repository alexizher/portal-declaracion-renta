import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export const FIRMA_ASESORA = 'Daniela Molina Foronda · Contadora Pública · Asesora Tributaria · 311 780 9709';
const FIRMA_CORTA = 'Daniela Molina Foronda · Contadora Pública';

const COLOR = {
  fondo: '#fbf8f6',
  borde: '#e3ddd4',
  texto: '#2b3440',
  tenue: '#7b8794',
  primario: '#152a45',
  primarioOsc: '#0e1e33',
  acento: '#c39a3b',
  alertaFondo: '#fdf3d7',
  alertaTexto: '#8a6d1a',
  sobrePrimario: 'rgba(255, 255, 255, 0.72)', // texto tenue sobre fondo azul marino
  panelPrimario: 'rgba(255, 255, 255, 0.07)', // panel "Contenido" de la portada
};

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatoFecha(fecha) {
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 72,
    paddingBottom: 46,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: COLOR.texto,
  },
  // Franja azul marino a todo el ancho (ignora el padding de la página
  // porque es absoluta respecto al Page, no a su caja de contenido) con la
  // barra dorada justo debajo, igual que la portada.
  headerFixed: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: COLOR.primario,
    borderBottomWidth: 4,
    borderBottomColor: COLOR.acento,
    paddingVertical: 11,
    paddingHorizontal: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitulo: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 0.4 },
  headerCliente: { fontSize: 8.5, color: COLOR.sobrePrimario },
  footerFixed: {
    position: 'absolute',
    bottom: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: COLOR.acento,
    paddingTop: 5,
  },
  footerTexto: { fontSize: 7, color: COLOR.tenue },

  // ---- Portada ----
  portada: {
    backgroundColor: COLOR.primario,
    paddingHorizontal: 40,
    paddingBottom: 40,
    fontFamily: 'Helvetica',
    height: '100%',
    flexDirection: 'column',
  },
  portadaEspacio: { flexGrow: 1 },
  portadaEtiqueta: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLOR.acento,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: 10,
  },
  portadaBarra: { height: 6, backgroundColor: COLOR.acento, marginBottom: 22 },
  portadaTitulo: { fontSize: 30, fontFamily: 'Helvetica-Bold', color: '#fff', marginBottom: 26 },
  portadaPreparadoPara: { fontSize: 9, color: COLOR.sobrePrimario, marginBottom: 4 },
  portadaNombre: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#fff', marginBottom: 3 },
  portadaCedula: { fontSize: 9.5, color: COLOR.sobrePrimario },
  portadaPanel: {
    backgroundColor: COLOR.panelPrimario,
    borderRadius: 4,
    padding: 14,
    marginTop: 34,
  },
  portadaPanelTitulo: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLOR.acento,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  portadaPanelItem: { fontSize: 9.5, color: '#fff', marginBottom: 5, lineHeight: 1.3 },
  portadaPieLinea: { borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.25)', marginTop: 30, paddingTop: 10 },
  portadaPieFila: { flexDirection: 'row', justifyContent: 'space-between' },
  portadaPieTexto: { fontSize: 8, color: COLOR.sobrePrimario },

  tituloDoc: { fontSize: 15, fontFamily: 'Helvetica-Bold', color: COLOR.primario, marginBottom: 2 },
  subTexto: { fontSize: 8.5, color: COLOR.tenue, marginBottom: 10, lineHeight: 1.4 },

  advertenciaBox: {
    borderWidth: 1,
    borderColor: COLOR.acento,
    backgroundColor: COLOR.alertaFondo,
    borderRadius: 5,
    padding: 8,
    marginBottom: 12,
  },
  advertenciaTitulo: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: COLOR.alertaTexto,
    marginBottom: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  advertenciaItem: { fontSize: 8.5, color: COLOR.texto, marginBottom: 2, lineHeight: 1.35 },

  resumenRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 14 },
  stat: {
    flexGrow: 1,
    flexBasis: 150,
    borderRadius: 4,
    backgroundColor: COLOR.acento,
    padding: 9,
  },
  statEnfasis: { backgroundColor: COLOR.primario },
  statLabel: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: 'rgba(255,255,255,0.85)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  statValor: { fontSize: 11.5, fontFamily: 'Helvetica-Bold', color: '#fff' },

  seccion: { borderTopWidth: 1, borderTopColor: COLOR.borde, paddingTop: 14, marginTop: 16 },
  seccionDestacada: {
    borderTopWidth: 0,
    backgroundColor: COLOR.fondo,
    borderWidth: 1,
    borderColor: COLOR.borde,
    borderLeftWidth: 4,
    borderLeftColor: COLOR.acento,
    borderRadius: 4,
    padding: 10,
    marginTop: 16,
  },
  seccionTitulo: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: COLOR.primario,
    borderLeftWidth: 3,
    borderLeftColor: COLOR.acento,
    paddingLeft: 6,
    marginBottom: 4,
  },
  seccionParrafo: { fontSize: 8.3, color: COLOR.tenue, lineHeight: 1.4 },

  bloque: { marginTop: 10 },
  bloqueCabecera: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: COLOR.acento,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    paddingVertical: 4.5,
    paddingHorizontal: 8,
  },
  bloqueCabeceraTexto: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  fila: {
    flexDirection: 'row',
    paddingVertical: 3.5,
    paddingHorizontal: 8,
  },
  filaPar: { backgroundColor: COLOR.fondo },
  filaEtiqueta: { flex: 1, fontSize: 8.3, paddingRight: 8 },
  filaValor: { width: 85, textAlign: 'right', fontFamily: 'Helvetica-Bold', fontSize: 8.3 },

  resumenFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    padding: 12,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: COLOR.primario,
    backgroundColor: COLOR.alertaFondo,
  },
  resumenFinalEtiqueta: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLOR.primario },
  resumenFinalValor: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: COLOR.primario },

  glosarioSeccion: { marginTop: 18 },
  conclusionParrafo: { fontSize: 8.8, color: COLOR.texto, lineHeight: 1.5, marginTop: 9 },
  conclusionNota: {
    fontSize: 7.8,
    fontFamily: 'Helvetica-Oblique',
    color: COLOR.tenue,
    lineHeight: 1.4,
    marginTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: COLOR.borde,
    paddingTop: 10,
  },
});

// Espacio mínimo (pt) que debe quedar debajo de un encabezado para que valga
// la pena empezarlo en esta página: si no caben el rótulo del bloque y unas
// 4 filas de tabla después del título, react-pdf lo baja entero a la página
// siguiente. Sin esto quedaban títulos (o una fila suelta) colgando al pie,
// con el cuerpo de la sección arrancando en la página de al lado — en las
// secciones destacadas se veía además el marco de la tarjeta vacío.
const ESPACIO_MINIMO_TRAS_TITULO = 110;

// Cada fila queda con wrap={false} para que nunca se corte a la mitad por un
// salto de página; el bloque completo (rótulo + tabla) también, así el
// rótulo "Qué se declaró"/"Cómo se calculó" nunca queda huérfano separado de
// su tabla. React-pdf ya sabe medir esto solo — nada de recortes a mano.
function TablaBloque({ etiqueta, items }) {
  if (!items || items.length === 0) return null;
  return (
    <View style={styles.bloque} wrap={false}>
      <View style={styles.bloqueCabecera}>
        <Text style={styles.bloqueCabeceraTexto}>{etiqueta}</Text>
        <Text style={styles.bloqueCabeceraTexto}>Valor</Text>
      </View>
      <View style={{ borderWidth: 1, borderTopWidth: 0, borderColor: COLOR.borde }}>
        {items.map((item, i) => (
          <View key={i} style={i % 2 === 1 ? { ...styles.fila, ...styles.filaPar } : styles.fila}>
            <Text style={styles.filaEtiqueta}>{item.etiqueta}</Text>
            <Text style={styles.filaValor}>{formatoPesos(item.valor)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// Cuántas filas de tabla trae la sección en total: las secciones cortas caben
// enteras en una página, así que se marcan como indivisibles (wrap={false})
// y se mueven completas — es la única forma de que la tarjeta de una sección
// "destacada" no se dibuje vacía al pie con el título adentro y las filas en
// la página siguiente. Las secciones largas sí se dejan partir (si no, no
// cabrían en ninguna página), protegidas fila a fila por TablaBloque.
const FILAS_MAX_SECCION_INDIVISIBLE = 12;

function Seccion({ s }) {
  const totalFilas = (s.declarado?.length || 0) + (s.calculo?.length || 0);
  const indivisible = totalFilas <= FILAS_MAX_SECCION_INDIVISIBLE;
  return (
    <View
      style={s.destacada ? styles.seccionDestacada : styles.seccion}
      wrap={!indivisible}
      minPresenceAhead={ESPACIO_MINIMO_TRAS_TITULO}
    >
      <View wrap={false}>
        <Text style={styles.seccionTitulo}>{s.titulo}</Text>
        {s.parrafo && <Text style={styles.seccionParrafo}>{s.parrafo}</Text>}
      </View>
      <TablaBloque etiqueta="Qué se declaró" items={s.declarado} />
      {s.notaAnticipo && <Text style={[styles.seccionParrafo, { marginTop: 6 }]}>{s.notaAnticipo}</Text>}
      <TablaBloque etiqueta="Cómo se calculó" items={s.calculo} />
    </View>
  );
}

// Portada de color completo, en su propia página: no comparte header/footer
// con las páginas de contenido (esas sí lo llevan fijo via `fixed`).
function Portada({ anexos, cliente }) {
  return (
    <Page size="A4" style={{ padding: 0 }}>
      <View style={styles.portada}>
        <View style={styles.portadaEspacio} />

        <Text style={styles.portadaEtiqueta}>Anexo declaración de renta</Text>
        <View style={styles.portadaBarra} />
        <Text style={styles.portadaTitulo}>AÑO GRAVABLE {cliente.anioGravable}</Text>

        <Text style={styles.portadaPreparadoPara}>Preparado para:</Text>
        <Text style={styles.portadaNombre}>{cliente.nombre || 'Cliente'}</Text>
        <Text style={styles.portadaCedula}>C.C. {cliente.cedula || 'sin cédula'}</Text>

        <View style={styles.portadaPanel}>
          <Text style={styles.portadaPanelTitulo}>Contenido</Text>
          {anexos.secciones.map((s) => (
            <Text key={s.id} style={styles.portadaPanelItem}>• {s.titulo}</Text>
          ))}
          <Text style={styles.portadaPanelItem}>• Conclusiones de la renta</Text>
        </View>

        <View style={styles.portadaEspacio} />

        <View style={styles.portadaPieLinea}>
          <View style={styles.portadaPieFila}>
            <Text style={styles.portadaPieTexto}>{FIRMA_CORTA}</Text>
            <Text style={styles.portadaPieTexto}>Elaborado el {formatoFecha(anexos.generado)}</Text>
          </View>
        </View>
      </View>
    </Page>
  );
}

export default function AnexosPDF({ anexos, cliente }) {
  const encabezadoIzquierda = `ANEXOS DECLARACIÓN DE RENTA ${cliente.anioGravable}`;
  const encabezadoDerecha = cliente.nombre || 'Cliente';

  return (
    <Document
      title={`Anexos de la declaración de renta — ${cliente.nombre || 'Cliente'} — ${cliente.anioGravable}`}
      subject="Anexos de la declaración de renta"
      author="Daniela Molina Foronda"
      creator="Daniela Molina Foronda — Contadora Pública"
    >
      <Portada anexos={anexos} cliente={cliente} />
      <Page size="A4" style={styles.page} wrap>
        <View style={styles.headerFixed} fixed>
          <Text style={styles.headerTitulo}>{encabezadoIzquierda}</Text>
          <Text style={styles.headerCliente}>{encabezadoDerecha}</Text>
        </View>
        <View style={styles.footerFixed} fixed>
          <Text style={styles.footerTexto}>{FIRMA_ASESORA}</Text>
          <Text style={styles.footerTexto} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
        </View>

        <View wrap={false}>
          <Text style={styles.tituloDoc}>Resumen ejecutivo</Text>
          <Text style={styles.subTexto}>
            Cifras principales de la declaración de renta — año gravable {cliente.anioGravable}
          </Text>
        </View>

        {anexos.advertencias.length > 0 && (
          <View style={styles.advertenciaBox} wrap={false}>
            <Text style={styles.advertenciaTitulo}>Advertencias — revisar antes de enviar</Text>
            {anexos.advertencias.map((a, i) => (
              <Text key={i} style={styles.advertenciaItem}>
                • {a}
              </Text>
            ))}
          </View>
        )}

        <View style={styles.resumenRow} wrap={false}>
          {anexos.resumenEjecutivo.map((item, i) => (
            <View key={i} style={item.enfasis ? { ...styles.stat, ...styles.statEnfasis } : styles.stat}>
              <Text style={styles.statLabel}>{item.etiqueta}</Text>
              <Text style={styles.statValor}>{formatoPesos(item.valor)}</Text>
            </View>
          ))}
        </View>

        {anexos.secciones.map((s) => (
          <Seccion key={s.id} s={s} />
        ))}

        <View style={styles.resumenFinal} wrap={false}>
          <Text style={styles.resumenFinalEtiqueta}>{anexos.resumenFinal.etiqueta}</Text>
          <Text style={styles.resumenFinalValor}>{formatoPesos(anexos.resumenFinal.valor)}</Text>
        </View>

        {/* Las conclusiones cierran el documento y entran completas en una
            página: wrap={false} las mantiene enteras en vez de dejar un
            párrafo suelto como única cosa en la última hoja. */}
        <View style={styles.glosarioSeccion} wrap={false}>
          <Text style={styles.seccionTitulo}>Conclusiones de la renta</Text>
          <Text style={styles.seccionParrafo}>
            Cierre de la declaración de renta persona natural — año gravable {cliente.anioGravable}
          </Text>
          {anexos.conclusiones.map((parrafo, i) => (
            <Text key={i} style={styles.conclusionParrafo}>{parrafo}</Text>
          ))}
          <Text style={styles.conclusionNota}>{anexos.notaConclusiones}</Text>
        </View>
      </Page>
    </Document>
  );
}
