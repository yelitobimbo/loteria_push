import 'package:firebase_messaging/firebase_messaging.dart';

import '../dominio/api_juego.dart';
import '../dominio/puerto_push.dart';

/// ÚNICO archivo que conoce firebase_messaging (salvo el manejador de fondo).
///
/// Nota sobre versiones: en firebase_messaging 17 getToken/onTokenRefresh/deleteToken
/// quedaron marcados como obsoletos a favor de register()/onRegistered (que entregan
/// un FID). Mientras no actives la opción FID en el manifiesto/Info.plist, el camino
/// de token sigue funcionando. Si migras, el cambio vive SOLO aquí.
class PuertoFcm implements PuertoPush {
  PuertoFcm() : _fcm = FirebaseMessaging.instance;
  final FirebaseMessaging _fcm;

  PermisoPush _mapear(AuthorizationStatus s) => switch (s) {
        AuthorizationStatus.authorized || AuthorizationStatus.provisional => PermisoPush.concedido,
        AuthorizationStatus.denied => PermisoPush.denegado,
        AuthorizationStatus.notDetermined => PermisoPush.sinPreguntar,
      };

  MensajePush _aMensaje(RemoteMessage m) => MensajePush(
        datos: Map<String, Object?>.from(m.data),
        titulo: m.notification?.title,
        cuerpo: m.notification?.body,
      );

  @override
  Future<PermisoPush> estadoPermiso() async => _mapear((await _fcm.getNotificationSettings()).authorizationStatus);

  @override
  Future<PermisoPush> pedirPermiso() async {
    // En Android 13+ esto muestra el diálogo POST_NOTIFICATIONS; en iOS, el de Apple.
    final s = await _fcm.requestPermission(alert: true, badge: false, sound: true);
    return _mapear(s.authorizationStatus);
  }

  @override
  Future<DestinoPush?> obtenerDestino() async {
    final token = await _fcm.getToken();
    return token == null ? null : DestinoPush('token', token);
  }

  @override
  Stream<DestinoPush> get destinoCambiado => _fcm.onTokenRefresh.map((t) => DestinoPush('token', t));

  @override
  Stream<MensajePush> get enPrimerPlano => FirebaseMessaging.onMessage.map(_aMensaje);

  @override
  Stream<MensajePush> get alAbrirDesdeNotificacion => FirebaseMessaging.onMessageOpenedApp.map(_aMensaje);

  @override
  Future<MensajePush?> mensajeInicial() async {
    final m = await _fcm.getInitialMessage();
    return m == null ? null : _aMensaje(m);
  }

  @override
  Future<void> suscribirTema(String tema) => _fcm.subscribeToTopic(tema);

  @override
  Future<void> desuscribirTema(String tema) => _fcm.unsubscribeFromTopic(tema);
}
