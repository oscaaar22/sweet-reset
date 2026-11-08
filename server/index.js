// Servidor de Sweet Reset.
// - Sirve la aplicación ya compilada (carpeta dist/).
// - POST /api/reto: genera retos y frases con Claude. La clave de la API nunca llega al navegador.
// - POST /api/codigos/registrar: valida el código del empaque, evita que se use dos veces
//   y, al juntar 10, emite el cupón desde el servidor (no se puede falsificar en el teléfono).
// - /tienda: página para que la caja verifique y canjee cupones (protegida con PIN_TIENDA).
import "dotenv/config";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { abrirAlmacen } from "./db.js";
import { cargarImpresos, huella } from "./impresos.js";
import { generarReto, claudeConfigurado, Anthropic } from "./claude.js";
import { esCodigoValido, formatearCodigo } from "../src/lib/codes.js";
import { CATEGORIAS_VALIDAS } from "../src/lib/prompt.js";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const PUERTO = Number(process.env.PORT || 8787);
const almacen = await abrirAlmacen();
const PIN_TIENDA = process.env.PIN_TIENDA || "";
const impresos = cargarImpresos();
console.log(`Códigos impresos registrados: ${impresos.size}`);
// Solo se aceptan códigos impresos (lista del repositorio o de la base de datos).
async function hayLista() {
  return impresos.size > 0 || (await almacen.hayEmitidos());
}
async function esCodigoImpreso(codigo) {
  if (impresos.size && impresos.has(await huella(codigo))) return true;
  return almacen.esEmitido(codigo);
}
console.log(`Almacenamiento: ${almacen.tipo === "postgresql" ? "PostgreSQL" : "archivo local data/sweet-reset.json (solo pruebas)"}`);

const app = express();
app.set("trust proxy", 1); // Render y otros servicios ponen un proxy delante
app.use(express.json({ limit: "10kb" }));

// ---------- Límite de peticiones a Claude por IP ----------
function crearLimite(porMinuto) {
  const ventanas = new Map();
  setInterval(() => ventanas.clear(), 10 * 60_000).unref();
  return (req, res, next) => {
    const ip = req.ip || "anon";
    const ahora = Date.now();
    const v = (ventanas.get(ip) || []).filter((t) => ahora - t < 60_000);
    if (v.length >= porMinuto) return res.status(429).json({ motivo: "limite", error: "Muchas solicitudes. Espera un minuto." });
    v.push(ahora);
    ventanas.set(ip, v);
    next();
  };
}
const limite = crearLimite(8);

app.get("/api/salud", async (_req, res) => {
  try {
    res.json({ ok: true, claude: claudeConfigurado(), codigosControlados: await hayLista() });
  } catch (e) {
    console.error("Base de datos no disponible:", e.message);
    res.status(503).json({ ok: false });
  }
});

app.post("/api/reto", limite, async (req, res) => {
  const { tipo, categoria, evitar } = req.body || {};
  if (!claudeConfigurado()) {
    return res.status(503).json({ error: "El servidor no tiene configurada la clave de Claude (ANTHROPIC_API_KEY)." });
  }
  try {
    const reto = await generarReto({
      tipo: tipo === "frase" ? "frase" : "reto",
      categoria: CATEGORIAS_VALIDAS.includes(categoria) ? categoria : undefined,
      evitar: Array.isArray(evitar) ? evitar.map(String).slice(0, 8) : [],
    });
    res.json({ reto });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return res.status(429).json({ error: "Claude está ocupado. Intenta en un momento." });
    if (e instanceof Anthropic.AuthenticationError) return res.status(500).json({ error: "La clave de Claude no es válida." });
    if (e instanceof Anthropic.APIConnectionError) return res.status(502).json({ error: "No hay conexión con Claude." });
    if (e?.codigo === "refusal") return res.status(422).json({ error: e.message });
    console.error("Error al generar reto:", e);
    res.status(500).json({ error: "Claude no respondió; te dejamos uno de los nuestros." });
  }
});

const limiteCodigos = crearLimite(30);

app.post("/api/codigos/registrar", limiteCodigos, async (req, res) => {
  const codigo = formatearCodigo(req.body?.codigo);
  const dispositivo = String(req.body?.dispositivo || "").slice(0, 64);
  if (!codigo) return res.status(400).json({ motivo: "formato" });
  if (dispositivo.length < 8) return res.status(400).json({ motivo: "formato" });
  try {
    if (!esCodigoValido(codigo)) return res.status(404).json({ motivo: "invalido" });
    if ((await hayLista()) && !(await esCodigoImpreso(codigo))) return res.status(404).json({ motivo: "invalido" });
    const r = await almacen.registrar(codigo, dispositivo);
    if (!r.ok) return res.status(409).json({ motivo: r.motivo });
    res.json({ ok: true, codigo, sellos: r.sellos, premio: r.premio, cupon: r.cupon });
  } catch (e) {
    console.error("Error al registrar código:", e);
    res.status(500).json({ motivo: "red" });
  }
});

const limpiarCupon = (t) => String(t || "").toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^NSR/, "").slice(0, 6);

app.get("/api/cupones/:cupon", limiteCodigos, async (req, res) => {
  const cupon = await almacen.consultarCupon("NSR-" + limpiarCupon(req.params.cupon));
  if (!cupon) return res.status(404).json({ motivo: "no-existe" });
  res.json({ cupon: cupon.cupon, creado: cupon.creado, canjeado: cupon.canjeado });
});

// Canje: lo hace el personal de la tienda desde /tienda con el PIN.
app.post("/api/cupones/canjear", limiteCodigos, async (req, res) => {
  if (!PIN_TIENDA) return res.status(503).json({ motivo: "sin-pin", error: "Falta configurar PIN_TIENDA en el servidor." });
  if (String(req.body?.pin || "") !== PIN_TIENDA) return res.status(401).json({ motivo: "pin", error: "PIN incorrecto." });
  const r = await almacen.canjearCupon("NSR-" + limpiarCupon(req.body?.cupon));
  if (!r.ok) return res.status(r.motivo === "no-existe" ? 404 : 409).json(r);
  res.json(r);
});

app.post("/api/tienda/resumen", limiteCodigos, async (req, res) => {
  if (!PIN_TIENDA || String(req.body?.pin || "") !== PIN_TIENDA) return res.status(401).json({ motivo: "pin" });
  res.json(await almacen.resumen());
});

// Página sencilla para la caja: verificar y canjear cupones.
app.get("/tienda", (_req, res) => res.sendFile(path.join(aqui, "tienda.html")));

// ---------- Aplicación compilada ----------
const dist = path.join(raiz, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api\/).*/, (_req, res) => res.sendFile(path.join(dist, "index.html")));
}

app.listen(PUERTO, () => {
  console.log(`Sweet Reset listo en http://localhost:${PUERTO}`);
  console.log(claudeConfigurado() ? "Claude: conectado" : "Claude: falta ANTHROPIC_API_KEY en .env (la app usará contenido local)");
});
