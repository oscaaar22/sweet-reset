// Contenido base de Sweet Reset. Funciona sin conexión y sin la API de Claude.

export const CATEGORIAS = {
  desconexion: { nombre: "Desconexión", color: "cielo" },
  gratitud: { nombre: "Gratitud", color: "miel" },
  relajacion: { nombre: "Relajación", color: "lavanda" },
  creatividad: { nombre: "Creatividad", color: "rosa" },
  autocuidado: { nombre: "Autocuidado", color: "menta" },
};

export const RETOS = [
  { categoria: "desconexion", titulo: "Diez minutos sin pantalla", texto: "Deja el celular boca abajo y aléjate de cualquier pantalla durante 10 minutos. Mira por la ventana o camina un poco.", minutos: 10 },
  { categoria: "desconexion", titulo: "Comida sin notificaciones", texto: "En tu próxima comida silencia el celular y ponlo fuera de tu vista. Pon atención al sabor y la textura de lo que comes.", minutos: 20 },
  { categoria: "desconexion", titulo: "Cinco cosas que ves", texto: "Nombra en voz baja cinco cosas que ves, cuatro que puedes tocar, tres que escuchas, dos que hueles y una que saboreas.", minutos: 3 },
  { categoria: "desconexion", titulo: "Antes de dormir", texto: "Deja el celular cargando lejos de la cama 30 minutos antes de dormir esta noche.", minutos: 30 },
  { categoria: "desconexion", titulo: "Mira el cielo", texto: "Sal o asómate un momento y observa el cielo durante dos minutos. Fíjate en el color y en cómo se mueven las nubes.", minutos: 2 },
  { categoria: "desconexion", titulo: "Un pendiente a la vez", texto: "Elige una sola tarea, cierra las demás pestañas y trabaja en ella 15 minutos sin cambiar de actividad.", minutos: 15 },
  { categoria: "gratitud", titulo: "Tres cosas buenas", texto: "Escribe tres cosas que salieron bien hoy, aunque sean pequeñas.", minutos: 3 },
  { categoria: "gratitud", titulo: "Un mensaje amable", texto: "Mándale un mensaje a alguien para agradecerle algo concreto que hizo por ti.", minutos: 2 },
  { categoria: "gratitud", titulo: "Lo que tu cuerpo hizo hoy", texto: "Piensa en algo que tu cuerpo te permitió hacer hoy y agradécelo en silencio.", minutos: 1 },
  { categoria: "gratitud", titulo: "Una persona, un recuerdo", texto: "Recuerda un momento feliz con alguien que quieres y escribe una línea sobre él.", minutos: 3 },
  { categoria: "gratitud", titulo: "Lo que sí tienes", texto: "Haz una lista de cinco cosas que hoy das por hecho y que en otro momento deseaste tener.", minutos: 4 },
  { categoria: "relajacion", titulo: "Escucha tu canción favorita", texto: "Ponte audífonos y escucha completa tu canción favorita, sin hacer nada más.", minutos: 4 },
  { categoria: "relajacion", titulo: "Hombros abajo", texto: "Sube los hombros hacia las orejas al inhalar y suéltalos de golpe al exhalar. Repite cinco veces.", minutos: 1 },
  { categoria: "relajacion", titulo: "Respiración de caja", texto: "Haz cuatro rondas de respiración de caja en la sección Respira: inhala 4, sostén 4, exhala 4, sostén 4.", minutos: 2 },
  { categoria: "relajacion", titulo: "Agua tibia", texto: "Lávate la cara o las manos con agua tibia, despacio, poniendo atención a la temperatura.", minutos: 2 },
  { categoria: "relajacion", titulo: "Escaneo corporal", texto: "Recorre tu cuerpo con la atención de los pies a la cabeza y suelta la tensión de cada zona.", minutos: 5 },
  { categoria: "relajacion", titulo: "Estírate", texto: "Ponte de pie, estira los brazos hacia el techo y luego inclínate hacia cada lado durante 20 segundos.", minutos: 2 },
  { categoria: "creatividad", titulo: "Dibuja tu día", texto: "Dibuja algo que represente cómo fue tu día. No importa si no sabes dibujar.", minutos: 5 },
  { categoria: "creatividad", titulo: "Seis palabras", texto: "Escribe una historia de tu semana en solo seis palabras.", minutos: 2 },
  { categoria: "creatividad", titulo: "Playlist de calma", texto: "Arma una lista con cinco canciones que te tranquilicen y ponle nombre.", minutos: 8 },
  { categoria: "creatividad", titulo: "Garabato libre", texto: "Toma una hoja y haz garabatos durante tres minutos sin intentar que salga algo.", minutos: 3 },
  { categoria: "creatividad", titulo: "Carta a tu yo del futuro", texto: "Escribe tres líneas para leerte dentro de un mes. ¿Qué quieres recordarte?", minutos: 5 },
  { categoria: "autocuidado", titulo: "Un vaso de agua", texto: "Toma un vaso de agua completo, despacio, ahora mismo.", minutos: 1 },
  { categoria: "autocuidado", titulo: "Algo que disfrutes", texto: "Dedica unos minutos a una actividad que disfrutes solo porque sí.", minutos: 10 },
  { categoria: "autocuidado", titulo: "Ordena un rincón", texto: "Ordena tu escritorio o tu mochila. Un espacio despejado ayuda a pensar con calma.", minutos: 5 },
  { categoria: "autocuidado", titulo: "Pausa con luz natural", texto: "Pasa cinco minutos donde te dé la luz del día.", minutos: 5 },
  { categoria: "autocuidado", titulo: "Hora de dormir", texto: "Decide hoy a qué hora te vas a dormir y pon una alarma 30 minutos antes para empezar a prepararte.", minutos: 1 },
  { categoria: "autocuidado", titulo: "Di que no", texto: "Identifica un pendiente que no es urgente ni tuyo y déjalo ir por hoy.", minutos: 2 },
];

export const FRASES = [
  "No tienes que resolver todo hoy. Basta con el siguiente paso.",
  "Descansar también es avanzar.",
  "Respira. Este momento también va a pasar.",
  "Lo estás haciendo mejor de lo que crees.",
  "Un examen no define lo que vales.",
  "Puedes ir despacio y aun así llegar.",
  "Hoy es un buen día para tratarte con amabilidad.",
  "Haz una pausa antes de que tu cuerpo te la pida.",
  "Tu calma también es productiva.",
  "Pequeños momentos de calma hacen días más ligeros.",
  "Cuidarte no es egoísmo; es lo que te deja cuidar lo demás.",
  "Suelta los hombros, afloja la mandíbula y sigue.",
  "Está bien no estar al cien todos los días.",
  "Lo que hoy pesa, mañana se verá más pequeño.",
  "Tu ritmo es válido.",
  "Un respiro a tiempo vale más que diez cafés.",
];

export const PATRONES_RESPIRACION = [
  {
    id: "caja",
    nombre: "Respiración de caja",
    para: "Calmarte antes de un examen o una junta",
    fases: [
      { tipo: "inhala", seg: 4 },
      { tipo: "sostén", seg: 4 },
      { tipo: "exhala", seg: 4 },
      { tipo: "sostén", seg: 4 },
    ],
  },
  {
    id: "478",
    nombre: "4 · 7 · 8",
    para: "Prepararte para dormir",
    fases: [
      { tipo: "inhala", seg: 4 },
      { tipo: "sostén", seg: 7 },
      { tipo: "exhala", seg: 8 },
    ],
  },
  {
    id: "coherente",
    nombre: "Respiración coherente",
    para: "Bajar el ritmo en cualquier momento",
    fases: [
      { tipo: "inhala", seg: 5 },
      { tipo: "exhala", seg: 5 },
    ],
  },
];

export const SONIDOS = [
  { id: "lluvia", nombre: "Lluvia suave", descripcion: "Lluvia constante sobre el techo", color: "cielo" },
  { id: "olas", nombre: "Olas del mar", descripcion: "Oleaje lento que va y viene", color: "lavanda" },
  { id: "bosque", nombre: "Bosque al amanecer", descripcion: "Viento entre árboles y pájaros", color: "menta" },
  { id: "estrellas", nombre: "Cielo estrellado", descripcion: "Música ambiental en notas suaves", color: "rosa" },
];

/** Número de día desde 2024-01-01 en hora local, para elegir el reto del día. */
export function numeroDeDia(fecha = new Date()) {
  const base = new Date(2024, 0, 1);
  const hoy = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
  return Math.round((hoy - base) / 86400000);
}

export function claveDia(fecha = new Date()) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const d = String(fecha.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function retoDelDia(fecha = new Date()) {
  const n = numeroDeDia(fecha);
  // Salto de 11 (primo con 28) para no repetir la misma categoría dos días seguidos.
  return RETOS[(n * 11) % RETOS.length];
}

export function fraseDelDia(fecha = new Date()) {
  return FRASES[(numeroDeDia(fecha) * 7) % FRASES.length];
}
