/// Mismos patrones que el servidor (lineas.js). El SERVIDOR decide quién gana;
/// aquí solo sirve para habilitar el botón "¡LOTERÍA!" y mostrar ayudas.
const Map<String, List<int>> patrones = {
  'llena': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
  'fila1': [0, 1, 2, 3],
  'fila2': [4, 5, 6, 7],
  'fila3': [8, 9, 10, 11],
  'fila4': [12, 13, 14, 15],
  'columna1': [0, 4, 8, 12],
  'columna2': [1, 5, 9, 13],
  'columna3': [2, 6, 10, 14],
  'columna4': [3, 7, 11, 15],
  'diagonal1': [0, 5, 10, 15],
  'diagonal2': [3, 6, 9, 12],
  'esquinas': [0, 3, 12, 15],
  'centro': [5, 6, 9, 10],
};

List<String> patronesCompletos(List<int> tabla, Set<int> cantadas) => [
      for (final e in patrones.entries)
        if (e.value.every((pos) => cantadas.contains(tabla[pos]))) e.key,
    ];

String describirPatron(String nombre) {
  if (nombre == 'llena') return 'la tabla llena';
  if (nombre == 'esquinas') return 'las cuatro esquinas';
  if (nombre == 'centro') return 'el centro';
  if (nombre.startsWith('diagonal')) return 'una diagonal';
  final m = RegExp(r'^(fila|columna)(\d)$').firstMatch(nombre);
  return m == null ? nombre : 'la ${m.group(1)} ${m.group(2)}';
}
