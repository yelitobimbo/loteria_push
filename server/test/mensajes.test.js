'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const m = require('../mensajes');

const ev = { tipo: 'carta', sala: 'ABCDE', n: 5, cartaId: 1, nombre: 'El Gallo', pista: 'Madruga más que tu mamá un domingo.' };
const AHORA = 1_700_000_000_000;

test('carta: va al tema de la sala', () => {
  const msg = m.mensajeCarta(ev, AHORA);
  assert.equal(msg.topic, 'sala_ABCDE');
  assert.equal(msg.token, undefined);
});

test('data: TODOS los valores son cadenas (requisito de FCM)', () => {
  for (const msg of [
    m.mensajeCarta(ev, AHORA),
    m.mensajeCasi({ tipo: 'casi', sala: 'ABCDE', n: 7, cartaId: 9 }, AHORA),
    m.mensajeLoteria({ tipo: 'loteria', sala: 'ABCDE', n: 12, ganador: 'Ana', patron: 'fila1' }, AHORA),
  ]) {
    for (const [k, v] of Object.entries(msg.data)) assert.equal(typeof v, 'string', `data.${k}`);
  }
  assert.equal(m.mensajeCarta(ev, AHORA).data.n, '5');
});

test('carta: caduca en 60 s (una carta vieja ya no sirve)', () => {
  const msg = m.mensajeCarta(ev, AHORA);
  assert.equal(msg.android.ttl, 60000);
  assert.equal(msg.apns.headers['apns-expiration'], String(Math.floor((AHORA + 60000) / 1000)));
});

test('carta: colapsa (Android collapseKey+tag, iOS apns-collapse-id)', () => {
  const msg = m.mensajeCarta(ev, AHORA);
  assert.equal(msg.android.collapseKey, 'carta_ABCDE');
  assert.equal(msg.android.notification.tag, 'carta_ABCDE');
  assert.equal(msg.apns.headers['apns-collapse-id'], 'carta_ABCDE');
  assert.ok(Buffer.byteLength(msg.apns.headers['apns-collapse-id']) <= 64, 'APNs limita a 64 bytes');
});

test('canales: cartas son discretas; casi y lotería son momentos importantes', () => {
  assert.equal(m.mensajeCarta(ev, AHORA).android.notification.channelId, 'cartas');
  assert.equal(m.mensajeCasi({ sala: 'ABCDE', n: 1, cartaId: 1 }, AHORA).android.notification.channelId, 'momentos');
  assert.equal(m.mensajeLoteria({ sala: 'ABCDE', n: 1, ganador: 'Ana', patron: 'fila1' }, AHORA).android.notification.channelId, 'momentos');
});

test('lotería: duración larga y texto humano', () => {
  const msg = m.mensajeLoteria({ sala: 'ABCDE', n: 12, ganador: 'Ana', patron: 'fila1' }, AHORA);
  assert.equal(msg.android.ttl, 3_600_000);
  assert.match(msg.notification.body, /Ana ganó con la fila 1/);
});

test('haciaDestino: quita el tema y apunta a un token o a un fid', () => {
  const base = m.mensajeCarta(ev, AHORA);
  const t = m.haciaDestino(base, { tipo: 'token', valor: 'tok'.repeat(10) });
  assert.equal(t.token, 'tok'.repeat(10));
  assert.equal(t.topic, undefined);
  assert.equal(t.fid, undefined);
  const f = m.haciaDestino(base, { tipo: 'fid', valor: 'fid'.repeat(10) });
  assert.equal(f.fid, 'fid'.repeat(10));
  assert.equal(f.token, undefined);
  assert.equal(base.topic, 'sala_ABCDE', 'no modifica el original');
});

test('un mensaje de más de 4 KB se rechaza antes de enviarlo', () => {
  assert.throws(() => m.mensajeCarta({ ...ev, pista: 'x'.repeat(5000) }, AHORA), /excede/);
});

test('un mensaje típico pesa mucho menos del límite', () => {
  assert.ok(Buffer.byteLength(JSON.stringify(m.mensajeCarta(ev, AHORA))) < 1200);
});
