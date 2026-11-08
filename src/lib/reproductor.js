// Estado global del reproductor para que el sonido siga aunque cambies de sección.
import { useSyncExternalStore } from "react";
import { paisaje } from "./audio.js";

let estado = { id: null, inicio: 0, duracionMin: 10, volumen: 0.7, error: null };
const oyentes = new Set();
let temporizador = null;
let alTerminar = null;

function emitir(parcial) {
  estado = { ...estado, ...parcial };
  oyentes.forEach((f) => f());
}

export const reproductor = {
  suscribir(f) { oyentes.add(f); return () => oyentes.delete(f); },
  obtener() { return estado; },
  /** callback(minutos) cuando termina o se detiene una sesión */
  alTerminar(fn) { alTerminar = fn; },
  reproducir(id, duracionMin = estado.duracionMin) {
    try {
      paisaje.ajustarVolumen(estado.volumen);
      this._cerrarSesion();
      paisaje.reproducir(id);
      clearTimeout(temporizador);
      if (duracionMin) temporizador = setTimeout(() => this.detener(), duracionMin * 60000);
      emitir({ id, inicio: Date.now(), duracionMin, error: null });
    } catch (e) {
      emitir({ error: e.message || "No se pudo reproducir el sonido." });
    }
  },
  detener() {
    clearTimeout(temporizador);
    this._cerrarSesion();
    paisaje.detener();
    emitir({ id: null, inicio: 0 });
  },
  _cerrarSesion() {
    if (estado.id && estado.inicio) {
      const min = Math.floor((Date.now() - estado.inicio) / 60000);
      if (min > 0 && alTerminar) alTerminar(min);
    }
  },
  duracion(min) {
    emitir({ duracionMin: min });
    if (estado.id) {
      clearTimeout(temporizador);
      if (min) {
        const restante = Math.max(1000, estado.inicio + min * 60000 - Date.now());
        temporizador = setTimeout(() => this.detener(), restante);
      }
    }
  },
  volumen(v) { paisaje.ajustarVolumen(v); emitir({ volumen: v }); },
};

export function useReproductor() {
  return useSyncExternalStore(reproductor.suscribir, reproductor.obtener, reproductor.obtener);
}
