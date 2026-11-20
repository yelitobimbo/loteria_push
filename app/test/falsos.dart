import 'dart:async';

import 'package:loteria_push/dominio/api_juego.dart';
import 'package:loteria_push/dominio/evento.dart';
import 'package:loteria_push/dominio/puerto_push.dart';

CartaCantada carta(int n, int id) => CartaCantada(n: n, cartaId: id, nombre: 'Carta $id', pista: 'Pista $id');

/// Un mensaje push tal como llega: TODO el "data" son textos.
MensajePush mensajeCarta(int n, int id, {String sala = 'ABCDE'}) => MensajePush(datos: {
      'tipo': 'carta', 'sala': sala, 'n': '$n', 'cartaId': '$id', 'nombre': 'Carta $id', 'pista': 'Pista $id',
    });

class ApiFalsa implements ApiJuego {
  final List<CartaCantada> cartasServidor = [];
  String? ganadorServidor;
  String? patronServidor;
  List<int> tabla = List.generate(16, (i) => i + 1);
  bool reclamoGana = false;
  Object? errorEnEstado;

  int llamadasEstado = 0;
  int? ultimoDesde;
  DestinoPush? destinoAlUnirse;
  final List<DestinoPush> destinosActualizados = [];

  @override
  Future<SalaCreada> crearSala() async => const SalaCreada('ABCDE', 'clave-cantor');

  @override
  Future<Union> unirse(String sala, String nombre, DestinoPush? destino) async {
    destinoAlUnirse = destino;
    return Union(nombre: nombre, tabla: tabla, claveJugador: 'k1', cartas: cartasServidor.toList());
  }

  @override
  Future<EstadoSala> estado(String sala, int desde) async {
    llamadasEstado++;
    ultimoDesde = desde;
    if (errorEnEstado != null) throw errorEnEstado!;
    return EstadoSala(
      ultima: cartasServidor.length,
      cartas: cartasServidor.where((c) => c.n > desde).toList(),
      ganador: ganadorServidor,
      patron: patronServidor,
    );
  }

  @override
  Future<CartaCantada> cantar(String sala, String claveCantor) async {
    final c = carta(cartasServidor.length + 1, cartasServidor.length + 1);
    cartasServidor.add(c);
    return c;
  }

  @override
  Future<ResultadoReclamo> reclamar(String sala, String nombre, String claveJugador) async =>
      ResultadoReclamo(gano: reclamoGana, patron: reclamoGana ? 'fila1' : null);

  @override
  Future<void> actualizarDestino(String sala, String nombre, String claveJugador, DestinoPush destino) async =>
      destinosActualizados.add(destino);
}

class PuertoPushFalso implements PuertoPush {
  PermisoPush permiso = PermisoPush.sinPreguntar;
  PermisoPush respuestaDelUsuario = PermisoPush.concedido;
  int vecesPidioPermiso = 0;
  DestinoPush? destino = const DestinoPush('token', 'token-del-telefono-xxxxxxxxxx');
  MensajePush? inicial;
  final Set<String> temas = {};

  final _frente = StreamController<MensajePush>.broadcast();
  final _abrir = StreamController<MensajePush>.broadcast();
  final _destino = StreamController<DestinoPush>.broadcast();

  void emitirEnPrimerPlano(MensajePush m) => _frente.add(m);
  void emitirAperturaDesdeNotificacion(MensajePush m) => _abrir.add(m);
  void emitirNuevoDestino(DestinoPush d) => _destino.add(d);

  @override
  Future<PermisoPush> estadoPermiso() async => permiso;

  @override
  Future<PermisoPush> pedirPermiso() async {
    vecesPidioPermiso++;
    permiso = respuestaDelUsuario;
    return permiso;
  }

  @override
  Future<DestinoPush?> obtenerDestino() async => destino;
  @override
  Stream<DestinoPush> get destinoCambiado => _destino.stream;
  @override
  Stream<MensajePush> get enPrimerPlano => _frente.stream;
  @override
  Stream<MensajePush> get alAbrirDesdeNotificacion => _abrir.stream;
  @override
  Future<MensajePush?> mensajeInicial() async => inicial;
  @override
  Future<void> suscribirTema(String tema) async => temas.add(tema);
  @override
  Future<void> desuscribirTema(String tema) async => temas.remove(tema);
}
