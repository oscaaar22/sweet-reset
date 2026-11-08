import { useEffect, useState } from "react";
import Inicio from "./views/Inicio.jsx";
import Escucha from "./views/Escucha.jsx";
import Respira from "./views/Respira.jsx";
import Reto from "./views/Reto.jsx";
import Recompensas from "./views/Recompensas.jsx";
import Navegacion from "./components/Navegacion.jsx";
import MiniReproductor from "./components/MiniReproductor.jsx";
import { reproductor } from "./lib/reproductor.js";
import { useEstado } from "./lib/store.jsx";

const VISTAS = ["inicio", "escucha", "respira", "reto", "recompensas"];

function leerRuta() {
  const h = (window.location.hash || "").replace("#", "");
  if (h.startsWith("codigo-")) return { vista: "recompensas", codigo: h.slice(7) };
  const q = new URLSearchParams(window.location.search).get("codigo");
  if (q) return { vista: "recompensas", codigo: q };
  return { vista: VISTAS.includes(h) ? h : "inicio", codigo: null };
}

export default function App() {
  const [ruta, setRuta] = useState(leerRuta);
  const { sumarMinutos } = useEstado();

  useEffect(() => {
    reproductor.alTerminar(sumarMinutos);
    const alCambiar = () => setRuta(leerRuta());
    window.addEventListener("hashchange", alCambiar);
    return () => window.removeEventListener("hashchange", alCambiar);
  }, [sumarMinutos]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  }, [ruta.vista]);

  const ir = (vista) => {
    if (vista === ruta.vista) return;
    try {
      window.location.hash = vista === "inicio" ? "inicio" : vista;
    } catch {
      /* algunos visores bloquean el hash: navegamos en memoria */
    }
    setRuta({ vista, codigo: null });
  };

  const Vista = { inicio: Inicio, escucha: Escucha, respira: Respira, reto: Reto, recompensas: Recompensas }[ruta.vista];

  return (
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col">
      <main
        key={ruta.vista}
        className="flex-1 animate-entrar pb-40 pt-4"
        style={{ paddingLeft: "max(16px, env(safe-area-inset-left, 0px))", paddingRight: "max(16px, env(safe-area-inset-right, 0px))" }}
      >
        <Vista ir={ir} codigoInicial={ruta.codigo} />
      </main>
      <MiniReproductor vista={ruta.vista} ir={ir} />
      <Navegacion vista={ruta.vista} ir={ir} />
    </div>
  );
}
