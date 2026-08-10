import { describe, it, expect } from 'vitest';
import { calcularCedulaHonorariosServicios } from './honorariosServicios.js';

const INGRESOS_VACIOS = { honorarios: 0, compensacionServicios: 0, comisionesBonificaciones: 0, ingresosExterior: 0 };

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
  ingresos: INGRESOS_VACIOS,
  incrngo: INCRNGO_VACIO,
  rentasExentasLimitadas: {},
  rentasExentasNoLimitadas: {},
  costosYGastos: 0,
  afcPensionVoluntaria: 0,
  medicinaDigitado: 0,
  viviendaDigitado: 0,
  icetexDigitado: 0,
  gmfCertificado: 0,
  cesantiasParticipesIndependientes: 0,
  autoHibrido: 0,
};

const CTX = { uvt: 47065, medicinaDisponible: 192 * 47065, viviendaDisponible: 1200 * 47065, icetexDisponible: 100 * 47065 };

describe('calcularCedulaHonorariosServicios — ingresos y costos', () => {
  it('ingresos brutos = suma de honorarios/compensación/comisiones/exterior', () => {
    const input = { ...BASE, ingresos: { honorarios: 5000000, compensacionServicios: 2000000, comisionesBonificaciones: 500000, ingresosExterior: 0 } };
    const r = calcularCedulaHonorariosServicios(input, CTX);
    expect(r.ingresosBrutos).toBe(7500000);
  });

  it('renta líquida resta costos y gastos procedentes', () => {
    const input = { ...BASE, ingresos: { ...INGRESOS_VACIOS, honorarios: 10000000 }, costosYGastos: 3000000 };
    const r = calcularCedulaHonorariosServicios(input, CTX);
    expect(r.rentaLiquida).toBe(7000000);
  });
});

describe('calcularCedulaHonorariosServicios — INCRNGO completo (Fase 5, CED.1 GENERAL!F70-F86)', () => {
  it('suma salud + pensión + ARL + Colciencias + daño emergente + ARL independientes + otros', () => {
    const input = {
      ...BASE,
      ingresos: { ...INGRESOS_VACIOS, honorarios: 20000000 },
      incrngo: { ...INCRNGO_VACIO, saludObligatoria: 1000000, pensionObligatoria: 1200000, aportesARL: 50000, colciencias: 100000, danoEmergente: 200000, aportesARLIndependientes: 80000, otros: 20000 },
    };
    const r = calcularCedulaHonorariosServicios(input, CTX);
    expect(r.incrngo).toBe(1000000 + 1200000 + 50000 + 100000 + 200000 + 80000 + 20000);
  });

  it('RAIS con tope 25% del ingreso bruto / 2.500 UVT', () => {
    const input = {
      ...BASE,
      ingresos: { ...INGRESOS_VACIOS, honorarios: 20000000 },
      incrngo: { ...INCRNGO_VACIO, aportesVoluntariosRAIS: 8000000 },
    };
    const r = calcularCedulaHonorariosServicios(input, CTX);
    expect(r.incrngo).toBe(20000000 * 0.25);
  });
});

describe('calcularCedulaHonorariosServicios — deducciones nuevas (Fase 5)', () => {
  it('GMF se deduce al 50%', () => {
    const r = calcularCedulaHonorariosServicios({ ...BASE, ingresos: { ...INGRESOS_VACIOS, honorarios: 5000000 }, gmfCertificado: 300000 }, CTX);
    expect(r.deduccionesImputablesSinDependientes).toBe(150000);
  });

  it('auto híbrido se deduce al 50%', () => {
    const r = calcularCedulaHonorariosServicios({ ...BASE, ingresos: { ...INGRESOS_VACIOS, honorarios: 5000000 }, autoHibrido: 2000000 }, CTX);
    expect(r.deduccionesImputablesSinDependientes).toBe(1000000);
  });

  it('cesantías partícipes independientes topadas a 1/12 de la renta líquida de esta cédula', () => {
    const input = { ...BASE, ingresos: { ...INGRESOS_VACIOS, honorarios: 1200000 }, cesantiasParticipesIndependientes: 999999999 };
    const r = calcularCedulaHonorariosServicios(input, CTX);
    expect(r.deduccionesImputablesSinDependientes).toBe(1200000 / 12);
  });
});

describe('calcularCedulaHonorariosServicios — rentas exentas (Fase 5, CED.1 GENERAL!F118-F136)', () => {
  it('rentas exentas limitadas se suman a la bolsa limitada', () => {
    const input = {
      ...BASE,
      ingresos: { ...INGRESOS_VACIOS, honorarios: 10000000 },
      rentasExentasLimitadas: { indemnizacionAccidenteTrabajo: 500000, gastosEntierroTrabajador: 300000 },
    };
    const r = calcularCedulaHonorariosServicios(input, CTX);
    expect(r.baseExentasYDeduccionesLimitadas).toBe(800000);
  });

  it('rentas exentas NO limitadas (CAN, hoteles) se exponen aparte', () => {
    const input = {
      ...BASE,
      ingresos: { ...INGRESOS_VACIOS, honorarios: 10000000 },
      rentasExentasNoLimitadas: { ingresosCAN: 700000, rentaHotelesConstruidos: 100000 },
    };
    const r = calcularCedulaHonorariosServicios(input, CTX);
    expect(r.rentasExentasNoLimitadas).toBe(800000);
    expect(r.baseExentasYDeduccionesLimitadas).toBe(0);
  });
});
