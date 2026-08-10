import { describe, it, expect } from 'vitest';
import { calcularCedulaNoLaboral } from './noLaboral.js';

const CONCEPTOS_VACIOS = {
  honorarios2omastrabajadores: 0,
  compensacionServicios2omastrabajadores: 0,
  ventasMercancia: 0,
  ventasActividades: 0,
  ventasInventarios: 0,
  ventasActivosBiologicos: 0,
  construccion: 0,
  apoyosEducativos: 0,
  gananciales: 0,
  indemnizacionDanoEmergente: 0,
  indemnizacionLucroCesante: 0,
  indemnizacionSegurosDistintosVida: 0,
  retiroPensionSinPermanencia: 0,
  retiroAfcSinPermanencia: 0,
  ventaInmuebles: 0,
  ventaInversiones: 0,
  ventaActivosFijos: 0,
  colaboracionEmpresarial: 0,
  ingresosCAN: 0,
  ingresosExterior: 0,
  otros: 0,
};

const INCRNGO_VACIO = {
  saludObligatoria: 0,
  pensionObligatoria: 0,
  fondoSolidaridadPensional: 0,
  aportesARL: 0,
  aportesVoluntariosRAIS: 0,
  apoyosEducativos: 0,
  colciencias: 0,
  danoEmergente: 0,
  aportesARLIndependientes: 0,
  otros: 0,
};

const BASE = {
  ingresos: CONCEPTOS_VACIOS,
  incrngo: INCRNGO_VACIO,
  rentasExentasLimitadas: {},
  rentasExentasNoLimitadas: {},
  devolucionesRebajas: 0,
  costosYGastos: 0,
  afcPensionVoluntaria: 0,
  viviendaDigitado: 0,
  icetexDigitado: 0,
  gmfCertificado: 0,
  cesantiasParticipesIndependientes: 0,
  autoHibrido: 0,
};

const CTX = { uvt: 47065, viviendaDisponible: 1200 * 47065, icetexDisponible: 100 * 47065 };

// Mismo cliente anonimizado — no laboral: compensación por servicios
// personales con 2+ trabajadores contratados, $1.200.000 (único concepto
// de esta cédula en el caso real, CED.1 GENERAL columna J/K).
describe('calcularCedulaNoLaboral — caso dorado (cliente real AG2024, anonimizado)', () => {
  const input = {
    ...BASE,
    ingresos: { ...CONCEPTOS_VACIOS, compensacionServicios2omastrabajadores: 1200000 },
  };
  const resultado = calcularCedulaNoLaboral(input, CTX);

  it('ingresos brutos y renta líquida coinciden con el .xlsm (1.200.000, sin deducciones)', () => {
    expect(resultado.ingresosBrutos).toBe(1200000);
    expect(resultado.rentaLiquida).toBe(1200000);
  });
});

describe('calcularCedulaNoLaboral — INCRNGO completo (Fase 5, CED.1 GENERAL!J70-J86)', () => {
  it('suma salud + pensión + ARL + Colciencias + daño emergente + ARL independientes + otros', () => {
    const input = {
      ...BASE,
      ingresos: { ...CONCEPTOS_VACIOS, ventasMercancia: 10000000 },
      incrngo: { ...INCRNGO_VACIO, saludObligatoria: 500000, aportesARL: 100000, colciencias: 200000, danoEmergente: 300000, aportesARLIndependientes: 150000, otros: 50000 },
    };
    const r = calcularCedulaNoLaboral(input, CTX);
    expect(r.incrngo).toBe(500000 + 100000 + 200000 + 300000 + 150000 + 50000);
  });

  it('RAIS con tope 25% del ingreso bruto / 2.500 UVT', () => {
    const input = {
      ...BASE,
      ingresos: { ...CONCEPTOS_VACIOS, ventasMercancia: 10000000 },
      incrngo: { ...INCRNGO_VACIO, aportesVoluntariosRAIS: 5000000 },
    };
    const r = calcularCedulaNoLaboral(input, CTX);
    expect(r.incrngo).toBe(10000000 * 0.25);
  });
});

describe('calcularCedulaNoLaboral — deducciones nuevas (Fase 5)', () => {
  it('GMF se deduce al 50%', () => {
    const r = calcularCedulaNoLaboral({ ...BASE, ingresos: { ...CONCEPTOS_VACIOS, ventasMercancia: 5000000 }, gmfCertificado: 200000 }, CTX);
    expect(r.deduccionesImputablesSinDependientes).toBe(100000);
  });

  it('auto híbrido se deduce al 50%', () => {
    const r = calcularCedulaNoLaboral({ ...BASE, ingresos: { ...CONCEPTOS_VACIOS, ventasMercancia: 5000000 }, autoHibrido: 4000000 }, CTX);
    expect(r.deduccionesImputablesSinDependientes).toBe(2000000);
  });

  it('cesantías partícipes independientes topadas a 1/12 de la renta líquida de esta cédula', () => {
    // Renta líquida = 1.200.000 (ingreso, sin costos ni incrngo) → tope = 100.000
    const r = calcularCedulaNoLaboral(
      { ...BASE, ingresos: { ...CONCEPTOS_VACIOS, ventasMercancia: 1200000 }, cesantiasParticipesIndependientes: 999999999 },
      CTX
    );
    expect(r.deduccionesImputablesSinDependientes).toBe(1200000 / 12);
  });
});

describe('calcularCedulaNoLaboral — rentas exentas (Fase 5, CED.1 GENERAL!J122-J136)', () => {
  it('rentas exentas limitadas se suman a la bolsa limitada', () => {
    const input = {
      ...BASE,
      ingresos: { ...CONCEPTOS_VACIOS, ventasMercancia: 5000000 },
      rentasExentasLimitadas: { economiaNaranja: 300000, rentasVisVip: 200000 },
    };
    const r = calcularCedulaNoLaboral(input, CTX);
    expect(r.baseExentasYDeduccionesLimitadas).toBe(500000);
  });

  it('rentas exentas NO limitadas (CAN, hoteles) se exponen aparte, fuera de la bolsa limitada', () => {
    const input = {
      ...BASE,
      ingresos: { ...CONCEPTOS_VACIOS, ventasMercancia: 5000000 },
      rentasExentasNoLimitadas: { ingresosCAN: 400000, rentaHotelesConstruidos: 100000 },
    };
    const r = calcularCedulaNoLaboral(input, CTX);
    expect(r.rentasExentasNoLimitadas).toBe(500000);
    expect(r.baseExentasYDeduccionesLimitadas).toBe(0);
  });
});
