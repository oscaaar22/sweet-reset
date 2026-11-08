import { Pause } from "lucide-react";
import { useReproductor, reproductor } from "../lib/reproductor.js";
import { SONIDOS } from "../lib/contenido.js";

export default function MiniReproductor({ vista, ir }) {
  const r = useReproductor();
  if (!r.id || vista === "escucha") return null;
  const sonido = SONIDOS.find((s) => s.id === r.id);
  return (
    <div
      className="fixed inset-x-0 z-20 mx-auto max-w-[560px]"
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 74px)",
        paddingLeft: "max(16px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(16px, env(safe-area-inset-right, 0px))",
      }}
    >
      <div className="flex items-center gap-3 rounded-2xl bg-noche/90 px-4 py-2.5 text-white shadow-nube backdrop-blur">
        <span className="flex h-6 items-end gap-[3px]" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className="w-[3px] animate-latido rounded-full bg-rosa-200" style={{ height: `${10 + (i % 2) * 8}px`, animationDelay: `${i * 0.2}s` }} />
          ))}
        </span>
        <button type="button" onClick={() => ir("escucha")} className="min-w-0 flex-1 text-left">
          <span className="block truncate text-sm font-bold">{sonido?.nombre}</span>
          <span className="block text-[11px] text-white/70">Sonando · toca para abrir</span>
        </button>
        <button
          type="button"
          onClick={() => reproductor.detener()}
          className="grid h-9 w-9 place-items-center rounded-full bg-white/15 hover:bg-white/25"
          aria-label="Detener sonido"
        >
          <Pause size={18} />
        </button>
      </div>
    </div>
  );
}
