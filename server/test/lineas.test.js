'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { patronesCompletos, cartaQueFalta, describirPatron, PATRONES } = require('../lineas');

// Tabla de ejemplo: posición p tiene la carta p+1  (1..16)
const tabla = Array.from({ length: 16 }, (_, i) => i + 1);
const comp = (...ids) => patronesCompletos(tabla, new Set(ids));

test('hay 12 patrones (llena, 4 filas, 4 columnas, 2 diagonales, esquinas, centro)', () => {
  assert.equal(PATRONES.length, 13);
});

test('sin cartas cantadas no hay patrón', () => assert.deepEqual(comp(), []));
test('fila 1', () => assert.deepEqual(comp(1, 2, 3, 4), ['fila1']));
test('columna 1', () => assert.deepEqual(comp(1, 5, 9, 13), ['columna1']));
test('diagonal 1', () => assert.deepEqual(comp(1, 6, 11, 16), ['diagonal1']));
test('diagonal 2', () => assert.deepEqual(comp(4, 7, 10, 13), ['diagonal2']));
test('cuatro esquinas', () => assert.deepEqual(comp(1, 4, 13, 16), ['esquinas']));
test('centro', () => assert.deepEqual(comp(6, 7, 10, 11), ['centro']));
test('una carta de menos no cuenta', () => assert.deepEqual(comp(1, 2, 3), []));
test('cartas que no están en la tabla se ignoran', () => assert.deepEqual(comp(1, 2, 3, 40, 50), []));
test('tabla llena incluye todos los patrones', () => {
  const todas = Array.from({ length: 16 }, (_, i) => i + 1);
  const r = comp(...todas);
  assert.equal(r[0], 'llena');
  assert.equal(r.length, 13);
});

test('cartaQueFalta: a una carta de la fila 1', () => assert.equal(cartaQueFalta(tabla, new Set([1, 2, 3])), 4));
test('cartaQueFalta: diagonal', () => assert.equal(cartaQueFalta(tabla, new Set([1, 6, 11])), 16));
test('cartaQueFalta: nada cerca -> null', () => assert.equal(cartaQueFalta(tabla, new Set()), null));
test('cartaQueFalta: si ya hay patrón completo -> null', () => assert.equal(cartaQueFalta(tabla, new Set([1, 2, 3, 4])), null));

test('descripciones humanas', () => {
  assert.equal(describirPatron('fila2'), 'la fila 2');
  assert.equal(describirPatron('columna4'), 'la columna 4');
  assert.equal(describirPatron('diagonal2'), 'una diagonal');
  assert.equal(describirPatron('esquinas'), 'las cuatro esquinas');
  assert.equal(describirPatron('llena'), 'la tabla llena');
});
