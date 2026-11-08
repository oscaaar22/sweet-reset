// Genera códigos únicos para imprimir en las etiquetas de cada bolsa.
// Uso: npm run codigos -- 500
// - Con DATABASE_URL: los guarda en la base de datos (la app solo aceptará códigos impresos).
// - Sin DATABASE_URL: los guarda en data/codigos-emitidos.txt (pruebas locales).
// Siempre crea data/codigos-para-imprenta.csv con la URL que va en el QR de cada bolsa.
import "dotenv/config";
import fs from "node:fs";
import crypto from "node:crypto";
import { generarCodigo } from "../src/lib/codes.js";
import { abrirAlmacen } from "../server/db.js";
import { huella, ARCHIVO_IMPRESOS } from "../server/impresos.js";

const cantidad = Number(process.argv[2] || 100);
const dominio = (process.env.SWEET_RESET_URL || "https://sweet-reset.onrender.com").replace(/\/$/, "");
const aleatorio = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32; // aleatorio criptográfico

const almacen = await abrirAlmacen();
const nuevos = new Set();
while (nuevos.size < cantidad) nuevos.add(generarCodigo(aleatorio));
const lista = [...nuevos];
const agregados = await almacen.agregarEmitidos(lista);
if (agregados !== lista.length) console.warn(`Aviso: ${lista.length - agregados} códigos ya existían; vuelve a correr el comando para completar.`);
await almacen.cerrar();

// Huellas para el repositorio: al subirlas a GitHub, la plataforma acepta estos códigos.
const huellas = [];
for (const c of lista) huellas.push(await huella(c));
if (!fs.existsSync(ARCHIVO_IMPRESOS)) fs.writeFileSync(ARCHIVO_IMPRESOS, "# Huellas de los códigos impresos (no son los códigos). Generado por npm run codigos.\n");
fs.appendFileSync(ARCHIVO_IMPRESOS, huellas.join("\n") + "\n");

fs.mkdirSync("data", { recursive: true });
const csv = ["codigo,url_qr", ...lista.map((c) => `${c},${dominio}/?codigo=${c}`)].join("\n");
fs.writeFileSync("data/codigos-para-imprenta.csv", csv + "\n");
console.log(`Listo: ${agregados} códigos nuevos guardados en ${almacen.tipo === "postgresql" ? "la base de datos" : "data/sweet-reset.json"}.`);
console.log("Archivo para la imprenta: data/codigos-para-imprenta.csv");
console.log("Sube server/codigos-impresos.txt a GitHub para que la plataforma acepte los nuevos códigos.");
