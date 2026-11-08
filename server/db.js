// Almacenamiento de Sweet Reset.
// - Con DATABASE_URL (PostgreSQL, p. ej. Render): los datos sobreviven reinicios y despliegues.
// - Sin DATABASE_URL: archivo JSON en data/ (solo para pruebas en tu computadora).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { SELLOS_PARA_PREMIO, generarCupon } from "../src/lib/codes.js";
import crypto from "node:crypto";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, "..");
const aleatorio = () => crypto.randomInt(0, 2 ** 32) / 2 ** 32;

// ---------------------------------------------------------------- PostgreSQL
async function crearPostgres(url) {
  const { default: pg } = await import("pg");
  const local = /localhost|127\.0\.0\.1|\.internal|^postgres(ql)?:\/\/[^@]*@[^./:]+[:/]/.test(url);
  const pool = new pg.Pool({
    connectionString: url,
    ssl: process.env.PGSSL === "no" || local ? false : { rejectUnauthorized: false },
    max: 5,
  });
  await pool.query(`
    CREATE TABLE IF NOT EXISTS codigos_emitidos (
      codigo TEXT PRIMARY KEY,
      creado TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS cupones (
      cupon TEXT PRIMARY KEY,
      dispositivo TEXT NOT NULL,
      creado TIMESTAMPTZ NOT NULL DEFAULT now(),
      canjeado TIMESTAMPTZ
    );
    CREATE TABLE IF NOT EXISTS codigos_usados (
      codigo TEXT PRIMARY KEY,
      dispositivo TEXT NOT NULL,
      fecha TIMESTAMPTZ NOT NULL DEFAULT now(),
      cupon TEXT REFERENCES cupones(cupon)
    );
    CREATE INDEX IF NOT EXISTS codigos_usados_disp ON codigos_usados (dispositivo) WHERE cupon IS NULL;
  `);

  return {
    tipo: "postgresql",
    async hayEmitidos() {
      const r = await pool.query("SELECT EXISTS (SELECT 1 FROM codigos_emitidos) AS hay");
      return r.rows[0].hay;
    },
    async esEmitido(codigo) {
      const r = await pool.query("SELECT 1 FROM codigos_emitidos WHERE codigo = $1", [codigo]);
      return r.rowCount > 0;
    },
    async agregarEmitidos(codigos) {
      const r = await pool.query(
        "INSERT INTO codigos_emitidos (codigo) SELECT unnest($1::text[]) ON CONFLICT DO NOTHING",
        [codigos]
      );
      return r.rowCount;
    },
    // Toda la operación va en una transacción: dos personas no pueden usar el mismo código
    // y el cupón se emite una sola vez aunque lleguen dos registros al mismo tiempo.
    async registrar(codigo, dispositivo) {
      const c = await pool.connect();
      try {
        await c.query("BEGIN");
        await c.query("SELECT pg_advisory_xact_lock(hashtext($1))", [dispositivo]);
        const ins = await c.query(
          "INSERT INTO codigos_usados (codigo, dispositivo) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [codigo, dispositivo]
        );
        if (ins.rowCount === 0) {
          const previo = await c.query("SELECT dispositivo FROM codigos_usados WHERE codigo = $1", [codigo]);
          await c.query("ROLLBACK");
          return { ok: false, motivo: previo.rows[0]?.dispositivo === dispositivo ? "repetido" : "usado" };
        }
        const pend = await c.query(
          "SELECT codigo FROM codigos_usados WHERE dispositivo = $1 AND cupon IS NULL ORDER BY fecha, codigo",
          [dispositivo]
        );
        let cupon = null;
        if (pend.rowCount >= SELLOS_PARA_PREMIO) {
          const lote = pend.rows.slice(0, SELLOS_PARA_PREMIO).map((r) => r.codigo);
          for (;;) {
            cupon = generarCupon(aleatorio);
            const r = await c.query(
              "INSERT INTO cupones (cupon, dispositivo) VALUES ($1, $2) ON CONFLICT DO NOTHING",
              [cupon, dispositivo]
            );
            if (r.rowCount) break;
          }
          await c.query("UPDATE codigos_usados SET cupon = $1 WHERE codigo = ANY($2::text[])", [cupon, lote]);
        }
        await c.query("COMMIT");
        const sellos = cupon ? pend.rowCount - SELLOS_PARA_PREMIO : pend.rowCount;
        return { ok: true, sellos, premio: Boolean(cupon), cupon };
      } catch (e) {
        await c.query("ROLLBACK").catch(() => {});
        throw e;
      } finally {
        c.release();
      }
    },
    async consultarCupon(cupon) {
      const r = await pool.query("SELECT cupon, creado, canjeado FROM cupones WHERE cupon = $1", [cupon]);
      return r.rows[0] || null;
    },
    async canjearCupon(cupon) {
      const r = await pool.query(
        "UPDATE cupones SET canjeado = now() WHERE cupon = $1 AND canjeado IS NULL RETURNING cupon, creado, canjeado",
        [cupon]
      );
      if (r.rowCount) return { ok: true, cupon: r.rows[0] };
      const existe = await this.consultarCupon(cupon);
      return existe ? { ok: false, motivo: "canjeado", cupon: existe } : { ok: false, motivo: "no-existe" };
    },
    async resumen() {
      const r = await pool.query(`SELECT
        (SELECT count(*) FROM codigos_emitidos)::int AS emitidos,
        (SELECT count(*) FROM codigos_usados)::int AS registrados,
        (SELECT count(*) FROM cupones)::int AS cupones,
        (SELECT count(*) FROM cupones WHERE canjeado IS NOT NULL)::int AS canjeados`);
      return r.rows[0];
    },
    cerrar: () => pool.end(),
  };
}

// ---------------------------------------------------------------- Archivo JSON (pruebas)
function crearArchivo() {
  const archivo = path.join(raiz, "data", "sweet-reset.json");
  const txtEmitidos = path.join(raiz, "data", "codigos-emitidos.txt");
  let d = { emitidos: [], usados: {}, cupones: {} };
  try { d = { ...d, ...JSON.parse(fs.readFileSync(archivo, "utf8")) }; } catch { /* primera vez */ }
  try {
    const extra = fs.readFileSync(txtEmitidos, "utf8").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    d.emitidos = [...new Set([...d.emitidos, ...extra])];
  } catch { /* sin lista */ }
  let emitidos = new Set(d.emitidos);
  const guardar = () => {
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    d.emitidos = [...emitidos];
    fs.writeFileSync(archivo, JSON.stringify(d, null, 2));
  };
  return {
    tipo: "archivo",
    async hayEmitidos() { return emitidos.size > 0; },
    async esEmitido(c) { return emitidos.has(c); },
    async agregarEmitidos(lista) {
      const antes = emitidos.size;
      lista.forEach((c) => emitidos.add(c));
      guardar();
      return emitidos.size - antes;
    },
    async registrar(codigo, dispositivo) {
      const previo = d.usados[codigo];
      if (previo) return { ok: false, motivo: previo.dispositivo === dispositivo ? "repetido" : "usado" };
      d.usados[codigo] = { dispositivo, fecha: new Date().toISOString(), cupon: null };
      const pend = Object.entries(d.usados).filter(([, u]) => u.dispositivo === dispositivo && !u.cupon);
      let cupon = null;
      if (pend.length >= SELLOS_PARA_PREMIO) {
        do cupon = generarCupon(aleatorio); while (d.cupones[cupon]);
        d.cupones[cupon] = { cupon, dispositivo, creado: new Date().toISOString(), canjeado: null };
        pend.slice(0, SELLOS_PARA_PREMIO).forEach(([, u]) => (u.cupon = cupon));
      }
      guardar();
      return { ok: true, sellos: cupon ? pend.length - SELLOS_PARA_PREMIO : pend.length, premio: Boolean(cupon), cupon };
    },
    async consultarCupon(c) { return d.cupones[c] || null; },
    async canjearCupon(c) {
      const x = d.cupones[c];
      if (!x) return { ok: false, motivo: "no-existe" };
      if (x.canjeado) return { ok: false, motivo: "canjeado", cupon: x };
      x.canjeado = new Date().toISOString();
      guardar();
      return { ok: true, cupon: x };
    },
    async resumen() {
      const cs = Object.values(d.cupones);
      return { emitidos: emitidos.size, registrados: Object.keys(d.usados).length, cupones: cs.length, canjeados: cs.filter((x) => x.canjeado).length };
    },
    cerrar: async () => {},
  };
}

export async function abrirAlmacen() {
  const url = process.env.DATABASE_URL;
  return url ? crearPostgres(url) : crearArchivo();
}
