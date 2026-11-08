import { useEffect, useRef } from "react";

// Cielo pastel con estrellas que titilan y nubes que se mueven despacio, dibujado en canvas.
export default function CieloEstrellado({ className = "", intensidad = 1, children }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const reducir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    let ancho = 0, alto = 0, dpr = 1, raf = 0, t0 = performance.now();
    let estrellas = [], nubes = [];

    function semilla(n) {
      let s = n;
      return () => ((s = (s * 16807) % 2147483647) / 2147483647);
    }

    function preparar() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      ancho = r.width; alto = r.height;
      canvas.width = Math.round(ancho * dpr); canvas.height = Math.round(alto * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const rnd = semilla(7);
      const total = Math.round((ancho * alto) / 2600 * intensidad);
      estrellas = Array.from({ length: total }, () => ({
        x: rnd() * ancho,
        y: rnd() * alto * 0.78,
        r: 0.5 + rnd() * 1.3,
        fase: rnd() * Math.PI * 2,
        vel: 0.6 + rnd() * 1.6,
        cruz: rnd() < 0.09,
      }));
      nubes = [
        { x: -0.08, y: 0.86, s: 1.25, v: 4 },
        { x: 0.28, y: 0.97, s: 1.0, v: 2.5 },
        { x: 0.72, y: 0.9, s: 1.3, v: 3.2 },
        { x: 1.02, y: 0.62, s: 0.9, v: 2.2 },
        { x: -0.02, y: 0.48, s: 0.7, v: 2.8 },
      ].map((n) => ({ ...n, x: n.x * ancho, y: n.y * alto, s: n.s * Math.max(ancho, 320) / 420 }));
    }

    function nube(cx, cy, s) {
      const bultos = [
        [0, 0, 70], [-60, 14, 52], [62, 12, 56], [-112, 32, 40], [112, 30, 42], [-20, -28, 50], [36, -22, 46],
      ];
      for (const [dx, dy, r] of bultos) {
        const x = cx + dx * s, y = cy + dy * s, rr = r * s;
        const g = ctx.createRadialGradient(x, y - rr * 0.3, rr * 0.1, x, y, rr);
        g.addColorStop(0, "rgba(255,248,252,0.95)");
        g.addColorStop(0.55, "rgba(252,226,238,0.75)");
        g.addColorStop(1, "rgba(246,206,228,0)");
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      }
    }

    function dibujar(ahora) {
      const t = (ahora - t0) / 1000;
      const fondo = ctx.createLinearGradient(0, 0, 0, alto);
      fondo.addColorStop(0, "#9E9BE6");
      fondo.addColorStop(0.45, "#C3B4EE");
      fondo.addColorStop(0.8, "#EBC6E4");
      fondo.addColorStop(1, "#F8D9E6");
      ctx.fillStyle = fondo;
      ctx.fillRect(0, 0, ancho, alto);

      for (const e of estrellas) {
        const a = reducir ? 0.8 : 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * e.vel + e.fase));
        ctx.globalAlpha = a;
        ctx.fillStyle = "#FFFFFF";
        if (e.cruz) {
          const L = e.r * 4.5;
          ctx.save();
          ctx.translate(e.x, e.y);
          ctx.beginPath();
          ctx.moveTo(0, -L); ctx.quadraticCurveTo(0, 0, L, 0); ctx.quadraticCurveTo(0, 0, 0, L);
          ctx.quadraticCurveTo(0, 0, -L, 0); ctx.quadraticCurveTo(0, 0, 0, -L);
          ctx.fill();
          ctx.restore();
        } else {
          ctx.beginPath(); ctx.arc(e.x, e.y, e.r, 0, Math.PI * 2); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;

      for (const n of nubes) {
        const dx = reducir ? 0 : Math.sin(t / (18 + n.v * 3) + n.v) * 14 * n.v;
        nube(n.x + dx, n.y, n.s);
      }
      if (!reducir) raf = requestAnimationFrame(dibujar);
    }

    preparar();
    raf = requestAnimationFrame(dibujar);
    const ro = new ResizeObserver(() => { preparar(); if (reducir) dibujar(performance.now()); });
    ro.observe(canvas);
    const vis = () => {
      cancelAnimationFrame(raf);
      if (!document.hidden) raf = requestAnimationFrame(dibujar);
    };
    document.addEventListener("visibilitychange", vis);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, [intensidad]);

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden="true" />
      <div className="relative">{children}</div>
    </div>
  );
}
