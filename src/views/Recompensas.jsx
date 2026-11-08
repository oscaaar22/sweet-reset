import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Gift, QrCode, Check, Copy, Ticket, Star, ScanLine, ChevronDown, Candy, UserRound } from "lucide-react";
import Encabezado, { AvisoBienestar } from "../components/Encabezado.jsx";
import { useEstado } from "../lib/store.jsx";
import { validarCodigo, infoServidor, cuponesCanjeados, clienteGuardado, cargarCliente, cerrarCuenta } from "../lib/api.js";
import EscanerQR from "../components/EscanerQR.jsx";
import RegistroCliente from "../components/RegistroCliente.jsx";
import { SELLOS_PARA_PREMIO, formatearCodigo, generarCodigo, limpiarCodigo } from "../lib/codes.js";

const ES_DEMO = import.meta.env.MODE === "demo";

const MENSAJES = {
  formato: "El código tiene 8 caracteres después de NS, por ejemplo NS-7KQ3-M9TB.",
  invalido: "Ese código no existe. Revisa que esté bien escrito; está dentro de tu bolsa.",
  repetido: "Ese código ya está registrado en tu tarjeta.",
  usado: "Ese código ya se usó en otra cuenta.",
  red: "No hay conexión con el servidor. Intenta de nuevo en un momento.",
  limite: "Demasiados intentos seguidos. Espera un minuto y vuelve a intentar.",
};

function fechaCorta(ms) {
  return new Date(ms).toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

/** Muestra lo que el usuario escribe con el formato NS-XXXX-XXXX. */
function mascara(texto) {
  const c = limpiarCodigo(texto).slice(0, 8);
  if (!c) return "";
  return c.length > 4 ? `NS-${c.slice(0, 4)}-${c.slice(4)}` : `NS-${c}`;
}

export default function Recompensas({ ir, codigoInicial }) {
  const { estado, registrarSello, canjearCupon, sincronizar, vaciarTarjeta } = useEstado();
  const [cliente, setCliente] = useState(() => (ES_DEMO ? null : clienteGuardado()));
  const [registro, setRegistro] = useState(null); // { motivo, pendiente }
  const [codigo, setCodigo] = useState(codigoInicial ? mascara(codigoInicial) : "");
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [escaneando, setEscaneando] = useState(false);
  const [premio, setPremio] = useState(null);
  const [completa, setCompleta] = useState(false);
  const [nuevoSello, setNuevoSello] = useState(-1);
  const [confirmar, setConfirmar] = useState(null);
  const [copiado, setCopiado] = useState(false);
  const [pruebas] = useState(() => Array.from({ length: 4 }, () => generarCodigo()));
  const estadoRef = useRef(estado);
  estadoRef.current = estado;
  const [servidor, setServidor] = useState({ servidor: false, codigosControlados: false });

  // Con servidor: saber si hay códigos controlados y sincronizar cupones canjeados en caja.
  useEffect(() => {
    let vivo = true;
    infoServidor().then(async (info) => {
      if (!vivo) return;
      setServidor(info);
      if (!info.servidor) return;
      // Con cuenta, la tarjeta se trae del servidor (igual en cualquier celular).
      const c = await cargarCliente();
      if (!vivo) return;
      if (c?.estado) {
        setCliente(c.cliente);
        sincronizar(c.estado);
        return;
      }
      if (c?.sinCuenta) setCliente(null);
      const pendientes = estadoRef.current.cupones.filter((c) => !c.canjeado).map((c) => c.cupon);
      const canjeados = await cuponesCanjeados(pendientes);
      if (vivo) canjeados.forEach((c) => canjearCupon(c));
    });
    return () => { vivo = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const registrar = async (valor) => {
    setError("");
    setExito("");
    const formateado = formatearCodigo(valor);
    if (!formateado) return setError(MENSAJES.formato);
    if (estadoRef.current.usados.includes(formateado)) return setError(MENSAJES.repetido);
    setEnviando(true);
    const info = await infoServidor();
    // En la plataforma real, cada sello va a la cuenta del cliente: si no tiene, primero se registra.
    if (info.servidor && !clienteGuardado()) {
      setEnviando(false);
      setCliente(null);
      return setRegistro({ motivo: "codigo", pendiente: formateado });
    }
    const v = await validarCodigo(formateado);
    setEnviando(false);
    if (v.motivo === "sin-cuenta") {
      setCliente(null);
      return setRegistro({ motivo: "codigo", pendiente: formateado });
    }
    if (!v.ok) return setError(MENSAJES[v.motivo] || MENSAJES.invalido);
    const r = registrarSello(formateado, estadoRef.current, v.servidor);
    if (!r.ok) return setError(MENSAJES[r.motivo] || MENSAJES.invalido);
    setCodigo("");
    if (r.premio) {
      setCompleta(true);
      setNuevoSello(SELLOS_PARA_PREMIO - 1);
      setTimeout(() => setPremio(r.cupon), 650);
    } else {
      setNuevoSello(estadoRef.current.sellos.length);
      setExito(`Código ${r.codigo} registrado. ¡Sumaste un sello!`);
    }
    // Deja la tarjeta idéntica a la del servidor.
    if (v.servidor) cargarCliente().then((c) => c?.estado && sincronizar(c.estado));
  };

  const alRegistrarse = ({ cliente: c, nuevo, estado: e }) => {
    const pendiente = registro?.pendiente;
    setRegistro(null);
    setCliente(c);
    sincronizar(e);
    const nombre = c.nombre.split(" ")[0];
    setExito(nuevo ? `¡Listo, ${nombre}! Tu tarjeta quedó creada.` : `¡Hola de nuevo, ${nombre}! Recuperamos tu tarjeta.`);
    if (pendiente) setTimeout(() => registrar(pendiente), 0);
  };

  const cerrarRegistro = useCallback(() => setRegistro(null), []);

  const noSoyYo = () => {
    cerrarCuenta();
    setCliente(null);
    vaciarTarjeta();
    setError("");
    setExito("");
  };

  const autoRegistro = useRef(false);
  useEffect(() => {
    if (codigoInicial && !autoRegistro.current) {
      autoRegistro.current = true;
      registrar(codigoInicial);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // En la demo sin servidor se simula; en la plataforma real se usa la cámara.
  const [camara, setCamara] = useState(false);
  const simularEscaneo = () => {
    setEscaneando(true);
    setTimeout(() => {
      setEscaneando(false);
      registrar(generarCodigo());
    }, 1800);
  };
  const abrirEscaner = () => (ES_DEMO ? simularEscaneo() : setCamara(true));
  const alLeerQR = useCallback((codigo) => {
    setCamara(false);
    registrar(codigo);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const copiar = async (texto) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    } catch {
      const el = document.getElementById("cupon-texto");
      if (el) {
        const rango = document.createRange();
        rango.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(rango);
      }
    }
  };

  const llenos = completa ? SELLOS_PARA_PREMIO : estado.sellos.length;
  const faltan = SELLOS_PARA_PREMIO - llenos;

  return (
    <div>
      <Encabezado
        ir={ir}
        titulo="Recompensas"
        subtitulo="Cada bolsa trae un código único. Junta 10 y te regalamos un paquete de gomitas."
      />

      <section className="tarjeta overflow-hidden" aria-labelledby="tarjeta-sellos">
        <div className="bg-gradient-to-br from-lavanda-300 via-[#CDB7EF] to-rosa-200 px-5 pb-5 pt-4 text-white">
          <div className="flex items-center justify-between">
            <p id="tarjeta-sellos" className="text-[12px] font-extrabold uppercase tracking-[0.16em] text-white/90">Tarjeta de sellos</p>
            <Candy size={20} className="text-white/90" aria-hidden="true" />
          </div>
          <p className="mt-1 font-display text-[40px] font-semibold leading-none tabular-nums drop-shadow-sm">
            {llenos}<span className="text-2xl text-white/80"> / {SELLOS_PARA_PREMIO}</span>
          </p>
          <p className="mt-1 text-[14px] font-semibold text-white/90">
            {faltan === 0 ? "¡Tarjeta completa!" : faltan === 1 ? "¡Te falta solo uno!" : `Te faltan ${faltan} para tu paquete gratis`}
          </p>
        </div>
        <ol className="grid grid-cols-5 gap-3 p-5" aria-label={`${llenos} de ${SELLOS_PARA_PREMIO} sellos`}>
          {Array.from({ length: SELLOS_PARA_PREMIO }).map((_, i) => {
            const lleno = i < llenos;
            const ultimo = i === SELLOS_PARA_PREMIO - 1;
            return (
              <li key={i} className="flex flex-col items-center">
                <span
                  className={`grid aspect-square w-full max-w-[56px] place-items-center rounded-full transition ${
                    lleno
                      ? `bg-gradient-to-br from-lavanda-400 to-rosa-300 text-white shadow-suave ${i === nuevoSello ? "animate-sello" : ""}`
                      : ultimo
                      ? "border-2 border-dashed border-rosa-300 bg-rosa-50 text-rosa-300"
                      : "border-2 border-dashed border-lavanda-200 bg-lavanda-50 text-lavanda-300"
                  }`}
                >
                  {lleno ? <Star size={20} fill="currentColor" /> : ultimo ? <Gift size={18} /> : <span className="text-[13px] font-bold tabular-nums">{i + 1}</span>}
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="tarjeta mt-5 p-5" aria-labelledby="registrar">
        {cliente && (
          <div className="mb-4 flex items-center gap-3 rounded-2xl bg-lavanda-50 px-3 py-2.5 ring-1 ring-lavanda-200">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-white text-lavanda-500 ring-1 ring-lavanda-200"><UserRound size={18} /></span>
            <p className="min-w-0 flex-1 truncate text-[14px] font-bold text-noche">Hola, {cliente.nombre.split(" ")[0]}</p>
            <button type="button" onClick={noSoyYo} className="shrink-0 text-[12.5px] font-bold text-lavanda-600 underline underline-offset-2">¿No eres tú?</button>
          </div>
        )}
        <h2 id="registrar" className="font-display text-xl font-semibold">Registra tu bolsa</h2>
        <p className="mt-1 text-[14px] text-noche/65">Escanea el QR del empaque o escribe el código que viene dentro de la bolsa.</p>

        <button type="button" onClick={abrirEscaner} disabled={escaneando || enviando || camara} className="boton-primario mt-4 w-full">
          <QrCode size={18} /> Escanear código QR
        </button>

        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            registrar(codigo);
          }}
        >
          <label htmlFor="codigo" className="sr-only">Código de tu empaque</label>
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => { setCodigo(mascara(e.target.value)); setError(""); }}
            placeholder="NS-0000-0000"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck="false"
            inputMode="text"
            className="min-w-0 flex-1 rounded-full bg-lavanda-50 px-5 py-3 font-mono text-[16px] font-bold tracking-widest text-noche ring-1 ring-lavanda-200 placeholder:text-noche/30 focus:outline-none focus:ring-2 focus:ring-lavanda-400"
            aria-invalid={Boolean(error)}
            aria-describedby="codigo-ayuda"
          />
          <button type="submit" disabled={enviando || !codigo} className="boton-suave shrink-0">
            {enviando ? "…" : "Registrar"}
          </button>
        </form>
        <div id="codigo-ayuda" role="status" aria-live="polite">
          {error && <p className="mt-3 rounded-xl bg-rosa-50 px-3 py-2 text-[13px] font-semibold text-[#B0446C]">{error}</p>}
          {exito && <p className="mt-3 flex items-center gap-2 rounded-xl bg-menta-100 px-3 py-2 text-[13px] font-semibold text-menta-500"><Check size={15} /> {exito}</p>}
        </div>

        {servidor.servidor && !cliente && (
          <p className="mt-4 text-center text-[13px] text-noche/65">
            ¿Ya tienes tarjeta en otro celular?{" "}
            <button type="button" onClick={() => setRegistro({ motivo: "cuenta" })} className="font-bold text-lavanda-600 underline underline-offset-2">Entra con tu número</button>
          </p>
        )}

        {!servidor.codigosControlados && (
        <details className="group mt-4 rounded-2xl bg-noche/[.03] p-3 text-[13px]">
          <summary className="flex cursor-pointer list-none items-center justify-between font-bold text-noche/70">
            Códigos de prueba para la demostración
            <ChevronDown size={16} className="transition group-open:rotate-180" />
          </summary>
          <p className="mt-2 text-noche/60">Toca uno para registrarlo. En el producto real cada código viene impreso dentro de una bolsa.</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {pruebas.map((p) => {
              const usado = estado.usados.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  disabled={usado}
                  onClick={() => registrar(p)}
                  className="rounded-full bg-white px-3 py-1.5 font-mono text-[12.5px] font-bold tracking-wider text-lavanda-600 ring-1 ring-lavanda-200 disabled:text-noche/35 disabled:line-through"
                >
                  {p}
                </button>
              );
            })}
          </div>
        </details>
        )}
      </section>

      {estado.cupones.length > 0 && (
        <section className="tarjeta mt-5 p-5" aria-labelledby="mis-cupones">
          <h2 id="mis-cupones" className="font-display text-xl font-semibold">Mis cupones</h2>
          <ul className="mt-3 grid gap-2">
            {estado.cupones.map((c) => (
              <li key={c.cupon} className={`flex items-center gap-3 rounded-2xl p-3 ring-1 ${c.canjeado ? "bg-noche/[.03] ring-noche/10" : "bg-rosa-50 ring-rosa-200"}`}>
                <Ticket size={22} className={c.canjeado ? "text-noche/35" : "text-rosa-400"} aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className={`font-mono text-[15px] font-bold tracking-wider ${c.canjeado ? "text-noche/40 line-through" : "text-noche"}`}>{c.cupon}</p>
                  <p className="text-[12px] text-noche/55">Paquete de gomitas gratis · {c.canjeado ? "canjeado" : `ganado el ${fechaCorta(c.fecha)}`}</p>
                </div>
                {!c.canjeado && servidor.servidor && (
                  <span className="chip shrink-0 bg-white text-lavanda-600 ring-1 ring-lavanda-200">Muéstralo en caja</span>
                )}
                {!c.canjeado && !servidor.servidor &&
                  (confirmar === c.cupon ? (
                    <span className="flex shrink-0 gap-1">
                      <button type="button" onClick={() => { canjearCupon(c.cupon); setConfirmar(null); }} className="chip bg-noche text-white">Sí, canjear</button>
                      <button type="button" onClick={() => setConfirmar(null)} className="chip bg-white text-noche/70 ring-1 ring-noche/10" aria-label="Cancelar">No</button>
                    </span>
                  ) : (
                    <button type="button" onClick={() => setConfirmar(c.cupon)} className="chip shrink-0 bg-white text-lavanda-600 ring-1 ring-lavanda-200">
                      Usar en tienda
                    </button>
                  ))}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-noche/55">Marca el cupón como usado frente a la persona que te atiende en el punto de venta.</p>
        </section>
      )}

      <section className="mt-5 grid gap-3 sm:grid-cols-3" aria-label="Cómo funciona">
        {[
          { Icono: QrCode, t: "Escanea", d: "El QR de tu bolsa te trae a Sweet Reset." },
          { Icono: Star, t: "Suma sellos", d: "Cada código dentro de la bolsa vale un sello." },
          { Icono: Gift, t: "Gana", d: "Con 10 sellos recibes un cupón para gomitas gratis." },
        ].map(({ Icono, t, d }) => (
          <div key={t} className="flex items-start gap-3 rounded-2xl bg-white/60 p-3.5 ring-1 ring-lavanda-200/60 sm:flex-col">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lavanda-100 text-lavanda-600"><Icono size={18} /></span>
            <span>
              <span className="block font-extrabold">{t}</span>
              <span className="block text-[13px] text-noche/60">{d}</span>
            </span>
          </div>
        ))}
      </section>

      <AvisoBienestar />

      {escaneando && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center bg-noche/80 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Escaneando código QR">
          <div className="w-full max-w-xs text-center text-white">
            <div className="relative mx-auto aspect-square w-60 overflow-hidden rounded-3xl bg-gradient-to-br from-[#3B356F] to-[#5A4C8F]">
              <QrCode size={120} strokeWidth={1.2} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/25" />
              {["left-3 top-3 border-l-4 border-t-4", "right-3 top-3 border-r-4 border-t-4", "bottom-3 left-3 border-b-4 border-l-4", "bottom-3 right-3 border-b-4 border-r-4"].map((c) => (
                <span key={c} className={`absolute h-10 w-10 rounded-md border-rosa-200 ${c}`} />
              ))}
              <span className="absolute inset-x-6 h-0.5 animate-[escaneo_1.6s_ease-in-out_infinite] bg-rosa-200 shadow-[0_0_16px_4px_rgba(249,204,221,.7)]" />
            </div>
            <p className="mt-5 flex items-center justify-center gap-2 font-bold"><ScanLine size={18} /> Buscando el código…</p>
            <p className="mt-1 text-[13px] text-white/70">Simulación: en el empaque real, el QR abre esta página con tu código ya cargado.</p>
            <style>{`@keyframes escaneo{0%,100%{top:12%}50%{top:86%}}`}</style>
          </div>
        </div>,
        document.body
      )}

      {camara && <EscanerQR alLeer={alLeerQR} alCerrar={() => setCamara(false)} />}

      {registro && <RegistroCliente motivo={registro.motivo} alListo={alRegistrarse} alCerrar={cerrarRegistro} />}

      {premio && createPortal(
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-noche/70 p-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="titulo-premio">
          <div className="relative w-full max-w-sm overflow-hidden rounded-[30px] bg-white text-center shadow-2xl animate-entrar">
            <div className="relative overflow-hidden bg-gradient-to-br from-lavanda-300 via-[#D4B8EE] to-rosa-200 px-6 pb-8 pt-10 text-white">
              {Array.from({ length: 18 }).map((_, i) => (
                <Star
                  key={i}
                  size={8 + (i % 4) * 5}
                  fill="currentColor"
                  className="absolute animate-sello text-white/45"
                  style={{ left: `${(i * 41) % 95}%`, top: `${(i * 29) % 90}%`, animationDelay: `${(i % 6) * 0.1}s` }}
                  aria-hidden="true"
                />
              ))}
              <span className="relative mx-auto grid h-20 w-20 animate-flotar place-items-center rounded-3xl bg-white/30 backdrop-blur">
                <Gift size={40} />
              </span>
              <h2 id="titulo-premio" className="relative mt-4 font-display text-[34px] font-semibold leading-tight drop-shadow-sm">¡Premio ganado!</h2>
              <p className="relative mt-1 font-semibold text-white/95">Juntaste 10 sellos. Tu próximo paquete de gomitas va por nuestra cuenta.</p>
            </div>
            <div className="px-6 pb-6 pt-5">
              <p className="etiqueta">Tu cupón</p>
              <div className="mt-2 flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-lavanda-300 bg-lavanda-50 px-4 py-4">
                <span id="cupon-texto" className="select-all font-mono text-[24px] font-extrabold tracking-[0.14em] text-noche">{premio}</span>
                <button type="button" onClick={() => copiar(premio)} className="grid h-9 w-9 place-items-center rounded-full bg-white text-lavanda-600 ring-1 ring-lavanda-200" aria-label="Copiar cupón">
                  {copiado ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <p className="mt-3 text-[13.5px] leading-relaxed text-noche/70">
                Muéstralo en nuestro punto de venta en San Juan Teotihuacán o escríbelo en tu pedido por WhatsApp. También queda guardado en <b>Mis cupones</b>.
              </p>
              <button type="button" onClick={() => { setPremio(null); setCompleta(false); setNuevoSello(-1); }} className="boton-primario mt-5 w-full">
                ¡Gracias!
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
