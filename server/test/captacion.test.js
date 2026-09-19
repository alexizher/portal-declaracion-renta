// Pruebas de las reglas de la captación de prospectos: horario de la Ley 2300
// de 2023, festivos de Colombia, render del correo y tokens de baja.
// Runner nativo de Node (node --test): sin dependencias ni base de datos; los
// módulos que tocan MariaDB abren el pool solo al consultar.

process.env.ADMIN_PASSWORD = 'clave-de-prueba';
process.env.BASE_URL = 'https://portal.ejemplo.test';

const test = require('node:test');
const assert = require('node:assert/strict');

const { puedeContactar, festivosColombia } = require('../src/horarioContacto');
const { renderCorreoCaptacion } = require('../src/correo');
const { tokenBaja, prospectoIdDeBaja, tokenPortal, clienteIdDelPortal } = require('../src/auth');
const { CALENDARIO_2026 } = require('../src/seed');
const { CUERPO, ASUNTO } = require('../src/plantillaCaptacion');

test('festivos de Colombia 2026: coinciden con el calendario oficial (18 días)', () => {
  assert.deepEqual([...festivosColombia(2026)].sort(), [
    '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03',
    '2026-05-01', '2026-05-18', '2026-06-08', '2026-06-15', '2026-06-29',
    '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12', '2026-11-02',
    '2026-11-16', '2026-12-08', '2026-12-25',
  ]);
});

test('festivos móviles de otro año: la Pascua se calcula, no se tabula', () => {
  const f2027 = festivosColombia(2027);
  assert.ok(f2027.has('2027-03-25'), 'Jueves Santo 2027');
  assert.ok(f2027.has('2027-03-26'), 'Viernes Santo 2027');
  assert.ok(f2027.has('2027-05-10'), 'Ascensión 2027 (lunes)');
});

test('Ley 2300: lunes a viernes de 7:00 a. m. a 7:00 p. m.', () => {
  assert.equal(puedeContactar('2026-09-18 06:59:00').ok, false);
  assert.equal(puedeContactar('2026-09-18 07:00:00').ok, true);
  assert.equal(puedeContactar('2026-09-18 18:59:00').ok, true);
  assert.equal(puedeContactar('2026-09-18 19:00:00').ok, false);
});

test('Ley 2300: sábados de 8:00 a. m. a 3:00 p. m.; nunca domingos ni festivos', () => {
  assert.equal(puedeContactar('2026-09-19 07:59:00').ok, false);
  assert.equal(puedeContactar('2026-09-19 08:00:00').ok, true);
  assert.equal(puedeContactar('2026-09-19 14:59:00').ok, true);
  assert.equal(puedeContactar('2026-09-19 15:00:00').ok, false);
  assert.equal(puedeContactar('2026-09-20 10:00:00').ok, false, 'domingo');
  const festivo = puedeContactar('2026-10-12 10:00:00');
  assert.equal(festivo.ok, false);
  assert.match(festivo.motivo, /festivo/);
});

const CONFIG = { asunto_captacion: ASUNTO, cuerpo_captacion: CUERPO, remitente: '' };
// La plantilla de presentación no saluda por nombre; {{saludo}} se prueba
// con una plantilla mínima porque el render lo sigue soportando.
const CONFIG_SALUDO = { asunto_captacion: 'x', cuerpo_captacion: '<p>{{saludo}}</p>', remitente: '' };
const prospecto = (campos = {}) => ({ id: 'abc123', nombre: '', email: 'p@ejemplo.test', estado: 'nuevo', ...campos });

test('saludo: solo el primer nombre, capitalizado (las bases vienen en mayúsculas)', () => {
  const { html } = renderCorreoCaptacion(prospecto({ nombre: 'ÁNGELA MARÍA VÉLEZ' }), CONFIG_SALUDO, CALENDARIO_2026, '2026-09-19');
  assert.match(html, /Hola Ángela,/);
  assert.doesNotMatch(html, /VÉLEZ/);
});

test('saludo sin nombre: "Hola," a secas', () => {
  const { html } = renderCorreoCaptacion(prospecto(), CONFIG_SALUDO, CALENDARIO_2026, '2026-09-19');
  assert.match(html, /Hola,<\/p>/);
});

test('el nombre se escapa: no se puede inyectar HTML en el correo', () => {
  const { html } = renderCorreoCaptacion(prospecto({ nombre: '<img src=x>' }), CONFIG_SALUDO, CALENDARIO_2026, '2026-09-19');
  assert.doesNotMatch(html, /<img src=x>/);
  assert.match(html, /Hola &lt;img,/);
});

test('la tabla de fechas solo trae plazos que no han vencido', () => {
  const { html } = renderCorreoCaptacion(prospecto(), CONFIG, CALENDARIO_2026, '2026-09-19');
  assert.match(html, />55-56<\/span>/, 'el 21-sep (55-56) sigue vigente');
  assert.doesNotMatch(html, />53-54<\/span>/, 'el 18-sep (53-54) ya pasó');
  assert.match(html, /plazos hasta el 26 de octubre\./);
});

test('advertencias: baja, cliente y fin de temporada bloquean el envío', () => {
  const adv = (p, hoy = '2026-09-19') => renderCorreoCaptacion(p, CONFIG, CALENDARIO_2026, hoy).advertencias;
  assert.deepEqual(adv(prospecto()), []);
  assert.match(adv(prospecto({ estado: 'baja' })).join(), /no recibir más correos/);
  assert.match(adv(prospecto({ estado: 'convertido' })).join(), /Ya es cliente/);
  assert.match(adv(prospecto(), '2026-10-27').join(), /temporada terminó/);
});

test('el enlace de baja del correo resuelve al prospecto', () => {
  const { html } = renderCorreoCaptacion(prospecto(), CONFIG, CALENDARIO_2026, '2026-09-19');
  const [, token] = html.match(/href="https:\/\/portal\.ejemplo\.test\/baja\/([^"]+)"/);
  assert.equal(prospectoIdDeBaja(token), 'abc123');
});

test('tokens con separación de dominio: uno de baja no abre un portal ni al revés', () => {
  assert.equal(clienteIdDelPortal(tokenBaja('abc123')), null);
  assert.equal(prospectoIdDeBaja(tokenPortal('abc123')), null);
  assert.equal(prospectoIdDeBaja('abc123.firma-falsa'), null);
  assert.equal(prospectoIdDeBaja(''), null);
});

test('la plantilla inicial trae el enlace de baja (obligatorio, Ley 1581)', () => {
  assert.match(CUERPO, /\{\{baja\}\}/);
});

test('la plantilla es una presentación: no usa el nombre ni supone que la persona declara', () => {
  const { html } = renderCorreoCaptacion(prospecto({ nombre: 'ADELA MILLAN' }), CONFIG, CALENDARIO_2026, '2026-09-19');
  assert.doesNotMatch(CUERPO, /\{\{(saludo|nombre)\}\}/);
  assert.doesNotMatch(html, /Adela|ADELA/);
  assert.doesNotMatch(html, /su declaraci[oó]n|le corresponde declarar|est[aá] obligad[oa]|su fecha/i);
  assert.match(html, /asesoría personalizada/);
  assert.match(html, />55-56<\/span>/, 'incluye la tabla de plazos vigentes');
});
