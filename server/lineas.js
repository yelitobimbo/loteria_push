'use strict';
// La tabla es de 4x4. Las posiciones se numeran por filas:
//   0  1  2  3
//   4  5  6  7
//   8  9 10 11
//  12 13 14 15
const PATRONES = [
  ['llena', Array.from({ length: 16 }, (_, i) => i)],
  ...[0, 4, 8, 12].map((s, i) => [`fila${i + 1}`, [s, s + 1, s + 2, s + 3]]),
  ...[0, 1, 2, 3].map((s, i) => [`columna${i + 1}`, [s, s + 4, s + 8, s + 12]]),
  ['diagonal1', [0, 5, 10, 15]],
  ['diagonal2', [3, 6, 9, 12]],
  ['esquinas', [0, 3, 12, 15]],
  ['centro', [5, 6, 9, 10]],
].map(([nombre, posiciones]) => Object.freeze({ nombre, posiciones }));

/** Patrones completos: todas sus cartas ya fueron cantadas. */
function patronesCompletos(tabla, cantadas) {
  return PATRONES.filter((p) => p.posiciones.every((pos) => cantadas.has(tabla[pos]))).map((p) => p.nombre);
}

/**
 * Si no hay patrón completo pero alguno está a UNA carta de completarse,
 * devuelve el id de esa carta que falta; si no, null.
 */
function cartaQueFalta(tabla, cantadas) {
  if (patronesCompletos(tabla, cantadas).length > 0) return null;
  for (const p of PATRONES) {
    if (p.nombre === 'llena') continue; // "llena" casi siempre estaría "a una" y avisaría de más
    const faltan = p.posiciones.map((pos) => tabla[pos]).filter((id) => !cantadas.has(id));
    if (faltan.length === 1) return faltan[0];
  }
  return null;
}

/** Nombre del patrón en lenguaje humano, para los mensajes. */
function describirPatron(nombre) {
  if (nombre === 'llena') return 'la tabla llena';
  if (nombre === 'esquinas') return 'las cuatro esquinas';
  if (nombre === 'centro') return 'el centro';
  if (nombre.startsWith('diagonal')) return 'una diagonal';
  const m = /^(fila|columna)(\d)$/.exec(nombre);
  return m ? `la ${m[1]} ${m[2]}` : nombre;
}

module.exports = { PATRONES, patronesCompletos, cartaQueFalta, describirPatron };
