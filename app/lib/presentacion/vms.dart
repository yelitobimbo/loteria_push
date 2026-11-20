import 'dart:async';

import 'package:flutter/widgets.dart';

import '../dominio/api_juego.dart';
import '../dominio/controlador.dart';
import '../dominio/partida.dart';
import '../dominio/puerto_push.dart';

class JuegoVm extends ChangeNotifier {
  JuegoVm(this.controlador) {
    _sub = controlador.cambios.listen((_) => notifyListeners());
  }

  final ControladorPartida controlador;
  late final StreamSubscription<void> _sub;
  Timer? _consulta;
  String? mensaje;
  bool ocupado = false;

  Partida? get partida => controlador.partida;
  bool get avisosActivos => controlador.avisosActivos;
  PermisoPush get permiso => controlador.permiso;

  /// Con la app lista: ¿hay una partida guardada? (p. ej. tras tocar una notificación)
  Future<void> iniciar() async {
    await controlador.leerPermiso();
    if (await controlador.restaurar()) _vigilar();
    notifyListeners();
  }

  /// Sin push, la app revisa cada 5 s MIENTRAS esté abierta (degradación elegante).
  void _vigilar() {
    _consulta?.cancel();
    if (controlador.avisosActivos) return;
    _consulta = Timer.periodic(const Duration(seconds: 5), (_) => controlador.sincronizar());
  }

  Future<void> unirse({required String sala, required String nombre, required bool pedirAvisos}) async {
    ocupado = true;
    mensaje = null;
    notifyListeners();
    try {
      if (pedirAvisos) await controlador.pedirPermisoAvisos();
      await controlador.unirse(sala: sala, nombre: nombre);
      _vigilar();
    } on ErrorApi catch (e) {
      mensaje = e.mensaje;
    } finally {
      ocupado = false;
      notifyListeners();
    }
  }

  Future<void> alVolverALaApp() => controlador.sincronizar();

  Future<void> cantarLoteria() async {
    try {
      final r = await controlador.reclamarLoteria();
      mensaje = r.gano ? '¡Ganaste! 🎉' : 'Todavía no tienes Lotería... ¡paciencia!';
    } on ErrorApi catch (e) {
      mensaje = e.mensaje;
    }
    notifyListeners();
  }

  Future<void> salir() async {
    _consulta?.cancel();
    await controlador.salir();
  }

  @override
  void dispose() {
    _consulta?.cancel();
    _sub.cancel();
    super.dispose();
  }
}

class CantorVm extends ChangeNotifier {
  CantorVm(this.api);
  final ApiJuego api;

  SalaCreada? sala;
  final List<String> cantadas = [];
  String? mensaje;
  Timer? _auto;
  bool get automatico => _auto != null;

  Future<void> crear() async {
    try {
      sala = await api.crearSala();
      mensaje = null;
    } on ErrorApi catch (e) {
      mensaje = e.mensaje;
    }
    notifyListeners();
  }

  Future<void> cantar() async {
    final s = sala;
    if (s == null) return;
    try {
      final c = await api.cantar(s.id, s.claveCantor);
      cantadas.insert(0, '${c.n}. ${c.nombre}');
      mensaje = null;
    } on ErrorApi catch (e) {
      mensaje = e.mensaje;
      if (e.codigo == 'SALA_TERMINADA' || e.codigo == 'SIN_CARTAS') detenerAutomatico();
    }
    notifyListeners();
  }

  void alternarAutomatico() {
    if (automatico) {
      detenerAutomatico();
    } else {
      _auto = Timer.periodic(const Duration(seconds: 6), (_) => cantar());
    }
    notifyListeners();
  }

  void detenerAutomatico() {
    _auto?.cancel();
    _auto = null;
  }

  @override
  void dispose() {
    detenerAutomatico();
    super.dispose();
  }
}
