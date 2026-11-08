// Llamada a la API de Anthropic (Claude) para generar retos y frases.
import Anthropic from "@anthropic-ai/sdk";
import { INSTRUCCIONES, ESQUEMA_RETO, pedidoReto, normalizarReto } from "../src/lib/prompt.js";

const MODELO = process.env.CLAUDE_MODEL || "claude-opus-5-5";

let cliente = null;
export function claudeConfigurado() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}
function obtenerCliente() {
  if (!cliente) cliente = new Anthropic(); // lee ANTHROPIC_API_KEY del entorno
  return cliente;
}

/**
 * Genera un reto o una frase con Claude.
 * Usa salida estructurada (JSON Schema) para que la respuesta siempre tenga la forma esperada,
 * esfuerzo "low" porque es una tarea corta, y "fallbacks" para que, si el modelo declina por
 * política, la API reintente con el modelo de respaldo recomendado.
 */
export async function generarReto({ tipo = "reto", categoria, evitar = [] } = {}) {
  const respuesta = await obtenerCliente().beta.messages.create({
    model: MODELO,
    max_tokens: 1024,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: INSTRUCCIONES,
    messages: [{ role: "user", content: pedidoReto({ tipo, categoria, evitar }) }],
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: ESQUEMA_RETO },
    },
  });

  if (respuesta.stop_reason === "refusal") {
    const e = new Error("Claude no pudo generar este contenido.");
    e.codigo = "refusal";
    throw e;
  }
  const texto = respuesta.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");
  return normalizarReto(JSON.parse(texto));
}

export { Anthropic };
