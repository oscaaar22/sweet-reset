import { useEffect, useRef, useState } from "react";
import { Play, Square, Bell, BellOff, Check } from "lucide-react";
import Encabezado, { AvisoBienestar } from "../components/Encabezado.jsx";
import { PATRONES_RESPIRACION } from "../lib/contenido.js";
import { campana } from "../lib/audio.js";
import { useEstado } from "../lib/store.jsx";

const TEXTO_FASE = { inhala: "Inhala", sostén: "Sostén", exhala: "Exhala" };
const RONDAS = [3, 5, 8];

export default function Respira({ ir }) {
  const { sumarPausa } = useEstado();
  const [patronId, setPatronId] = useState("caja");
  const [rondasMeta, setRondasMeta] = useState(5);
  const [conSonido, setConSonido] = useState(true);
  const [activo, setActivo] = useState(false);
  const [fase, setFase] = useState(0);
  const [ronda, setRonda] = useState(0);
  const [restante, setRestante] = useState(0);
  const [terminado, setTerminado] = useState(false);
  const fin = useRef(0);

  const patron = PATRONES_RESPIRACION.find((p) => p.id === patronId);
  const actual = patron.fases[fase];

  // Escala del círculo según la fase: crece al inhalar, se queda al sostener, baja al exhalar.
  const escalaDe = (f, idx) => {
    if (f.tipo === "inhala") return 1;
    if (f.tipo === "exhala") return 0.55;
    const previa = patron.fases[(idx - 1 + patron.fases.length) % patron.fases.length];
    return previa.tipo === "inhala" ? 1 : 0.55;
  };
  const escala = activo ? escalaDe(actual, fase) : 0.62;

  useEffect(() => {
    if (!activo) return;
    fin.current = Date.now() + actual.seg * 1000;
    setRestante(actual.seg);
    if (conSonido) campana(actual.tipo === "inhala" ? 528 : actual.tipo === "exhala" ? 396 : 462, 0.05);
    try { navigator.vibrate?.(actual.tipo === "sostén" ? 20 : 45); } catch { /* sin vibración */ }
    const tick = setInterval(() => {
      const r = Math.ceil((fin.current - Date.now()) / 1000);
      if (r <= 0) {
        clearInterval(tick);
        const siguiente = (fase + 1) % patron.fases.length;
        if (siguiente === 0) {
          const hechas = ronda + 1;
          if (hechas >= rondasMeta) {
            setActivo(false);
            setTerminado(true);
            setRonda(hechas);
            sumarPausa(1);
            if (conSonido) campana(660, 0.05);
            return;
          }
          setRonda(hechas);
        }
        setFase(siguiente);
      } else setRestante(r);
    }, 200);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo, fase, ronda]);

  const empezar = () => {
    setTerminado(false);
    setFase(0);
    setRonda(0);
    setActivo(true);
  };
  const detener = () => {
    setActivo(false);
    setFase(0);
  };

  const duracionTotal = patron.fases.reduce((a, f) => a + f.seg, 0) * rondasMeta;

  return (
    <div>
      <Encabezado ir={ir} titulo="Respira" subtitulo="Sigue el círculo. Inhala por la nariz y exhala despacio por la boca." />

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1" role="radiogroup" aria-label="Tipo de respiración">
        {PATRONES_RESPIRACION.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.id === patronId}
            disabled={activo}
            onClick={() => { setPatronId(p.id); setTerminado(false); }}
            className={`shrink-0 rounded-2xl px-4 py-2.5 text-left ring-1 transition disabled:opacity-60 ${
              p.id === patronId ? "bg-noche text-white ring-noche" : "bg-white/70 text-noche ring-lavanda-200 hover:bg-white"
            }`}
          >
            <span className="block text-sm font-extrabold">{p.nombre}</span>
            <span className={`block text-[11.5px] ${p.id === patronId ? "text-white/75" : "text-noche/60"}`}>{p.para}</span>
          </button>
        ))}
      </div>

      <section className="tarjeta relative overflow-hidden bg-gradient-to-b from-menta-100 via-white to-lavanda-50 px-6 pb-6 pt-8 text-center">
        <div className="relative mx-auto grid aspect-square w-full max-w-[290px] place-items-center">
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-menta-300/70" aria-hidden="true" />
          <div
            className="absolute inset-[6%] rounded-full bg-gradient-to-br from-menta-300 via-[#B9DDEB] to-lavanda-300 shadow-[0_20px_60px_-15px_rgba(78,158,124,.55)]"
            style={{
              transform: `scale(${escala})`,
              transition: `transform ${activo ? actual.seg : 0.6}s ${actual?.tipo === "sostén" ? "linear" : "cubic-bezier(.45,.05,.35,1)"}`,
            }}
            aria-hidden="true"
          />
          <div className="relative" aria-live="polite">
            {activo ? (
              <>
                <p className="font-display text-[30px] font-semibold text-noche">{TEXTO_FASE[actual.tipo]}</p>
                <p className="font-display text-5xl font-semibold tabular-nums text-noche/80">{restante}</p>
              </>
            ) : terminado ? (
              <>
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-menta-500 shadow-suave"><Check /></span>
                <p className="mt-2 font-display text-2xl font-semibold text-noche">Muy bien</p>
                <p className="text-sm text-noche/70">Terminaste {ronda} rondas.</p>
              </>
            ) : (
              <>
                <p className="font-display text-2xl font-semibold text-noche">{patron.nombre}</p>
                <p className="mt-1 text-sm text-noche/70">{patron.fases.map((f) => `${TEXTO_FASE[f.tipo].toLowerCase()} ${f.seg}`).join(" · ")}</p>
              </>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-1.5" aria-label={`Ronda ${Math.min(ronda + (activo ? 1 : 0), rondasMeta)} de ${rondasMeta}`}>
          {Array.from({ length: rondasMeta }).map((_, i) => (
            <span key={i} className={`h-2 rounded-full transition-all ${i < ronda ? "w-6 bg-menta-500" : i === ronda && activo ? "w-6 bg-menta-300" : "w-2 bg-noche/15"}`} />
          ))}
        </div>

        <div className="mt-5 flex items-center justify-center gap-3">
          {activo ? (
            <button type="button" onClick={detener} className="boton-suave"><Square size={16} /> Detener</button>
          ) : (
            <button type="button" onClick={empezar} className="boton-primario"><Play size={18} /> {terminado ? "Otra vez" : "Empezar"}</button>
          )}
          <button
            type="button"
            onClick={() => setConSonido((v) => !v)}
            aria-pressed={conSonido}
            aria-label={conSonido ? "Silenciar campana" : "Activar campana"}
            className="grid h-12 w-12 place-items-center rounded-full bg-white text-lavanda-600 ring-1 ring-lavanda-200"
          >
            {conSonido ? <Bell size={18} /> : <BellOff size={18} />}
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-2 text-[13px] text-noche/65" role="group" aria-label="Número de rondas">
          Rondas:
          {RONDAS.map((n) => (
            <button
              key={n}
              type="button"
              disabled={activo}
              onClick={() => setRondasMeta(n)}
              aria-pressed={rondasMeta === n}
              className={`chip ring-1 ${rondasMeta === n ? "bg-lavanda-500 text-white ring-lavanda-500" : "bg-white text-noche/70 ring-lavanda-200"}`}
            >
              {n}
            </button>
          ))}
          <span className="tabular-nums">≈ {Math.round(duracionTotal / 6) / 10} min</span>
        </div>
      </section>

      <p className="mt-5 text-center text-[13px] text-noche/60">
        Si sientes mareo, vuelve a respirar normal. No hay prisa.
      </p>
      <AvisoBienestar />
    </div>
  );
}
