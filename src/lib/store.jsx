import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { claveDia } from "./contenido.js";
import { SELLOS_PARA_PREMIO, formatearCodigo, generarCupon } from "./codes.js";

const CLAVE = "sweet-reset:v1";

const ESTADO_INICIAL = {
  sellos: [], // [{ codigo, fecha }] de la tarjeta actual (máximo 10)
  usados: [], // todos los códigos registrados en este dispositivo
  cupones: [], // [{ cupon, fecha, canjeado }]
  retos: {}, // { "2026-11-08": { titulo, categoria, completado } }
  pausas: 0, // ciclos de respiración completados
  minutosEscucha: 0,
};

function leer() {
  try {
    const raw = localStorage.getItem(CLAVE);
    if (!raw) return ESTADO_INICIAL;
    return { ...ESTADO_INICIAL, ...JSON.parse(raw) };
  } catch {
    return ESTADO_INICIAL;
  }
}

function guardar(estado) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(estado));
  } catch {
    /* almacenamiento bloqueado: la app sigue funcionando en memoria */
  }
}

function reducer(estado, accion) {
  switch (accion.tipo) {
    case "AGREGAR_SELLO": {
      if (estado.usados.includes(accion.codigo)) return estado; // evita dobles toques
      let sellos = [...estado.sellos, { codigo: accion.codigo, fecha: Date.now() }];
      // Con servidor, la tarjeta muestra exactamente los sellos que el servidor tiene registrados.
      if (accion.sellosServidor > 0) sellos = sellos.slice(-accion.sellosServidor);
      const usados = [...estado.usados, accion.codigo];
      if (accion.cupon) {
        const cupon = { cupon: accion.cupon, fecha: Date.now(), canjeado: false };
        return { ...estado, sellos: [], usados, cupones: [cupon, ...estado.cupones] };
      }
      return { ...estado, sellos, usados };
    }
    case "CANJEAR_CUPON":
      return {
        ...estado,
        cupones: estado.cupones.map((c) => (c.cupon === accion.cupon ? { ...c, canjeado: true } : c)),
      };
    case "GUARDAR_RETO": {
      const dia = accion.dia || claveDia();
      const previo = estado.retos[dia] || {};
      return { ...estado, retos: { ...estado.retos, [dia]: { ...previo, ...accion.reto } } };
    }
    case "SUMAR_PAUSA":
      return { ...estado, pausas: estado.pausas + (accion.n || 1) };
    case "SUMAR_MINUTOS":
      return { ...estado, minutosEscucha: estado.minutosEscucha + accion.minutos };
    case "SINCRONIZAR": {
      // La tarjeta de la cuenta vive en el servidor: así se ve igual en cualquier celular.
      const e = accion.estado || {};
      const fecha = (f) => (f ? new Date(f).getTime() : Date.now());
      return {
        ...estado,
        sellos: (e.sellos || []).slice(-SELLOS_PARA_PREMIO).map((x) => ({ codigo: x.codigo, fecha: fecha(x.fecha) })),
        usados: e.usados || [],
        cupones: (e.cupones || []).map((c) => ({ cupon: c.cupon, fecha: fecha(c.creado), canjeado: Boolean(c.canjeado) })),
      };
    }
    case "VACIAR_TARJETA":
      return { ...estado, sellos: [], usados: [], cupones: [] };
    case "REINICIAR":
      return ESTADO_INICIAL;
    default:
      return estado;
  }
}

const Contexto = createContext(null);

export function ProveedorEstado({ children }) {
  const [estado, dispatch] = useReducer(reducer, undefined, leer);
  useEffect(() => guardar(estado), [estado]);

  const acciones = useMemo(
    () => ({
      /**
       * Registra un código de empaque. Devuelve { ok, motivo, premio, cupon }.
       * La validación de formato y de verificador ya se hizo antes (api.js).
       */
      registrarSello(codigoCrudo, estadoActual, servidor) {
        const codigo = formatearCodigo(codigoCrudo);
        if (!codigo) return { ok: false, motivo: "formato" };
        if (estadoActual.usados.includes(codigo)) return { ok: false, motivo: "repetido" };
        // Con servidor, el premio y el cupón los decide el servidor; sin él (demo), se cuenta aquí.
        const premio = servidor ? servidor.premio : estadoActual.sellos.length + 1 >= SELLOS_PARA_PREMIO;
        const cupon = premio ? (servidor ? servidor.cupon : generarCupon()) : null;
        dispatch({ tipo: "AGREGAR_SELLO", codigo, cupon, sellosServidor: servidor?.sellos });
        return { ok: true, codigo, premio, cupon };
      },
      canjearCupon: (cupon) => dispatch({ tipo: "CANJEAR_CUPON", cupon }),
      sincronizar: (estadoServidor) => dispatch({ tipo: "SINCRONIZAR", estado: estadoServidor }),
      vaciarTarjeta: () => dispatch({ tipo: "VACIAR_TARJETA" }),
      guardarReto: (reto, dia) => dispatch({ tipo: "GUARDAR_RETO", reto, dia }),
      sumarPausa: (n) => dispatch({ tipo: "SUMAR_PAUSA", n }),
      sumarMinutos: (minutos) => dispatch({ tipo: "SUMAR_MINUTOS", minutos }),
      reiniciar: () => dispatch({ tipo: "REINICIAR" }),
    }),
    []
  );

  return <Contexto.Provider value={{ estado, ...acciones }}>{children}</Contexto.Provider>;
}

export function useEstado() {
  const v = useContext(Contexto);
  if (!v) throw new Error("useEstado debe usarse dentro de ProveedorEstado");
  return v;
}

/** Días seguidos (terminando hoy o ayer) con reto completado. */
export function calcularRacha(retos, hoy = new Date()) {
  let racha = 0;
  const d = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  if (!retos[claveDia(d)]?.completado) d.setDate(d.getDate() - 1);
  while (retos[claveDia(d)]?.completado) {
    racha++;
    d.setDate(d.getDate() - 1);
  }
  return racha;
}
