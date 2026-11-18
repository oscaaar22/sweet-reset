// Sonidos de la sección Escucha.
// Son pistas MP3 de alta calidad (public/audio, generadas con scripts/generar-audios.py).
// Cada archivo es un bucle perfecto de P segundos más una cola que repite el inicio:
// el reproductor encima dos copias justo en esa cola, así el bucle nunca se corta.
import PERIODOS from "./audio-periodos.json";

const COLA = 1.5;
const BASE = `${import.meta.env.BASE_URL || "/"}audio/`;
const ADELANTO = 15; // segundos que se dejan programados por adelantado

function decodificar(ctx, datos) {
  // Safari viejo solo acepta la versión con callbacks.
  return new Promise((ok, mal) => {
    const p = ctx.decodeAudioData(datos, ok, mal);
    if (p && p.then) p.then(ok, mal);
  });
}

export class Paisaje {
  constructor() {
    this.ctx = null;
    this.maestro = null;
    this.volumen = 0.7;
    this.actual = null;
    this.buffers = new Map();
    this.fuentes = new Set();
    this.timer = null;
    this.turno = 0;
  }

  _asegurar() {
    // En iPhone, "playback" hace que se escuche aunque el interruptor de silencio esté activado.
    try {
      if (navigator.audioSession) navigator.audioSession.type = "playback";
    } catch {
      /* no disponible */
    }
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error("Tu navegador no puede reproducir audio.");
      this.ctx = new AC();
    }
    if (this.ctx.state !== "running") this.ctx.resume();
  }

  _cargar(id) {
    if (!this.buffers.has(id)) {
      const promesa = fetch(BASE + id + ".mp3")
        .then((r) => {
          if (!r.ok) throw new Error("No se pudo descargar el sonido.");
          return r.arrayBuffer();
        })
        .then((datos) => decodificar(this.ctx, datos))
        .catch((e) => {
          this.buffers.delete(id);
          throw e;
        });
      this.buffers.set(id, promesa);
    }
    return this.buffers.get(id);
  }

  /** Descarga en segundo plano para que el siguiente toque suene al instante. */
  precargar(id) {
    try {
      this._asegurar();
      this._cargar(id).catch(() => {});
    } catch {
      /* sin audio */
    }
  }

  async reproducir(id) {
    this._asegurar(); // dentro del toque del usuario, para que iPhone permita el audio
    this.detener(true);
    const turno = ++this.turno;
    this.actual = id;
    let buffer;
    try {
      buffer = await this._cargar(id);
    } catch {
      if (turno === this.turno) this.actual = null;
      throw new Error("No se pudo cargar el sonido. Revisa tu conexión e intenta de nuevo.");
    }
    if (turno !== this.turno) return; // el usuario ya eligió otro
    const ctx = this.ctx;
    if (ctx.state !== "running") await ctx.resume().catch(() => {});
    this.buffer = buffer;
    this.P = PERIODOS[id] || Math.max(5, buffer.duration - COLA);
    this.maestro = ctx.createGain();
    this.maestro.gain.setValueAtTime(0, ctx.currentTime);
    this.maestro.gain.linearRampToValueAtTime(this.volumen, ctx.currentTime + 2);
    this.maestro.connect(ctx.destination);
    this.t0 = ctx.currentTime + 0.05;
    this.k = 0;
    this._programar(turno);
  }

  _programar(turno) {
    if (turno !== this.turno || !this.maestro) return;
    const ctx = this.ctx;
    while (this.t0 + this.k * this.P < ctx.currentTime + ADELANTO) {
      const inicio = this.t0 + this.k * this.P;
      const fuente = ctx.createBufferSource();
      fuente.buffer = this.buffer;
      const g = ctx.createGain();
      // Cruce dentro de la cola: las dos copias suenan idénticas, así que no se nota.
      if (this.k > 0) {
        g.gain.setValueAtTime(0, ctx.currentTime);
        g.gain.setValueAtTime(0, inicio + 0.2);
        g.gain.linearRampToValueAtTime(1, inicio + 0.9);
      }
      g.gain.setValueAtTime(1, inicio + this.P + 0.2);
      g.gain.linearRampToValueAtTime(0, inicio + this.P + 0.9);
      fuente.connect(g);
      g.connect(this.maestro);
      fuente.start(inicio);
      fuente.stop(inicio + this.P + 1.0);
      this.fuentes.add(fuente);
      fuente.onended = () => {
        this.fuentes.delete(fuente);
        try { g.disconnect(); } catch { /* */ }
      };
      this.k++;
    }
    this.timer = setTimeout(() => this._programar(turno), 3000);
  }

  ajustarVolumen(v) {
    this.volumen = v;
    if (this.maestro && this.ctx) this.maestro.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  detener(inmediato = false) {
    this.turno++;
    clearTimeout(this.timer);
    const fuentes = [...this.fuentes];
    const maestro = this.maestro;
    this.fuentes.clear();
    this.maestro = null;
    this.actual = null;
    if (!maestro || !this.ctx) return;
    const t = this.ctx.currentTime;
    const espera = inmediato ? 0.25 : 1.2;
    maestro.gain.cancelScheduledValues(t);
    maestro.gain.setValueAtTime(maestro.gain.value, t);
    maestro.gain.linearRampToValueAtTime(0, t + espera);
    setTimeout(() => {
      fuentes.forEach((f) => { try { f.stop(); } catch { /* ya detenida */ } });
      try { maestro.disconnect(); } catch { /* */ }
    }, espera * 1000 + 60);
  }
}

export const paisaje = new Paisaje();

/** Un tono suave para marcar el cambio de fase en Respira. */
export function campana(frecuencia = 528, volumen = 0.06) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!campana.ctx) campana.ctx = new AC();
    const ctx = campana.ctx;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    // Pequeño cuenco: fundamental y dos parciales inarmónicos que se apagan más rápido.
    [[1, 1, 2.6], [2.76, 0.35, 1.4], [5.4, 0.12, 0.7]].forEach(([r, a, dur]) => {
      const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = frecuencia * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volumen * a, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + dur + 0.05);
    });
  } catch { /* sin audio */ }
}
