import 'evento.dart';
import 'lineas.dart';

enum ResultadoAplicar { aplicado, duplicado, hueco, informativo }

/// El estado de la partida visto por UN jugador. Idempotente y consciente de
/// huecos: el push NO garantiza ni el orden, ni la entrega, ni que no se repita.
class Partida {
  Partida({required this.sala, required this.nombre, required this.tabla});

  final String sala;
  final String nombre;
  final List<int> tabla;
  final List<CartaCantada> _cantadas = [];

  String? ganador;
  String? patronGanador;
  bool casi = false;
  int? cartaQueFalta;

  List<CartaCantada> get cantadas => List.unmodifiable(_cantadas);
  int get ultima => _cantadas.length;
  Set<int> get idsCantados => {for (final c in _cantadas) c.cartaId};
  CartaCantada? get ultimaCarta => _cantadas.isEmpty ? null : _cantadas.last;

  bool estaMarcada(int cartaId) => idsCantados.contains(cartaId);
  List<String> get patrones => patronesCompletos(tabla, idsCantados);
  bool get puedeCantarLoteria => ganador == null && patrones.isNotEmpty;

  ResultadoAplicar aplicar(EventoJuego e) {
    switch (e) {
      case CartaCantada c:
        if (c.n <= ultima) return ResultadoAplicar.duplicado; // ya la teníamos
        if (c.n > ultima + 1) return ResultadoAplicar.hueco; // faltan cartas: hay que preguntar al servidor
        _cantadas.add(c);
        return ResultadoAplicar.aplicado;
      case LoteriaCantada l:
        final yaEstaba = ganador == l.ganador;
        ganador = l.ganador;
        patronGanador = l.patron;
        return yaEstaba ? ResultadoAplicar.duplicado : ResultadoAplicar.aplicado;
      case CasiGanas k:
        casi = true;
        cartaQueFalta = k.cartaId;
        return ResultadoAplicar.informativo;
    }
  }

  /// Aplica una lista que viene del servidor (en cualquier orden, con repetidas).
  void aplicarLote(List<CartaCantada> cartas) {
    final ordenadas = [...cartas]..sort((a, b) => a.n.compareTo(b.n));
    for (final c in ordenadas) {
      aplicar(c);
    }
  }
}
