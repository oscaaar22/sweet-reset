import { useEffect, useState } from "react";
import { Play, Pause, Volume2, CloudRain, Waves, Trees, Moon, Timer } from "lucide-react";
import Encabezado, { AvisoBienestar } from "../components/Encabezado.jsx";
import { SONIDOS } from "../lib/contenido.js";
import { useReproductor, reproductor } from "../lib/reproductor.js";

const ICONOS = { lluvia: CloudRain, olas: Waves, bosque: Trees, estrellas: Moon };
const TONOS = {
  cielo: "from-cielo-200 to-cielo-100 text-[#4A6FB0]",
  lavanda: "from-lavanda-200 to-lavanda-100 text-lavanda-600",
  menta: "from-menta-300/70 to-menta-100 text-menta-500",
  rosa: "from-rosa-200 to-rosa-100 text-rosa-400",
};
const DURACIONES = [5, 10, 15, 30];

function mmss(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export default function Escucha({ ir }) {
  const r = useReproductor();
  const [ahora, setAhora] = useState(Date.now());
  const [seleccion, setSeleccion] = useState(r.id || "lluvia");

  useEffect(() => {
    if (!r.id) return;
    const t = setInterval(() => setAhora(Date.now()), 500);
    return () => clearInterval(t);
  }, [r.id]);

  const activo = SONIDOS.find((s) => s.id === (r.id || seleccion));
  const Icono = ICONOS[activo.id];
  const sonando = Boolean(r.id);
  const total = r.duracionMin * 60000;
  const transcurrido = sonando ? ahora - r.inicio : 0;
  const progreso = sonando && total ? Math.min(1, transcurrido / total) : 0;

  const alternar = () => (sonando ? reproductor.detener() : reproductor.reproducir(seleccion));

  return (
    <div>
      <Encabezado ir={ir} titulo="Escucha" subtitulo="Ponte audífonos, cierra los ojos y elige un sonido." />

      <section className={`tarjeta overflow-hidden bg-gradient-to-b p-6 text-center ${TONOS[activo.color]}`} aria-live="polite">
        <div className="relative mx-auto grid h-44 w-44 place-items-center">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className={`absolute inset-0 rounded-full bg-white/50 ${sonando ? "animate-ping" : ""}`}
              style={{ animationDuration: `${3.2 + i}s`, animationDelay: `${i * 0.9}s`, transform: `scale(${0.7 + i * 0.15})`, opacity: sonando ? 0.35 : 0.25 - i * 0.06 }}
            />
          ))}
          <span className={`relative grid h-28 w-28 place-items-center rounded-full bg-white shadow-nube ${sonando ? "animate-latido" : ""}`}>
            <Icono size={44} strokeWidth={1.6} />
          </span>
        </div>
        <h2 className="mt-4 font-display text-2xl font-semibold text-noche">{activo.nombre}</h2>
        <p className="text-sm text-noche/65">{activo.descripcion}</p>

        <div className="mx-auto mt-5 max-w-xs">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progreso * 100)} aria-label="Tiempo de la sesión">
            <div className="h-full rounded-full bg-lavanda-500 transition-[width] duration-500" style={{ width: `${progreso * 100}%` }} />
          </div>
          <div className="mt-1 flex justify-between text-[11px] font-bold tabular-nums text-noche/60">
            <span>{mmss(transcurrido)}</span>
            <span>{r.duracionMin ? mmss(total) : "sin límite"}</span>
          </div>
        </div>

        <button type="button" onClick={alternar} className="boton-primario mt-4 h-14 w-14 !p-0" aria-label={sonando ? "Pausar" : "Reproducir"}>
          {sonando ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
        </button>
        {r.error && <p className="mt-3 text-sm font-bold text-rosa-400">{r.error}</p>}

        <div className="mx-auto mt-5 flex max-w-xs items-center gap-3">
          <Volume2 size={18} className="shrink-0 text-noche/60" aria-hidden="true" />
          <label htmlFor="volumen" className="sr-only">Volumen</label>
          <input id="volumen" type="range" min="0" max="1" step="0.01" value={r.volumen} onChange={(e) => reproductor.volumen(Number(e.target.value))} className="w-full" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2" role="group" aria-label="Duración">
          <Timer size={16} className="text-noche/60" aria-hidden="true" />
          {DURACIONES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => reproductor.duracion(d)}
              aria-pressed={r.duracionMin === d}
              className={`chip ring-1 transition ${r.duracionMin === d ? "bg-noche text-white ring-noche" : "bg-white/70 text-noche/70 ring-white hover:bg-white"}`}
            >
              {d} min
            </button>
          ))}
        </div>
      </section>

      <h2 className="mb-3 mt-7 font-display text-xl font-semibold">Sonidos</h2>
      <ul className="grid gap-3">
        {SONIDOS.map((s) => {
          const I = ICONOS[s.id];
          const esteSuena = r.id === s.id;
          const elegido = (r.id || seleccion) === s.id;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => {
                  setSeleccion(s.id);
                  if (esteSuena) reproductor.detener();
                  else reproductor.reproducir(s.id);
                }}
                className={`tarjeta flex w-full items-center gap-4 p-3.5 text-left transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavanda-300 ${elegido ? "ring-2 ring-lavanda-400" : "hover:bg-white"}`}
              >
                <span className={`grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br ${TONOS[s.color]}`}>
                  <I size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold">{s.nombre}</span>
                  <span className="block text-[13px] text-noche/60">{s.descripcion}</span>
                </span>
                <span className={`grid h-9 w-9 place-items-center rounded-full ${esteSuena ? "bg-lavanda-500 text-white" : "bg-lavanda-50 text-lavanda-500"}`} aria-hidden="true">
                  {esteSuena ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-center text-[12px] text-noche/55">Los sonidos se generan en tu celular en tiempo real; no gastan datos.</p>
      <AvisoBienestar />
    </div>
  );
}
