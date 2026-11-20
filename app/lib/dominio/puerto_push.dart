import 'api_juego.dart';

enum PermisoPush { sinPreguntar, concedido, denegado }

/// Un mensaje recibido, ya despojado de tipos del SDK. `datos` es texto sin fiar.
class MensajePush {
  const MensajePush({required this.datos, this.titulo, this.cuerpo});
  final Map<String, Object?> datos;
  final String? titulo;
  final String? cuerpo;
}

/// La "puerta" hacia Firebase Cloud Messaging. El dominio solo conoce esto;
/// el SDK real vive en lib/infra/puerto_fcm.dart.
abstract class PuertoPush {
  /// Estado actual SIN mostrar ningún diálogo.
  Future<PermisoPush> estadoPermiso();

  /// Muestra el diálogo del sistema.
  Future<PermisoPush> pedirPermiso();

  /// Identificador de este dispositivo para avisos personales (token o fid).
  Future<DestinoPush?> obtenerDestino();

  /// El identificador cambió (reinstalación, restauración, rotación...).
  Stream<DestinoPush> get destinoCambiado;

  /// Llegó un mensaje con la app ABIERTA y al frente.
  Stream<MensajePush> get enPrimerPlano;

  /// El usuario tocó una notificación con la app en segundo plano.
  Stream<MensajePush> get alAbrirDesdeNotificacion;

  /// La notificación que abrió la app desde CERRADA (si la hubo).
  Future<MensajePush?> mensajeInicial();

  Future<void> suscribirTema(String tema);
  Future<void> desuscribirTema(String tema);
}
