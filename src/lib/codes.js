// Códigos únicos de empaque NutraSweets.
// Formato: NS-XXXX-XXXX  (7 caracteres aleatorios + 1 dígito verificador).
// Se usa un alfabeto sin caracteres que se confunden (sin 0, O, 1, I, L).
// Este módulo lo comparten el navegador, el servidor y el script que genera los códigos.

export const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const BASE = ALFABETO.length; // 31, número primo: detecta cualquier error de un carácter

function verificador(cuerpo) {
  let suma = 0;
  for (let i = 0; i < cuerpo.length; i++) {
    const v = ALFABETO.indexOf(cuerpo[i]);
    if (v < 0) return null;
    suma += v * (i + 2);
  }
  return ALFABETO[suma % BASE];
}

/** Quita espacios y guiones, pasa a mayúsculas y corrige letras confundibles. */
export function limpiarCodigo(texto) {
  let c = String(texto || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length === 10 && c.startsWith("NS")) c = c.slice(2);
  return c
    .replace(/[0O]/g, "Q") // 0 y O no existen en el alfabeto; se leen como Q
    .replace(/[1IL]/g, "J"); // 1, I y L no existen; se leen como J
}

/** Devuelve el código con formato NS-XXXX-XXXX o null si no tiene 8 caracteres. */
export function formatearCodigo(texto) {
  const c = limpiarCodigo(texto);
  if (c.length !== 8) return null;
  return `NS-${c.slice(0, 4)}-${c.slice(4)}`;
}

/** true si el código existe en el formato correcto y su verificador coincide. */
export function esCodigoValido(texto) {
  const c = limpiarCodigo(texto);
  if (c.length !== 8) return false;
  return verificador(c.slice(0, 7)) === c[7];
}

/** Genera un código válido nuevo. En producción esto lo hace el script de impresión. */
export function generarCodigo(aleatorio = Math.random) {
  let cuerpo = "";
  for (let i = 0; i < 7; i++) cuerpo += ALFABETO[Math.floor(aleatorio() * BASE)];
  const c = cuerpo + verificador(cuerpo);
  return `NS-${c.slice(0, 4)}-${c.slice(4)}`;
}

/** Cupón de premio: NSR- + 6 caracteres. */
export function generarCupon(aleatorio = Math.random) {
  let s = "";
  for (let i = 0; i < 6; i++) s += ALFABETO[Math.floor(aleatorio() * BASE)];
  return `NSR-${s}`;
}

export const SELLOS_PARA_PREMIO = 10;
