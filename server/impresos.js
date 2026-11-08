// Lista de códigos impresos en las bolsas, guardada como huellas (scrypt) en
// server/codigos-impresos.txt. Así el repositorio puede ser público sin revelar
// los códigos: con la huella no se puede adivinar el código.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const aqui = path.dirname(fileURLToPath(import.meta.url));
export const ARCHIVO_IMPRESOS = path.join(aqui, "codigos-impresos.txt");
const SAL = "sweet-reset·nutrasweets";

export function huella(codigo) {
  return new Promise((ok, mal) =>
    crypto.scrypt(codigo, SAL, 32, { N: 2 ** 14, r: 8, p: 1 }, (e, k) => (e ? mal(e) : ok(k.toString("hex"))))
  );
}

export function cargarImpresos() {
  try {
    return new Set(
      fs.readFileSync(ARCHIVO_IMPRESOS, "utf8").split(/\r?\n/).map((l) => l.trim()).filter((l) => /^[0-9a-f]{64}$/.test(l))
    );
  } catch {
    return new Set();
  }
}
