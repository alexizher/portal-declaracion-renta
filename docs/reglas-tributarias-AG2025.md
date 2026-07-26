# Reglas tributarias — Liquidador F210 AG2025 (borrador en construcción)

> Fuente primaria normativa: **Estatuto Tributario** (Decreto 624/1989 y
> modificaciones), Título V personas naturales. Fuente de implementación de
> referencia: `1. Liquidador-DRPN-AG-2024-Version-8.0.-(NO-OBLIGADOS).xlsm`
> (usado por Daniela en la temporada AG2024) — **NUNCA se commitea** (contiene
> datos reales de un cliente); solo se citan aquí las fórmulas y estructura,
> ya generalizadas. Este documento se completa en la Fase F0/F1 del plan y se
> actualiza a medida que se analizan más hojas.

## Estado del análisis

| Hoja del .xlsm | Estado | Contenido |
|---|---|---|
| LISTAS | Sin analizar en detalle (1499 celdas) | Catálogos de códigos (actividad económica, direcciones seccionales) |
| TABLAS | ✅ Analizada | Tabla Art. 241 ET + dividendos (legado) |
| TABLAS2023 | ✅ Analizada | Misma tabla, versión anterior — confirma estabilidad de fórmula |
| DATOS BÁSICOS | ✅ Analizada | UVT/salario mínimo/auxilio transporte 2022-2025 |
| DATOS INICIALES | ✅ Analizada (⚠️ tenía PII real) | RUT, dígito verificación, datos año anterior |
| PREGUNTAS | Volcada, sin analizar | — |
| DEPENDIENTES | Volcada, sin analizar | Detalle del cálculo Art. 387 ET |
| a_copiar | ✅ Analizada — descartada | Utilidad interna de versionado, NO es catálogo de exógena |
| PT | ✅ Analizada | Papel de trabajo de PATRIMONIO (activo por activo, Art. 73 ET) |
| RENTAS TRABAJO | ✅ Analizada | Ver §2.1 |
| RENTAS HON y SER. | ✅ Analizada | Ver §2.2 |
| RENTAS CAPITAL | 🟡 Parcial (primeras 130 filas) | Ver §2.3 |
| RENTAS NO LABORAL | Volcada, sin leer | Pendiente |
| CED.1 GENERAL / RESUMEN C.GENERAL | Pendiente | Tope combinado 40%/1.340 UVT Art. 336 ET |
| PATRIMONIO | Pendiente | Patrimonio bruto/líquido, test obligados a declarar |
| RENTA COMP PATR | Pendiente | Comparación patrimonial Art. 236-237 ET |
| CONSOLIDADO RLC | Pendiente | Consolidación renta líquida cedular |
| DESCUENTOS TRIBUTARIOS | Pendiente | Art. 254 ET y otros |
| RETENCIONES | Pendiente | — |
| ANTICIPO | Pendiente | Art. 807 ET opción 2 |
| FORMULARIO 210 | Pendiente | Verificación casilla por casilla (se lee al final) |

**Hallazgo clave (confirmado, ver §0):** el `.xlsm` es 100% de **digitación
manual** por línea — no contiene ningún parser ni catálogo de códigos de
exógena. Por eso el alcance de esta temporada NO incluye clasificación
automática de exógena (ver decisión de alcance del 2026-07-20).

## §0. Constantes confirmadas (DATOS BÁSICOS)

| Año gravable | UVT | Salario mínimo | Auxilio transporte |
|---|---|---|---|
| 2025 | $49.799 | $1.423.500 | $200.000 |
| 2024 | $47.065 | $1.300.000 | $162.000 |
| 2023 | $42.412 | $1.160.000 | $140.606 |
| 2022 | $38.004 | $1.000.000 | $117.172 |

- **Renta presuntiva = 0%** los 4 años → módulo omitido del alcance MVP
  (tarifa en 0% desde Ley 2277/2022, Art. 188/189 ET).
- Sanción mínima = `ROUND(UVT*10, -3)`.
- Monto para exigir firma de contador público = `UVT * 100.000` (Art. 596
  num. 6 / Art. 599 ET, remite a un tope en UVT sobre patrimonio bruto o
  ingresos brutos — **verificar artículo exacto en F1, valor aquí es el
  cálculo, no la norma**).

## §1. Tabla de impuesto — Art. 241 ET

Confirmada en `TABLAS` y `TABLAS2023` con fórmula idéntica en ambas
versiones (estable):

| Rango (UVT) | Tarifa marginal | Fórmula |
|---|---|---|
| 0 – 1.090 | 0% | Sin impuesto |
| >1.090 – 1.700 | 19% | `(UVT_base - 1090) * 19%` |
| >1.700 – 4.100 | 28% | `(UVT_base - 1700) * 28% + 116 UVT` |
| >4.100 – 8.670 | 33% | `(UVT_base - 4100) * 33% + 788 UVT` |
| >8.670 – 18.970 | 35% | `(UVT_base - 8670) * 35% + 2296 UVT` |
| >18.970 – 31.000 | 37% | `(UVT_base - 18970) * 37% + 5901 UVT` |
| >31.000 | 39% | `(UVT_base - 31000) * 39% + 10352 UVT` |

Cada tramo se calcula en pesos y se redondea a la centena (`ROUND(...,-3)`
en el .xlsm — **ojo**: `-3` en Excel redondea a miles, no a centenas;
verificar si la DIAN exige redondeo a mil pesos en el F210 actual).
El resultado final es `MAX()` de los 7 tramos (todos son 0 salvo el que
aplica, por las condiciones IF anidadas).

**Pendiente F1:** confirmar contra el texto vigente del Art. 241 ET si los
tramos/tarifas AG2025 son idénticos a AG2024 (no hubo cambios de ley
conocidos, pero debe verificarse contra la norma, no asumirse).

## §2bis. CORRECCIÓN ESTRUCTURAL — hoja real vs. hojas vestigiales

**Hallazgo crítico:** `CED.1 GENERAL` es la hoja **realmente usada** para
AG2024 (protegida con clave, contiene los datos reales del cliente,
confirma independientemente el tope de **1.340 UVT** en su celda E220 —
coincide con la verificación normativa del §2.5). Las hojas
`RENTAS TRABAJO`, `RENTAS HON y SER.`, `RENTAS CAPITAL`, `RENTAS NO
LABORAL` y `RESUMEN C.GENERAL` están **en cero y no alimentan el cálculo
real** — son plantillas de una versión anterior del libro, vestigiales.
Todo lo documentado en §2.1-§2.5 sobre esas hojas sigue siendo
normativamente válido (las citas de artículos ET son correctas) pero la
**estructura de columnas y algunas fórmulas puntuales de `CED.1 GENERAL`
prevalecen** cuando hay diferencia. La más importante:

**Pieza que faltaba — Renta exenta del 25% laboral (Art. 206 núm. 10 ET):**
ausente de las hojas vestigiales, presente y activa en `CED.1 GENERAL`
filas 138-142:
```
ingreso_laboral_neto_cesantias = ingresos_brutos_trabajo − cesantías(pagadas + fondo + pre-2017)
base_25 = ingreso_laboral_neto_cesantias − INCRNGO − deducciones(sin GMF ni ICETEX) − rentas_exentas(sin cesantías)
renta_exenta_25 = MAX(0, base_25 × 25%)
renta_exenta_25_limitada = MIN(renta_exenta_25, 790 × UVT)
```
Esta exención se SUMA al total de rentas exentas "limitadas" (junto con
AFC/pensión voluntaria) que luego entra al tope combinado de 1.340 UVT del
§2.5 — no es un tope aparte, es un componente más de la misma bolsa.

**Módulo `dependientes` en `CED.1 GENERAL`:** confirma exactamente el 10%
del ingreso bruto, tope 384 UVT — igual que lo documentado en §2.1/§2.2,
sin cambios.

**Deducciones con tope en `CED.1 GENERAL` (fila 145-152), coherentes con
lo ya documentado:** dependientes (10%, ≤384 UVT), medicina
prepagada/salud (≤192 UVT), intereses vivienda (≤1.200 UVT), GMF (50%),
ICETEX (≤100 UVT), cesantías independientes (MIN(valor, renta_líquida/12,
2.500 UVT)).

## §2. Cédulas de la renta de trabajo (digitación manual)

Estructura común a las 3 hojas de la cédula general (trabajo, honorarios y
servicios, capital): **I. Ingresos brutos → II. INCRNGO → (III. Costos y
deducciones, solo honorarios/servicios) → IV. Deducciones imputables → V.
Rentas exentas sujetas a límite 40% → VI. Rentas exentas NO sujetas a
límite**. Cada renglón se digita a mano; las columnas de "Cálculos"
aplican el tope correspondiente en vivo.

### 2.1 Rentas de trabajo (`RENTAS TRABAJO`)

**Ingresos brutos (Art. 103 ET):** salarios, cesantías e intereses de
cesantías pagados directamente, cesantías consignadas al fondo,
prestaciones sociales, primas extralegales, comisiones, bonificaciones,
indemnizaciones por despido injustificado, subsidios/auxilios, viáticos,
emolumentos eclesiásticos, honorarios (< 2 trabajadores, sin costos/gastos),
compensación por servicios personales (ídem), pagos indirectos por
alimentación, gastos de representación, ingresos del exterior, cesantías
retiradas pre-2017 (NO sujetas al límite 40%), otros.

**INCRNGO (ingresos no constitutivos de renta):**
- Salud obligatoria (Art. 56 ET) — sin límite.
- Aportes obligatorios a fondos de pensiones (Art. 55 ET) — sin límite.
- Fondo de Solidaridad Pensional — sin límite.
- Aportes voluntarios RAIS — **límite: MIN(25% del ingreso laboral anual,
  2.500 UVT)**.
- Aportes voluntarios a Riesgos Laborales — sin límite.
- Apoyos económicos educativos (Art. 46 ET) — sin límite.
- Pagos a terceros por alimentación — **límite: 41 UVT anuales, solo si
  salario mensual no supera 310 UVT** (fórmula usa
  `310*UVT*meses_vinculación` como techo salarial y `41*UVT*meses` como
  techo del beneficio — revisar en F1 si el multiplicador correcto es meses
  trabajados o 12 fijo, la hoja de honorarios usa `*12` fijo y la de
  trabajo usa `'DATOS INICIALES'!D29` (meses digitados) — **inconsistencia
  entre hojas a resolver, no asumir cuál es la correcta sin verificar norma**).
- Aporte solidario COVID-19 — sin límite (posiblemente derogado/vencido,
  verificar vigencia AG2025).

### 2.2 Honorarios y compensación de servicios (`RENTAS HON y SER.`)

Aplica cuando el contribuyente **renuncia** a la exención del numeral 10
Art. 206 ET y prefiere restar costos y gastos como independiente. Mismos
INCRNGO que trabajo, más:

**III. Costos y deducciones procedentes** (todos citan Art. 107, 107-1,
771-2 ET): costo de mercancías vendidas, costo fiscal de activos fijos
vendidos (<2 años), salarios y prestaciones, aportes seguridad
social/parafiscales, honorarios, gastos legales, mantenimientos, intereses
por subcapitalización, gastos financieros, arrendamientos, contribuciones,
seguros, servicios, impuesto predial/ICA/vehículos (Art. 115 ET),
reparaciones, adecuaciones, gastos de viaje, diversos, gastos por
colaboración empresarial.

**IV. Deducciones imputables:**
- Salud prepagada/seguros de salud (Art. 387 ET) — **límite 192 UVT/año
  (nota: parece ser 16 UVT/mes × 12 en la fórmula — verificar si el
  artículo fija 192 anuales directamente)**.
- Dependientes económicos (Art. 387 ET) — **límite: 10% del ingreso bruto,
  tope 384 UVT/año**; se prorratea entre las hojas trabajo/honorarios según
  proporción de ingresos de cada una (fórmula `H83` reparte el tope común).
- Intereses préstamo vivienda — **límite 1.200 UVT/año**.
- GMF 4×1000 — **50% del valor certificado deducible**.
- Cesantías de partícipes independientes — **límite MIN(2.500 UVT, 1/12
  del ingreso gravable)**.
- Intereses préstamos ICETEX — **límite 100 UVT/año**.

**V. Rentas exentas sujetas a límite del 40%:** aportes voluntarios del
empleador a pensiones (Art. 126-1 ET, límite 30% ingreso tributario, techo
3.800 UVT), AFC (Art. 126-4 ET), actividades económicas Art. 235-2
numerales 3-8 (energía eólica, transporte fluvial, etc.), otras.

**VI. Rentas exentas NO sujetas al límite del 40%:** cesantías pre-2017,
ingresos países CAN, renta exenta hoteles construidos 2003-2016 (Art.
207-2 num. 3-4 ET), otras.

El límite combinado (Art. 336 ET) se aplica **una sola vez sobre la suma de
las 4 cédulas** en la hoja `RESUMEN C.GENERAL` (celdas F81-F97, ya
analizadas — ver §2.4).

### 2.3 Rentas de capital (`RENTAS CAPITAL`) — análisis parcial

**Ingresos brutos:** intereses financieros, intereses entre particulares,
descuentos de títulos, rendimientos de contratos de colaboración
empresarial, rendimientos de entidades financieras vigiladas (Art. 38 ET),
títulos de deuda pública (Art. 38 ET), bonos/papeles comerciales (Art. 38
ET), FIC según su componente de inversión (Art. 39 ET), rendimientos de
fondos de pensiones/cesantías/AFC, valorización de aportes voluntarios a
pensiones, **intereses presuntivos** (link a hoja `INTERÉS PRESUNTIVO` —
fuera de alcance MVP salvo que algún cliente típico tenga préstamos a
socios), arrendamientos, regalías, explotación de propiedad intelectual,
ingresos del exterior, otros.

**INCRNGO relevante:** componente inflacionario de rendimientos
financieros (Art. 38/41 ET) y de FIC (Art. 39 ET) — usa el % de
"componente inflacionario" de `DATOS BÁSICOS` (0.5088 para 2024,
0.2501/0.6335/etc. según el concepto — **hay varias tasas de componente
inflacionario distintas por tipo de renglón, no una sola; revisar cuál
aplica a cada línea en F1**).

### 2.4 Rentas no laborales (`RENTAS NO LABORAL`) — ✅ completa

Estructura análoga a honorarios/servicios: **I. Ingresos brutos** (honorarios
con ≥2 trabajadores, contratos de prestación de servicios, ventas de
mercancía/inventarios/activos biológicos, construcción, gananciales,
indemnizaciones daño emergente/lucro cesante/seguros de vida, retiro
pensión/AFC sin permanencia, venta de inmuebles/inversiones/activos <2 años,
colaboración empresarial, CAN, diferencia en cambio Art. 288 ET, otros) →
**II. Devoluciones/rebajas** → **III. INCRNGO** (salud/pensión obligatoria,
RAIS ≤25%/2.500 UVT, gananciales Art. 47 ET, AIS Art. 57-1 ET, utilidad
venta acciones BVC ≤10% circulación Art. 36-1 ET, otros) → **IV. Costos y
deducciones** (mismo set Art. 107/107-1/771-2/115 ET que honorarios, más
gastos por diferencia en cambio) → **V. Rentas pasivas ECE** → **VI.
Deducciones imputables** (vivienda ≤1.200 UVT, GMF 50%, cesantías
independientes, ICETEX ≤100 UVT) → **VII. Rentas exentas limitadas al 40%**
(Art. 126-1/126-4 ET, transporte fluvial, forestales, energía eólica/biomasa/
solar Ley 1715/2014, VIS/VIP, economía naranja Art. 28 Ley 98/1993) → **VIII.
Rentas exentas NO limitadas** (CAN, hoteles).

### 2.5 Tope combinado — Art. 336 ET (`RESUMEN C.GENERAL`) — ✅ completa, con CORRECCIÓN

**⚠️ Corrección crítica sobre el `.xlsm` de referencia:** la celda `F83` de
`RESUMEN C.GENERAL` calcula el techo del límite como `5040 * UVT`. Se
verificó contra el texto vigente del Art. 336 ET (fuentes:
[estatuto.co/336](https://estatuto.co/336),
[actualicese.com](https://actualicese.com/estatutotributario/336-2/),
[consultorcontable.com](https://www.consultorcontable.com/cambios-en-la-base-de-limitante-del-40-art-336-et/))
y el tope real vigente para AG2024 y AG2025 es **1.340 UVT**, no 5.040. La
cifra del Excel está desactualizada (posible resabio de una versión anterior
a la Ley 2277/2022) y **NO se porta tal cual** — el motor JS usa 1.340 UVT.
Este hallazgo confirma la necesidad de anclar cada regla en el ET, no solo
en el Excel de referencia.

**Cálculo confirmado (con la corrección aplicada):**

1. `Total ingresos brutos` = suma de ingresos brutos de las 4 cédulas
   (trabajo + honorarios/servicios + capital + no laboral).
2. Menos INCRNGO de las 4 cédulas, menos devoluciones/rebajas/descuentos,
   menos rentas exentas NO sujetas a límite (numeral 3 Art. 206 ET,
   excepciones) = **Base límite del 40%**.
3. **(A)** `Base × 40%`.
4. **(B)** `1.340 × UVT` (corregido; el Excel decía 5.040).
5. Techo definitivo = `MIN(A, B)`.
6. + rentas exentas no limitadas = rentas exentas y deducciones limitadas
   definitivas.
7. Ese monto se reparte entre las 4 cédulas **en cascada** (primero
   trabajo, lo que sobra a honorarios/servicios, lo que sobra a capital, lo
   que sobra a no laboral) — replicado en `F87-F97` del Excel, lógica de
   reparto en cascada válida y sin discrepancia detectada.

**Resuelto:** el parágrafo de 72 UVT por dependiente (hoja `DEPENDIENTES`,
celda F47) es `= (número de dependientes, máx. 4) × 72 × UVT` — se suma
DESPUÉS del tope de 1.340 UVT (adicional, no incluido en él). El formulario
solo tiene 4 casillas de dependiente, así que el máximo de 4 es estructural,
no una validación aparte. Listo para portar sin ambigüedad.
*(Pendiente F1, menor: confirmar la fórmula `PREGUNTAS!I54*1%` que también
suma en `RESUMEN C.GENERAL!I45` — parece un concepto adicional aislado, no
bloquea el resto.)*

## §5. Dependientes económicos (Art. 336 parágrafo + Art. 387 ET) — ✅ resuelto

Dos mecanismos distintos que coexisten en el `.xlsm`, **no confundir**:

1. **Art. 336 ET parágrafo** (hoja `DEPENDIENTES`, sección 1): deducción
   adicional de **72 UVT por dependiente**, máximo 4 dependientes (4
   casillas en el formulario), **por encima** del tope de 1.340 UVT. Los 5
   tipos de parentesco válidos: hijo(a) ≤18 años, hijo(a) 18-23 años
   (estudiando), hijo(a) 23+ en dependencia física, cónyuge/compañero(a)
   dependiente, padres/hermanos dependientes.
2. **Art. 387 ET** (hoja `DEPENDIENTES`, sección 2 + fórmula en
   `RENTAS TRABAJO!E83`/`RENTAS HON y SER.!E83`): deducción del 10% del
   ingreso bruto por tener AL MENOS UN dependiente (no por cada uno),
   límite 384 UVT/año, prorrateada entre las cédulas de trabajo y
   honorarios/servicios según su peso de ingresos. Es la que ya estaba
   documentada en §2.1/§2.2.

Son beneficios **independientes y acumulables**, con base legal distinta.

## §6. Comparación patrimonial — Art. 236-239 ET (`RENTA COMP PATR`) — ✅ completa

Fórmula confirmada, coincide con el mecanismo legal (renta presunta por
incremento patrimonial no justificado):

**A) Diferencia patrimonial:**
```
patrimonio líquido actual (31-dic año gravable)
+ desvalorizaciones del período (ajuste no monetario, ver nota)
− valorizaciones del período (ajuste no monetario, ver nota)
− patrimonio líquido año anterior (entrada manual, renglón 31 F210 previo)
= DIFERENCIA PATRIMONIAL (mínimo 0)
```
*Nota: valorizaciones/desvalorizaciones en el Excel salen de dos celdas
puntuales de `PATRIMONIO` (acciones/inversiones) — para el MVP, si no se
modela el detalle de valorización de acciones, se puede simplificar a 0 y
dejarlo como advertencia explícita ("no se ajustó por valorizaciones de
inversiones") en vez de omitir el campo silenciosamente.*

**B) Rentas ajustadas (lo que la renta declarada explica del incremento):**
```
renta líquida gravable (de nuestro propio cálculo del F210)
+ rentas exentas totales
+ INCRNGO totales
+ ganancia ocasional neta (ingresos - costos, antes de exenciones/tarifa)
+ normalización tributaria del año (fuera de alcance MVP → 0)
− impuestos y anticipos pagados durante el año gravable (entrada manual nueva)
− retenciones en la fuente practicadas en el año (entrada manual o desde certificados)
= RENTAS AJUSTADAS (mínimo 0)
```

**C) Resultado:**
```
RENTA POR COMPARACIÓN PATRIMONIAL = MAX(0, Diferencia patrimonial − Rentas ajustadas)
```
Si es mayor a 0, se adiciona a la renta líquida gravable (renglón 96 del
F210) — dispara advertencia obligatoria en la UI, no se declara nada
automáticamente sin que Daniela lo revise (hay que verificar activos
omitidos/pasivos inexistentes primero, como indica el procedimiento de
auditoría en el propio Excel).

**Nuevo campo de entrada requerido, no estaba en el diseño original:**
"impuestos y anticipos pagados durante el año gravable" (distinto del
anticipo del año anterior que ya se pedía) — hay que agregarlo al paso de
patrimonio del wizard.

## §3. Comparación patrimonial y año anterior (confirmado en DATOS INICIALES)

Los 6 campos que se piden del año anterior coinciden exactamente con el
diseño planeado de entrada manual:

| Campo | Renglón F210 año anterior |
|---|---|
| Impuesto neto de renta año anterior | 126 |
| Saldo a pagar año anterior | 134 |
| Saldo a favor año anterior | 137 |
| Anticipo calculado para el año actual | 133 |
| Patrimonio bruto año anterior | 29 |
| Patrimonio líquido año anterior | 31 |

*(Nota: el .xlsm no pide el renglón 30 "deudas" por separado — se puede
derivar como `29 - 31` si hace falta, o pedirlo directo si `RENTA COMP
PATR` lo usa distinto. Pendiente confirmar al analizar esa hoja.)*

## §4. Puntos normativos — resueltos en F1

1. **✅ Resuelto — redondeo:** el Art. 577 ET exige redondear a la unidad
   de mil: <500 hacia abajo, ≥500 hacia arriba (fuente:
   [gerencie.com](https://www.gerencie.com/como-se-aproximan-los-valores-en-las-declaraciones-tributarias.html)).
   Coincide exactamente con `ROUND(valor, -3)` de Excel — se porta igual
   (`Math.round(valor / 1000) * 1000` en JS, que redondea 0.5 hacia arriba
   igual que Excel).
2. **✅ Resuelto — tope alimentación (Art. 387-1 ET):** el límite es
   **mensual** (41 UVT/mes, salario ≤310 UVT/mes) — fuente:
   [estatuto.co/387-1](https://estatuto.co/387-1),
   [ambitojuridico.com](https://www.ambitojuridico.com/noticias/tributario/laboral-y-seguridad-social/precisan-pagos-terceros-por-alimentacion-que-no).
   Por eso el cálculo anual correcto se prorratea por **meses realmente
   trabajados**, no por 12 fijo — la hoja `RENTAS TRABAJO` (que usa
   `'DATOS INICIALES'!D29`, meses digitados) tiene el patrón correcto; la
   de `RENTAS HON y SER.` (que multiplica por `12` fijo) es una
   simplificación que se corrige al portar — usar meses trabajados en
   ambas cédulas.
3. **Aporte solidario COVID-19:** era una medida temporal de emergencia
   (Decreto 568/2020 y siguientes); para AG2025 se considera derogada/sin
   vigencia — se incluye el campo en el motor por completitud del F210
   pero con valor esperado 0 y sin resaltar en la UI como campo relevante.
4. **Tope "UVT × 100.000" firma contador:** dato informativo del Excel
   (umbral de patrimonio/ingresos que exige dictamen de contador), no
   afecta el cálculo del impuesto — se documenta pero no se implementa en
   el motor (es una validación de obligatoriedad de firma, no de cálculo).
5. **Componente inflacionario:** confirmado que hay UNA tasa por año en
   `DATOS BÁSICOS!E28` (0.5088 para AG2024) aplicada a rendimientos
   financieros de entidades vigiladas (Art. 38 ET) y de FIC (Art. 39 ET) —
   no eran tasas distintas, era la misma tasa reutilizada en ambas líneas;
   confirmado al leer las fórmulas completas de `RENTAS CAPITAL`.

## §7. Mapa completo de casillas — Formulario 210 (hoja `FORMULARIO 210`)

Confirmado casilla por casilla contra el `.xlsm`. **Negrita = en alcance
MVP esta temporada; el resto queda en 0 con nota "fuera de alcance" en el
motor, no se omite silenciosamente.**

| Casilla | Concepto | Origen |
|---|---|---|
| **29** | Total patrimonio bruto | `patrimonio.js` (suma de categorías, ver §8) |
| **30** | Deudas | `patrimonio.js` |
| **31** | Total patrimonio líquido | `MAX(0, 29-30)` |
| **32/43/58/74** | Ingresos brutos (trabajo/honorarios/capital/no laboral) | `cedulas/*.js` |
| **33/44/59/76** | INCRNGO por cédula | `cedulas/*.js` |
| 75 | Devoluciones/rebajas (solo no laboral) | `cedulas/noLaboral.js` |
| **45/60/77** | Costos y deducciones procedentes (honorarios/capital/no laboral — trabajo no aplica) | `cedulas/*.js` |
| **34/46/61/78** | Renta líquida por cédula | `cedulas/*.js` |
| 62/79 | Rentas líquidas pasivas ECE (capital/no laboral) | Fuera de alcance MVP → 0 |
| **35-40 / 47-52 / 63-68 / 80-85** | Rentas exentas + deducciones imputables (bruto, antes del tope) | `cedulas/*.js` |
| **41/53/69/86** | Rentas exentas y deducciones **limitadas** (post Art. 336 ET) | `exencionesDeducciones.js` |
| **42/57/73/90** | Renta líquida ordinaria por cédula (post límite) | `exencionesDeducciones.js` |
| 55/71/88, 56/72/89 | Pérdida líquida / compensación por pérdidas | Fuera de alcance MVP → 0 |
| **91** | Renta líquida cédula general (suma 4 cédulas) | `formulario210.js` |
| **92** | Rentas exentas/deducciones limitadas + adición dependientes (139) + 1% compras factura electrónica (28) | `exencionesDeducciones.js` + `dependientes.js` |
| **93** | Renta líquida ordinaria cédula general (91-92) | `formulario210.js` |
| 94, 95 | Compensación pérdidas / exceso renta presuntiva | Fuera de alcance MVP → 0 |
| **96** | Rentas gravables (activos omitidos / **renta por comparación patrimonial**) | `comparacionPatrimonial.js` |
| **97** | Renta líquida gravable cédula general (93+96-94-95) | `formulario210.js` |
| 98 | Renta presuntiva | Confirmado 0% → 0 |
| **99-103** | Pensiones (ingresos país+exterior, INCRNGO, renta líquida, exentas —tope propio 12.000 UVT, Art. 206 núm. 5 ET—, gravable) | `cedulas/pensiones.js` |
| **104-106** | Dividendos 2016 y anteriores (bruto, INCRNGO, renta líquida) | `cedulas/dividendos.js` |
| **107** | Dividendos subcédula 1 (no gravados, numeral 3 art. 49 ET) | `cedulas/dividendos.js` |
| **108** | Dividendos subcédula 2 (gravados, parágrafo 2° art. 49 ET) — tarifa plana 35% en casilla 118 | `cedulas/dividendos.js` + `impuestoDividendos.js` |
| **109-110** | Dividendos ECE/exterior (bruto, exenta asociada) — tarifa plana 35% en casilla 120 | `cedulas/dividendos.js` + `impuestoDividendos.js` |
| **111** | Renta líquida gravable total = 97 (o renta presuntiva=0 si mayor) + 103 + 107 + remanente de 108 tras su 35% | `formulario210.js` |
| **112-115** | Ganancias ocasionales (ingresos, costos, exentas, gravable) — base y tarifa propias (15%/20%), NO pasa por Art. 241 ET | `gananciaOcasional.js` |
| **116** | Impuesto sobre RLC cédula general+pensiones+dividendos subcéd.1/2-neto (tabla Art. 241 ET) | `formulario210.js` |
| 117 | Impuesto renta presuntiva mayor a la líquida | Confirmado 0% ET → nunca aplica en este alcance, siempre 0 |
| **118** | Impuesto dividendos subcédula 2 (tarifa plana 35%) | `impuestoDividendos.js` |
| **119** | Impuesto dividendos 2016 y anteriores (tabla propia, `tablaDividendos2016.js`) | `impuestoDividendos.js` |
| **120** | Impuesto dividendos ECE/exterior (tarifa plana 35%) | `impuestoDividendos.js` |
| **121** | Total impuesto sobre rentas líquidas gravables (116+117+118+119+120) | `formulario210.js` |
| **122-125** | Descuentos tributarios: 122-123 simplificados a 1 campo "otros descuentos" (Art. 259 ET), **124** descuento Art. 254-1 ET de dividendos, 125 = suma con tope | `descuentos.js` + `impuestoDividendos.js` |
| **126** | Impuesto neto de renta (121-125) | `impuesto.js` |
| **127** | Impuesto de ganancias ocasionales (tarifa 15%/20%) | `gananciaOcasional.js` |
| 128 | Descuento impuestos exterior sobre ganancia ocasional | Fuera de alcance MVP → 0 (caso raro) |
| **129** | Total impuesto a cargo (126+127-128) | `formulario210.js` |
| **130** | Anticipo renta año anterior | Entrada manual (año anterior) |
| **131** | Saldo a favor año anterior sin solicitud devolución | Entrada manual (año anterior) |
| **132** | Retenciones año gravable | `retenciones.js` (tabla simple) |
| **133** | Anticipo renta año siguiente (Art. 807 ET) | `anticipo.js` |
| **134** | Saldo a pagar (129+133-130-131-132) | `formulario210.js` |
| 135 | Sanciones | Fuera de alcance MVP → 0 (campo manual opcional) |
| **136** | Total saldo a pagar (129+133+135-130-131-132) | `formulario210.js` |
| **137** | Total saldo a favor | `formulario210.js` |
| **138** | Número de dependientes económicos | `dependientes.js` |
| **139** | Adición por dependientes (72 UVT × N, máx. 4) | `dependientes.js` |
| 140 | Marca si costos honorarios >60% ingresos (Art. 336-1 ET, indicador) | Se calcula y se muestra como advertencia, no bloquea |
| 141 | Aporte voluntario | Fuera de alcance MVP → 0 |
| **28** | 1% compras con factura electrónica (tope 240 UVT) | Entrada manual (monto de compras) → `MIN(compras×1%, 240×UVT)`, suma a casilla 92 |

## §8. Patrimonio — simplificación MVP (`PATRIMONIO`)

El Excel de referencia lleva un libro auxiliar activo-por-activo (10
categorías × ~10 líneas cada una = las 4.762 celdas de la hoja). Para el
MVP de esta temporada **no se replica el detalle línea por línea**; se
simplifica a captura por categoría (suficiente para casillas 29/30/31 y
para `comparacionPatrimonial.js`, que solo necesita los totales):

- Efectivo y equivalentes (cuentas, ahorros, CDT, cesantías en fondo)
- Inversiones (acciones, cuotas, títulos)
- Cuentas por cobrar
- Inventarios / activos biológicos
- Activos fijos e inmuebles
- Vehículos
- Otros activos (intangibles, activos en el exterior)
- **Total patrimonio bruto** = suma de las anteriores (casilla 29)
- Deudas (nacionales + exterior + otras, un solo total o desglosado en 3)
- **Total patrimonio líquido** = MAX(0, bruto − deudas) (casilla 31)

Se documenta como simplificación deliberada, no como omisión — si a futuro
se necesita el papel de trabajo activo-por-activo completo, es una
extensión de `patrimonio.js`, no un rediseño.

**Fase 5 (reajuste fiscal, `reajusteFiscal.js`):** para "Activos fijos e
inmuebles"/"Vehículos" sí se agregó el detalle por activo cuando el usuario
lo necesita, replicando PATRIMONIO!334-436 del .xlsm de referencia. Dos
mecanismos independientes, se toma el MAYOR entre los tres:

1. Reajuste fiscal anual (Art. 70 ET, opcional) — % único publicado por la
   DIAN cada año (`DATOS BÁSICOS!E18`, `REAJUSTE_FISCAL_POR_ANIO` en
   `estadoInicial.js`) sobre el valor declarado el año anterior (o el costo
   de adquisición si se compró este año gravable) + mejoras/valorizaciones.
2. Tabla Art. 73 ET (opcional, **solo bienes raíces** — nota literal de la
   hoja PATRIMONIO: "el reajuste del Art. 73 del E.T. solo aplica para
   Bienes Raíces") — factor por año de adquisición × tipo (urbano/rural),
   digitalizada completa 1900-2024 en `constantes/tablaArt73.js`,
   multiplicado directo por el costo histórico de adquisición.
3. Valor catastral (inmuebles) o avalúo comercial (vehículos) — entrada manual.

El total por activo se SUMA aparte, encima de la categoría simple
("Activos fijos e inmuebles"/"Vehículos"), no la reemplaza — el usuario
sigue pudiendo digitar un total rápido para lo que no necesita el detalle.

## Estado final de F0/F1

Análisis completo para el alcance acordado (trabajo, honorarios, capital
—incluye costos y gastos itemizados—, no laboral, pensiones, dividendos y
participaciones, ganancia ocasional, patrimonio simplificado por categoría
+ detalle opcional por activo con reajuste fiscal Art. 70/73 ET para
activos fijos, comparación patrimonial, anticipo, descuentos simplificados
+ Art. 254-1 dividendos, retenciones). Pendiente solo para fases futuras
(pospuestas, no bloquean esta temporada): venta de activos/acciones con
costo por activo (la ganancia ocasional captura totales digitados, no el
sub-flujo completo), patrimonio detallado activo-por-activo para las
demás categorías (efectivo, inversiones, cuentas por cobrar, etc.),
F420, renta presuntiva (0%, no aplica), subcapitalización, diferencia en
cambio, beneficio de auditoría, interés presuntivo, sanciones.
