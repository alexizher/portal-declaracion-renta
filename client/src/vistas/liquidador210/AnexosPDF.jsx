import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

export const FIRMA_ASESORA = 'Daniela Molina Foronda · Contadora Pública · Asesora Tributaria · 311 780 9709';

const COLOR = {
  fondo: '#fbf8f6',
  borde: '#e3ddd4',
  texto: '#2b3440',
  tenue: '#7b8794',
  primario: '#152a45',
  acento: '#c39a3b',
  alertaFondo: '#fdf3d7',
  alertaTexto: '#8a6d1a',
};

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function formatoFecha(fecha) {
  return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

const styles = StyleSheet.create({
  page: {
    paddingTop: 46,
    paddingBottom: 46,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: 'Helvetica',
    color: COLOR.texto,
  },
  headerFixed: {
    position: 'absolute',
    top: 22,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderBottomWidth: 1.5,
    borderBottomColor: COLOR.acento,
    paddingBottom: 5,
  },
  headerTitulo: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: COLOR.primario, letterSpacing: 0.3 },
  headerCliente: { fontSize: 8.5, color: COLOR.primario },
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
    flexBasis: 110,
    borderWidth: 1,
    borderColor: COLOR.borde,
    borderTopWidth: 3,
    borderTopColor: COLOR.primario,
    borderRadius: 5,
    backgroundColor: COLOR.fondo,
    padding: 7,
  },
  statEnfasis: { borderColor: COLOR.acento, borderTopColor: COLOR.acento },
  statLabel: { fontSize: 6.3, fontFamily: 'Helvetica-Bold', color: COLOR.tenue, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  statValor: { fontSize: 10.5, fontFamily: 'Helvetica-Bold', color: COLOR.primario },

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

  bloque: { marginTop: 9 },
  bloqueEtiqueta: {
    fontSize: 6.3,
    fontFamily: 'Helvetica-Bold',
    color: COLOR.alertaTexto,
    backgroundColor: COLOR.alertaFondo,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 7,
    alignSelf: 'flex-start',
    marginBottom: 3,
  },
  fila: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: COLOR.borde,
    borderBottomStyle: 'dashed',
    paddingVertical: 3,
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
  glosarioItem: { marginTop: 8 },
  glosarioTermino: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLOR.primario },
  glosarioDefinicion: { fontSize: 8.3, color: COLOR.texto, marginTop: 1, lineHeight: 1.4 },
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
      <Text style={styles.bloqueEtiqueta}>{etiqueta}</Text>
      {items.map((item, i) => (
        <View key={i} style={i % 2 === 1 ? { ...styles.fila, ...styles.filaPar } : styles.fila}>
          <Text style={styles.filaEtiqueta}>{item.etiqueta}</Text>
          <Text style={styles.filaValor}>{formatoPesos(item.valor)}</Text>
        </View>
      ))}
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
          <Text style={styles.tituloDoc}>Anexos de la declaración de renta</Text>
          <Text style={styles.subTexto}>
            {cliente.nombre || 'Cliente'} · {cliente.cedula || 'sin cédula'} · Año gravable {cliente.anioGravable} · Generado el{' '}
            {formatoFecha(anexos.generado)}
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

        {/* El glosario cierra el documento y entra completo en una página:
            wrap={false} lo mantiene entero en vez de dejar dos o tres
            términos sueltos como única cosa en la última hoja. */}
        <View style={styles.glosarioSeccion} wrap={false}>
          <Text style={styles.seccionTitulo}>Notas y términos</Text>
          {anexos.glosario.map((g) => (
            <View key={g.termino} style={styles.glosarioItem} wrap={false}>
              <Text style={styles.glosarioTermino}>{g.termino}</Text>
              <Text style={styles.glosarioDefinicion}>{g.definicion}</Text>
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
