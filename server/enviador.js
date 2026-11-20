'use strict';
// "Enviador" = lo único que habla con Firebase. Se inyecta en el servidor, así
// las pruebas usan uno falso y tú puedes correr todo sin cuenta de Firebase.

/** Imprime los mensajes en consola en lugar de enviarlos (modo clase sin Firebase). */
function crearEnviadorConsola(log = console.log) {
  return {
    async enviar(mensaje) {
      log('[push simulado]', JSON.stringify(mensaje));
      return 'simulado';
    },
  };
}

/**
 * Enviador real con el SDK de administrador de Firebase.
 * Credenciales: variable GOOGLE_APPLICATION_CREDENTIALS apuntando al JSON de la
 * cuenta de servicio (NUNCA dentro de la app móvil ni del repositorio).
 * Con dryRun=true Firebase VALIDA el mensaje pero no lo entrega: ideal para probar.
 */
function crearEnviadorFcm({ dryRun = false } = {}) {
  const admin = require('firebase-admin'); // se carga solo si se usa
  admin.initializeApp();
  const messaging = admin.messaging();
  return {
    enviar: (mensaje) => messaging.send(mensaje, dryRun),
  };
}

/** ¿El error significa que ese destino ya no existe (app desinstalada, token vencido)? */
function esDestinoMuerto(err) {
  const codigo = err && err.code;
  // OJO: 'messaging/invalid-argument' NO está aquí a propósito: puede ser culpa
  // de NUESTRO mensaje mal armado; borrar al jugador por eso sería un error.
  return (
    codigo === 'messaging/registration-token-not-registered' ||
    codigo === 'messaging/invalid-registration-token'
  );
}

module.exports = { crearEnviadorConsola, crearEnviadorFcm, esDestinoMuerto };
