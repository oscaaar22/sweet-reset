import { useState } from "react";
import { Heart, Shuffle, Copy, Check, Send } from "lucide-react";
import { MENSAJES_LINDOS } from "../lib/contenido.js";

const PESTANAS = [
  { id: "ti", nombre: "Para ti" },
  { id: "alguien", nombre: "Para alguien" },
];
const FONDOS = [
  "from-rosa-200 via-[#F3D3EA] to-lavanda-200",
  "from-lavanda-200 via-[#D9CCF5] to-cielo-200",
  "from-menta-300/70 via-[#D5EEE6] to-cielo-100",
  "from-miel-300/70 via-[#FBE3C4] to-rosa-200",
];

function otroIndice(actual, total) {
  if (total < 2) return 0;
  let n = actual;
  while (n === actual) n = Math.floor(Math.random() * total);
  return n;
}

/** Baraja de tarjetas con mensajes lindos: para leer o para mandarle a alguien. */
export default function MensajesLindos() {
  const [tipo, setTipo] = useState("ti");
  const [indice, setIndice] = useState(() => Math.floor(Math.random() * MENSAJES_LINDOS.ti.length));
  const [vuelta, setVuelta] = useState(0);
  const [copiado, setCopiado] = useState(false);

  const lista = MENSAJES_LINDOS[tipo];
  const mensaje = lista[indice % lista.length];
  const textoCompartir = `${mensaje}\n\n— Sweet Reset by NutraSweets 🍬`;

  const cambiar = (nuevoTipo = tipo) => {
    const total = MENSAJES_LINDOS[nuevoTipo].length;
    setTipo(nuevoTipo);
    setIndice((i) => (nuevoTipo === tipo ? otroIndice(i, total) : Math.floor(Math.random() * total)));
    setVuelta((v) => v + 1);
    setCopiado(false);
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(textoCompartir);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      /* sin portapapeles: el texto se puede seleccionar a mano */
    }
  };

  const compartir = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ text: textoCompartir });
        return;
      } catch (e) {
        if (e?.name === "AbortError") return;
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(textoCompartir)}`, "_blank", "noopener");
  };

  return (
    <section aria-labelledby="mensajes-lindos" className="tarjeta p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <h2 id="mensajes-lindos" className="flex items-center gap-2 whitespace-nowrap font-display text-[22px] font-semibold">
          <Heart size={20} className="text-rosa-400" fill="currentColor" /> Mensajes lindos
        </h2>
        <div className="flex shrink-0 rounded-full bg-lavanda-50 p-1 ring-1 ring-lavanda-200" role="tablist" aria-label="Tipo de mensaje">
          {PESTANAS.map((p) => (
            <button
              key={p.id}
              type="button"
              role="tab"
              aria-selected={tipo === p.id}
              onClick={() => tipo !== p.id && cambiar(p.id)}
              className={`rounded-full px-3 py-1 text-[12.5px] font-bold transition ${tipo === p.id ? "bg-white text-lavanda-600 shadow-suave" : "text-noche/55"}`}
            >
              {p.nombre}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => cambiar()}
        key={vuelta}
        aria-label="Ver otro mensaje"
        className={`relative mt-4 grid min-h-[150px] w-full place-items-center overflow-hidden rounded-3xl bg-gradient-to-br px-6 py-7 text-center shadow-suave animate-entrar ${FONDOS[vuelta % FONDOS.length]}`}
      >
        <span className="absolute left-4 top-3 font-display text-5xl leading-none text-white/70" aria-hidden="true">“</span>
        <span className="relative font-display text-[21px] font-semibold leading-snug text-noche" aria-live="polite">{mensaje}</span>
        <span className="absolute bottom-2.5 right-4 text-[11px] font-bold uppercase tracking-[0.14em] text-noche/40">Toca para otro</span>
      </button>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <button type="button" onClick={() => cambiar()} className="boton-suave !px-2 text-[14px]">
          <Shuffle size={16} /> Otro
        </button>
        <button type="button" onClick={copiar} className="boton-suave !px-2 text-[14px]">
          {copiado ? <Check size={16} /> : <Copy size={16} />} {copiado ? "Listo" : "Copiar"}
        </button>
        <button type="button" onClick={compartir} className="boton-primario !px-2 text-[14px]">
          <Send size={16} /> Enviar
        </button>
      </div>
    </section>
  );
}
