'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Sala, Salas, ErrorJuego, MAX_JUGADORES, INTERVALO_MIN_CANTO_MS } = require('../sala');
const { barajar } = require('../baraja');
const { patronesCompletos, cartaQueFalta } = require('../lineas');

// Fuente de azar DETERMINISTA para pruebas
function fuenteDeterminista() {
  let s = 1000;
  let c = 0;
  return { semilla: () => ++s, clave: () => `clave${++c}`, codigoSala: () => `SALA${++c}` };
}
const nuevaSala = () => new Sala({ id: 'ABCDE', claveCantor: 'cantor', semilla: 99, fuente: fuenteDeterminista() });
const TOKEN = 'token-de-prueba-de-20-o-mas-caracteres';
const dest = { tipo: 'token', valor: TOKEN };

function codigo(fn) {
  try { fn(); } catch (e) { return e instanceof ErrorJuego ? e.codigo : `otro:${e.message}`; }
  return 'sin error';
}

test('unirse: devuelve tabla de 16, clave propia y las cartas ya cantadas', () => {
  const s = nuevaSala();
  const u = s.unir('Ana', dest);
  assert.equal(u.tabla.length, 16);
  assert.equal(u.claveJugador, 'clave1');
  assert.equal(u.ultima, 0);
  assert.deepEqual(u.cartas, []);
});

test('unirse sin destino (sin permiso de notificaciones) está permitido', () => {
  assert.doesNotThrow(() => nuevaSala().unir('Luis', null));
});

test('nombres inválidos, repetidos y destinos inválidos se rechazan', () => {
  const s = nuevaSala();
  s.unir('Ana', dest);
  assert.equal(codigo(() => s.unir('', dest)), 'NOMBRE_INVALIDO');
  assert.equal(codigo(() => s.unir('x'.repeat(21), dest)), 'NOMBRE_INVALIDO');
  assert.equal(codigo(() => s.unir('<script>', dest)), 'NOMBRE_INVALIDO');
  assert.equal(codigo(() => s.unir(42, dest)), 'NOMBRE_INVALIDO');
  assert.equal(codigo(() => s.unir('Ana', dest)), 'NOMBRE_OCUPADO');
  assert.equal(codigo(() => s.unir('Beto', { tipo: 'token', valor: 'corto' })), 'DESTINO_INVALIDO');
  assert.equal(codigo(() => s.unir('Beto', { tipo: 'sms', valor: TOKEN })), 'DESTINO_INVALIDO');
});

test('nombres con acentos y eñes son válidos', () => {
  assert.doesNotThrow(() => nuevaSala().unir('Ñoño Pérez', dest));
});

test('la sala se llena en el máximo de jugadores', () => {
  const s = nuevaSala();
  for (let i = 0; i < MAX_JUGADORES; i++) s.unir(`J${i}`, null);
  assert.equal(codigo(() => s.unir('Sobrante', null)), 'SALA_LLENA');
});

test('cantar entrega las cartas en el orden del mazo secreto', () => {
  const s = nuevaSala();
  const orden = barajar(99);
  for (let i = 0; i < 5; i++) {
    const { evento } = s.cantar(i * INTERVALO_MIN_CANTO_MS);
    assert.equal(evento.n, i + 1);
    assert.equal(evento.cartaId, orden[i]);
  }
});

test('freno: cantar dos veces seguidas es "muy rápido"', () => {
  const s = nuevaSala();
  s.cantar(10_000);
  assert.equal(codigo(() => s.cantar(10_500)), 'MUY_RAPIDO');
  assert.doesNotThrow(() => s.cantar(10_000 + INTERVALO_MIN_CANTO_MS));
});

test('estado: solo muestra lo ya cantado y permite pedir "desde n"', () => {
  const s = nuevaSala();
  for (let i = 0; i < 4; i++) s.cantar(i * 5000);
  const e = s.estado(2);
  assert.equal(e.ultima, 4);
  assert.deepEqual(e.cartas.map((c) => c.n), [3, 4]);
  assert.equal(JSON.stringify(s.estado()).includes('"mazo"'), false);
  // el siguiente id del mazo NO debe aparecer en ninguna parte del estado
  const siguiente = barajar(99)[4];
  assert.ok(!s.estado(0).cartas.some((c) => c.cartaId === siguiente));
});

test('estado devuelve copias: modificar la respuesta no altera la sala', () => {
  const s = nuevaSala();
  s.cantar(0);
  s.estado().cartas[0].nombre = 'HACKEADA';
  assert.notEqual(s.estado().cartas[0].nombre, 'HACKEADA');
});

test('reclamar sin patrón completo: no gana, y puede seguir jugando', () => {
  const s = nuevaSala();
  const u = s.unir('Ana', dest);
  s.cantar(0);
  const r = s.reclamar('Ana', u.claveJugador);
  assert.equal(r.gano, false);
  assert.equal(s.ganador, null);
});

test('reclamar con clave equivocada es "no autorizado" (igual si el jugador no existe)', () => {
  const s = nuevaSala();
  s.unir('Ana', dest);
  assert.equal(codigo(() => s.reclamar('Ana', 'mala')), 'NO_AUTORIZADO');
  assert.equal(codigo(() => s.reclamar('Fantasma', 'x')), 'NO_AUTORIZADO');
});

// Canta hasta que ocurra la condición; devuelve cuántos cantos hicieron falta.
function cantarHasta(s, condicion) {
  for (let i = 0; i < 54; i++) {
    const r = s.cantar(i * 10_000);
    if (condicion(r)) return { r, i };
  }
  throw new Error('no ocurrió en 54 cartas');
}

test('un jugador gana cuando completa un patrón; el servidor lo valida', () => {
  const s = nuevaSala();
  const u = s.unir('Ana', null);
  const ids = new Set();
  cantarHasta(s, ({ evento }) => {
    ids.add(evento.cartaId);
    return patronesCompletos(u.tabla, ids).length > 0;
  });
  const r = s.reclamar('Ana', u.claveJugador);
  assert.equal(r.gano, true);
  assert.equal(s.ganador, 'Ana');
  assert.equal(r.evento.tipo, 'loteria');
});

test('después de ganar: nadie más gana y no se puede seguir cantando', () => {
  const s = nuevaSala();
  const a = s.unir('Ana', null);
  const b = s.unir('Beto', null);
  const ids = new Set();
  cantarHasta(s, ({ evento }) => {
    ids.add(evento.cartaId);
    return patronesCompletos(a.tabla, ids).length > 0;
  });
  s.reclamar('Ana', a.claveJugador);
  assert.equal(codigo(() => s.reclamar('Beto', b.claveJugador)), 'YA_HAY_GANADOR');
  assert.equal(codigo(() => s.cantar(1e9)), 'SALA_TERMINADA');
});

test('"¡casi!": se avisa UNA sola vez por jugador y solo a quien tiene destino', () => {
  const s = nuevaSala();
  const a = s.unir('Ana', dest);
  s.unir('SinPush', null);
  const ids = new Set();
  let avisos = 0;
  let victimas = [];
  for (let i = 0; i < 30; i++) {
    const { evento, casi } = s.cantar(i * 10_000);
    ids.add(evento.cartaId);
    avisos += casi.length;
    victimas = victimas.concat(casi.map((c) => c.jugador));
  }
  assert.equal(avisos, 1, 'exactamente un aviso en toda la partida');
  assert.deepEqual(victimas, ['Ana']);
  void a;
});

test('el aviso de "casi" nombra la carta que falta', () => {
  const s = nuevaSala();
  const a = s.unir('Ana', dest);
  const ids = new Set();
  for (let i = 0; i < 40; i++) {
    const { evento, casi } = s.cantar(i * 10_000);
    ids.add(evento.cartaId);
    if (casi.length) {
      assert.equal(casi[0].evento.cartaId, cartaQueFalta(a.tabla, ids));
      return;
    }
  }
  assert.fail('no hubo aviso de casi');
});

test('actualizar destino exige la clave del jugador', () => {
  const s = nuevaSala();
  const u = s.unir('Ana', dest);
  assert.equal(codigo(() => s.actualizarDestino('Ana', 'robada', dest)), 'NO_AUTORIZADO');
  assert.doesNotThrow(() => s.actualizarDestino('Ana', u.claveJugador, { tipo: 'token', valor: 'otro-token-de-prueba-largo-123' }));
  assert.equal(s.jugadores.get('Ana').destino.valor, 'otro-token-de-prueba-largo-123');
});

test('solo el cantor (con su clave) puede verificar', () => {
  const s = nuevaSala();
  assert.equal(codigo(() => s.verificarCantor('otra')), 'NO_AUTORIZADO');
  assert.doesNotThrow(() => s.verificarCantor('cantor'));
});

test('Salas: crear, obtener sin importar mayúsculas y sala inexistente', () => {
  const salas = new Salas({ fuente: fuenteDeterminista() });
  const s = salas.crear();
  assert.equal(salas.obtener(s.id.toLowerCase()), s);
  assert.equal(codigo(() => salas.obtener('NOEXISTE')), 'SALA_NO_EXISTE');
});
