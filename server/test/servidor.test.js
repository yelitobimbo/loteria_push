'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { crearServidor } = require('../servidor');
const { Salas } = require('../sala');
const { patronesCompletos } = require('../lineas');

function fuenteDeterminista() {
  let s = 500;
  let c = 0;
  return { semilla: () => ++s, clave: () => `clave${++c}`, codigoSala: () => `SALA${++c}` };
}

/** Arranca un servidor real en un puerto libre, con un enviador falso que registra todo. */
async function levantar({ falla = () => null } = {}) {
  const enviados = [];
  const logs = [];
  let reloj = 1_000_000;
  const enviador = {
    async enviar(mensaje) {
      const err = falla(mensaje);
      if (err) throw err;
      enviados.push(mensaje);
      return 'id';
    },
  };
  const salas = new Salas({ fuente: fuenteDeterminista() });
  const srv = crearServidor({ salas, enviador, ahora: () => reloj, log: (l) => logs.push(l) });
  await new Promise((r) => srv.listen(0, r));
  const base = `http://127.0.0.1:${srv.address().port}`;
  const http = async (metodo, ruta, cuerpo, cabeceras = {}) => {
    const res = await fetch(base + ruta, {
      method: metodo,
      headers: { 'content-type': 'application/json', ...cabeceras },
      body: cuerpo === undefined ? undefined : typeof cuerpo === 'string' ? cuerpo : JSON.stringify(cuerpo),
    });
    return { estado: res.status, json: await res.json() };
  };
  return {
    http, enviados, logs, salas,
    avanzar: (ms) => { reloj += ms; },
    cerrar: () => new Promise((r) => srv.close(r)),
  };
}

const T1 = 'token-ana-xxxxxxxxxxxxxxxxxxxx';
const T2 = 'token-beto-xxxxxxxxxxxxxxxxxxx';

async function sala(ctx) {
  const { json } = await ctx.http('POST', '/salas');
  return { id: json.id, cantor: { 'x-cantor-clave': json.claveCantor } };
}

test('flujo completo: crear, unirse, cantar y ver el push al tema', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    const u = await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'Ana', destino: { tipo: 'token', valor: T1 } });
    assert.equal(u.estado, 201);
    assert.equal(u.json.tabla.length, 16);

    const c = await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor);
    assert.equal(c.estado, 200);
    assert.equal(c.json.evento.n, 1);
    assert.equal(ctx.enviados.length, 1);
    assert.equal(ctx.enviados[0].topic, `sala_${s.id}`);
    assert.equal(ctx.enviados[0].data.n, '1');
  } finally { await ctx.cerrar(); }
});

test('cantar exige la clave del cantor', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    const sinClave = await ctx.http('POST', `/salas/${s.id}/cantar`);
    const mala = await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, { 'x-cantor-clave': 'adivinada' });
    assert.equal(sinClave.estado, 403);
    assert.equal(mala.estado, 403);
    assert.equal(ctx.enviados.length, 0, 'sin clave no sale ningún push');
  } finally { await ctx.cerrar(); }
});

test('freno: dos cantos seguidos -> 429 y solo un push', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor);
    const r = await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor);
    assert.equal(r.estado, 429);
    assert.equal(r.json.error, 'MUY_RAPIDO');
    assert.equal(ctx.enviados.length, 1);
    ctx.avanzar(2500);
    assert.equal((await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor)).estado, 200);
  } finally { await ctx.cerrar(); }
});

test('GET estado devuelve las cartas desde n (para ponerse al día)', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    for (let i = 0; i < 4; i++) { await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor); ctx.avanzar(3000); }
    const e = await ctx.http('GET', `/salas/${s.id}/estado?desde=2`);
    assert.equal(e.json.ultima, 4);
    assert.deepEqual(e.json.cartas.map((c) => c.n), [3, 4]);
    const raro = await ctx.http('GET', `/salas/${s.id}/estado?desde=abc`);
    assert.equal(raro.json.cartas.length, 4);
  } finally { await ctx.cerrar(); }
});

test('si FCM falla, el canto igual cuenta (el estado es la verdad) y se registra el fallo', async () => {
  const ctx = await levantar({ falla: () => Object.assign(new Error('FCM caído'), { code: 'messaging/internal-error' }) });
  try {
    const s = await sala(ctx);
    const c = await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor);
    assert.equal(c.estado, 200);
    assert.equal(c.json.enviado, false);
    assert.ok(ctx.logs.some((l) => l.includes('messaging/internal-error')));
    const e = await ctx.http('GET', `/salas/${s.id}/estado`);
    assert.equal(e.json.ultima, 1, 'quien consulte, la verá');
  } finally { await ctx.cerrar(); }
});

test('aviso de "casi" va a UN token, no al tema; y el token muerto se elimina', async () => {
  const muerto = Object.assign(new Error('x'), { code: 'messaging/registration-token-not-registered' });
  const ctx = await levantar({ falla: (m) => (m.token === T2 ? muerto : null) });
  try {
    const s = await sala(ctx);
    const a = await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'Ana', destino: { tipo: 'token', valor: T1 } });
    const b = await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'Beto', destino: { tipo: 'token', valor: T2 } });
    for (let i = 0; i < 40; i++) {
      const r = await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor);
      if (r.estado !== 200) break;
      ctx.avanzar(3000);
    }
    const personales = ctx.enviados.filter((m) => m.token);
    assert.ok(personales.every((m) => m.topic === undefined && m.data.tipo === 'casi'));
    assert.ok(personales.every((m) => m.token === T1), 'Beto falló: su token no quedó en enviados');
    assert.equal(ctx.salas.obtener(s.id).jugadores.get('Beto').destino, null, 'token muerto eliminado');
    assert.ok(ctx.logs.some((l) => l.includes('destino muerto de Beto')));
    void a; void b;
  } finally { await ctx.cerrar(); }
});

test('un error "invalid-argument" NO borra al jugador (puede ser nuestro mensaje)', async () => {
  const raro = Object.assign(new Error('x'), { code: 'messaging/invalid-argument' });
  const ctx = await levantar({ falla: (m) => (m.token ? raro : null) });
  try {
    const s = await sala(ctx);
    await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'Ana', destino: { tipo: 'token', valor: T1 } });
    for (let i = 0; i < 40; i++) { await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor); ctx.avanzar(3000); }
    assert.notEqual(ctx.salas.obtener(s.id).jugadores.get('Ana').destino, null);
  } finally { await ctx.cerrar(); }
});

test('un destino tipo fid se envía con el campo fid', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'Ana', destino: { tipo: 'fid', valor: 'fid-ana-xxxxxxxxxxxxxxxxxxxxx' } });
    for (let i = 0; i < 40; i++) { await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor); ctx.avanzar(3000); }
    const personal = ctx.enviados.find((m) => m.fid);
    assert.ok(personal, 'hubo aviso personal con fid');
    assert.equal(personal.token, undefined);
  } finally { await ctx.cerrar(); }
});

test('PUT destino: solo con la clave del jugador (nadie secuestra tokens ajenos)', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    const u = await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'Ana', destino: { tipo: 'token', valor: T1 } });
    const nuevo = { nombre: 'Ana', destino: { tipo: 'token', valor: T2 } };
    assert.equal((await ctx.http('PUT', `/salas/${s.id}/destino`, nuevo, { 'x-jugador-clave': 'robada' })).estado, 403);
    assert.equal((await ctx.http('PUT', `/salas/${s.id}/destino`, nuevo, { 'x-jugador-clave': u.json.claveJugador })).estado, 200);
    assert.equal(ctx.salas.obtener(s.id).jugadores.get('Ana').destino.valor, T2);
  } finally { await ctx.cerrar(); }
});

test('lotería: el servidor valida y avisa a todos; falsa alarma no avisa a nadie', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    const u = await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'Ana', destino: { tipo: 'token', valor: T1 } });
    const cab = { 'x-jugador-clave': u.json.claveJugador };

    const falsa = await ctx.http('POST', `/salas/${s.id}/loteria`, { nombre: 'Ana' }, cab);
    assert.equal(falsa.json.gano, false);
    assert.equal(ctx.enviados.filter((m) => m.data.tipo === 'loteria').length, 0);

    const ids = new Set();
    for (let i = 0; i < 54; i++) {
      const r = await ctx.http('POST', `/salas/${s.id}/cantar`, undefined, s.cantor);
      ids.add(r.json.evento.cartaId);
      ctx.avanzar(3000);
      if (patronesCompletos(u.json.tabla, ids).length > 0) break;
    }
    const buena = await ctx.http('POST', `/salas/${s.id}/loteria`, { nombre: 'Ana' }, cab);
    assert.equal(buena.json.gano, true);
    const fin = ctx.enviados.filter((m) => m.data.tipo === 'loteria');
    assert.equal(fin.length, 1);
    assert.equal(fin[0].topic, `sala_${s.id}`);

    const otra = await ctx.http('POST', `/salas/${s.id}/loteria`, { nombre: 'Ana' }, cab);
    assert.equal(otra.estado, 409);
  } finally { await ctx.cerrar(); }
});

test('entradas malas: JSON roto, cuerpo enorme, sala inexistente y ruta desconocida', async () => {
  const ctx = await levantar();
  try {
    const s = await sala(ctx);
    assert.equal((await ctx.http('POST', `/salas/${s.id}/unirse`, '{no es json')).estado, 400);
    assert.equal((await ctx.http('POST', `/salas/${s.id}/unirse`, '[1,2]')).estado, 400);
    assert.equal((await ctx.http('POST', `/salas/${s.id}/unirse`, { nombre: 'x'.repeat(5000) })).estado, 413);
    assert.equal((await ctx.http('GET', '/salas/ZZZZZ/estado')).estado, 404);
    assert.equal((await ctx.http('GET', '/otra/cosa')).estado, 404);
  } finally { await ctx.cerrar(); }
});

test('errores internos no filtran detalles al cliente', async () => {
  const ctx = await levantar();
  try {
    ctx.salas.crear = () => { throw new Error('contraseña de la base de datos: 1234'); };
    const r = await ctx.http('POST', '/salas');
    assert.equal(r.estado, 500);
    assert.equal(JSON.stringify(r.json).includes('contraseña'), false);
    assert.ok(ctx.logs.some((l) => l.includes('contraseña')), 'pero sí queda en el log del servidor');
  } finally { await ctx.cerrar(); }
});
