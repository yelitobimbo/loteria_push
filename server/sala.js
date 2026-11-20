'use strict';
const crypto = require('node:crypto');
const { barajar, generarTabla, cartaPorId } = require('./baraja');
const { patronesCompletos, cartaQueFalta } = require('./lineas');

class ErrorJuego extends Error {
  constructor(codigo, mensaje, estado = 400) {
    super(mensaje);
    this.codigo = codigo;
    this.estado = estado;
  }
}

const MAX_JUGADORES = 30;
const MAX_SALAS = 200;
const INTERVALO_MIN_CANTO_MS = 2000; // freno: cada push cuesta y puede usarse para abusar
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin 0/O ni 1/I/L: no se confunden

// Fuente de azar de PRODUCCIÓN: criptográfica. La semilla del mazo debe ser
// impredecible, o un tramposo podría adivinar las cartas que vienen.
const fuenteSegura = {
  semilla: () => crypto.randomInt(0, 2 ** 31),
  clave: () => crypto.randomBytes(16).toString('hex'),
  codigoSala: () => Array.from({ length: 5 }, () => ALFABETO[crypto.randomInt(ALFABETO.length)]).join(''),
};

function iguales(a, b) {
  // Comparación en tiempo constante: no filtra información por cuánto tarda.
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function validarNombre(nombre) {
  if (typeof nombre !== 'string') throw new ErrorJuego('NOMBRE_INVALIDO', 'El nombre es obligatorio');
  const limpio = nombre.trim();
  if (!/^[\p{L}\p{N} ._-]{1,20}$/u.test(limpio)) {
    throw new ErrorJuego('NOMBRE_INVALIDO', 'El nombre debe tener de 1 a 20 letras, números o espacios');
  }
  return limpio;
}

function validarDestino(destino) {
  if (destino === null || destino === undefined) return null; // sin avisos: se juega consultando
  const ok =
    typeof destino === 'object' &&
    (destino.tipo === 'token' || destino.tipo === 'fid') &&
    typeof destino.valor === 'string' &&
    destino.valor.length >= 20 &&
    destino.valor.length <= 4096;
  if (!ok) throw new ErrorJuego('DESTINO_INVALIDO', 'El destino de notificaciones no es válido');
  return { tipo: destino.tipo, valor: destino.valor };
}

class Sala {
  constructor({ id, claveCantor, semilla, fuente = fuenteSegura }) {
    this.id = id;
    this.claveCantor = claveCantor;
    this.fuente = fuente;
    this._mazo = barajar(semilla); // SECRETO: jamás sale del servidor
    this.cantadas = []; // [{n, cartaId, nombre, pista}]
    this.jugadores = new Map();
    this.ganador = null;
    this.patron = null;
    this._ultimoCantoMs = -Infinity;
  }

  get ultima() {
    return this.cantadas.length;
  }

  _cartasDesde(desde) {
    return this.cantadas.slice(Math.max(0, desde)).map((c) => ({ ...c }));
  }

  unir(nombre, destino) {
    const limpio = validarNombre(nombre);
    const dest = validarDestino(destino);
    if (this.jugadores.has(limpio)) throw new ErrorJuego('NOMBRE_OCUPADO', 'Ya hay alguien con ese nombre', 409);
    if (this.jugadores.size >= MAX_JUGADORES) throw new ErrorJuego('SALA_LLENA', 'La sala está llena', 409);
    const claveJugador = this.fuente.clave();
    const tabla = generarTabla(this.fuente.semilla());
    this.jugadores.set(limpio, { nombre: limpio, tabla, claveJugador, destino: dest, avisadoCasi: false });
    return { nombre: limpio, tabla, claveJugador, ultima: this.ultima, cartas: this._cartasDesde(0) };
  }

  _jugador(nombre, clave) {
    const j = this.jugadores.get(nombre);
    // Mismo error si no existe o si la clave no coincide: no revelamos quién juega.
    if (!j || !iguales(j.claveJugador, clave ?? '')) throw new ErrorJuego('NO_AUTORIZADO', 'Credenciales inválidas', 403);
    return j;
  }

  actualizarDestino(nombre, clave, destino) {
    const j = this._jugador(nombre, clave);
    j.destino = validarDestino(destino);
  }

  quitarDestino(nombre) {
    const j = this.jugadores.get(nombre);
    if (j) j.destino = null;
  }

  verificarCantor(clave) {
    if (!iguales(this.claveCantor, clave ?? '')) throw new ErrorJuego('NO_AUTORIZADO', 'Solo el cantor puede hacer eso', 403);
  }

  /** Saca la siguiente carta. Devuelve el evento y los avisos personales de "¡casi!". */
  cantar(ahoraMs) {
    if (this.ganador) throw new ErrorJuego('SALA_TERMINADA', 'La partida ya terminó', 409);
    if (this.ultima >= this._mazo.length) throw new ErrorJuego('SIN_CARTAS', 'Ya se cantaron todas las cartas', 409);
    if (ahoraMs - this._ultimoCantoMs < INTERVALO_MIN_CANTO_MS) {
      throw new ErrorJuego('MUY_RAPIDO', 'Canta más despacio', 429);
    }
    this._ultimoCantoMs = ahoraMs;
    const carta = cartaPorId(this._mazo[this.ultima]);
    this.cantadas.push({ n: this.ultima + 1, cartaId: carta.id, nombre: carta.nombre, pista: carta.pista });
    const evento = { tipo: 'carta', sala: this.id, n: this.ultima, cartaId: carta.id, nombre: carta.nombre, pista: carta.pista };

    const ids = new Set(this.cantadas.map((c) => c.cartaId));
    const casi = [];
    for (const j of this.jugadores.values()) {
      if (j.avisadoCasi) continue; // un solo aviso por jugador: sin spam
      const falta = cartaQueFalta(j.tabla, ids);
      if (falta !== null) {
        j.avisadoCasi = true;
        if (j.destino) casi.push({ jugador: j.nombre, destino: j.destino, evento: { tipo: 'casi', sala: this.id, n: this.ultima, cartaId: falta } });
      }
    }
    return { evento, casi };
  }

  /** El SERVIDOR decide quién gana; el cliente solo dice "¡Lotería!". */
  reclamar(nombre, clave) {
    const j = this._jugador(nombre, clave);
    if (this.ganador) throw new ErrorJuego('YA_HAY_GANADOR', `${this.ganador} ya cantó Lotería`, 409);
    const ids = new Set(this.cantadas.map((c) => c.cartaId));
    const patrones = patronesCompletos(j.tabla, ids);
    if (patrones.length === 0) return { gano: false, evento: null };
    this.ganador = j.nombre;
    this.patron = patrones[0];
    return {
      gano: true,
      patron: this.patron,
      evento: { tipo: 'loteria', sala: this.id, n: this.ultima, ganador: j.nombre, patron: this.patron },
    };
  }

  /** Estado público. Solo cartas YA cantadas: nunca el mazo completo. */
  estado(desde = 0) {
    return { sala: this.id, ultima: this.ultima, cartas: this._cartasDesde(desde), ganador: this.ganador, patron: this.patron };
  }
}

class Salas {
  constructor({ fuente = fuenteSegura } = {}) {
    this.fuente = fuente;
    this._salas = new Map();
  }

  crear() {
    if (this._salas.size >= MAX_SALAS) throw new ErrorJuego('SERVIDOR_LLENO', 'Demasiadas salas activas', 503);
    let id;
    do {
      id = this.fuente.codigoSala();
    } while (this._salas.has(id));
    const sala = new Sala({ id, claveCantor: this.fuente.clave(), semilla: this.fuente.semilla(), fuente: this.fuente });
    this._salas.set(id, sala);
    return sala;
  }

  obtener(id) {
    const sala = this._salas.get(String(id).toUpperCase());
    if (!sala) throw new ErrorJuego('SALA_NO_EXISTE', 'No existe esa sala', 404);
    return sala;
  }
}

module.exports = { Sala, Salas, ErrorJuego, fuenteSegura, MAX_JUGADORES, INTERVALO_MIN_CANTO_MS };
