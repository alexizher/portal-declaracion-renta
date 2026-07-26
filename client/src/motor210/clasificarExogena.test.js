import { describe, it, expect } from 'vitest';
import { parsearReporteExogena, clasificarFilasExogena, agruparSugerencias, _internos } from './clasificarExogena.js';
import { crearEstadoInicial } from '../vistas/liquidador210/estadoInicial.js';

function existeRuta(objeto, ruta) {
  let nodo = objeto;
  for (const parte of ruta) {
    if (nodo == null || !(parte in nodo)) return false;
    nodo = nodo[parte];
  }
  return true;
}

// Auditoría sistemática: TODO campo que el clasificador puede llegar a
// producir debe existir de verdad en el estado del wizard — si no, el
// valor se guarda en una clave huérfana que ningún input muestra y que el
// motor de cálculo ignora en silencio (así se perdieron $7.089.349 de
// "Otros pagos Rentas de trabajo" en un caso real: el campo por defecto
// para trabajo era "otros" pero el campo real se llama
// "otrosPagosLaborales"). Este test existe para que ese tipo de bug nunca
// vuelva a pasar inadvertido.
describe('clasificarExogena — auditoría de que todos los campos destino existen', () => {
  const estado = crearEstadoInicial(2025);

  it('cada campo de PALABRAS_CLAVE_INGRESO existe en <cedula>.ingresos', () => {
    for (const [cedula, reglas] of Object.entries(_internos.PALABRAS_CLAVE_INGRESO)) {
      for (const [, campo] of reglas) {
        expect(existeRuta(estado, [cedula, 'ingresos', campo]), `${cedula}.ingresos.${campo}`).toBe(true);
      }
    }
  });

  it('el campo por defecto ("otros") de cada cédula existe en <cedula>.ingresos', () => {
    for (const [cedula, campo] of Object.entries(_internos.CAMPO_OTROS_POR_CEDULA)) {
      expect(existeRuta(estado, [cedula, 'ingresos', campo]), `${cedula}.ingresos.${campo}`).toBe(true);
    }
  });

  it('cada campo de PALABRAS_CLAVE_INCRNGO_TRABAJO existe en trabajo.incrngo', () => {
    for (const [, campo] of _internos.PALABRAS_CLAVE_INCRNGO_TRABAJO) {
      expect(existeRuta(estado, ['trabajo', 'incrngo', campo]), `trabajo.incrngo.${campo}`).toBe(true);
    }
  });

  it('cada campo de PALABRAS_CLAVE_PATRIMONIO_ACTIVO existe en activosPatrimonio', () => {
    for (const [, campo] of _internos.PALABRAS_CLAVE_PATRIMONIO_ACTIVO) {
      expect(existeRuta(estado, ['activosPatrimonio', campo]), `activosPatrimonio.${campo}`).toBe(true);
    }
  });

  it('cada destino de RENGLON_A_SECCION resuelve a una ruta válida del estado (o es un destino especial conocido)', () => {
    const DESTINOS_SIN_RUTA_DIRECTA = ['ingreso', 'incrngo', 'patrimonioActivo', 'retencion', 'fueraDeAlcance']; // se resuelven con una tabla de palabras clave aparte, ya cubiertas arriba
    for (const [renglon, seccion] of Object.entries(_internos.RENGLON_A_SECCION)) {
      if (DESTINOS_SIN_RUTA_DIRECTA.includes(seccion.destino)) continue;
      if (seccion.destino === 'afcPension') {
        expect(existeRuta(estado, [seccion.cedula, 'afcPensionVoluntaria']), `R${renglon}: ${seccion.cedula}.afcPensionVoluntaria`).toBe(true);
      } else if (seccion.destino === 'patrimonioDeuda') {
        expect(existeRuta(estado, ['deudasPatrimonio']), `R${renglon}: deudasPatrimonio`).toBe(true);
      } else if (seccion.destino === 'saldoAFavorAnioAnterior') {
        expect(existeRuta(estado, ['saldoAFavorAnioAnteriorSinSolicitud']), `R${renglon}: saldoAFavorAnioAnteriorSinSolicitud`).toBe(true);
      }
    }
  });
});

// Filas sintéticas que replican los PATRONES reales observados en reportes
// de MUISCA (estructura y frases de "Uso declaración Sugerida" reales),
// con cifras y nombres inventados — nunca datos reales de un cliente.
const ENCABEZADO = ['NIT', 'Nombre / Razón Social', 'NIT', 'Nombre/Razón Social reportada por el tercero', 'Detalle', 'Valor', 'Uso declaración Sugerida', 'Información  Adicional '];

function filasSinteticas() {
  return [
    [],
    [],
    [],
    [],
    [],
    ['Tipo de documento:', '', 'C. C.', '', '', '', '', ''],
    ['Identificación:', '', '123456789', '', '', '', '', ''],
    ['Nombres / Razón social:', '', 'CLIENTE EJEMPLO', '', '', '', '', ''],
    [],
    [],
    [],
    [],
    [],
    ENCABEZADO,
    ['', '', '', '', 'Tope 1 - Ingresos', 50000000, '', ''],
    ['', '', '', '', 'Tope 2 - Patrimonio', 80000000, '', ''],
    [900111222, 'BANCO EJEMPLO S.A.', 123456789, 'CLIENTE EJEMPLO', 'Saldo cuentas bancarias (Titular Principal)', 2000000, 'Tope 2: Patrimonio | R29 Patrimonio Bruto (si el saldo es positivo)| R30 Deudas  (si el saldo es negativo)', ''],
    [900111222, 'BANCO EJEMPLO S.A.', 123456789, 'CLIENTE EJEMPLO', 'CDT Rendimientos Pagados (Informado principal) (Concepto: 1020)', 15000, 'Tope 1: Ingresos brutos | R58 Ingresos brutos por rentas de capital | R59 Ingresos no constitutivos por rentas de capital', ''],
    [900111222, 'BANCO EJEMPLO S.A.', 123456789, 'CLIENTE EJEMPLO', 'CDT Retención prácticada (Concepto: 1020)', 300, 'R132 Retenciones año gravable a declarar', ''],
    [900111222, 'BANCO EJEMPLO S.A.', 123456789, 'CLIENTE EJEMPLO', 'CDT Retención prácticada (Concepto: 1020)', 200, 'R132 Retenciones año gravable a declarar', ''],
    [900333444, 'EMPRESA PAGADORA S.A.S.', 123456789, 'CLIENTE EJEMPLO', 'Pagos por salarios (Concepto: 2276)', 40000000, 'Tope 1: Ingresos brutos | R32 Ingresos brutos por rentas de trabajo (art. 103 E.T.)', ''],
    [900333444, 'EMPRESA PAGADORA S.A.S.', 123456789, 'CLIENTE EJEMPLO', 'Aportes obligatorios a salud a cargo Trabajador (Concepto: 2276)', 1800000, 'Ingresos no constitutivos de renta | Asignación según el tipo de renta: R33 (Trabajo) / R59 (Capital) / R100 (Pensiones)', ''],
    [900333444, 'EMPRESA PAGADORA S.A.S.', 123456789, 'CLIENTE EJEMPLO', 'Pagos por alimentación hasta a 41 UVT (Concepto: 2276)', 1200000, 'No aplica', ''],
    [900555666, 'COOPERATIVA X', 123456789, 'CLIENTE EJEMPLO', 'Aportes a cuentas AFC (Concepto: 2276)', 900000, 'R35 Rentas exentas y deducciones imputables a las rentas de trabajo', ''],
    [900777888, 'DIAN', 123456789, 'CLIENTE EJEMPLO', 'Monto total de facturación electrónica susceptible de beneficio', 5000000, '', ''],
    [900777888, 'DIAN', 123456789, 'CLIENTE EJEMPLO', 'Suma valor total facturas tras ajustes por notas', 5200000, 'Tope 5: Compras registradas en Factura Electrónica', ''],
    [123456789, 'CLIENTE EJEMPLO', 123456789, 'CLIENTE EJEMPLO', 'Total saldo a favor', 0, 'anterior sin solicitud de devolución y/o compensación', ''],
    [900999000, 'FIDUCIARIA X', 123456789, 'CLIENTE EJEMPLO', 'Inversiones en fondos de inversión colectiva realizadas durante el año (Titular Principal)', 3000000, 'Tope 4: Consignaciones e inversiones', ''],
    [900999000, 'SOCIEDAD Y', 123456789, 'CLIENTE EJEMPLO', 'Valor recibido Participación dividendo exigible 2017 y sig. Num.3 Art.49 E.T. (Concepto: 5071)', 250000, 'Tope 1: Ingresos brutos | R107 1a Subcédula año 2017 y siguientes numeral 3 art 49 del E.T:', ''],
    // Caso real reportado: caía en un campo "otros" que no existe para trabajo.
    [900111333, 'EMPLEADOR EJEMPLO S.A.S.', 123456789, 'CLIENTE EJEMPLO', 'Otros pagos Rentas de trabajo y pensión (Concepto: 2276)', 7089349, 'Tope 1: Ingresos brutos | R32 Ingresos brutos por rentas de trabajo (art. 103 E.T.)', ''],
    // Caso real reportado: la DIAN sugiere R29 (patrimonio) primero, pero
    // también debe llegar a la cédula de trabajo (R36 rentas exentas).
    [900444555, 'FONDO DE CESANTIAS EJEMPLO', 123456789, 'CLIENTE EJEMPLO', 'Cesantías consignadas al fondo de cesantías (Concepto: 2276)', 6670902, 'Tope 2: Patrimonio | R29 Patrimonio Bruto | R36 Otras rentas exentas', ''],
  ];
}

describe('parsearReporteExogena', () => {
  it('reconoce el encabezado real y separa topes de detalle', () => {
    const r = parsearReporteExogena(filasSinteticas());
    expect(r.reconocido).toBe(true);
    expect(r.topes).toHaveLength(2);
    expect(r.detalle.length).toBeGreaterThan(5);
  });

  it('devuelve reconocido:false si no encuentra el encabezado esperado', () => {
    const r = parsearReporteExogena([['algo', 'distinto']]);
    expect(r.reconocido).toBe(false);
  });

  it('extrae la cédula y el nombre del consultante desde los metadatos del archivo', () => {
    const r = parsearReporteExogena(filasSinteticas());
    expect(r.consultante.cedula).toBe('123456789');
    expect(r.consultante.nombre).toBe('CLIENTE EJEMPLO');
  });
});

describe('clasificarFilasExogena', () => {
  const { detalle } = parsearReporteExogena(filasSinteticas());
  const { sugerencias, sinClasificar } = clasificarFilasExogena(detalle);
  const { campos, filasRetenciones } = agruparSugerencias(sugerencias);

  function valorDe(ruta) {
    return campos.find((c) => c.ruta.join('.') === ruta)?.valor;
  }

  it('patrimonio: saldo de cuenta bancaria va a activosPatrimonio.efectivo (R29)', () => {
    // Incluye también la cesantías-fondo (2.000.000 + 6.670.902) — ver el
    // test dedicado más abajo para el desglose de ese caso especial.
    expect(valorDe('activosPatrimonio.efectivo')).toBe(2000000 + 6670902);
  });

  it('capital: rendimientos de CDT van a capital.ingresos.rendimientosEntidadesFinancieras (R58)', () => {
    expect(valorDe('capital.ingresos.rendimientosEntidadesFinancieras')).toBe(15000);
  });

  it('retenciones se consolidan por agente retenedor (2 filas de 300+200 = 500)', () => {
    expect(filasRetenciones).toHaveLength(1);
    expect(filasRetenciones[0].retencion).toBe(500);
  });

  it('trabajo: salarios van a trabajo.ingresos.salarios (R32)', () => {
    expect(valorDe('trabajo.ingresos.salarios')).toBe(40000000);
  });

  it('trabajo: aportes obligatorios de salud van a trabajo.incrngo.saludObligatoria (R33 + palabra clave)', () => {
    expect(valorDe('trabajo.incrngo.saludObligatoria')).toBe(1800000);
  });

  it('caso especial: alimentación 41 UVT sin renglón usable ("No aplica") va a INGRESOS (el motor calcula el INCRNGO solo)', () => {
    expect(valorDe('trabajo.ingresos.pagosAlimentacion')).toBe(1200000);
    expect(valorDe('trabajo.incrngo.pagosAlimentacion')).toBeUndefined();
  });

  it('AFC (R35) va a trabajo.afcPensionVoluntaria', () => {
    expect(valorDe('trabajo.afcPensionVoluntaria')).toBe(900000);
  });

  it('caso real: "Otros pagos Rentas de trabajo" cae en otrosPagosLaborales, NO en un campo "otros" inexistente', () => {
    expect(valorDe('trabajo.ingresos.otrosPagosLaborales')).toBe(7089349);
    expect(valorDe('trabajo.ingresos.otros')).toBeUndefined();
  });

  it('caso real: "Cesantías consignadas al fondo" llega a trabajo.ingresos.cesantiasFondo Y a activosPatrimonio.efectivo (la DIAN sugiere ambos renglones)', () => {
    expect(valorDe('trabajo.ingresos.cesantiasFondo')).toBe(6670902);
    expect(valorDe('activosPatrimonio.efectivo')).toBe(2000000 + 6670902);
  });

  it('caso especial: "facturación electrónica susceptible de beneficio" va a comprasConFacturaElectronica', () => {
    expect(valorDe('comprasConFacturaElectronica')).toBe(5000000);
  });

  it('"facturas tras ajustes por notas" (duplicado del Tope 5) NO se prellena — queda sin clasificar', () => {
    expect(valorDe('comprasConFacturaElectronica')).toBe(5000000); // no se sumó el segundo valor (5.200.000)
    expect(sinClasificar.some((f) => /facturas tras ajustes/i.test(f.detalle))).toBe(true);
  });

  it('saldo a favor año anterior se reconoce aunque sea $0', () => {
    expect(valorDe('saldoAFavorAnioAnteriorSinSolicitud')).toBe(0);
  });

  it('inversiones realizadas en el año (Tope 4, sin R29) NO se prellenan — es una cifra de flujo', () => {
    expect(sinClasificar.some((f) => /realizadas durante el año/i.test(f.detalle))).toBe(true);
  });

  it('dividendos quedan fuera de alcance — nunca se prellenan', () => {
    expect(campos.some((c) => c.ruta.join('.').includes('dividendo'))).toBe(false);
    expect(sinClasificar.some((f) => /dividendo/i.test(f.motivo))).toBe(true);
  });

  it('nunca se pierde una fila: cada fila de detalle produce al menos una sugerencia o cae en sinClasificar', () => {
    // "Cesantías consignadas al fondo" es la única fila que a propósito
    // produce 2 sugerencias (trabajo + patrimonio a la vez), así que se
    // resta 1 al total de sugerencias para que la cuenta cierre 1:1 con
    // el número de filas de detalle.
    const filasConDobleSugerencia = 1;
    expect(sugerencias.length - filasConDobleSugerencia + sinClasificar.length).toBe(detalle.length);
  });
});
