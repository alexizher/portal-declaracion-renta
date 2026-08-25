import { SeccionConceptos, CampoDinero, TotalSeccion } from './campos.jsx';
import { CONCEPTOS_INGRESOS_GANANCIA_OCASIONAL, CONCEPTOS_COSTOS_GANANCIA_OCASIONAL, CONCEPTOS_EXENTAS_GANANCIA_OCASIONAL } from './conceptos.js';

function actualizar(objeto, ruta, valor) {
  const partes = ruta.split('.');
  const copia = structuredClone(objeto);
  let nodo = copia;
  for (let i = 0; i < partes.length - 1; i++) nodo = nodo[partes[i]];
  nodo[partes[partes.length - 1]] = valor;
  return copia;
}

export default function PasoGananciaOcasional({ estado, onCambiar }) {
  const set = (ruta, valor) => onCambiar(actualizar(estado, ruta, valor));

  return (
    <div>
      <div className="tarjeta">
        <p className="tenue">
          Base y tarifa propias (15% general, 20% loterías/rifas) — no es parte de la cédula general y no pasa por
          la tabla del Art. 241 ET.
        </p>
      </div>

      <div className="tarjeta">
        <SeccionConceptos
          titulo="Ingresos por venta de activos, herencias, donaciones… (tarifa 15%)"
          conceptos={CONCEPTOS_INGRESOS_GANANCIA_OCASIONAL}
          valores={estado.gananciaOcasional.ingresos}
          onCambiar={(clave, v) => set(`gananciaOcasional.ingresos.${clave}`, v)}
        />
        <fieldset className="seccion-conceptos">
          <legend>Otros ingresos por ganancia ocasional</legend>
          <CampoDinero
            etiqueta="Rifas, loterías y similares"
            nota="tarifa 20%, sobre el valor bruto"
            valor={estado.gananciaOcasional.loteriasRifas}
            onCambiar={(v) => set('gananciaOcasional.loteriasRifas', v)}
          />
          <CampoDinero
            etiqueta="Ganancias ocasionales en el exterior"
            nota="tarifa 15%"
            valor={estado.gananciaOcasional.gananciasExterior}
            onCambiar={(v) => set('gananciaOcasional.gananciasExterior', v)}
          />
          <TotalSeccion
            valor={
              (Number(estado.gananciaOcasional.loteriasRifas) || 0) +
              (Number(estado.gananciaOcasional.gananciasExterior) || 0)
            }
          />
        </fieldset>
      </div>

      <div className="tarjeta">
        <SeccionConceptos
          titulo="Costos procedentes"
          conceptos={CONCEPTOS_COSTOS_GANANCIA_OCASIONAL}
          valores={estado.gananciaOcasional.costos}
          onCambiar={(clave, v) => set(`gananciaOcasional.costos.${clave}`, v)}
        />
      </div>

      <div className="tarjeta">
        <SeccionConceptos
          titulo="Ganancias ocasionales no gravadas o exentas"
          conceptos={CONCEPTOS_EXENTAS_GANANCIA_OCASIONAL}
          valores={estado.gananciaOcasional.exentas}
          onCambiar={(clave, v) => set(`gananciaOcasional.exentas.${clave}`, v)}
        />
        <p className="tenue">
          La exención de porción conyugal, donaciones y seguros de vida se calcula sola a partir de lo digitado en
          "Ingresos" arriba — no hace falta repetirla aquí.
        </p>
      </div>
    </div>
  );
}
