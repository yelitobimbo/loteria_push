import 'evento.dart';

/// A dónde enviar los avisos personales: un token de FCM (clásico) o un FID (nuevo).
class DestinoPush {
  const DestinoPush(this.tipo, this.valor);
  final String tipo; // 'token' | 'fid'
  final String valor;
  Map<String, String> toJson() => {'tipo': tipo, 'valor': valor};
}

class SalaCreada {
  const SalaCreada(this.id, this.claveCantor);
  final String id;
  final String claveCantor;
}

class Union {
  const Union({required this.nombre, required this.tabla, required this.claveJugador, required this.cartas});
  final String nombre;
  final List<int> tabla;
  final String claveJugador;
  final List<CartaCantada> cartas;
}

class EstadoSala {
  const EstadoSala({required this.ultima, required this.cartas, this.ganador, this.patron});
  final int ultima;
  final List<CartaCantada> cartas;
  final String? ganador;
  final String? patron;
}

class ResultadoReclamo {
  const ResultadoReclamo({required this.gano, this.patron});
  final bool gano;
  final String? patron;
}

class ErrorApi implements Exception {
  const ErrorApi(this.codigo, this.mensaje);
  final String codigo;
  final String mensaje;
  @override
  String toString() => 'ErrorApi($codigo): $mensaje';
}

abstract class ApiJuego {
  Future<SalaCreada> crearSala();
  Future<Union> unirse(String sala, String nombre, DestinoPush? destino);
  Future<EstadoSala> estado(String sala, int desde);
  Future<CartaCantada> cantar(String sala, String claveCantor);
  Future<ResultadoReclamo> reclamar(String sala, String nombre, String claveJugador);
  Future<void> actualizarDestino(String sala, String nombre, String claveJugador, DestinoPush destino);
}
