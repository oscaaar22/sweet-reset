import { Music2, Wind, Sparkles, Gift, ChevronRight, Flame, Clock, Heart } from "lucide-react";
import CieloEstrellado from "../components/CieloEstrellado.jsx";
import { Marca, AvisoBienestar } from "../components/Encabezado.jsx";
import { useEstado, calcularRacha } from "../lib/store.jsx";
import { claveDia, fraseDelDia, retoDelDia, CATEGORIAS } from "../lib/contenido.js";
import { SELLOS_PARA_PREMIO } from "../lib/codes.js";

function saludo(h = new Date().getHours()) {
  if (h < 6) return "Buenas noches";
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

export default function Inicio({ ir }) {
  const { estado } = useEstado();
  const hoy = claveDia();
  const retoHoy = estado.retos[hoy];
  const reto = retoHoy?.titulo ? retoHoy : retoDelDia();
  const racha = calcularRacha(estado.retos);
  const pendientes = estado.cupones.filter((c) => !c.canjeado).length;

  const secciones = [
    { id: "escucha", titulo: "Escucha", sub: "Música y sonidos", Icono: Music2, tono: "bg-cielo-100 text-[#4A6FB0]" },
    { id: "respira", titulo: "Respira", sub: "Pausas guiadas", Icono: Wind, tono: "bg-menta-100 text-menta-500" },
    { id: "reto", titulo: "Mi reto", sub: retoHoy?.completado ? "Completado hoy" : "Actividad del día", Icono: Sparkles, tono: "bg-rosa-100 text-rosa-400" },
    {
      id: "recompensas",
      titulo: "Recompensas",
      sub: pendientes ? "¡Tienes un premio!" : `${estado.sellos.length} de ${SELLOS_PARA_PREMIO} sellos`,
      Icono: Gift,
      tono: "bg-miel-100 text-miel-500",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Marca />
        <button type="button" onClick={() => ir("recompensas")} className="chip bg-white text-lavanda-600 shadow-suave ring-1 ring-lavanda-200">
          <Gift size={14} /> Tu espacio · {estado.sellos.length}/{SELLOS_PARA_PREMIO}
        </button>
      </div>

      <CieloEstrellado className="rounded-[28px] shadow-nube">
        <div className="flex min-h-[260px] flex-col justify-between p-6 sm:min-h-[300px]">
          <div>
            <p className="text-sm font-bold text-white/90 drop-shadow-sm">{saludo()}</p>
            <h1 className="mt-1 font-display text-[34px] font-semibold leading-[1.1] text-white drop-shadow-[0_2px_10px_rgba(70,50,130,.35)]">
              Un pequeño momento para ti.
            </h1>
          </div>
          <blockquote className="mt-8 max-w-[22rem] rounded-2xl bg-white/55 px-4 py-3 text-[15px] font-semibold text-noche backdrop-blur-md">
            “{fraseDelDia()}”
          </blockquote>
        </div>
      </CieloEstrellado>

      <section aria-labelledby="que-necesitas">
        <h2 id="que-necesitas" className="mb-3 font-display text-[22px] font-semibold">¿Qué necesitas hoy?</h2>
        <div className="grid grid-cols-2 gap-3">
          {secciones.map(({ id, titulo, sub, Icono, tono }) => (
            <button
              key={id}
              type="button"
              onClick={() => ir(id)}
              className="tarjeta group flex flex-col items-start gap-3 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-nube focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavanda-300"
            >
              <span className={`grid h-11 w-11 place-items-center rounded-2xl ${tono}`}>
                <Icono size={22} />
              </span>
              <span>
                <span className="block text-[17px] font-extrabold text-noche">{titulo}</span>
                <span className={`block text-[13px] ${id === "recompensas" && pendientes ? "font-bold text-rosa-400" : "text-noche/60"}`}>{sub}</span>
              </span>
            </button>
          ))}
        </div>
      </section>

      <button
        type="button"
        onClick={() => ir("reto")}
        className="tarjeta flex items-center gap-4 p-4 text-left transition hover:shadow-nube focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-lavanda-300"
      >
        <div className="grid h-14 w-12 shrink-0 rotate-[-6deg] place-items-center rounded-xl bg-gradient-to-br from-lavanda-200 to-rosa-200 shadow-suave">
          <Sparkles size={20} className="text-white" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="etiqueta">Tu tarjeta sorpresa</p>
          <p className="mt-0.5 font-bold text-noche">
            {retoHoy?.completado ? `Hoy completaste: ${reto.titulo}` : "Hoy es un buen día para dedicarte unos minutos."}
          </p>
          <p className="text-[13px] text-noche/60">
            {retoHoy?.completado ? "Vuelve mañana por otra tarjeta." : `Descubre tu reto de ${CATEGORIAS[reto.categoria]?.nombre.toLowerCase() || "hoy"}.`}
          </p>
        </div>
        <ChevronRight className="shrink-0 text-lavanda-400" />
      </button>

      <section aria-label="Tu progreso" className="grid grid-cols-3 gap-3">
        {[
          { Icono: Flame, valor: racha, texto: racha === 1 ? "día de racha" : "días de racha" },
          { Icono: Heart, valor: estado.pausas, texto: estado.pausas === 1 ? "pausa guiada" : "pausas guiadas" },
          { Icono: Clock, valor: estado.minutosEscucha, texto: "min de calma" },
        ].map(({ Icono, valor, texto }) => (
          <div key={texto} className="rounded-2xl bg-white/60 p-3 text-center ring-1 ring-lavanda-200/60">
            <Icono size={16} className="mx-auto text-lavanda-400" />
            <p className="mt-1 font-display text-2xl font-semibold tabular-nums">{valor}</p>
            <p className="text-[11px] font-semibold leading-tight text-noche/60">{texto}</p>
          </div>
        ))}
      </section>

      <AvisoBienestar />
    </div>
  );
}
