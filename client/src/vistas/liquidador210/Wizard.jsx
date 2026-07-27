import React, { useEffect, useMemo, useState } from 'react';
import { crearEstadoInicial, fusionarConEstadoInicial } from './estadoInicial.js';
import PasoExogena from './PasoExogena.jsx';
import PasoCedulas from './PasoCedulas.jsx';
import PasoGananciaOcasional from './PasoGananciaOcasional.jsx';
import PasoPatrimonio from './PasoPatrimonio.jsx';
import PasoAnticipo from './PasoAnticipo.jsx';
import PasoImpuesto from './PasoImpuesto.jsx';
import PasoFormulario210 from './PasoFormulario210.jsx';
import PasoResultado from './PasoResultado.jsx';
import { liquidar } from '../../motor210/index.js';
import { totalRetenciones } from '../../motor210/retenciones.js';
import { calcularDigitoVerificacion, dividirNombreCompleto } from '../../motor210/identificacion.js';
import { api } from '../../api.js';

function soloDigitos(cedula) {
  return (cedula || '').replace(/\D/g, '');
}

const PASOS = [
  { id: 'cliente', titulo: 'Cliente' },
  { id: 'exogena', titulo: 'Exógena (visor)' },
  { id: 'cedulas', titulo: 'Cédulas' },
  { id: 'gananciaOcasional', titulo: 'Ganancia ocasional' },
  { id: 'patrimonio', titulo: 'Patrimonio y año anterior' },
  { id: 'anticipo', titulo: 'Anticipo' },
  { id: 'impuesto', titulo: 'Impuesto' },
  { id: 'formulario210', titulo: 'Formulario 210' },
  { id: 'resultado', titulo: 'Resultado' },
];

function claveGuardado(cedula) {
  return `f210:${soloDigitos(cedula) || 'sin-cedula'}`;
}

export default function Wizard() {
  const [estado, setEstado] = useState(() => crearEstadoInicial());
  const [pasoIndex, setPasoIndex] = useState(0);
  const [cedulaCargada, setCedulaCargada] = useState('');
  const [clientesDB, setClientesDB] = useState([]);
  const [origenCliente, setOrigenCliente] = useState(null); // 'guardado' | 'db' | 'nuevo' | null
  // Texto en edición del campo cédula, separado de estado.cliente.cedula:
  // así el autoguardado (atado a estado.cliente.cedula) no se dispara con
  // cada tecla mientras se escribe, solo cuando se confirma con blur/Enter.
  const [cedulaEnEdicion, setCedulaEnEdicion] = useState('');

  // Lista de clientes ya registrados en el panel (tabla `clientes`), solo
  // para autocompletar nombre/datos — no se persiste nada del liquidador
  // de vuelta al servidor.
  useEffect(() => {
    api('/clientes').then(setClientesDB).catch(() => setClientesDB([]));
  }, []);

  // Autoguardado en localStorage por cédula — nunca sale del navegador.
  useEffect(() => {
    if (!estado.cliente.cedula) return;
    const clave = claveGuardado(estado.cliente.cedula);
    localStorage.setItem(clave, JSON.stringify(estado));
  }, [estado]);

  function cargarCliente(cedula) {
    const clave = claveGuardado(cedula);
    const guardado = localStorage.getItem(clave);
    if (guardado) {
      try {
        const estadoGuardado = JSON.parse(guardado);
        setEstado(fusionarConEstadoInicial(estadoGuardado));
        setCedulaCargada(cedula);
        setOrigenCliente('guardado');
        return;
      } catch {
        // si el JSON guardado está corrupto, seguir con estado en blanco
      }
    }

    const enDB = clientesDB.find((c) => soloDigitos(c.cedula) === soloDigitos(cedula));
    if (enDB) {
      setEstado((prev) => {
        const base = crearEstadoInicial(prev.anioGravable);
        // La lista de Clientes solo guarda "nombre completo" en una sola
        // cadena — se divide en apellidos/nombres como punto de partida
        // editable (si no, el usuario ve todo en blanco pese a que el
        // cliente sí está registrado, ver dividirNombreCompleto).
        return { ...base, cliente: { ...base.cliente, ...dividirNombreCompleto(enDB.nombre), nombre: enDB.nombre, cedula } };
      });
      setCedulaCargada(cedula);
      setOrigenCliente('db');
      return;
    }
    setEstado((prev) => ({ ...crearEstadoInicial(prev.anioGravable), cliente: { ...prev.cliente, cedula } }));
    setCedulaCargada(cedula);
    setOrigenCliente('nuevo');
  }

  // Se calcula en cada paso (no solo en "Resultado") para que Anticipo,
  // Impuesto y Formulario 210 puedan mostrar cifras ya calculadas sin
  // depender de que el usuario haya llegado al último paso — es barato
  // (aritmética pura) y ya está protegido con try/catch.
  const resultado = useMemo(() => {
    try {
      return liquidar({
        ...estado,
        retencionesPracticadas: totalRetenciones(estado.filasRetenciones),
      });
    } catch (err) {
      return { casillas: {}, advertencias: [`Error calculando el formulario: ${err.message}`], intermedios: {} };
    }
  }, [estado]);

  const paso = PASOS[pasoIndex];
  const progresoPct = ((pasoIndex + 1) / PASOS.length) * 100;

  const CAMPOS_NOMBRE = ['primerNombre', 'otrosNombres', 'primerApellido', 'segundoApellido'];
  const setCliente = (campo, valor) => {
    const cliente = { ...estado.cliente, [campo]: valor };
    if (CAMPOS_NOMBRE.includes(campo)) {
      cliente.nombre = [cliente.primerNombre, cliente.otrosNombres, cliente.primerApellido, cliente.segundoApellido]
        .filter(Boolean)
        .join(' ')
        .trim();
    }
    setEstado({ ...estado, cliente });
  };
  const digitoVerificacion = useMemo(
    () => calcularDigitoVerificacion(estado.cliente.cedula),
    [estado.cliente.cedula]
  );

  return (
    <div className="tarjeta">
      <div className="progreso">
        <div className="progreso-relleno" style={{ width: `${progresoPct}%` }} />
      </div>
      <div className="fila-botones" style={{ justifyContent: 'flex-start', flexWrap: 'wrap' }}>
        {PASOS.map((p, i) => (
          <button
            key={p.id}
            className={i === pasoIndex ? 'activo' : ''}
            onClick={() => setPasoIndex(i)}
            disabled={p.id !== 'cliente' && !estado.cliente.cedula}
          >
            {i + 1}. {p.titulo}
          </button>
        ))}
      </div>

      {paso.id === 'cliente' && (
        <div className="tarjeta">
          <fieldset className="seccion-conceptos">
            <legend>Datos del cliente</legend>
            <label className="campo-dinero">
              <span>Cédula/NIT</span>
              <input
                value={cedulaEnEdicion}
                onChange={(e) => setCedulaEnEdicion(e.target.value)}
                onBlur={(e) => e.target.value && cargarCliente(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && e.target.value && cargarCliente(e.target.value)}
                placeholder="Escribe la cédula y sal del campo para cargar/crear"
              />
            </label>
            <label className="campo-dinero">
              <span>Año gravable</span>
              <select
                value={estado.anioGravable}
                onChange={(e) => {
                  const anio = Number(e.target.value);
                  setEstado((prev) => ({ ...crearEstadoInicial(anio), cliente: prev.cliente }));
                }}
              >
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            </label>
          </fieldset>

          <fieldset className="seccion-conceptos">
            <legend>Identificación (casillas 5-27 del Formulario 210)</legend>
            <label className="campo-dinero">
              <span>Tipo de documento</span>
              <select
                value={estado.cliente.tipoDocumento}
                onChange={(e) => setCliente('tipoDocumento', e.target.value)}
              >
                <option value="cedula">Cédula de ciudadanía</option>
                <option value="nit">NIT</option>
              </select>
            </label>
            <label className="campo-dinero">
              <span>Primer apellido</span>
              <input value={estado.cliente.primerApellido} onChange={(e) => setCliente('primerApellido', e.target.value)} />
            </label>
            <label className="campo-dinero">
              <span>Segundo apellido</span>
              <input value={estado.cliente.segundoApellido} onChange={(e) => setCliente('segundoApellido', e.target.value)} />
            </label>
            <label className="campo-dinero">
              <span>Primer nombre</span>
              <input value={estado.cliente.primerNombre} onChange={(e) => setCliente('primerNombre', e.target.value)} />
            </label>
            <label className="campo-dinero">
              <span>Otros nombres</span>
              <input value={estado.cliente.otrosNombres} onChange={(e) => setCliente('otrosNombres', e.target.value)} />
            </label>
            <label className="campo-dinero">
              <span>Dígito de verificación</span>
              <input value={digitoVerificacion ?? ''} disabled placeholder="se calcula solo" />
            </label>
            <label className="campo-dinero">
              <span>Actividad económica principal</span>
              <input
                value={estado.cliente.actividadEconomica}
                onChange={(e) => setCliente('actividadEconomica', e.target.value)}
                placeholder="Código CIIU"
              />
            </label>
            <label className="campo-dinero">
              <span>Código dirección seccional</span>
              <input
                value={estado.cliente.codigoDireccionSeccional}
                onChange={(e) => setCliente('codigoDireccionSeccional', e.target.value)}
              />
            </label>
            <label className="campo-dinero">
              <span>¿Gran contribuyente?</span>
              <input
                type="checkbox"
                checked={estado.cliente.granContribuyente}
                onChange={(e) => setCliente('granContribuyente', e.target.checked)}
              />
            </label>
          </fieldset>

          <fieldset className="seccion-conceptos">
            <legend>Datos para el cálculo</legend>
            <label className="campo-dinero">
              <span>Meses trabajados en el año</span>
              <input
                type="number"
                min="0"
                max="12"
                value={estado.mesesTrabajados}
                onChange={(e) => setEstado({ ...estado, mesesTrabajados: Number(e.target.value) || 0 })}
              />
            </label>
            <label className="campo-dinero">
              <span>Ingreso mensual promedio (últimos 6 meses)</span>
              <input
                type="text"
                inputMode="numeric"
                value={estado.ingresoMensualPromedio6m || ''}
                onChange={(e) => setEstado({ ...estado, ingresoMensualPromedio6m: Number(String(e.target.value).replace(/\D/g, '')) || 0 })}
              />
            </label>
          </fieldset>
          {cedulaCargada === estado.cliente.cedula && origenCliente === 'guardado' && (
            <p className="tenue">✓ Continuando un cálculo ya guardado en este navegador para esta cédula.</p>
          )}
          {cedulaCargada === estado.cliente.cedula && origenCliente === 'db' && (
            <p className="tenue">✓ Cliente encontrado en tu lista de clientes — nombre autocompletado.</p>
          )}
          {cedulaCargada === estado.cliente.cedula && origenCliente === 'nuevo' && (
            <p className="tenue">Esta cédula no está en tu lista de clientes — se usará solo para este cálculo.</p>
          )}
          {!estado.cliente.cedula && <p className="error">Escribe la cédula del cliente para continuar.</p>}
        </div>
      )}

      {paso.id === 'exogena' && <PasoExogena estado={estado} onCambiar={setEstado} />}
      {paso.id === 'cedulas' && <PasoCedulas estado={estado} onCambiar={setEstado} resultado={resultado} />}
      {paso.id === 'gananciaOcasional' && <PasoGananciaOcasional estado={estado} onCambiar={setEstado} />}
      {paso.id === 'patrimonio' && <PasoPatrimonio estado={estado} onCambiar={setEstado} />}
      {paso.id === 'anticipo' && <PasoAnticipo resultado={resultado} estado={estado} />}
      {paso.id === 'impuesto' && <PasoImpuesto resultado={resultado} estado={estado} />}
      {paso.id === 'formulario210' && <PasoFormulario210 resultado={resultado} />}
      {paso.id === 'resultado' && (
        <PasoResultado resultado={resultado} cliente={{ ...estado.cliente, anioGravable: estado.anioGravable }} estado={estado} onCambiar={setEstado} />
      )}

      <div className="fila-botones">
        <button type="button" disabled={pasoIndex === 0} onClick={() => setPasoIndex(pasoIndex - 1)}>
          ← Anterior
        </button>
        <button
          type="button"
          className="primario"
          disabled={pasoIndex === PASOS.length - 1 || !estado.cliente.cedula}
          onClick={() => setPasoIndex(pasoIndex + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
