import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';

import '../firebase_options.dart';

/// Se ejecuta en un "isolate" APARTE cuando llega un mensaje con la app en segundo plano
/// o cerrada. Reglas de oro:
///  - DEBE ser una función de nivel superior (no un método ni una lambda).
///  - DEBE llevar @pragma('vm:entry-point') o el compilador puede eliminarla (release).
///  - No comparte memoria con la app: NO toca la interfaz ni tu controlador.
///  - Debe ser breve. Aquí no hacemos nada importante a propósito: al volver a abrir
///    la app, el controlador pregunta al servidor y se pone al día (push = aviso, no verdad).
@pragma('vm:entry-point')
Future<void> manejadorSegundoPlano(RemoteMessage mensaje) async {
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  // Aquí podrías, por ejemplo, anotar en disco que "hay cosas pendientes".
}
