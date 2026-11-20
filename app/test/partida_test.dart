import 'package:flutter_test/flutter_test.dart';
import 'package:loteria_push/dominio/evento.dart';
import 'package:loteria_push/dominio/partida.dart';

import 'falsos.dart';

void main() {
  Partida nueva() => Partida(sala: 'ABCDE', nombre: 'Ana', tabla: List.generate(16, (i) => i + 1));

  test('las cartas en orden se aplican', () {
    final p = nueva();
    expect(p.aplicar(carta(1, 10)), ResultadoAplicar.aplicado);
    expect(p.aplicar(carta(2, 11)), ResultadoAplicar.aplicado);
    expect(p.ultima, 2);
    expect(p.ultimaCarta!.cartaId, 11);
  });

  test('un push repetido NO se aplica dos veces (idempotencia)', () {
    final p = nueva();
    p.aplicar(carta(1, 10));
    expect(p.aplicar(carta(1, 10)), ResultadoAplicar.duplicado);
    expect(p.ultima, 1);
  });

  test('si falta una carta, se detecta el HUECO y no se aplica la adelantada', () {
    final p = nueva();
    p.aplicar(carta(1, 10));
    expect(p.aplicar(carta(3, 12)), ResultadoAplicar.hueco);
    expect(p.ultima, 1, reason: 'no se salta la carta 2');
  });

  test('aplicarLote tolera desorden y repetidas', () {
    final p = nueva();
    p.aplicar(carta(1, 10));
    p.aplicarLote([carta(4, 13), carta(2, 11), carta(3, 12), carta(2, 11), carta(1, 10)]);
    expect(p.cantadas.map((c) => c.n), [1, 2, 3, 4]);
  });

  test('aplicarLote con huecos se detiene en el primero', () {
    final p = nueva();
    p.aplicarLote([carta(1, 10), carta(2, 11), carta(4, 13)]);
    expect(p.ultima, 2);
  });

  test('una carta está marcada si ya fue cantada (la pantalla solo pregunta por MIS casillas)', () {
    final p = nueva(); // tabla 1..16
    p.aplicar(carta(1, 3));
    p.aplicar(carta(2, 40)); // salió, pero no está en mi tabla: no afecta a ninguna casilla mía
    expect(p.estaMarcada(3), isTrue);
    expect(p.estaMarcada(5), isFalse);
    expect(p.tabla.where(p.estaMarcada).toList(), [3]);
  });

  test('el botón de Lotería se habilita al completar un patrón', () {
    final p = nueva();
    for (var i = 1; i <= 3; i++) {
      p.aplicar(carta(i, i));
    }
    expect(p.puedeCantarLoteria, isFalse);
    p.aplicar(carta(4, 4));
    expect(p.puedeCantarLoteria, isTrue);
    expect(p.patrones, ['fila1']);
  });

  test('si ya hay ganador, nadie más puede cantar', () {
    final p = nueva();
    for (var i = 1; i <= 4; i++) {
      p.aplicar(carta(i, i));
    }
    p.aplicar(const LoteriaCantada(n: 4, ganador: 'Beto', patron: 'fila2'));
    expect(p.ganador, 'Beto');
    expect(p.puedeCantarLoteria, isFalse);
  });

  test('el aviso de lotería repetido es duplicado', () {
    final p = nueva();
    const l = LoteriaCantada(n: 4, ganador: 'Beto', patron: 'fila2');
    expect(p.aplicar(l), ResultadoAplicar.aplicado);
    expect(p.aplicar(l), ResultadoAplicar.duplicado);
  });

  test('"casi" solo informa', () {
    final p = nueva();
    expect(p.aplicar(const CasiGanas(n: 3, cartaId: 7)), ResultadoAplicar.informativo);
    expect(p.casi, isTrue);
    expect(p.cartaQueFalta, 7);
  });
}
