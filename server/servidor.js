'use strict';
const http = require('node:http');
const { Salas, ErrorJuego, INTERVALO_MIN_CANTO_MS } = require('./sala');
const { mensajeCarta, mensajeCasi, mensajeLoteria, haciaDestino } = require('./mensajes');
const { crearEnviadorConsola, crearEnviadorFcm, esDestinoMuerto } = require('./enviador');

const MAX_CUERPO = 2048;

function leerJson(req) {
  return new Promise((resolve, reject) => {
    let total = 0;
    const partes = [];
    req.on('data', (c) => {
      total += c.length;
      if (total > MAX_CUERPO) {
        // No cortamos el socket de golpe (el cliente no vería el 413): dejamos de
        // acumular, descartamos lo que falte y respondemos con "connection: close".
        req.removeAllListeners('data');
        req.resume();
        reject(new ErrorJuego('CUERPO_GRANDE', 'Cuerpo demasiado grande', 413));
        return;
      }
      partes.push(c);
    });
    req.on('end', () => {
      if (partes.length === 0) return resolve({});
      try {
        const v = JSON.parse(Buffer.concat(partes).toString('utf8'));
        if (v === null || typeof v !== 'object' || Array.isArray(v)) throw new Error('no objeto');
        resolve(v);
      } catch {
        reject(new ErrorJuego('JSON_INVALIDO', 'El cuerpo no es JSON válido', 400));
      }
    });
    req.on('error', reject);
  });
}

function crearManejador({ salas = new Salas(), enviador, ahora = () => Date.now(), log = () => {} } = {}) {
  /** Envía sin romper la petición: el estado del juego es la verdad; el push es un aviso. */
  async function enviarSeguro(mensaje, { sala, jugador } = {}) {
    try {
      await enviador.enviar(mensaje);
      return true;
    } catch (err) {
      if (jugador && esDestinoMuerto(err)) {
        sala.quitarDestino(jugador); // higiene de tokens: no seguir enviando a un destino muerto
        log(`destino muerto de ${jugador}: eliminado (${err.code})`);
      } else {
        log(`fallo al enviar (${err && err.code}): ${err && err.message}`);
      }
      return false;
    }
  }

  async function atender(req, res) {
    const url = new URL(req.url, 'http://x');
    const ruta = url.pathname.replace(/\/+$/, '');
    const m = req.method;
    let r;

    if (m === 'POST' && ruta === '/salas') {
      const sala = salas.crear();
      return [201, { id: sala.id, claveCantor: sala.claveCantor }];
    }

    r = /^\/salas\/([A-Za-z0-9]{3,8})(\/[a-z]+)?$/.exec(ruta);
    if (!r) throw new ErrorJuego('RUTA_NO_EXISTE', 'Ruta no encontrada', 404);
    const sala = salas.obtener(r[1]);
    const accion = r[2] ?? '';

    if (m === 'POST' && accion === '/unirse') {
      const cuerpo = await leerJson(req);
      const u = sala.unir(cuerpo.nombre, cuerpo.destino);
      return [201, u];
    }
    if (m === 'PUT' && accion === '/destino') {
      const cuerpo = await leerJson(req);
      sala.actualizarDestino(cuerpo.nombre, req.headers['x-jugador-clave'], cuerpo.destino);
      return [200, { ok: true }];
    }
    if (m === 'GET' && accion === '/estado') {
      const desde = Number.parseInt(url.searchParams.get('desde') ?? '0', 10);
      return [200, sala.estado(Number.isNaN(desde) ? 0 : desde)];
    }
    if (m === 'POST' && accion === '/cantar') {
      sala.verificarCantor(req.headers['x-cantor-clave']);
      const { evento, casi } = sala.cantar(ahora());
      const t = ahora();
      const enviado = await enviarSeguro(mensajeCarta(evento, t), { sala });
      await Promise.all(
        casi.map((c) => enviarSeguro(haciaDestino(mensajeCasi(c.evento, t), c.destino), { sala, jugador: c.jugador })),
      );
      return [200, { evento, enviado, avisosCasi: casi.length }];
    }
    if (m === 'POST' && accion === '/loteria') {
      const cuerpo = await leerJson(req);
      const resultado = sala.reclamar(cuerpo.nombre, req.headers['x-jugador-clave']);
      if (resultado.gano) await enviarSeguro(mensajeLoteria(resultado.evento, ahora()), { sala });
      return [200, { gano: resultado.gano, patron: resultado.patron ?? null }];
    }
    throw new ErrorJuego('RUTA_NO_EXISTE', 'Ruta no encontrada', 404);
  }

  return async (req, res) => {
    try {
      const [estado, cuerpo] = await atender(req, res);
      res.writeHead(estado, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(cuerpo));
    } catch (err) {
      const conocido = err instanceof ErrorJuego;
      if (!conocido) log(`error interno: ${err && err.stack}`);
      // Al cliente solo le damos mensajes seguros; los detalles internos se quedan en el log.
      const cabeceras = { 'content-type': 'application/json; charset=utf-8' };
      if (conocido && err.estado === 413) cabeceras.connection = 'close';
      res.writeHead(conocido ? err.estado : 500, cabeceras);
      res.end(JSON.stringify({ error: conocido ? err.codigo : 'ERROR_INTERNO', mensaje: conocido ? err.message : 'Error interno' }));
    }
  };
}

function crearServidor(deps) {
  return http.createServer(crearManejador(deps));
}

if (require.main === module) {
  const log = (...a) => console.log(new Date().toISOString(), ...a);
  const real = process.env.FCM_REAL === '1';
  const enviador = real ? crearEnviadorFcm({ dryRun: process.env.FCM_DRY_RUN === '1' }) : crearEnviadorConsola(log);
  const puerto = Number(process.env.PORT ?? 8080);
  crearServidor({ enviador, log }).listen(puerto, () => {
    log(`Cantor listo en http://localhost:${puerto} (${real ? 'FCM real' : 'push simulado en consola'}; intervalo mínimo ${INTERVALO_MIN_CANTO_MS} ms)`);
  });
}

module.exports = { crearManejador, crearServidor };
