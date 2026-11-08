import { Home, Music2, Wind, Sparkles, Gift } from "lucide-react";
import { useEstado } from "../lib/store.jsx";

const PESTANAS = [
  { id: "inicio", nombre: "Inicio", Icono: Home },
  { id: "escucha", nombre: "Escucha", Icono: Music2 },
  { id: "respira", nombre: "Respira", Icono: Wind },
  { id: "reto", nombre: "Mi reto", Icono: Sparkles },
  { id: "recompensas", nombre: "Premios", Icono: Gift },
];

export default function Navegacion({ vista, ir }) {
  const { estado } = useEstado();
  const cuponesPendientes = estado.cupones.filter((c) => !c.canjeado).length;
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-lavanda-200/70 bg-white/85 backdrop-blur-lg"
      style={{
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "max(8px, env(safe-area-inset-left, 0px))",
        paddingRight: "max(8px, env(safe-area-inset-right, 0px))",
      }}
    >
      <ul className="mx-auto grid max-w-[560px] grid-cols-5">
        {PESTANAS.map(({ id, nombre, Icono }) => {
          const activa = vista === id;
          return (
            <li key={id}>
              <button
                type="button"
                onClick={() => ir(id)}
                aria-current={activa ? "page" : undefined}
                className={`relative flex w-full flex-col items-center gap-1 px-1 pb-2.5 pt-2 text-[11px] font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lavanda-300 ${
                  activa ? "text-lavanda-600" : "text-noche/55 hover:text-noche/80"
                }`}
              >
                <span className={`grid h-8 w-12 place-items-center rounded-full transition ${activa ? "bg-lavanda-100" : ""}`}>
                  <Icono size={20} strokeWidth={activa ? 2.4 : 2} />
                </span>
                {nombre}
                {id === "recompensas" && cuponesPendientes > 0 && (
                  <span className="absolute right-[22%] top-1.5 h-2.5 w-2.5 rounded-full bg-rosa-400 ring-2 ring-white" aria-label="Tienes un premio" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
