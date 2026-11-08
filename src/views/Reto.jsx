import { useEffect, useRef, useState } from "react";
import { Sparkles, Check, Wand2, Quote, Clock, Loader2, X, RotateCcw } from "lucide-react";
import Encabezado, { AvisoBienestar } from "../components/Encabezado.jsx";
import { useEstado, calcularRacha } from "../lib/store.jsx";
import { CATEGORIAS, claveDia, retoDelDia } from "../lib/contenido.js";
import { generarConClaude, claudeDisponible } from "../lib/api.js";

const TONO_CAT = {
  cielo: "bg-cielo-100 text-[#4A6FB0]",
  miel: "bg-miel-100 text-miel-500",
  lavanda: "bg-lavanda-100 text-lavanda-600",
  rosa: "bg-rosa-100 text-rosa-400",
  menta: "bg-menta-100 text-menta-500",
};
const DIAS = ["D", "L", "M", "M", "J", "V", "S"];

function fechaLarga(d = new Date()) {
  const t = d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export default function Reto({ ir }) {
  const { estado, guardarReto } = useEstado();
  const hoy = claveDia();
  const guardado = estado.retos[hoy];
  const reto = guardado?.titulo ? guardado : retoDelDia();
  const [volteada, setVolteada] = useState(Boolean(guardado?.visto));
  const [cargando, setCargando] = useState(null); // "reto" | "frase" | null
  const [aviso, setAviso] = useState("");
  const [frase, setFrase] = useState(null);
  const [categoria, setCategoria] = useState("");
  const [hayClaude, setHayClaude] = useState(null);
  const [festejo, setFestejo] = useState(false);
  const ctl = useRef(null);

  useEffect(() => {
    let vivo = true;
    claudeDisponible().then((v) => vivo && setHayClaude(v));
    return () => { vivo = false; ctl.current?.abort(); };
  }, []);

  const descubrir = () => {
    setVolteada(true);
    if (!guardado?.visto) guardarReto({ ...reto, visto: true });
  };

  const completar = () => {
    guardarReto({ ...reto, visto: true, completado: true });
    setFestejo(true);
    setTimeout(() => setFestejo(false), 2200);
  };

  const pedir = async (tipo) => {
    ctl.current?.abort();
    ctl.current = new AbortController();
    setCargando(tipo);
    setAviso("");
    try {
      const evitar = tipo === "frase" ? (frase ? [frase.texto] : []) : [reto.titulo];
      const nuevo = await generarConClaude({ tipo, categoria: categoria || undefined, evitar, signal: ctl.current.signal });
      if (nuevo.aviso) setAviso(nuevo.aviso);
      if (tipo === "frase") setFrase(nuevo);
      else {
        guardarReto({ ...nuevo, visto: true, completado: false });
        setVolteada(true);
      }
    } catch (e) {
      if (e?.name !== "AbortError") setAviso("No se pudo generar. Intenta de nuevo.");
    } finally {
      setCargando(null);
    }
  };

  const cancelar = () => { ctl.current?.abort(); setCargando(null); };

  // Últimos 7 días
  const semana = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return { d, hecho: Boolean(estado.retos[claveDia(d)]?.completado), esHoy: i === 6 };
  });
  const racha = calcularRacha(estado.retos);
  const cat = CATEGORIAS[reto.categoria] || CATEGORIAS.relajacion;

  return (
    <div>
      <Encabezado ir={ir} titulo="Mi reto" subtitulo={fechaLarga()} />

      <div className="voltear">
        <div className={`voltear-interior relative grid ${volteada ? "volteada" : ""}`}>
          <button
            type="button"
            onClick={descubrir}
            className="cara col-start-1 row-start-1 flex min-h-[300px] flex-col items-center justify-center gap-3 overflow-hidden rounded-[26px] bg-gradient-to-br from-lavanda-300 via-[#D4B8EE] to-rosa-200 p-8 text-center text-white shadow-nube focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavanda-300"
            aria-hidden={volteada}
            tabIndex={volteada ? -1 : 0}
          >
            <span className="grid h-16 w-16 animate-flotar place-items-center rounded-2xl bg-white/25 backdrop-blur">
              <Sparkles size={30} />
            </span>
            <span className="font-display text-[26px] font-semibold drop-shadow-sm">Tu tarjeta sorpresa</span>
            <span className="text-[15px] font-semibold text-white/90">Toca para descubrir tu reto de hoy</span>
          </button>

          <div className="cara cara-atras col-start-1 row-start-1 flex min-h-[300px] flex-col rounded-[26px] bg-white p-6 shadow-nube ring-1 ring-lavanda-200" aria-hidden={!volteada}>
            <div className="flex items-center justify-between gap-2">
              <span className={`chip ${TONO_CAT[cat.color]}`}>{cat.nombre}</span>
              <span className="chip bg-lavanda-50 text-noche/70"><Clock size={12} /> {reto.minutos} min</span>
            </div>
            <h2 className="mt-5 font-display text-[27px] font-semibold leading-tight text-noche">{reto.titulo}</h2>
            <p className="mt-2 text-[16px] leading-relaxed text-noche/80">{reto.texto}</p>
            {reto.fuente === "claude" && (
              <p className="mt-3 inline-flex items-center gap-1 text-[12px] font-bold text-lavanda-500"><Wand2 size={13} /> Creado con Claude para ti</p>
            )}
            <div className="mt-auto pt-6">
              {guardado?.completado ? (
                <p className="flex items-center justify-center gap-2 rounded-full bg-menta-100 py-3 font-extrabold text-menta-500">
                  <Check size={18} /> ¡Reto cumplido!
                </p>
              ) : (
                <button type="button" onClick={completar} className="boton-primario w-full" tabIndex={volteada ? 0 : -1}>
                  <Check size={18} /> ¡Lo hice!
                </button>
              )}
            </div>
            {festejo && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[26px]" aria-hidden="true">
                {Array.from({ length: 14 }).map((_, i) => (
                  <Sparkles
                    key={i}
                    size={14 + (i % 3) * 6}
                    className="absolute animate-sello text-rosa-300"
                    style={{ left: `${(i * 37) % 92}%`, top: `${(i * 53) % 80}%`, animationDelay: `${(i % 5) * 0.08}s` }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <section className="tarjeta mt-5 p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold">¿Quieres otro?</h2>
          {hayClaude !== null && (
            <span className={`chip ${hayClaude ? "bg-lavanda-100 text-lavanda-600" : "bg-noche/5 text-noche/60"}`}>
              <Wand2 size={12} /> {hayClaude ? "Claude conectado" : "Modo sin conexión"}
            </span>
          )}
        </div>
        <p className="mt-1 text-[14px] text-noche/65">Claude crea un reto nuevo o una frase para ti en segundos.</p>

        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Categoría del reto">
          {[["", "Sorpréndeme"], ...Object.entries(CATEGORIAS).map(([k, v]) => [k, v.nombre])].map(([k, nombre]) => (
            <button
              key={k || "todas"}
              type="button"
              role="radio"
              aria-checked={categoria === k}
              onClick={() => setCategoria(k)}
              className={`chip ring-1 transition ${categoria === k ? "bg-noche text-white ring-noche" : "bg-white text-noche/70 ring-lavanda-200 hover:bg-lavanda-50"}`}
            >
              {nombre}
            </button>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => pedir("reto")} disabled={Boolean(cargando)} className="boton-primario">
            {cargando === "reto" ? <Loader2 size={18} className="animate-spin" /> : <Wand2 size={18} />}
            {cargando === "reto" ? "Claude está pensando…" : "Generar reto con Claude"}
          </button>
          <button type="button" onClick={() => pedir("frase")} disabled={Boolean(cargando)} className="boton-suave">
            {cargando === "frase" ? <Loader2 size={18} className="animate-spin" /> : <Quote size={18} />}
            {cargando === "frase" ? "Escribiendo…" : "Frase de motivación"}
          </button>
        </div>
        {cargando && (
          <button type="button" onClick={cancelar} className="mx-auto mt-2 flex items-center gap-1 text-[13px] font-bold text-noche/60 hover:text-noche">
            <X size={14} /> Cancelar
          </button>
        )}
        {aviso && <p className="mt-3 rounded-xl bg-miel-100 px-3 py-2 text-[13px] font-semibold text-[#8A5D0F]" role="status">{aviso}</p>}

        {frase && (
          <figure className="mt-4 rounded-2xl bg-gradient-to-br from-rosa-50 to-lavanda-50 p-5 ring-1 ring-rosa-200/70">
            <Quote size={20} className="text-rosa-300" aria-hidden="true" />
            <blockquote className="mt-1 font-display text-[20px] leading-snug text-noche">{frase.texto}</blockquote>
            <figcaption className="mt-2 flex items-center justify-between text-[12px] font-bold text-noche/55">
              {frase.fuente === "claude" ? "Escrita por Claude" : "De nuestra colección"}
              <button type="button" onClick={() => pedir("frase")} disabled={Boolean(cargando)} className="inline-flex items-center gap-1 text-lavanda-600"><RotateCcw size={13} /> Otra</button>
            </figcaption>
          </figure>
        )}
      </section>

      <section className="tarjeta mt-5 p-5" aria-label="Tu semana">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-xl font-semibold">Tu semana</h2>
          <p className="text-[13px] font-bold text-noche/60 tabular-nums">Racha: {racha} {racha === 1 ? "día" : "días"}</p>
        </div>
        <ol className="mt-4 grid grid-cols-7 gap-1.5 text-center">
          {semana.map(({ d, hecho, esHoy }) => (
            <li key={claveDia(d)} className="flex flex-col items-center gap-1.5">
              <span className={`text-[11px] font-bold ${esHoy ? "text-lavanda-600" : "text-noche/50"}`}>{DIAS[d.getDay()]}</span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-bold tabular-nums ${
                  hecho ? "bg-lavanda-500 text-white" : esHoy ? "bg-white text-lavanda-600 ring-2 ring-lavanda-300" : "bg-noche/5 text-noche/45"
                }`}
              >
                {hecho ? <Check size={15} /> : d.getDate()}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <AvisoBienestar />
    </div>
  );
}
