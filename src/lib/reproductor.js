// Estado global del reproductor para que el sonido siga aunque cambies de sección.
import { useSyncExternalStore } from "react";
import { paisaje } from "./audio.js";

let estado = { id: null, inicio: 0, duracionMin: 10, volumen: 0.7, error: null, cargando: false };
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
      clearTimeout(temporizador);
      emitir({ id, inicio: Date.now(), duracionMin, error: null, cargando: true });
      paisaje
        .reproducir(id)
        .then(() => {
          if (estado.id !== id) return;
          emitir({ cargando: false, inicio: Date.now() });
          if (duracionMin) temporizador = setTimeout(() => this.detener(), duracionMin * 60000);
        })
        .catch((e) => {
          if (estado.id === id) emitir({ id: null, inicio: 0, cargando: false, error: e.message || "No se pudo reproducir el sonido." });
        });
    } catch (e) {
      emitir({ id: null, cargando: false, error: e.message || "No se pudo reproducir el sonido." });
    }
  },
  precargar(id) { paisaje.precargar(id); },
  detener() {
    clearTimeout(temporizador);
    this._cerrarSesion();
    paisaje.detener();
    emitir({ id: null, inicio: 0, cargando: false });
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
