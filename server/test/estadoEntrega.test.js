// Pruebas de la clasificación de eventos de Brevo: decide a quién se excluye
// de la captación (rebote o queja) y qué estado de entrega se muestra.

const test = require('node:test');
const assert = require('node:assert/strict');
const { clasificarEventos } = require('../src/estadoEntrega');

const ev = (tipo, email, fecha, motivo = '') => ({ tipo, email, fecha, motivo });

test('rebote permanente: excluye al prospecto (estado rebote)', () => {
  const r = clasificarEventos([
    ev('delivered', 'a@x.co', '2026-09-19T12:00:00-05:00'),
    ev('hardBounces', 'a@x.co', '2026-09-19T12:00:05-05:00', '550 5.1.1 no existe'),
  ]).get('a@x.co');
  assert.equal(r.entrega, 'rebote');
  assert.equal(r.estado, 'rebote');
  assert.match(r.detalle, /550/);
});

test('un rebote no se "cura" con un evento posterior', () => {
  const r = clasificarEventos([
    ev('hardBounces', 'a@x.co', '2026-09-19T12:00:00-05:00'),
    ev('deferred', 'a@x.co', '2026-09-19T13:00:00-05:00'),
  ]).get('a@x.co');
  assert.equal(r.estado, 'rebote');
});

test('invalid y blocked también son rebote', () => {
  const r = clasificarEventos([ev('invalid', 'a@x.co', '2026-09-19T12:00:00Z'), ev('blocked', 'b@x.co', '2026-09-19T12:00:00Z')]);
  assert.equal(r.get('a@x.co').estado, 'rebote');
  assert.equal(r.get('b@x.co').estado, 'rebote');
});

test('queja de spam y baja en Brevo: pasan a baja', () => {
  const r = clasificarEventos([ev('spam', 'a@x.co', '2026-09-19T12:00:00Z'), ev('unsubscribed', 'b@x.co', '2026-09-19T12:00:00Z')]);
  assert.deepEqual([r.get('a@x.co').entrega, r.get('a@x.co').estado], ['spam', 'baja']);
  assert.deepEqual([r.get('b@x.co').entrega, r.get('b@x.co').estado], ['baja', 'baja']);
});

test('diferido y luego entregado: queda entregado, sin excluir', () => {
  const r = clasificarEventos([
    ev('deferred', 'a@x.co', '2026-09-19T12:00:00-05:00', 'connection timeout'),
    ev('delivered', 'a@x.co', '2026-09-19T12:30:00-05:00'),
  ]).get('a@x.co');
  assert.equal(r.entrega, 'entregado');
  assert.equal(r.estado, null);
});

test('rebote temporal (buzón lleno): se muestra, pero no excluye', () => {
  const r = clasificarEventos([ev('softBounces', 'a@x.co', '2026-09-19T12:00:00Z', '452 4.2.2 buzón lleno')]).get('a@x.co');
  assert.equal(r.entrega, 'temporal');
  assert.equal(r.estado, null);
});

test('ordena por fecha real aunque las zonas horarias difieran', () => {
  const r = clasificarEventos([
    ev('delivered', 'a@x.co', '2026-09-19T18:00:00Z'), // 1:00 p. m. Bogotá
    ev('deferred', 'a@x.co', '2026-09-19T12:30:00-05:00'), // 12:30 p. m. Bogotá
  ]).get('a@x.co');
  assert.equal(r.entrega, 'entregado');
});

test('normaliza el correo e ignora tipos desconocidos', () => {
  const r = clasificarEventos([ev('hardBounces', '  A@X.CO ', '2026-09-19T12:00:00Z'), ev('opened', 'b@x.co', '2026-09-19T12:00:00Z')]);
  assert.ok(r.has('a@x.co'));
  assert.ok(!r.has('b@x.co'));
});
