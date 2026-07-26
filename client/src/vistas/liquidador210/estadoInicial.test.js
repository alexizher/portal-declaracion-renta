import { describe, it, expect } from 'vitest';
import { crearEstadoInicial, fusionarConEstadoInicial } from './estadoInicial.js';

describe('fusionarConEstadoInicial', () => {
  it('rellena campos nuevos que el estado guardado (versión anterior) no tenía', () => {
    // Simula un estado guardado ANTES de que existieran rentasExentasLimitadas/
    // rentasExentasNoLimitadas (Fase 2) — el campo viejo ya no existe en la plantilla.
    const estadoViejo = {
      anioGravable: 2025,
      cliente: { nombre: 'Cliente Viejo', cedula: '123' },
      trabajo: {
        ingresos: { salarios: 5000000 },
        rentasExentasEspecialesNoLimitadas: 100000, // campo obsoleto
      },
    };

    const fusionado = fusionarConEstadoInicial(estadoViejo);

    expect(fusionado.cliente.nombre).toBe('Cliente Viejo');
    expect(fusionado.cliente.cedula).toBe('123');
    expect(fusionado.cliente.tipoDocumento).toBe('cedula'); // campo nuevo, valor por defecto
    expect(fusionado.trabajo.ingresos.salarios).toBe(5000000);
    expect(fusionado.trabajo.rentasExentasLimitadas).toEqual(crearEstadoInicial().trabajo.rentasExentasLimitadas);
    expect(fusionado.trabajo.rentasExentasNoLimitadas).toEqual(crearEstadoInicial().trabajo.rentasExentasNoLimitadas);
    expect(fusionado.trabajo.rentasExentasEspecialesNoLimitadas).toBeUndefined();
  });

  it('conserva arreglos guardados tal cual (no los fusiona elemento por elemento)', () => {
    const estadoViejo = {
      filasRetenciones: [{ agenteRetenedor: 'Banco X', concepto: 'Rendimientos', retencion: 5000 }],
    };
    const fusionado = fusionarConEstadoInicial(estadoViejo);
    expect(fusionado.filasRetenciones).toEqual([{ agenteRetenedor: 'Banco X', concepto: 'Rendimientos', retencion: 5000 }]);
  });

  it('sin estado guardado devuelve la plantilla por defecto', () => {
    expect(fusionarConEstadoInicial(null)).toEqual(crearEstadoInicial());
    expect(fusionarConEstadoInicial(undefined)).toEqual(crearEstadoInicial());
  });
});
