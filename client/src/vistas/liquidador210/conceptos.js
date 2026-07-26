// Catálogo de conceptos digitables por cédula — nombres de campo alineados
// 1:1 con client/src/motor210/cedulas/*.js. Las notas citan el artículo del
// ET, igual que hacía el .xlsm de referencia (ver docs/reglas-tributarias-AG2025.md).

export const CONCEPTOS_INGRESOS_TRABAJO = [
  { clave: 'salarios', etiqueta: 'Salarios' },
  { clave: 'cesantiasPagadas', etiqueta: 'Cesantías pagadas directamente al empleado' },
  { clave: 'cesantiasFondo', etiqueta: 'Cesantías consignadas al fondo' },
  { clave: 'cesantiasPre2017', etiqueta: 'Cesantías retiradas (guardadas antes de 2017)', nota: 'no sujetas al límite del 40%' },
  { clave: 'prestacionesSociales', etiqueta: 'Prestaciones sociales' },
  { clave: 'primasExtralegales', etiqueta: 'Primas extralegales' },
  { clave: 'comisionesBonificaciones', etiqueta: 'Comisiones y bonificaciones' },
  { clave: 'otrosPagosLaborales', etiqueta: 'Otros pagos laborales' },
  { clave: 'indemnizacionesDespido', etiqueta: 'Indemnizaciones por despido injustificado' },
  { clave: 'subsidiosAuxilios', etiqueta: 'Subsidios y auxilios' },
  { clave: 'viaticos', etiqueta: 'Viáticos' },
  { clave: 'honorariosSinCostos', etiqueta: 'Honorarios (menos de 2 trabajadores contratados)' },
  { clave: 'compensacionServiciosSinCostos', etiqueta: 'Compensación por servicios personales (menos de 2 trabajadores)' },
  { clave: 'pagosAlimentacion', etiqueta: 'Pagos indirectos por alimentación', nota: 'Art. 387-1 ET, salario ≤310 UVT/mes' },
  { clave: 'gastosRepresentacion', etiqueta: 'Gastos de representación' },
  { clave: 'ingresosExterior', etiqueta: 'Ingresos obtenidos en el exterior' },
];

export const CONCEPTOS_INCRNGO_TRABAJO = [
  { clave: 'saludObligatoria', etiqueta: 'Salud obligatoria', nota: 'Art. 56 ET' },
  { clave: 'pensionObligatoria', etiqueta: 'Pensión obligatoria', nota: 'Art. 55 ET' },
  { clave: 'fondoSolidaridadPensional', etiqueta: 'Fondo de solidaridad pensional' },
  { clave: 'aportesVoluntariosRAIS', etiqueta: 'Aportes voluntarios RAIS', nota: 'tope 25% / 2.500 UVT' },
  { clave: 'apoyosEducativos', etiqueta: 'Apoyos económicos educativos', nota: 'Art. 46 ET' },
  { clave: 'otros', etiqueta: 'Otros INCRNGO' },
];

export const CONCEPTOS_DEDUCCIONES_TRABAJO = [
  { clave: 'medicinaPrepagada', etiqueta: 'Medicina prepagada / póliza de salud', nota: 'tope compartido 192 UVT' },
  { clave: 'interesesVivienda', etiqueta: 'Intereses de crédito de vivienda', nota: 'tope compartido 1.200 UVT' },
  { clave: 'gmfCertificado', etiqueta: 'GMF (4×1000) certificado', nota: 'se deduce el 50%' },
  { clave: 'interesesIcetex', etiqueta: 'Intereses créditos ICETEX', nota: 'tope compartido 100 UVT' },
  { clave: 'otras', etiqueta: 'Otras deducciones' },
];

// CED.1 GENERAL filas 115-137 (columna trabajo) — se dejan por fuera de
// estos catálogos las 2 que ya tienen su propio campo dedicado (AFC/pensión
// voluntaria y cesantías, calculadas en cedulas/trabajo.js).
export const CONCEPTOS_RENTAS_EXENTAS_LIMITADAS_TRABAJO = [
  { clave: 'indemnizacionAccidenteTrabajo', etiqueta: 'Indemnización por accidente de trabajo o enfermedad' },
  { clave: 'indemnizacionMaternidad', etiqueta: 'Indemnización que implique protección a la maternidad' },
  { clave: 'gastosEntierroTrabajador', etiqueta: 'Gastos de entierro del trabajador' },
  { clave: 'primasMisionesDiplomaticas', etiqueta: 'Primas, bonificaciones y horas extra de colombianos en misiones diplomáticas' },
  { clave: 'ventaEnergiaElectrica', etiqueta: 'Venta de energía eléctrica (eólica, biomasa, solar, geotérmica, residuos agrícolas)' },
  { clave: 'rentasVisVip', etiqueta: 'Rentas asociadas a vivienda de interés social y prioritario (VIS/VIP)' },
  { clave: 'economiaNaranja', etiqueta: 'Incentivo tributario economía naranja', nota: 'Art. 28 Ley 98 de 1993' },
  { clave: 'otrasRentasExentas', etiqueta: 'Otras rentas exentas no mencionadas anteriormente' },
];

export const CONCEPTOS_RENTAS_EXENTAS_NO_LIMITADAS_TRABAJO = [
  { clave: 'seguroMuerteFuerzasMilitares', etiqueta: 'Seguro por muerte, FFMM y Policía Nacional', nota: 'Art. 206 núm. 6 ET' },
  { clave: 'gastosRepresentacionMagistrados', etiqueta: 'Gastos de representación magistrados y fiscales', nota: '50% del salario, Art. 206 núm. 7 ET' },
  { clave: 'gastosRepresentacionJueces', etiqueta: 'Gastos de representación jueces de la República', nota: '25% del salario, Art. 206 núm. 7 ET' },
  { clave: 'excesoSalarioOficiales', etiqueta: 'Exceso salario básico oficiales/suboficiales FFMM y Policía' },
  { clave: 'gastosRepresentacionRectores', etiqueta: 'Gastos de representación rectores y profesores universidades oficiales', nota: '50% del salario, Art. 206 núm. 9 ET' },
  { clave: 'ingresosCAN', etiqueta: 'Ingresos obtenidos en países de la CAN' },
  { clave: 'primaDiplomaticos', etiqueta: 'Prima especial diplomáticos, consulares y de cancillería', nota: 'Art. 206-1 ET' },
  { clave: 'rentaHotelesConstruidos', etiqueta: 'Renta exenta hoteles construidos 2003-2016', nota: 'Art. 207-2 núm. 3-4 ET' },
];

export const CONCEPTOS_INGRESOS_HONORARIOS = [
  { clave: 'honorarios', etiqueta: 'Honorarios (2 o más trabajadores contratados)' },
  { clave: 'compensacionServicios', etiqueta: 'Compensación por servicios personales (2+ trabajadores)' },
  { clave: 'comisionesBonificaciones', etiqueta: 'Comisiones y bonificaciones' },
  { clave: 'ingresosExterior', etiqueta: 'Ingresos obtenidos en el exterior' },
  { clave: 'otros', etiqueta: 'Otros ingresos' },
];

export const CONCEPTOS_INGRESOS_CAPITAL = [
  { clave: 'intereses', etiqueta: 'Intereses financieros / entre particulares' },
  { clave: 'rendimientosEntidadesFinancieras', etiqueta: 'Rendimientos de entidades financieras vigiladas', nota: 'Art. 38 ET' },
  { clave: 'rendimientosTitulosDeudaPublica', etiqueta: 'Rendimientos de títulos de deuda pública', nota: 'Art. 38 ET' },
  { clave: 'fondosInversionColectiva', etiqueta: 'Fondos de inversión colectiva (FIC)', nota: 'Art. 39 ET' },
  { clave: 'rendimientosPensiones', etiqueta: 'Rendimientos de fondos de pensiones' },
  { clave: 'rendimientosCesantias', etiqueta: 'Rendimientos de fondos de cesantías' },
  { clave: 'rendimientosAFC', etiqueta: 'Rendimientos de cuentas AFC/AVC' },
  { clave: 'arrendamientos', etiqueta: 'Arrendamientos' },
  { clave: 'regalias', etiqueta: 'Regalías' },
  { clave: 'propiedadIntelectual', etiqueta: 'Explotación de propiedad intelectual' },
  { clave: 'ingresosExterior', etiqueta: 'Ingresos del exterior por rentas de capital' },
  { clave: 'otros', etiqueta: 'Otros ingresos de capital' },
];

export const CONCEPTOS_INGRESOS_NO_LABORAL = [
  { clave: 'honorarios2omastrabajadores', etiqueta: 'Honorarios (2 o más trabajadores contratados)' },
  { clave: 'compensacionServicios2omastrabajadores', etiqueta: 'Compensación por servicios personales (2+ trabajadores)' },
  { clave: 'contratosPrestacionServicios', etiqueta: 'Contratos de prestación de servicios' },
  { clave: 'ventasMercancia', etiqueta: 'Ventas ordinarias de mercancías' },
  { clave: 'ventasActividades', etiqueta: 'Ingresos por actividades comerciales' },
  { clave: 'ventasInventarios', etiqueta: 'Venta de inventarios producidos' },
  { clave: 'ventasActivosBiologicos', etiqueta: 'Venta de activos biológicos' },
  { clave: 'construccion', etiqueta: 'Servicios de construcción' },
  { clave: 'apoyosEducativos', etiqueta: 'Apoyos económicos del Estado (educativos)' },
  { clave: 'gananciales', etiqueta: 'Ingresos por gananciales' },
  { clave: 'indemnizacionDanoEmergente', etiqueta: 'Indemnización por daño emergente' },
  { clave: 'indemnizacionLucroCesante', etiqueta: 'Indemnización por lucro cesante' },
  { clave: 'indemnizacionSegurosVida', etiqueta: 'Indemnización de seguros de vida' },
  { clave: 'retiroPensionSinPermanencia', etiqueta: 'Retiro de fondo de pensión sin requisito de permanencia' },
  { clave: 'retiroAfcSinPermanencia', etiqueta: 'Retiro de cuenta AFC sin requisito de permanencia' },
  { clave: 'ventaInmuebles', etiqueta: 'Venta de inmuebles (< 2 años)' },
  { clave: 'ventaInversiones', etiqueta: 'Venta de inversiones (< 2 años)' },
  { clave: 'ventaActivosFijos', etiqueta: 'Venta de otros activos fijos (< 2 años)' },
  { clave: 'colaboracionEmpresarial', etiqueta: 'Contratos de colaboración empresarial' },
  { clave: 'ingresosCAN', etiqueta: 'Rentas de países de la CAN' },
  { clave: 'ingresosExterior', etiqueta: 'Otros ingresos del exterior' },
  { clave: 'otros', etiqueta: 'Otros ingresos no laborales' },
];

// CED.1 GENERAL filas 89-111 (columna capital) — costos y gastos
// procedentes Art. 107/107-1/771-2 ET. "gastosFinancieros" lleva un
// tratamiento especial en cedulas/capital.js (se afecta por el componente
// inflacionario de gastos financieros, DATOS BÁSICOS!E29 — distinto del
// que ya se usa para los ingresos de esta misma cédula, DATOS BÁSICOS!E28).
export const CONCEPTOS_COSTOS_GASTOS_CAPITAL = [
  { clave: 'costosMercanciasVendidas', etiqueta: 'Costos de mercancías vendidas' },
  { clave: 'costoFiscalActivosVendidos', etiqueta: 'Costo fiscal de activos fijos vendidos', nota: 'poseídos menos de 2 años' },
  { clave: 'salariosPrestacionesSociales', etiqueta: 'Salarios y prestaciones sociales' },
  { clave: 'aportesSeguridadSocial', etiqueta: 'Aportes a la seguridad social' },
  { clave: 'aportesParafiscales', etiqueta: 'Aportes parafiscales' },
  { clave: 'honorarios', etiqueta: 'Honorarios' },
  { clave: 'administracion', etiqueta: 'Administración' },
  { clave: 'mantenimientos', etiqueta: 'Mantenimientos' },
  { clave: 'interesesSubcapitalizacion', etiqueta: 'Intereses deducibles por subcapitalización' },
  { clave: 'gastosFinancieros', etiqueta: 'Gastos financieros', nota: 'se afecta por el componente inflacionario de gastos FRS' },
  { clave: 'arrendamientos', etiqueta: 'Arrendamientos' },
  { clave: 'contribucionesAfiliaciones', etiqueta: 'Contribuciones y afiliaciones' },
  { clave: 'seguros', etiqueta: 'Seguros' },
  { clave: 'servicios', etiqueta: 'Servicios' },
  { clave: 'impuestoPredial', etiqueta: 'Impuesto predial' },
  { clave: 'impuestoIndustriaComercio', etiqueta: 'Impuesto de industria y comercio' },
  { clave: 'impuestoVehiculos', etiqueta: 'Impuesto de vehículos' },
  { clave: 'reparaciones', etiqueta: 'Reparaciones' },
  { clave: 'adecuaciones', etiqueta: 'Adecuaciones' },
  { clave: 'gastosViaje', etiqueta: 'Gastos de viaje' },
  { clave: 'diversos', etiqueta: 'Diversos' },
  { clave: 'gastosColaboracionEmpresarial', etiqueta: 'Gastos certificados por contratos de colaboración empresarial' },
  { clave: 'otrosCostosGastos', etiqueta: 'Otros costos y gastos no mencionados anteriormente' },
];

// CED.2 PENSIONES filas 16-22 (país) y 26-34 (exterior, 3 categorías con
// trato distinto — ver cedulas/pensiones.js).
export const CONCEPTOS_INGRESOS_PENSIONES = [
  { clave: 'jubilacion', etiqueta: 'Pensión de jubilación' },
  { clave: 'invalidez', etiqueta: 'Pensión de invalidez' },
  { clave: 'vejez', etiqueta: 'Pensión de vejez' },
  { clave: 'sobrevivientes', etiqueta: 'Pensión de sobrevivientes' },
  { clave: 'riesgosProfesionales', etiqueta: 'Pensión sobre riesgos profesionales' },
  { clave: 'indemnizacionesSustitutivas', etiqueta: 'Indemnizaciones sustitutivas de las pensiones' },
  { clave: 'devolucionSaldosAhorro', etiqueta: 'Devoluciones de saldos de ahorro pensional' },
];

export const CONCEPTOS_INGRESOS_EXTERIOR_PENSIONES = [
  { clave: 'sinConvenioJubilacionEtc', etiqueta: 'Sin convenio doble imposición: jubilación, invalidez, vejez', nota: 'sin exención' },
  { clave: 'sinConvenioOtras', etiqueta: 'Sin convenio doble imposición: otras pensiones', nota: 'sin exención' },
  { clave: 'demasPaisesJubilacionEtc', etiqueta: 'Demás países: jubilación, invalidez, vejez', nota: 'exenta, tope 12.000 UVT' },
  { clave: 'demasPaisesOtras', etiqueta: 'Demás países: otras pensiones', nota: 'exenta, tope 12.000 UVT' },
  { clave: 'canJubilacionEtc', etiqueta: 'Países de la CAN: jubilación, invalidez, vejez', nota: 'exenta sin límite' },
  { clave: 'canOtras', etiqueta: 'Países de la CAN: otras pensiones', nota: 'exenta sin límite' },
];

export const CONCEPTOS_INCRNGO_PENSIONES = [
  { clave: 'saludObligatoria', etiqueta: 'Pagos salud obligatoria', nota: 'Art. 56 ET, sin límite' },
  { clave: 'fondoSolidaridadPensional', etiqueta: 'Contribuciones al Fondo de Solidaridad Pensional', nota: 'sin límite' },
  { clave: 'indemnizaciones', etiqueta: 'Indemnizaciones (diferentes a las laborales, daño emergente, entre otras)' },
  { clave: 'otros', etiqueta: 'Otros ingresos no constitutivos de renta' },
];

// CED.3 DIVIDENDOS filas 16-21 (2016 y anteriores).
export const CONCEPTOS_DIVIDENDOS_2016 = [
  { clave: 'dividendosNoGravados', etiqueta: 'Dividendos y participaciones NO gravados' },
  { clave: 'dividendosGravados', etiqueta: 'Dividendos y participaciones gravados' },
  { clave: 'capitalizacionesNoGravadas', etiqueta: 'Capitalizaciones NO gravadas para los socios o accionistas' },
  { clave: 'capitalizacionesGravadas', etiqueta: 'Capitalizaciones gravadas para los socios o accionistas' },
  { clave: 'distribucionEceNoGravados', etiqueta: 'Distribución de beneficios de las ECE NO gravados' },
  { clave: 'distribucionEceGravados', etiqueta: 'Distribución de beneficios de las ECE gravados' },
];

// GANANCIA OCASIONAL filas 10-17 (tarifa 15%) — porción conyugal, donaciones
// y seguros de vida tienen su exención derivada automáticamente en
// gananciaOcasional.js (mismo campo fuente que el .xlsm enlaza por fórmula).
export const CONCEPTOS_INGRESOS_GANANCIA_OCASIONAL = [
  { clave: 'ventaActivosFijos2AniosOMas', etiqueta: 'Venta de activos fijos poseídos por 2 años o más' },
  { clave: 'ventaAcciones2AniosOMas', etiqueta: 'Venta de acciones poseídas por 2 años o más' },
  { clave: 'porcionConyugal', etiqueta: 'Ingresos recibidos por porción conyugal', nota: 'exención automática, tope 3.250 UVT' },
  { clave: 'liquidacionSociedades', etiqueta: 'Ingresos obtenidos en la liquidación de sociedades' },
  { clave: 'herencia', etiqueta: 'Ingresos por herencia' },
  { clave: 'legados', etiqueta: 'Ingresos por legados' },
  { clave: 'indemnizacionSegurosVida', etiqueta: 'Indemnizaciones por seguros de vida', nota: 'exención automática, tope 3.250 UVT' },
  { clave: 'donacionesInterVivos', etiqueta: 'Donaciones o actos jurídicos inter vivos a título gratuito', nota: 'exención automática del 20%, tope 1.625 UVT' },
];

export const CONCEPTOS_COSTOS_GANANCIA_OCASIONAL = [
  { clave: 'costoVentaActivosFijos', etiqueta: 'Costo de venta de activos fijos' },
  { clave: 'costoVentaAcciones', etiqueta: 'Costo de venta de acciones' },
];

// GANANCIA OCASIONAL filas 45-58 — las que el .xlsm auto-deriva del ingreso
// (porción conyugal, donaciones, seguros de vida) NO están aquí, ver arriba.
export const CONCEPTOS_EXENTAS_GANANCIA_OCASIONAL = [
  { clave: 'ventaCasaAntes1987', etiqueta: 'Venta casa de habitación antes del 1° de enero de 1987', nota: 'sin límite' },
  { clave: 'viviendaCausante', etiqueta: 'Vivienda de habitación del causante (herencia)', nota: 'tope 13.000 UVT' },
  { clave: 'inmuebleCausante', etiqueta: 'Bienes inmuebles del causante distintos a la vivienda', nota: 'tope 6.500 UVT' },
  { clave: 'herenciaLegado', etiqueta: 'Herencia o legado (herederos/legitimarios)', nota: 'tope 3.250 UVT' },
  { clave: 'bienesTerceros', etiqueta: 'Bienes recibidos por terceros (no legitimarios ni cónyuge)', nota: '20%, tope 1.625 UVT' },
  { clave: 'librosRopaMobiliario', etiqueta: 'Libros, ropa, utensilios personales y mobiliario del causante', nota: 'sin límite' },
  { clave: 'ventaCasaHabitual', etiqueta: 'Utilidad venta casa o apartamento de habitación', nota: 'Art. 311-1 ET, tope 5.000 UVT' },
  { clave: 'accionesBVC', etiqueta: 'Utilidad venta acciones inscritas en bolsa (< 3%)', nota: 'sin límite' },
  { clave: 'exteriorEce', etiqueta: 'Rentas ECE y/o CAN y/o recibidas del exterior', nota: 'sin límite' },
  { clave: 'otras', etiqueta: 'Otras no mencionadas anteriormente' },
];

export const CATEGORIAS_PATRIMONIO = [
  { clave: 'efectivo', etiqueta: 'Efectivo y equivalentes', nota: 'cuentas, ahorros, CDT, cesantías en fondo' },
  { clave: 'inversiones', etiqueta: 'Inversiones', nota: 'acciones, cuotas, títulos' },
  { clave: 'cuentasPorCobrar', etiqueta: 'Cuentas por cobrar' },
  { clave: 'inventarios', etiqueta: 'Inventarios / activos biológicos' },
  { clave: 'activosFijosInmuebles', etiqueta: 'Activos fijos e inmuebles' },
  { clave: 'vehiculos', etiqueta: 'Vehículos' },
  { clave: 'otros', etiqueta: 'Otros activos', nota: 'intangibles, activos en el exterior' },
];
