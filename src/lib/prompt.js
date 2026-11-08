// Instrucciones para que Claude genere un reto o una frase de bienestar.
// Las comparte el servidor (API de Anthropic) y la demo publicada.

export const CATEGORIAS_VALIDAS = ["desconexion", "gratitud", "relajacion", "creatividad", "autocuidado"];

export const ESQUEMA_RETO = {
  type: "object",
  properties: {
    categoria: { type: "string", enum: CATEGORIAS_VALIDAS },
    titulo: { type: "string", description: "Título corto, de 2 a 6 palabras" },
    texto: { type: "string", description: "Instrucción concreta de 1 o 2 frases, máximo 220 caracteres" },
    minutos: { type: "integer", description: "Minutos que toma, de 1 a 30" },
  },
  required: ["categoria", "titulo", "texto", "minutos"],
  additionalProperties: false,
};

export const INSTRUCCIONES = `Eres la voz de Sweet Reset, la experiencia digital de NutraSweets, una marca mexicana de dulces funcionales con ingredientes naturales.
Escribes para estudiantes de 15 años en adelante y para adultos que trabajan, que viven estrés académico o laboral.

Reglas:
- Español de México, tono cálido, cercano y breve. Tutea al usuario.
- Propón acciones concretas, seguras y que se puedan hacer ya, con lo que una persona tiene a la mano.
- No des consejos médicos, no menciones medicamentos ni prometas curar ansiedad, insomnio o estrés.
- No menciones a NutraSweets ni sus productos dentro del reto.
- No uses emojis.`;

export function pedidoReto({ tipo = "reto", categoria, evitar = [] } = {}) {
  const cat = CATEGORIAS_VALIDAS.includes(categoria) ? categoria : null;
  const partes = [];
  if (tipo === "frase") {
    partes.push(
      'Escribe una frase de motivación original para una pausa de calma. Pon la frase en "texto" (máximo 120 caracteres), un título de 2 a 4 palabras en "titulo", la categoría que mejor le quede y minutos = 1.'
    );
  } else {
    partes.push("Propón un reto de bienestar para hoy.");
    partes.push(cat ? `Categoría: ${cat}.` : "Elige tú la categoría.");
  }
  if (evitar.length) partes.push(`No repitas estos títulos: ${evitar.slice(0, 8).join("; ")}.`);
  return partes.join(" ");
}

/** Revisa y normaliza lo que regresa el modelo. Lanza error si no sirve. */
export function normalizarReto(valor) {
  if (!valor || typeof valor !== "object") throw new Error("respuesta vacía");
  const categoria = CATEGORIAS_VALIDAS.includes(valor.categoria) ? valor.categoria : "relajacion";
  const titulo = String(valor.titulo || "").trim().slice(0, 60);
  const texto = String(valor.texto || "").trim().slice(0, 260);
  const minutos = Math.min(30, Math.max(1, parseInt(valor.minutos, 10) || 2));
  if (!titulo || !texto) throw new Error("respuesta incompleta");
  return { categoria, titulo, texto, minutos };
}
