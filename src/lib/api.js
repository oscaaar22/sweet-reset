// Conexión con el servidor de Sweet Reset y con Claude.
// Orden de intento para generar retos:
//   1. Servidor propio (POST /api/reto), que llama a la API de Anthropic con la clave del servidor.
//   2. Si la página corre como Artifact de Claude, la capacidad "sample" (usa la cuenta de quien la abre).
//   3. Contenido local, para que la función nunca se quede sin respuesta.

import { RETOS, FRASES } from "./contenido.js";
import { INSTRUCCIONES, ESQUEMA_RETO, pedidoReto, normalizarReto } from "./prompt.js";
import { esCodigoValido, formatearCodigo } from "./codes.js";

let servidorDisponible = null; // null = sin revisar
let servidorConClaude = false;
let codigosControlados = false;

async function hayServidor() {
  if (servidorDisponible !== null) return servidorDisponible;
  // La demo publicada (un solo archivo HTML) no tiene servidor propio.
  if (import.meta.env.MODE === "demo") return (servidorDisponible = false);
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 2500);
    const r = await fetch("/api/salud", { signal: ctl.signal });
    clearTimeout(t);
    const j = r.ok ? await r.json().catch(() => null) : null;
    servidorDisponible = Boolean(j && j.ok);
    servidorConClaude = Boolean(j && j.claude);
    codigosControlados = Boolean(j && j.codigosControlados);
  } catch {
    servidorDisponible = false;
  }
  return servidorDisponible;
}

let samplePromesa = null;
function obtenerSample() {
  if (!samplePromesa) {
    samplePromesa =
      typeof window !== "undefined" && window.claude?.use
        ? window.claude.use("sample").catch(() => null)
        : Promise.resolve(null);
  }
  return samplePromesa;
}

/** Estado del servidor: si existe y si solo acepta códigos impresos. */
export async function infoServidor() {
  const servidor = await hayServidor();
  return { servidor, codigosControlados: servidor && codigosControlados };
}

/** Consulta en el servidor si los cupones ya se canjearon en tienda. Devuelve los canjeados. */
export async function cuponesCanjeados(cupones) {
  if (!cupones.length || !(await hayServidor())) return [];
  const res = await Promise.all(
    cupones.map((c) =>
      fetch("/api/cupones/" + encodeURIComponent(c))
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => null)
    )
  );
  return res.filter((j) => j && j.canjeado).map((j) => j.cupon);
}

/** true si hay alguna forma de usar Claude (servidor o demo publicada). */
export async function claudeDisponible() {
  if ((await hayServidor()) && servidorConClaude) return true;
  return Boolean(await obtenerSample());
}

function aleatorio(lista) {
  return lista[Math.floor(Math.random() * lista.length)];
}

function retoLocal({ tipo, categoria, evitar = [] }) {
  if (tipo === "frase") {
    const texto = aleatorio(FRASES.filter((f) => !evitar.includes(f)).length ? FRASES.filter((f) => !evitar.includes(f)) : FRASES);
    return { categoria: "autocuidado", titulo: "Para hoy", texto, minutos: 1, fuente: "local" };
  }
  let opciones = RETOS.filter((r) => (!categoria || r.categoria === categoria) && !evitar.includes(r.titulo));
  if (!opciones.length) opciones = RETOS;
  return { ...aleatorio(opciones), fuente: "local" };
}

/**
 * Genera un reto o frase con Claude.
 * @param {{tipo?: "reto"|"frase", categoria?: string, evitar?: string[], signal?: AbortSignal}} opciones
 * @returns {Promise<{categoria, titulo, texto, minutos, fuente: "claude"|"local", aviso?: string}>}
 */
export async function generarConClaude(opciones = {}) {
  const { signal } = opciones;

  if ((await hayServidor()) && servidorConClaude) {
    try {
      const r = await fetch("/api/reto", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: opciones.tipo, categoria: opciones.categoria, evitar: opciones.evitar }),
        signal,
      });
      const j = await r.json();
      if (r.ok && j.reto) return { ...normalizarReto(j.reto), fuente: "claude" };
      return { ...retoLocal(opciones), aviso: j.error || "Claude no respondió; te dejamos uno de los nuestros." };
    } catch (e) {
      if (e?.name === "AbortError") throw e;
      return { ...retoLocal(opciones), aviso: "Sin conexión con el servidor; te dejamos uno de los nuestros." };
    }
  }

  const sample = await obtenerSample();
  if (sample) {
    try {
      const prompt = `${INSTRUCCIONES}

${pedidoReto(opciones)}

Responde solo con un objeto JSON válido, sin texto antes ni después, con esta forma:
${JSON.stringify(ESQUEMA_RETO.properties)}`;
      const valor = await sample.json(prompt, { modelTier: "quick", cache: false, signal });
      return { ...normalizarReto(valor), fuente: "claude" };
    } catch (e) {
      if (e?.code === "cancelled") throw Object.assign(new Error("cancelado"), { name: "AbortError" });
      const aviso =
        e?.code === "not_granted"
          ? "No diste permiso para usar Claude; te dejamos uno de los nuestros."
          : e?.code === "rate_limited"
          ? "Claude está ocupado. Intenta en un momento."
          : "Claude no respondió; te dejamos uno de los nuestros.";
      return { ...retoLocal(opciones), aviso };
    }
  }

  return { ...retoLocal(opciones), aviso: "Conecta la API de Claude para recibir retos nuevos cada vez." };
}

/**
 * Valida un código de empaque.
 * Con servidor: el servidor revisa que exista y que nadie lo haya usado antes.
 * Sin servidor (demo): se revisa el dígito verificador y que no se repita en este dispositivo.
 * Con servidor, también decide el premio: al juntar 10 devuelve { premio: true, cupon }.
 * @returns {Promise<{ok: boolean, codigo?: string, motivo?: string, servidor?: {sellos, premio, cupon}}>}
 */
export async function validarCodigo(texto) {
  const codigo = formatearCodigo(texto);
  if (!codigo) return { ok: false, motivo: "formato" };
  if (!esCodigoValido(codigo)) return { ok: false, motivo: "invalido" };

  if (await hayServidor()) {
    try {
      const r = await fetch("/api/codigos/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codigo, cliente: clienteGuardado()?.id || "" }),
      });
      const j = await r.json();
      if (j.motivo === "sin-cuenta") guardarCliente(null);
      if (!r.ok) return { ok: false, motivo: j.motivo || "invalido" };
      return { ok: true, codigo, servidor: { sellos: j.sellos, premio: Boolean(j.premio), cupon: j.cupon || null } };
    } catch {
      return { ok: false, motivo: "red" };
    }
  }
  return { ok: true, codigo };
}

// ---------- Cuenta del cliente (sin contraseña: nombre + celular) ----------
const CLAVE_CLIENTE = "sweet-reset:cliente";
let clienteMemoria = null; // por si el navegador bloquea el almacenamiento

/** Cliente guardado en este celular: { id, nombre } o null. */
export function clienteGuardado() {
  try {
    const c = JSON.parse(localStorage.getItem(CLAVE_CLIENTE) || "null");
    return c && c.id ? c : clienteMemoria;
  } catch {
    return clienteMemoria;
  }
}

function guardarCliente(c) {
  clienteMemoria = c ? { id: c.id, nombre: c.nombre } : null;
  try {
    if (c) localStorage.setItem(CLAVE_CLIENTE, JSON.stringify({ id: c.id, nombre: c.nombre }));
    else localStorage.removeItem(CLAVE_CLIENTE);
  } catch {
    /* sin almacenamiento */
  }
}

/** Olvida la cuenta en este celular (no borra nada del servidor). */
export function cerrarCuenta() {
  guardarCliente(null);
}

/**
 * Registra o recupera la cuenta con nombre y celular.
 * @returns {Promise<{ok: true, cliente, nuevo, estado} | {ok: false, motivo, error?}>}
 */
export async function registrarCliente({ nombre, telefono, acepta }) {
  try {
    const r = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, telefono, acepta, anterior: idDispositivo() }),
    });
    const j = await r.json().catch(() => ({}));
    if (r.status === 429) return { ok: false, motivo: "limite" };
    if (!r.ok) return { ok: false, motivo: j.motivo || "red", error: j.error };
    guardarCliente(j.cliente);
    return { ok: true, cliente: j.cliente, nuevo: j.nuevo, estado: j.estado };
  } catch {
    return { ok: false, motivo: "red" };
  }
}

/** Trae del servidor la tarjeta del cliente guardado. null si no hay cuenta o no hay red. */
export async function cargarCliente() {
  const c = clienteGuardado();
  if (!c || !(await hayServidor())) return null;
  try {
    const r = await fetch("/api/clientes/" + encodeURIComponent(c.id));
    if (r.status === 404) {
      guardarCliente(null);
      return { sinCuenta: true };
    }
    if (!r.ok) return null;
    const j = await r.json();
    guardarCliente(j.cliente);
    return { cliente: j.cliente, estado: j.estado };
  } catch {
    return null;
  }
}

function idDispositivo() {
  try {
    let id = localStorage.getItem("sweet-reset:dispositivo");
    if (!id) {
      id = (crypto.randomUUID && crypto.randomUUID()) || String(Math.random()).slice(2);
      localStorage.setItem("sweet-reset:dispositivo", id);
    }
    return id;
  } catch {
    return "sin-almacenamiento";
  }
}
