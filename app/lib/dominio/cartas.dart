/// Nombres de las 54 cartas (el id 1..54 es el mismo que usa el servidor).
const List<String> nombresCartas = [
  'El Gallo', 'El Diablito', 'La Dama', 'El Catrín', 'El Paraguas', 'La Sirena',
  'La Escalera', 'La Botella', 'El Barril', 'El Árbol', 'El Melón', 'El Valiente',
  'El Gorrito', 'La Muerte', 'La Pera', 'La Bandera', 'El Bandolón', 'El Violoncello',
  'La Garza', 'El Pájaro', 'La Mano', 'La Bota', 'La Luna', 'El Cotorro',
  'El Borracho', 'El Taco', 'El Corazón', 'La Sandía', 'El Tambor', 'El Camarón',
  'Las Jaras', 'El Músico', 'La Araña', 'El Soldado', 'La Estrella', 'El Cazo',
  'El Mundo', 'El Elote', 'El Nopal', 'El Alacrán', 'La Rosa', 'La Calavera',
  'La Campana', 'El Cantarito', 'El Venado', 'El Sol', 'La Corona', 'La Chalupa',
  'El Pino', 'El Pescado', 'La Palma', 'La Maceta', 'El Arpa', 'La Rana',
];

String nombreDeCarta(int id) => (id >= 1 && id <= nombresCartas.length) ? nombresCartas[id - 1] : '?';
