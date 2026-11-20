'use strict';
// La baraja de Lotería (54 cartas) con una pista original y chistosa para cada una.
// Nota de inclusión: dos cartas históricas cuyo nombre hoy resulta ofensivo se
// sustituyeron por "El Taco" y "El Elote". Un buen ejemplo de decisión de diseño.
const DATOS = [
  ['El Gallo', 'Madruga más que tu mamá un domingo.'],
  ['El Diablito', 'Pórtate bien... o no.'],
  ['La Dama', 'Llega tarde porque se arregla con calma.'],
  ['El Catrín', 'Trae más sombrero que presupuesto.'],
  ['El Paraguas', 'Nunca está cuando llueve.'],
  ['La Sirena', 'Canta bonito, pero no la sigas al mar.'],
  ['La Escalera', 'Sube de a poquito y baja de a brinco.'],
  ['La Botella', 'Tiene mucho que contar y poco contenido.'],
  ['El Barril', 'Redondo, pesado y siempre rodando.'],
  ['El Árbol', 'Da sombra gratis a quien se la merece.'],
  ['El Melón', 'Se elige a golpecitos y aun así sale malo.'],
  ['El Valiente', 'Dice que no tiene miedo, pero camina de lado.'],
  ['El Gorrito', 'Para el frío, para la moda o para el chistorete.'],
  ['La Muerte', 'Pálida y flaca, pero nadie le gana en puntualidad.'],
  ['La Pera', 'Madura solo cuando tú no la vigilas.'],
  ['La Bandera', 'Ondea más fuerte que tu wifi.'],
  ['El Bandolón', 'Suena a fiesta aunque nadie lo invitó.'],
  ['El Violoncello', 'Hace llorar a todos sin decir una palabra.'],
  ['La Garza', 'Una pata y mucha elegancia.'],
  ['El Pájaro', 'Madruga, canta y no paga renta.'],
  ['La Mano', 'Pedir con ella es fácil; devolver, ya no.'],
  ['La Bota', 'Camina por ti y huele por sí sola.'],
  ['La Luna', 'Cambia de cara y nadie se lo reprocha.'],
  ['El Cotorro', 'Habla sin parar y repite lo que oye.'],
  ['El Borracho', 'Juró que era el último... hace tres rondas.'],
  ['El Taco', 'Doblado, doradito y con salsita: nadie lo rechaza.'],
  ['El Corazón', 'No tiene llave pero igual se lo roban.'],
  ['La Sandía', 'Por fuera tranquila, por dentro pura fiesta.'],
  ['El Tambor', 'Todo el mundo lo golpea y aun así llama la atención.'],
  ['El Camarón', 'Se duerme y la corriente se lo lleva.'],
  ['Las Jaras', 'Flechas que no preguntan a quién le dan.'],
  ['El Músico', 'Si no hay propina, hay indirectas.'],
  ['La Araña', 'Teje su casa y nunca paga hipoteca.'],
  ['El Soldado', 'Marcha derecho aunque le pique la nariz.'],
  ['La Estrella', 'Brilla de noche y se hace la importante de día.'],
  ['El Cazo', 'Hierve rápido, igual que tu paciencia.'],
  ['El Mundo', 'Gira sin descanso y no te avisa.'],
  ['El Elote', 'Con mayonesa, chile y limón es de la familia.'],
  ['El Nopal', 'Pica, pero en ensalada se porta bien.'],
  ['El Alacrán', 'Trae la cola lista y mal humor.'],
  ['La Rosa', 'Bonita hasta que te pica.'],
  ['La Calavera', 'Es de azúcar y se come con sonrisa.'],
  ['La Campana', 'Todos la oyen, pocos saben a quién llama.'],
  ['El Cantarito', 'Agua fresca, cuando no se rompe.'],
  ['El Venado', 'Salta y desaparece cuando lo buscas.'],
  ['El Sol', 'Llega primero y se va sin despedirse.'],
  ['La Corona', 'Pesa más de lo que se ve.'],
  ['La Chalupa', 'Flota y no se hunde, como los chismes.'],
  ['El Pino', 'Verde todo el año, hasta en diciembre.'],
  ['El Pescado', 'Nada, nada, y nada más.'],
  ['La Palma', 'Se mece sin que nadie la empuje.'],
  ['La Maceta', 'Con cariño florece; sin él, se vuelve reproche.'],
  ['El Arpa', 'Cuerdas largas, historias largas.'],
  ['La Rana', 'Croa más que tu tío en las fiestas.'],
];

const CARTAS = DATOS.map(([nombre, pista], i) => Object.freeze({ id: i + 1, nombre, pista }));
const TAMANO_TABLA = 16;

function cartaPorId(id) {
  return CARTAS[id - 1] ?? null;
}

// Generador pseudoaleatorio con semilla (mulberry32): mismo número -> misma secuencia.
// SOLO para pruebas. En producción la semilla sale de crypto y NUNCA se comparte.
function mulberry32(semilla) {
  let a = semilla >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates: baraja imparcial (cada orden posible es igual de probable).
function barajar(semilla) {
  const rnd = mulberry32(semilla);
  const ids = CARTAS.map((c) => c.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

function generarTabla(semilla) {
  return barajar(semilla).slice(0, TAMANO_TABLA);
}

module.exports = { CARTAS, TAMANO_TABLA, cartaPorId, mulberry32, barajar, generarTabla };
