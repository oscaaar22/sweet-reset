import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { UserRound, Smartphone, X } from "lucide-react";
import { registrarCliente } from "../lib/api.js";

const ERRORES = {
  nombre: "Escribe tu nombre.",
  telefono: "Tu celular debe tener 10 dígitos.",
  aviso: "Para crear tu tarjeta necesitamos que aceptes el aviso de privacidad.",
  limite: "Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.",
  red: "No hay conexión con el servidor. Intenta de nuevo en un momento.",
};

/**
 * Registro sin contraseña: nombre + celular.
 * Si el celular ya tiene cuenta, se recupera su tarjeta (sirve para cambiar de teléfono).
 * Llama a alListo({ cliente, nuevo, estado }).
 */
export default function RegistroCliente({ alListo, alCerrar, motivo }) {
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [acepta, setAcepta] = useState(false);
  const [error, setError] = useState("");
  const [enviando, setEnviando] = useState(false);
  const primero = useRef(null);

  useEffect(() => {
    primero.current?.focus();
    const tecla = (e) => e.key === "Escape" && alCerrar();
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  }, [alCerrar]);

  const digitos = telefono.replace(/\D/g, "");

  const enviar = async (e) => {
    e.preventDefault();
    setError("");
    if (nombre.trim().length < 2) return setError(ERRORES.nombre);
    if (digitos.length !== 10) return setError(ERRORES.telefono);
    if (!acepta) return setError(ERRORES.aviso);
    setEnviando(true);
    const r = await registrarCliente({ nombre: nombre.trim(), telefono: digitos, acepta: true });
    setEnviando(false);
    if (!r.ok) return setError(ERRORES[r.motivo] || r.error || ERRORES.red);
    alListo(r);
  };

  // Muestra el celular como 55 1234 5678 mientras se escribe.
  const formatoTel = (t) => {
    const d = t.replace(/\D/g, "").slice(0, 10);
    return [d.slice(0, 2), d.slice(2, 6), d.slice(6)].filter(Boolean).join(" ");
  };

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-noche/70 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-registro">
      <form onSubmit={enviar} className="relative w-full max-w-sm overflow-hidden rounded-[30px] bg-white shadow-2xl animate-entrar" noValidate>
        <div className="bg-gradient-to-br from-lavanda-300 via-[#D4B8EE] to-rosa-200 px-6 pb-6 pt-7 text-white">
          <button type="button" onClick={alCerrar} className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/25 text-white" aria-label="Cerrar">
            <X size={18} />
          </button>
          <h2 id="titulo-registro" className="font-display text-[28px] font-semibold leading-tight drop-shadow-sm">Crea tu tarjeta de sellos</h2>
          <p className="mt-1 text-[14px] font-semibold text-white/95">
            {motivo === "codigo" ? "Antes de sumar tu sello, dinos quién eres. Solo se hace una vez." : "Solo se hace una vez. Sin contraseñas."}
          </p>
        </div>

        <div className="grid gap-4 px-6 pb-6 pt-5">
          <label className="grid gap-1.5">
            <span className="etiqueta">Tu nombre</span>
            <span className="flex items-center gap-2 rounded-full bg-lavanda-50 px-4 ring-1 ring-lavanda-200 focus-within:ring-2 focus-within:ring-lavanda-400">
              <UserRound size={17} className="shrink-0 text-lavanda-400" aria-hidden="true" />
              <input
                ref={primero}
                value={nombre}
                onChange={(e) => { setNombre(e.target.value.slice(0, 60)); setError(""); }}
                autoComplete="name"
                autoCapitalize="words"
                placeholder="Ej. Mariana López"
                className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-semibold text-noche placeholder:text-noche/30 focus:outline-none"
              />
            </span>
          </label>

          <label className="grid gap-1.5">
            <span className="etiqueta">Tu celular</span>
            <span className="flex items-center gap-2 rounded-full bg-lavanda-50 px-4 ring-1 ring-lavanda-200 focus-within:ring-2 focus-within:ring-lavanda-400">
              <Smartphone size={17} className="shrink-0 text-lavanda-400" aria-hidden="true" />
              <input
                value={formatoTel(telefono)}
                onChange={(e) => { setTelefono(e.target.value); setError(""); }}
                type="tel"
                inputMode="numeric"
                autoComplete="tel-national"
                placeholder="55 1234 5678"
                className="min-w-0 flex-1 bg-transparent py-3 text-[16px] font-semibold tabular-nums tracking-wide text-noche placeholder:text-noche/30 focus:outline-none"
              />
            </span>
            <span className="text-[12.5px] text-noche/60">Si cambias de celular, escribe el mismo número y recuperas tus sellos.</span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl bg-noche/[.03] p-3 text-[13px] leading-snug text-noche/75">
            <input
              type="checkbox"
              checked={acepta}
              onChange={(e) => { setAcepta(e.target.checked); setError(""); }}
              className="mt-0.5 h-5 w-5 shrink-0 accent-lavanda-500"
            />
            <span>
              Acepto que NutraSweets use mi nombre y celular solo para mi tarjeta de sellos, mis cupones y avisos de promociones. No los compartimos con nadie.
            </span>
          </label>

          <div role="status" aria-live="polite">
            {error && <p className="rounded-xl bg-rosa-50 px-3 py-2 text-[13px] font-semibold text-[#B0446C]">{error}</p>}
          </div>

          <button type="submit" disabled={enviando} className="boton-primario w-full">
            {enviando ? "Guardando…" : "Crear mi tarjeta"}
          </button>
        </div>
      </form>
    </div>,
    document.body
  );
}
