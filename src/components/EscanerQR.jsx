import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ScanLine, X, CameraOff } from "lucide-react";
import jsQR from "jsqr";

/** Saca el código NS-XXXX-XXXX del texto del QR (una URL con ?codigo= o el código solo). */
export function codigoDesdeQR(texto) {
  const t = String(texto || "").trim();
  try {
    const u = new URL(t);
    const c = u.searchParams.get("codigo") || (u.hash.startsWith("#codigo-") ? u.hash.slice(8) : "");
    if (c) return c;
  } catch {
    /* no es URL */
  }
  return t;
}

/**
 * Lector de QR con la cámara del celular.
 * Llama a alLeer(codigo) una sola vez y se cierra.
 */
export default function EscanerQR({ alLeer, alCerrar }) {
  const video = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let flujo = null;
    let vivo = true;
    let temporizador = null;
    const lienzo = document.createElement("canvas");
    const ctx = lienzo.getContext("2d", { willReadFrequently: true });

    const leer = () => {
      if (!vivo) return;
      const v = video.current;
      if (v && v.readyState >= 2 && v.videoWidth) {
        const escala = Math.min(1, 640 / v.videoWidth);
        lienzo.width = Math.round(v.videoWidth * escala);
        lienzo.height = Math.round(v.videoHeight * escala);
        ctx.drawImage(v, 0, 0, lienzo.width, lienzo.height);
        const img = ctx.getImageData(0, 0, lienzo.width, lienzo.height);
        const r = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
        if (r && r.data) {
          vivo = false;
          if (navigator.vibrate) navigator.vibrate(60);
          alLeer(codigoDesdeQR(r.data));
          return;
        }
      }
      temporizador = setTimeout(leer, 160);
    };

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Tu navegador no permite usar la cámara aquí.");
        return;
      }
      try {
        flujo = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
        if (!vivo) return;
        video.current.srcObject = flujo;
        await video.current.play().catch(() => {});
        leer();
      } catch (e) {
        setError(
          e?.name === "NotAllowedError"
            ? "No diste permiso para usar la cámara."
            : "No pudimos abrir la cámara."
        );
      }
    })();

    return () => {
      vivo = false;
      clearTimeout(temporizador);
      flujo?.getTracks().forEach((t) => t.stop());
    };
  }, [alLeer]);

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-noche/85 p-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Escanear código QR">
      <div className="w-full max-w-xs text-center text-white">
        <div className="relative mx-auto aspect-square w-64 max-w-full overflow-hidden rounded-3xl bg-[#2B2752]">
          {!error && <video ref={video} playsInline muted className="absolute inset-0 h-full w-full object-cover" />}
          {error && <CameraOff size={64} strokeWidth={1.4} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40" />}
          {["left-3 top-3 border-l-4 border-t-4", "right-3 top-3 border-r-4 border-t-4", "bottom-3 left-3 border-b-4 border-l-4", "bottom-3 right-3 border-b-4 border-r-4"].map((c) => (
            <span key={c} className={`absolute h-10 w-10 rounded-md border-rosa-200 ${c}`} />
          ))}
          {!error && <span className="absolute inset-x-6 h-0.5 animate-[escaneo_1.6s_ease-in-out_infinite] bg-rosa-200 shadow-[0_0_16px_4px_rgba(249,204,221,.7)]" />}
        </div>
        {error ? (
          <>
            <p className="mt-5 font-bold">{error}</p>
            <p className="mt-1 text-[13px] text-white/75">Escanea el QR con la cámara de tu celular o escribe el código que viene en la etiqueta.</p>
          </>
        ) : (
          <>
            <p className="mt-5 flex items-center justify-center gap-2 font-bold"><ScanLine size={18} /> Apunta al QR de tu bolsa</p>
            <p className="mt-1 text-[13px] text-white/75">Se registra solo en cuanto lo lea.</p>
          </>
        )}
        <button type="button" onClick={alCerrar} className="mx-auto mt-5 flex items-center gap-2 rounded-full bg-white/15 px-5 py-2.5 font-bold ring-1 ring-white/25">
          <X size={16} /> Cerrar
        </button>
        <style>{`@keyframes escaneo{0%,100%{top:12%}50%{top:86%}}`}</style>
      </div>
    </div>,
    document.body
  );
}
