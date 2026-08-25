import { CampoDinero, SeccionConceptos } from './campos.jsx';
import { CATEGORIAS_PATRIMONIO } from './conceptos.js';
import { calcularValorActivoConReajuste } from '../../motor210/reajusteFiscal.js';

function activoVacio() {
  return {
    descripcion: '',
    tipo: 'inmuebleUrbano',
    anioAdquisicion: new Date().getFullYear(),
    valorAdquisicion: 0,
    valorDeclaradoAnioAnterior: 0,
    mejorasYValorizaciones: 0,
    disminucionesYTransferencias: 0,
    aplicaReajusteFiscal: false,
    aplicaArt73: false,
    valorCatastralOAvaluo: 0,
  };
}

function formatoPesos(v) {
  return (v || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
}

function actualizar(objeto, ruta, valor) {
  const partes = ruta.split('.');
  const copia = structuredClone(objeto);
  let nodo = copia;
  for (let i = 0; i < partes.length - 1; i++) nodo = nodo[partes[i]];
  nodo[partes[partes.length - 1]] = valor;
  return copia;
}

export default function PasoPatrimonio({ estado, onCambiar }) {
  const set = (ruta, valor) => onCambiar(actualizar(estado, ruta, valor));

  function agregarRetencion() {
    onCambiar({
      ...estado,
      filasRetenciones: [...estado.filasRetenciones, { agenteRetenedor: '', concepto: '', retencion: 0 }],
    });
  }
  function editarRetencion(i, campo, valor) {
    const filas = estado.filasRetenciones.map((f, idx) => (idx === i ? { ...f, [campo]: valor } : f));
    onCambiar({ ...estado, filasRetenciones: filas });
  }
  function borrarRetencion(i) {
    onCambiar({ ...estado, filasRetenciones: estado.filasRetenciones.filter((_, idx) => idx !== i) });
  }

  function agregarActivo() {
    onCambiar({ ...estado, activosConReajuste: [...estado.activosConReajuste, activoVacio()] });
  }
  function editarActivo(i, campo, valor) {
    const activos = estado.activosConReajuste.map((a, idx) => (idx === i ? { ...a, [campo]: valor } : a));
    onCambiar({ ...estado, activosConReajuste: activos });
  }
  function borrarActivo(i) {
    onCambiar({ ...estado, activosConReajuste: estado.activosConReajuste.filter((_, idx) => idx !== i) });
  }

  return (
    <div>
      <div className="tarjeta">
        <SeccionConceptos
          titulo="Patrimonio bruto a 31 de diciembre"
          conceptos={CATEGORIAS_PATRIMONIO}
          valores={estado.activosPatrimonio}
          onCambiar={(clave, v) => set(`activosPatrimonio.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Deudas</legend>
          <CampoDinero etiqueta="Total deudas (nacionales + exterior)" valor={estado.deudasPatrimonio} onCambiar={(v) => set('deudasPatrimonio', v)} />
        </fieldset>
      </div>

      <div className="tarjeta">
        <strong>Activos fijos con reajuste fiscal</strong>
        <p className="tenue" style={{ marginTop: '0.25rem' }}>
          Opcional — solo para inmuebles/vehículos donde valga la pena calcular el reajuste fiscal anual (Art. 70
          ET) y/o la tabla del Art. 73 ET (solo bienes raíces). El valor patrimonial de cada uno se suma aparte a
          "Activos fijos e inmuebles"/"Vehículos" de arriba — no lo digites dos veces.
        </p>
        {estado.activosConReajuste.map((a, i) => {
          const valor = calcularValorActivoConReajuste(a, { anioGravable: estado.anioGravable, tasaReajusteFiscal: estado.tasaReajusteFiscal });
          return (
            <fieldset key={i} className="seccion-conceptos" style={{ marginTop: '0.75rem' }}>
              <legend>{a.descripcion || `Activo ${i + 1}`}</legend>
              <label className="campo-dinero">
                <span>Descripción</span>
                <input value={a.descripcion} onChange={(e) => editarActivo(i, 'descripcion', e.target.value)} placeholder="Ej. Casa de habitación" />
              </label>
              <label className="campo-dinero">
                <span>Tipo de bien</span>
                <select value={a.tipo} onChange={(e) => editarActivo(i, 'tipo', e.target.value)}>
                  <option value="inmuebleUrbano">Inmueble urbano</option>
                  <option value="inmuebleRural">Inmueble rural</option>
                  <option value="vehiculo">Vehículo</option>
                </select>
              </label>
              <label className="campo-dinero">
                <span>Año de adquisición</span>
                <input
                  type="number"
                  value={a.anioAdquisicion}
                  onChange={(e) => editarActivo(i, 'anioAdquisicion', Number(e.target.value) || 0)}
                />
              </label>
              <CampoDinero etiqueta="Valor de adquisición" nota="costo histórico" valor={a.valorAdquisicion} onCambiar={(v) => editarActivo(i, 'valorAdquisicion', v)} />
              <CampoDinero
                etiqueta="Valor declarado en renta el año anterior"
                nota="si no se compró este año gravable"
                valor={a.valorDeclaradoAnioAnterior}
                onCambiar={(v) => editarActivo(i, 'valorDeclaradoAnioAnterior', v)}
              />
              <CampoDinero
                etiqueta="Mejoras no deducidas y valorizaciones pagadas este año"
                valor={a.mejorasYValorizaciones}
                onCambiar={(v) => editarActivo(i, 'mejorasYValorizaciones', v)}
              />
              <CampoDinero
                etiqueta="Disminuciones y/o transferencias del año"
                nota="ventas parciales, transferencias — se resta del costo fiscal ajustado y del ajuste Art. 73"
                valor={a.disminucionesYTransferencias}
                onCambiar={(v) => editarActivo(i, 'disminucionesYTransferencias', v)}
              />
              <label className="campo-dinero">
                <span>¿Aplica reajuste fiscal anual? (Art. 70 ET)</span>
                <input type="checkbox" checked={a.aplicaReajusteFiscal} onChange={(e) => editarActivo(i, 'aplicaReajusteFiscal', e.target.checked)} />
              </label>
              {a.tipo !== 'vehiculo' && (
                <label className="campo-dinero">
                  <span>¿Aplica tabla del Art. 73 ET?</span>
                  <input type="checkbox" checked={a.aplicaArt73} onChange={(e) => editarActivo(i, 'aplicaArt73', e.target.checked)} />
                </label>
              )}
              <CampoDinero
                etiqueta={a.tipo === 'vehiculo' ? 'Avalúo comercial' : 'Valor catastral'}
                valor={a.valorCatastralOAvaluo}
                onCambiar={(v) => editarActivo(i, 'valorCatastralOAvaluo', v)}
              />
              <p className="tenue">Valor patrimonial de este activo: <strong>{formatoPesos(valor.valorPatrimonial)}</strong></p>
              <div className="fila-botones">
                <button type="button" className="peligro" onClick={() => borrarActivo(i)}>Quitar activo</button>
              </div>
            </fieldset>
          );
        })}
        <div className="fila-botones">
          <button type="button" onClick={agregarActivo}>+ Agregar activo con reajuste</button>
        </div>
      </div>

      <div className="tarjeta">
        <fieldset className="seccion-conceptos">
          <legend>Declaración del año anterior — activa la comparación patrimonial</legend>
          <CampoDinero etiqueta="Patrimonio líquido año anterior" nota="renglón 31 del F210 anterior" valor={estado.patrimonioLiquidoAnioAnterior} onCambiar={(v) => set('patrimonioLiquidoAnioAnterior', v)} />
          <CampoDinero etiqueta="Impuesto neto de renta año anterior" nota="renglón 126" valor={estado.impuestoNetoAnioAnterior} onCambiar={(v) => set('impuestoNetoAnioAnterior', v)} />
          <CampoDinero etiqueta="Anticipo calculado para este año" nota="renglón 133 del F210 anterior" valor={estado.anticipoAnioAnterior} onCambiar={(v) => set('anticipoAnioAnterior', v)} />
          <CampoDinero etiqueta="Saldo a favor sin solicitud de devolución" nota="renglón 131" valor={estado.saldoAFavorAnioAnteriorSinSolicitud} onCambiar={(v) => set('saldoAFavorAnioAnteriorSinSolicitud', v)} />
          <CampoDinero
            etiqueta="Impuestos y anticipos pagados durante el año gravable"
            nota="para la conciliación patrimonial Art. 236-239 ET"
            valor={estado.impuestosYAnticiposPagadosAnioGravable}
            onCambiar={(v) => set('impuestosYAnticiposPagadosAnioGravable', v)}
          />
          <label className="campo-dinero">
            <span>Años que lleva declarando renta (para el anticipo, Art. 807 ET)</span>
            <select value={estado.antiguedadDeclarante} onChange={(e) => set('antiguedadDeclarante', e.target.value)}>
              <option value="primerAnio">Primer año</option>
              <option value="segundoAnio">Segundo año</option>
              <option value="terceroYSiguientes">Tercer año y siguientes</option>
            </select>
          </label>
        </fieldset>
      </div>

      <div className="tarjeta">
        <strong>Retenciones en la fuente practicadas</strong>
        <div className="tabla-scroll" style={{ marginTop: '0.5rem' }}>
          <table>
            <thead>
              <tr>
                <th>Agente retenedor</th>
                <th>Concepto</th>
                <th>Retención</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {estado.filasRetenciones.map((f, i) => (
                <tr key={i}>
                  <td><input value={f.agenteRetenedor} onChange={(e) => editarRetencion(i, 'agenteRetenedor', e.target.value)} /></td>
                  <td><input value={f.concepto} onChange={(e) => editarRetencion(i, 'concepto', e.target.value)} /></td>
                  <td>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={f.retencion || ''}
                      onChange={(e) => editarRetencion(i, 'retencion', Number(String(e.target.value).replace(/\D/g, '')) || 0)}
                    />
                  </td>
                  <td><button type="button" onClick={() => borrarRetencion(i)}>Quitar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="fila-botones">
          <button type="button" onClick={agregarRetencion}>+ Agregar retención</button>
        </div>
      </div>

      <div className="tarjeta">
        <fieldset className="seccion-conceptos">
          <legend>Descuentos tributarios y sanciones</legend>
          <CampoDinero
            etiqueta="Otros descuentos tributarios"
            nota="Art. 254-259 ET — impuestos exterior, donaciones, otros (casos poco frecuentes)"
            valor={estado.descuentosTributariosDigitados}
            onCambiar={(v) => set('descuentosTributariosDigitados', v)}
          />
          <CampoDinero etiqueta="Sanciones" nota="si aplica" valor={estado.sanciones} onCambiar={(v) => set('sanciones', v)} />
        </fieldset>
      </div>
    </div>
  );
}
