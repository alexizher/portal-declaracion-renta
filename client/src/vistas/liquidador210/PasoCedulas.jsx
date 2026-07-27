import React, { useState } from 'react';
import { SeccionConceptos, CampoDinero } from './campos.jsx';
import {
  CONCEPTOS_INGRESOS_TRABAJO,
  CONCEPTOS_INCRNGO_TRABAJO,
  CONCEPTOS_DEDUCCIONES_TRABAJO,
  CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_TRABAJO,
  CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_TRABAJO,
  CONCEPTOS_INGRESOS_HONORARIOS,
  CONCEPTOS_INGRESOS_CAPITAL,
  CONCEPTOS_COSTOS_GASTOS_CAPITAL,
  CONCEPTOS_INGRESOS_NO_LABORAL,
  CONCEPTOS_INGRESOS_PENSIONES,
  CONCEPTOS_INGRESOS_EXTERIOR_PENSIONES,
  CONCEPTOS_INCRNGO_PENSIONES,
  CONCEPTOS_DIVIDENDOS_2016,
} from './conceptos.js';

function Colapsable({ titulo, resumen, abiertoInicial, children }) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  return (
    <div className="tarjeta">
      <button
        type="button"
        className="colapsable-cab"
        onClick={() => setAbierto(!abierto)}
        style={{ display: 'flex', justifyContent: 'space-between', width: '100%', background: 'none', border: 'none' }}
      >
        <strong>{abierto ? '▾' : '▸'} {titulo}</strong>
        {!abierto && <span className="tenue">{resumen}</span>}
      </button>
      {abierto && <div style={{ marginTop: '0.75rem' }}>{children}</div>}
    </div>
  );
}

function actualizar(objeto, ruta, valor) {
  // ruta tipo "trabajo.ingresos.salarios"
  const partes = ruta.split('.');
  const copia = structuredClone(objeto);
  let nodo = copia;
  for (let i = 0; i < partes.length - 1; i++) nodo = nodo[partes[i]];
  nodo[partes[partes.length - 1]] = valor;
  return copia;
}

export default function PasoCedulas({ estado, onCambiar, resultado }) {
  const set = (ruta, valor) => onCambiar(actualizar(estado, ruta, valor));
  const trabajoCalc = resultado?.intermedios?.trabajo;

  return (
    <div>
      <Colapsable titulo="Cédula de trabajo" resumen="salarios, prestaciones, cesantías…" abiertoInicial>
        <SeccionConceptos
          titulo="Ingresos brutos"
          conceptos={CONCEPTOS_INGRESOS_TRABAJO}
          valores={estado.trabajo.ingresos}
          onCambiar={(clave, v) => set(`trabajo.ingresos.${clave}`, v)}
        />
        <SeccionConceptos
          titulo="Ingresos no constitutivos de renta (INCRNGO)"
          conceptos={CONCEPTOS_INCRNGO_TRABAJO}
          valores={estado.trabajo.incrngo}
          onCambiar={(clave, v) => set(`trabajo.incrngo.${clave}`, v)}
        />
        <SeccionConceptos
          titulo="Deducciones imputables"
          conceptos={CONCEPTOS_DEDUCCIONES_TRABAJO}
          valores={estado.trabajo.deducciones}
          onCambiar={(clave, v) => set(`trabajo.deducciones.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Rentas exentas</legend>
          <CampoDinero
            etiqueta="Aportes voluntarios pensión + AFC"
            nota="Art. 126-1/126-4 ET, tope 30% del ingreso / 3.800 UVT"
            valor={estado.trabajo.afcPensionVoluntaria}
            onCambiar={(v) => set('trabajo.afcPensionVoluntaria', v)}
          />
          <CampoDinero
            etiqueta="Auxilio de cesantía y los intereses sobre cesantías"
            nota="Art. 206 núm. 4 ET — se calcula solo: (cesantías pagadas + cesantías al fondo) × % según salario"
            valor={trabajoCalc?.cesantiasExentasLimitadas}
            soloLectura
          />
          <CampoDinero
            etiqueta="Renta exenta del 25% laboral"
            nota="Art. 206 núm. 10 ET — se calcula sola, tope 790 UVT/año"
            valor={trabajoCalc?.rentaExenta25}
            soloLectura
          />
        </fieldset>
        <SeccionConceptos
          titulo="Rentas exentas sujetas a limitación"
          conceptos={CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_TRABAJO}
          valores={estado.trabajo.rentasExentasLimitadas}
          onCambiar={(clave, v) => set(`trabajo.rentasExentasLimitadas.${clave}`, v)}
        />
        <SeccionConceptos
          titulo="Rentas exentas que NO se someten al límite"
          conceptos={CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_TRABAJO}
          valores={estado.trabajo.rentasExentasNoLimitadas}
          onCambiar={(clave, v) => set(`trabajo.rentasExentasNoLimitadas.${clave}`, v)}
        />
      </Colapsable>

      <Colapsable titulo="Honorarios y compensación de servicios" resumen="con 2+ trabajadores contratados">
        <SeccionConceptos
          titulo="Ingresos brutos"
          conceptos={CONCEPTOS_INGRESOS_HONORARIOS}
          valores={estado.honorarios.ingresos}
          onCambiar={(clave, v) => set(`honorarios.ingresos.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Costos, deducciones y rentas exentas</legend>
          <CampoDinero etiqueta="Costos y gastos procedentes" nota="Art. 107/107-1/771-2 ET, total" valor={estado.honorarios.costosYGastos} onCambiar={(v) => set('honorarios.costosYGastos', v)} />
          <CampoDinero etiqueta="Aportes voluntarios pensión + AFC" valor={estado.honorarios.afcPensionVoluntaria} onCambiar={(v) => set('honorarios.afcPensionVoluntaria', v)} />
          <CampoDinero etiqueta="Medicina prepagada" nota="tope compartido con trabajo, 192 UVT" valor={estado.honorarios.medicinaDigitado} onCambiar={(v) => set('honorarios.medicinaDigitado', v)} />
          <CampoDinero etiqueta="Intereses vivienda" nota="tope compartido, 1.200 UVT" valor={estado.honorarios.viviendaDigitado} onCambiar={(v) => set('honorarios.viviendaDigitado', v)} />
          <CampoDinero etiqueta="Intereses ICETEX" nota="tope compartido, 100 UVT" valor={estado.honorarios.icetexDigitado} onCambiar={(v) => set('honorarios.icetexDigitado', v)} />
        </fieldset>
      </Colapsable>

      <Colapsable titulo="Rentas de capital" resumen="intereses, arrendamientos, dividendos…">
        <SeccionConceptos
          titulo="Ingresos brutos"
          conceptos={CONCEPTOS_INGRESOS_CAPITAL}
          valores={estado.capital.ingresos}
          onCambiar={(clave, v) => set(`capital.ingresos.${clave}`, v)}
        />
        <SeccionConceptos
          titulo="Costos y gastos procedentes"
          conceptos={CONCEPTOS_COSTOS_GASTOS_CAPITAL}
          valores={estado.capital.costosYGastos}
          onCambiar={(clave, v) => set(`capital.costosYGastos.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Deducciones y rentas exentas</legend>
          <CampoDinero etiqueta="Aportes voluntarios pensión + AFC" valor={estado.capital.afcPensionVoluntaria} onCambiar={(v) => set('capital.afcPensionVoluntaria', v)} />
          <CampoDinero etiqueta="Intereses vivienda" nota="tope compartido, 1.200 UVT" valor={estado.capital.viviendaDigitado} onCambiar={(v) => set('capital.viviendaDigitado', v)} />
          <CampoDinero etiqueta="Intereses ICETEX" nota="tope compartido, 100 UVT" valor={estado.capital.icetexDigitado} onCambiar={(v) => set('capital.icetexDigitado', v)} />
        </fieldset>
      </Colapsable>

      <Colapsable titulo="Rentas no laborales" resumen="ventas, indemnizaciones, otros…">
        <SeccionConceptos
          titulo="Ingresos brutos"
          conceptos={CONCEPTOS_INGRESOS_NO_LABORAL}
          valores={estado.noLaboral.ingresos}
          onCambiar={(clave, v) => set(`noLaboral.ingresos.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Costos, deducciones y rentas exentas</legend>
          <CampoDinero etiqueta="Devoluciones, rebajas y descuentos" valor={estado.noLaboral.devolucionesRebajas} onCambiar={(v) => set('noLaboral.devolucionesRebajas', v)} />
          <CampoDinero etiqueta="Costos y gastos procedentes" valor={estado.noLaboral.costosYGastos} onCambiar={(v) => set('noLaboral.costosYGastos', v)} />
          <CampoDinero etiqueta="Aportes voluntarios pensión + AFC" valor={estado.noLaboral.afcPensionVoluntaria} onCambiar={(v) => set('noLaboral.afcPensionVoluntaria', v)} />
          <CampoDinero etiqueta="Intereses vivienda" nota="tope compartido, 1.200 UVT" valor={estado.noLaboral.viviendaDigitado} onCambiar={(v) => set('noLaboral.viviendaDigitado', v)} />
          <CampoDinero etiqueta="Intereses ICETEX" nota="tope compartido, 100 UVT" valor={estado.noLaboral.icetexDigitado} onCambiar={(v) => set('noLaboral.icetexDigitado', v)} />
        </fieldset>
      </Colapsable>

      <Colapsable titulo="Pensiones" resumen="jubilación, invalidez, vejez, sobrevivientes…">
        <SeccionConceptos
          titulo="Ingresos del país"
          conceptos={CONCEPTOS_INGRESOS_PENSIONES}
          valores={estado.pensiones.ingresos}
          onCambiar={(clave, v) => set(`pensiones.ingresos.${clave}`, v)}
        />
        <SeccionConceptos
          titulo="Ingresos del exterior"
          conceptos={CONCEPTOS_INGRESOS_EXTERIOR_PENSIONES}
          valores={estado.pensiones.ingresosExterior}
          onCambiar={(clave, v) => set(`pensiones.ingresosExterior.${clave}`, v)}
        />
        <SeccionConceptos
          titulo="Ingresos no constitutivos de renta (INCRNGO)"
          conceptos={CONCEPTOS_INCRNGO_PENSIONES}
          valores={estado.pensiones.incrngo}
          onCambiar={(clave, v) => set(`pensiones.incrngo.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Rentas exentas</legend>
          <CampoDinero
            etiqueta="Aportes voluntarios pensión + AFC/FVP/AVC"
            nota="Art. 126-1/126-4 ET, tope 30% de la pensión del país / 3.800 UVT"
            valor={estado.pensiones.afcPensionVoluntaria}
            onCambiar={(v) => set('pensiones.afcPensionVoluntaria', v)}
          />
        </fieldset>
      </Colapsable>

      <Colapsable titulo="Dividendos y participaciones" resumen="2016 y anteriores, subcédulas 2017+, exterior…">
        <SeccionConceptos
          titulo="Año 2016 y anteriores"
          conceptos={CONCEPTOS_DIVIDENDOS_2016}
          valores={estado.dividendos.anio2016yAnteriores}
          onCambiar={(clave, v) => set(`dividendos.anio2016yAnteriores.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Año 2017 y siguientes</legend>
          <CampoDinero
            etiqueta="Subcédula N°1 — no gravados"
            nota="numeral 3 art. 49 ET, utilidades que ya pagaron impuesto pleno en la sociedad"
            valor={estado.dividendos.subcedula1NoGravados}
            onCambiar={(v) => set('dividendos.subcedula1NoGravados', v)}
          />
          <CampoDinero
            etiqueta="Subcédula N°2 — gravados"
            nota="parágrafo 2° art. 49 ET, tarifa plana del 35%"
            valor={estado.dividendos.subcedula2Gravados}
            onCambiar={(v) => set('dividendos.subcedula2Gravados', v)}
          />
        </fieldset>
        <fieldset className="seccion-conceptos">
          <legend>Recibidos del exterior / ECE</legend>
          <CampoDinero
            etiqueta="Renta líquida pasiva"
            nota="dividendos ECE y/o recibidos del exterior y/o países CAN"
            valor={estado.dividendos.rentaLiquidaPasivaExterior}
            onCambiar={(v) => set('dividendos.rentaLiquidaPasivaExterior', v)}
          />
          <CampoDinero
            etiqueta="Rentas exentas asociadas"
            valor={estado.dividendos.rentaExentaExterior}
            onCambiar={(v) => set('dividendos.rentaExentaExterior', v)}
          />
        </fieldset>
      </Colapsable>

      <div className="tarjeta">
        <fieldset className="seccion-conceptos">
          <legend>Dependientes y otros beneficios</legend>
          <label className="campo-dinero">
            <span>¿Tiene al menos un dependiente económico? (Art. 387 ET, deducción del 10%)</span>
            <input
              type="checkbox"
              checked={estado.tieneDependienteArt387}
              onChange={(e) => set('tieneDependienteArt387', e.target.checked)}
            />
          </label>
          <label className="campo-dinero">
            <span>Número de dependientes (Art. 336 ET, 72 UVT c/u, máx. 4)</span>
            <input
              type="number"
              min="0"
              max="4"
              value={estado.numeroDependientesArt336}
              onChange={(e) => set('numeroDependientesArt336', Math.min(4, Math.max(0, Number(e.target.value) || 0)))}
            />
          </label>
          <CampoDinero
            etiqueta="Compras del año con factura electrónica"
            nota="1% deducible, tope 240 UVT"
            valor={estado.comprasConFacturaElectronica}
            onCambiar={(v) => set('comprasConFacturaElectronica', v)}
          />
        </fieldset>
      </div>
    </div>
  );
}
