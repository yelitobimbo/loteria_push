import 'dart:convert';

/// Lo mínimo para retomar la partida al abrir desde una notificación con la app cerrada.
class Sesion {
  const Sesion({required this.sala, required this.nombre, required this.tabla, required this.claveJugador});
  final String sala;
  final String nombre;
  final List<int> tabla;
  final String claveJugador;

  String aTexto() => jsonEncode({'sala': sala, 'nombre': nombre, 'tabla': tabla, 'claveJugador': claveJugador});

  static Sesion? desdeTexto(String? texto) {
    if (texto == null) return null;
    try {
      final j = jsonDecode(texto);
      if (j is! Map<String, dynamic>) return null;
      final tabla = j['tabla'];
      if (j['sala'] is! String || j['nombre'] is! String || j['claveJugador'] is! String) return null;
      if (tabla is! List || tabla.length != 16 || tabla.any((e) => e is! int)) return null;
      return Sesion(
        sala: j['sala'] as String,
        nombre: j['nombre'] as String,
        tabla: tabla.cast<int>(),
        claveJugador: j['claveJugador'] as String,
      );
    } on FormatException {
      return null;
    }
  }
}
