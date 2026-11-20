/// Lo que llega por push es TEXTO que viaja por internet: se parsea con
/// desconfianza. Si algo no cuadra, el evento se descarta (devuelve null).
sealed class EventoJuego {
  const EventoJuego(this.n);
  final int n;

  static String? salaDe(Map<String, Object?> datos) {
    final s = datos['sala'];
    return (s is String && s.isNotEmpty && s.length <= 8) ? s.toUpperCase() : null;
  }

  static EventoJuego? desdeDatos(Map<String, Object?> datos) {
    final tipo = datos['tipo'];
    final n = _entero(datos['n'], min: 1, max: 54);
    if (tipo is! String || n == null) return null;
    switch (tipo) {
      case 'carta':
        final id = _entero(datos['cartaId'], min: 1, max: 54);
        final nombre = _texto(datos['nombre']);
        final pista = _texto(datos['pista'], max: 200);
        if (id == null || nombre == null || pista == null) return null;
        return CartaCantada(n: n, cartaId: id, nombre: nombre, pista: pista);
      case 'loteria':
        final ganador = _texto(datos['ganador'], max: 20);
        final patron = _texto(datos['patron'], max: 20);
        if (ganador == null || patron == null) return null;
        return LoteriaCantada(n: n, ganador: ganador, patron: patron);
      case 'casi':
        final id = _entero(datos['cartaId'], min: 1, max: 54);
        if (id == null) return null;
        return CasiGanas(n: n, cartaId: id);
      default:
        return null; // tipo desconocido (quizá de una versión futura): se ignora
    }
  }

  // Los valores de "data" en FCM llegan SIEMPRE como texto: "5", no 5.
  static int? _entero(Object? v, {required int min, required int max}) {
    final x = v is int ? v : int.tryParse('$v');
    return (x != null && x >= min && x <= max) ? x : null;
  }

  static String? _texto(Object? v, {int max = 120}) {
    if (v is! String) return null;
    final t = v.trim();
    return (t.isNotEmpty && t.length <= max) ? t : null;
  }
}

final class CartaCantada extends EventoJuego {
  const CartaCantada({required int n, required this.cartaId, required this.nombre, required this.pista}) : super(n);
  final int cartaId;
  final String nombre;
  final String pista;

  factory CartaCantada.desdeJson(Map<String, dynamic> j) => CartaCantada(
        n: j['n'] as int,
        cartaId: j['cartaId'] as int,
        nombre: j['nombre'] as String,
        pista: j['pista'] as String,
      );
}

final class LoteriaCantada extends EventoJuego {
  const LoteriaCantada({required int n, required this.ganador, required this.patron}) : super(n);
  final String ganador;
  final String patron;
}

final class CasiGanas extends EventoJuego {
  const CasiGanas({required int n, required this.cartaId}) : super(n);
  final int cartaId;
}
