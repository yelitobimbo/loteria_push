import 'dart:convert';

import 'package:http/http.dart' as http;

import '../dominio/api_juego.dart';
import '../dominio/evento.dart';

/// Habla con el servidor del cantor (carpeta server/) por HTTP + JSON.
class ApiHttp implements ApiJuego {
  ApiHttp(this.base, {http.Client? cliente}) : _c = cliente ?? http.Client();
  final String base; // p. ej. http://10.0.2.2:8080 (el "localhost" del emulador Android)
  final http.Client _c;

  Uri _u(String ruta) => Uri.parse('$base$ruta');

  Future<Map<String, dynamic>> _pedir(Future<http.Response> Function() peticion) async {
    final http.Response r;
    try {
      r = await peticion().timeout(const Duration(seconds: 8));
    } on Object {
      throw const ErrorApi('SIN_CONEXION', 'No se pudo contactar al cantor');
    }
    Map<String, dynamic> cuerpo;
    try {
      cuerpo = jsonDecode(utf8.decode(r.bodyBytes)) as Map<String, dynamic>;
    } on Object {
      throw ErrorApi('RESPUESTA_INVALIDA', 'Respuesta inesperada (${r.statusCode})');
    }
    if (r.statusCode >= 400) {
      throw ErrorApi('${cuerpo['error'] ?? 'ERROR'}', '${cuerpo['mensaje'] ?? 'Error del servidor'}');
    }
    return cuerpo;
  }

  Map<String, String> get _json => {'content-type': 'application/json'};

  List<CartaCantada> _cartas(Object? l) =>
      [for (final c in (l as List<dynamic>? ?? const [])) CartaCantada.desdeJson(c as Map<String, dynamic>)];

  @override
  Future<SalaCreada> crearSala() async {
    final j = await _pedir(() => _c.post(_u('/salas')));
    return SalaCreada(j['id'] as String, j['claveCantor'] as String);
  }

  @override
  Future<Union> unirse(String sala, String nombre, DestinoPush? destino) async {
    final j = await _pedir(() => _c.post(
          _u('/salas/$sala/unirse'),
          headers: _json,
          body: jsonEncode({'nombre': nombre, 'destino': destino?.toJson()}),
        ));
    return Union(
      nombre: j['nombre'] as String,
      tabla: (j['tabla'] as List<dynamic>).cast<int>(),
      claveJugador: j['claveJugador'] as String,
      cartas: _cartas(j['cartas']),
    );
  }

  @override
  Future<EstadoSala> estado(String sala, int desde) async {
    final j = await _pedir(() => _c.get(_u('/salas/$sala/estado?desde=$desde')));
    return EstadoSala(
      ultima: j['ultima'] as int,
      cartas: _cartas(j['cartas']),
      ganador: j['ganador'] as String?,
      patron: j['patron'] as String?,
    );
  }

  @override
  Future<CartaCantada> cantar(String sala, String claveCantor) async {
    final j = await _pedir(() => _c.post(_u('/salas/$sala/cantar'), headers: {'x-cantor-clave': claveCantor}));
    final e = j['evento'] as Map<String, dynamic>;
    return CartaCantada(n: e['n'] as int, cartaId: e['cartaId'] as int, nombre: e['nombre'] as String, pista: e['pista'] as String);
  }

  @override
  Future<ResultadoReclamo> reclamar(String sala, String nombre, String claveJugador) async {
    final j = await _pedir(() => _c.post(
          _u('/salas/$sala/loteria'),
          headers: {..._json, 'x-jugador-clave': claveJugador},
          body: jsonEncode({'nombre': nombre}),
        ));
    return ResultadoReclamo(gano: j['gano'] as bool, patron: j['patron'] as String?);
  }

  @override
  Future<void> actualizarDestino(String sala, String nombre, String claveJugador, DestinoPush destino) async {
    await _pedir(() => _c.put(
          _u('/salas/$sala/destino'),
          headers: {..._json, 'x-jugador-clave': claveJugador},
          body: jsonEncode({'nombre': nombre, 'destino': destino.toJson()}),
        ));
  }
}
