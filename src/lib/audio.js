// Paisajes sonoros generados en el navegador con Web Audio.
// No se descargan archivos: lluvia, olas, bosque y música ambiental se sintetizan en vivo,
// así que no hay problemas de derechos de autor ni de peso de la página.

function bufferRuido(ctx, tipo = "blanco", segundos = 4) {
  const n = ctx.sampleRate * segundos;
  const buf = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let canal = 0; canal < 2; canal++) {
    const d = buf.getChannelData(canal);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, ultimo = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (tipo === "rosa") {
        b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852; b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
        d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else if (tipo === "cafe") {
        ultimo = (ultimo + 0.02 * w) / 1.02;
        d[i] = ultimo * 3.5;
      } else d[i] = w;
    }
  }
  return buf;
}

export class Paisaje {
  constructor() {
    this.ctx = null;
    this.maestro = null;
    this.nodos = [];
    this.timers = [];
    this.actual = null;
    this.volumen = 0.7;
  }

  _asegurar() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) throw new Error("Tu navegador no reproduce audio generado.");
      this.ctx = new AC();
      this.ruido = {
        blanco: bufferRuido(this.ctx, "blanco"),
        rosa: bufferRuido(this.ctx, "rosa"),
        cafe: bufferRuido(this.ctx, "cafe"),
      };
    }
    if (this.ctx.state === "suspended") this.ctx.resume();
  }

  _fuenteRuido(tipo) {
    const s = this.ctx.createBufferSource();
    s.buffer = this.ruido[tipo];
    s.loop = true;
    s.start();
    this.nodos.push(s);
    return s;
  }

  _nodo(n) {
    this.nodos.push(n);
    return n;
  }

  _cada(minMs, maxMs, fn) {
    const tick = () => {
      if (!this.actual) return;
      fn();
      this.timers.push(setTimeout(tick, minMs + Math.random() * (maxMs - minMs)));
    };
    this.timers.push(setTimeout(tick, minMs * Math.random()));
  }

  reproducir(id) {
    this._asegurar();
    this.detener(true);
    const ctx = this.ctx;
    const ahora = ctx.currentTime;
    this.maestro = ctx.createGain();
    this.maestro.gain.setValueAtTime(0, ahora);
    this.maestro.gain.linearRampToValueAtTime(this.volumen, ahora + 1.5);
    this.maestro.connect(ctx.destination);
    this.actual = id;
    const salida = this.maestro;

    if (id === "lluvia") {
      const hp = this._nodo(ctx.createBiquadFilter()); hp.type = "highpass"; hp.frequency.value = 350;
      const lp = this._nodo(ctx.createBiquadFilter()); lp.type = "lowpass"; lp.frequency.value = 5200;
      const g = this._nodo(ctx.createGain()); g.gain.value = 0.55;
      this._fuenteRuido("rosa").connect(hp); hp.connect(lp); lp.connect(g); g.connect(salida);
      this._cada(25, 140, () => this._gota(salida));
    }

    if (id === "olas") {
      const lp = this._nodo(ctx.createBiquadFilter()); lp.type = "lowpass"; lp.frequency.value = 700; lp.Q.value = 0.4;
      const g = this._nodo(ctx.createGain()); g.gain.value = 0.45;
      this._fuenteRuido("cafe").connect(lp); lp.connect(g); g.connect(salida);
      const lfo = this._nodo(ctx.createOscillator()); lfo.frequency.value = 0.09;
      const lfoG = this._nodo(ctx.createGain()); lfoG.gain.value = 0.38;
      const lfoF = this._nodo(ctx.createGain()); lfoF.gain.value = 520;
      lfo.connect(lfoG); lfoG.connect(g.gain); lfo.connect(lfoF); lfoF.connect(lp.frequency); lfo.start();
      const espuma = this._nodo(ctx.createBiquadFilter()); espuma.type = "bandpass"; espuma.frequency.value = 2400; espuma.Q.value = 0.6;
      const gE = this._nodo(ctx.createGain()); gE.gain.value = 0.05;
      const lfoE = this._nodo(ctx.createGain()); lfoE.gain.value = 0.05;
      lfo.connect(lfoE); lfoE.connect(gE.gain);
      this._fuenteRuido("rosa").connect(espuma); espuma.connect(gE); gE.connect(salida);
    }

    if (id === "bosque") {
      const lp = this._nodo(ctx.createBiquadFilter()); lp.type = "lowpass"; lp.frequency.value = 900;
      const g = this._nodo(ctx.createGain()); g.gain.value = 0.22;
      this._fuenteRuido("cafe").connect(lp); lp.connect(g); g.connect(salida);
      const lfo = this._nodo(ctx.createOscillator()); lfo.frequency.value = 0.05;
      const lfoG = this._nodo(ctx.createGain()); lfoG.gain.value = 0.12;
      lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
      const hojas = this._nodo(ctx.createBiquadFilter()); hojas.type = "highpass"; hojas.frequency.value = 3000;
      const gH = this._nodo(ctx.createGain()); gH.gain.value = 0.03;
      this._fuenteRuido("blanco").connect(hojas); hojas.connect(gH); gH.connect(salida);
      this._cada(1400, 5200, () => this._pajaro(salida));
    }

    if (id === "estrellas") {
      const lp = this._nodo(ctx.createBiquadFilter()); lp.type = "lowpass"; lp.frequency.value = 2400;
      const eco = this._nodo(ctx.createDelay(2)); eco.delayTime.value = 0.45;
      const fb = this._nodo(ctx.createGain()); fb.gain.value = 0.42;
      const mezcla = this._nodo(ctx.createGain()); mezcla.gain.value = 0.35;
      lp.connect(salida); lp.connect(eco); eco.connect(fb); fb.connect(eco); eco.connect(mezcla); mezcla.connect(salida);
      this.bus = lp;
      // Pentatónica de Re mayor, registro medio-grave.
      const notas = [146.83, 164.81, 185.0, 220.0, 246.94, 293.66, 329.63, 369.99, 440.0];
      const zumbido = this._nodo(ctx.createOscillator()); zumbido.type = "sine"; zumbido.frequency.value = 73.42;
      const gZ = this._nodo(ctx.createGain()); gZ.gain.value = 0.06;
      zumbido.connect(gZ); gZ.connect(lp); zumbido.start();
      this._cada(1500, 3400, () => this._nota(notas[Math.floor(Math.random() * notas.length)]));
    }
    if (id.startsWith("ruido-")) {
      // Ruido de color con un filtro suave para que no canse el oído.
      const tipo = { "ruido-blanco": "blanco", "ruido-rosa": "rosa", "ruido-cafe": "cafe" }[id];
      const lp = this._nodo(ctx.createBiquadFilter()); lp.type = "lowpass";
      lp.frequency.value = tipo === "blanco" ? 9000 : tipo === "rosa" ? 7000 : 1800;
      const g = this._nodo(ctx.createGain()); g.gain.value = tipo === "blanco" ? 0.16 : tipo === "rosa" ? 0.42 : 0.6;
      this._fuenteRuido(tipo).connect(lp); lp.connect(g); g.connect(salida);
    }

    if (id === "hz-432" || id === "hz-528") {
      // Tono puro con armónicos suaves (octava abajo y quinta) que respiran lento.
      const f = id === "hz-432" ? 432 : 528;
      const g = this._nodo(ctx.createGain()); g.gain.value = 0.11;
      const lfo = this._nodo(ctx.createOscillator()); lfo.frequency.value = 0.08;
      const lfoG = this._nodo(ctx.createGain()); lfoG.gain.value = 0.035;
      lfo.connect(lfoG); lfoG.connect(g.gain); lfo.start();
      g.connect(salida);
      [[f, 0.55], [f / 2, 0.9], [f * 1.5, 0.12], [f * 2, 0.06]].forEach(([fr, v], i) => {
        const o = this._nodo(ctx.createOscillator()); o.type = "sine"; o.frequency.value = fr; o.detune.value = i ? (i % 2 ? 3 : -3) : 0;
        const gv = this._nodo(ctx.createGain()); gv.gain.value = v;
        o.connect(gv); gv.connect(g); o.start();
      });
    }

    if (id === "alfa" || id === "theta" || id === "delta") {
      // Pulso binaural: cada oído recibe un tono distinto y el cerebro percibe la diferencia (con audífonos).
      const pulso = { alfa: 10, theta: 6, delta: 2 }[id];
      const base = { alfa: 220, theta: 180, delta: 140 }[id];
      const mezcla = this._nodo(ctx.createChannelMerger(2));
      const g = this._nodo(ctx.createGain()); g.gain.value = 0.16;
      mezcla.connect(g); g.connect(salida);
      [base, base + pulso].forEach((fr, canal) => {
        const o = this._nodo(ctx.createOscillator()); o.type = "sine"; o.frequency.value = fr;
        o.connect(mezcla, 0, canal); o.start();
      });
      // Cama de ruido rosa muy baja para que el tono no se sienta "pelón".
      const lp = this._nodo(ctx.createBiquadFilter()); lp.type = "lowpass"; lp.frequency.value = 1200;
      const gR = this._nodo(ctx.createGain()); gR.gain.value = 0.07;
      this._fuenteRuido("rosa").connect(lp); lp.connect(gR); gR.connect(salida);
    }
  }

  _gota(salida) {
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.ruido.blanco;
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1800 + Math.random() * 3800; bp.Q.value = 8;
    const g = ctx.createGain();
    const pico = 0.04 + Math.random() * 0.1;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(pico, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    s.connect(bp); bp.connect(g);
    if (pan) { pan.pan.value = Math.random() * 1.6 - 0.8; g.connect(pan); pan.connect(salida); } else g.connect(salida);
    s.start(t, Math.random() * 3); s.stop(t + 0.1);
  }

  _pajaro(salida) {
    const ctx = this.ctx;
    const base = 2200 + Math.random() * 1800;
    const repeticiones = 2 + Math.floor(Math.random() * 4);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (pan) { pan.pan.value = Math.random() * 1.4 - 0.7; pan.connect(salida); }
    for (let i = 0; i < repeticiones; i++) {
      const t = ctx.currentTime + i * (0.11 + Math.random() * 0.06);
      const o = ctx.createOscillator(); o.type = "sine";
      o.frequency.setValueAtTime(base, t);
      o.frequency.exponentialRampToValueAtTime(base * (1.25 + Math.random() * 0.3), t + 0.05);
      o.frequency.exponentialRampToValueAtTime(base * 0.9, t + 0.09);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.045, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      o.connect(g); g.connect(pan || salida);
      o.start(t); o.stop(t + 0.12);
    }
  }

  _nota(f) {
    const ctx = this.ctx, t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.07, t + 1.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 7.5);
    g.connect(this.bus);
    [0, 4, -5].forEach((cents, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "triangle" : "sine";
      o.frequency.value = f; o.detune.value = cents;
      o.connect(g); o.start(t); o.stop(t + 8);
    });
  }

  ajustarVolumen(v) {
    this.volumen = v;
    if (this.maestro && this.ctx) this.maestro.gain.setTargetAtTime(v, this.ctx.currentTime, 0.1);
  }

  detener(inmediato = false) {
    this.timers.forEach(clearTimeout);
    this.timers = [];
    const nodos = this.nodos;
    const maestro = this.maestro;
    this.nodos = [];
    this.maestro = null;
    this.actual = null;
    if (!maestro || !this.ctx) return;
    const t = this.ctx.currentTime;
    const espera = inmediato ? 0.15 : 0.9;
    maestro.gain.cancelScheduledValues(t);
    maestro.gain.setValueAtTime(maestro.gain.value, t);
    maestro.gain.linearRampToValueAtTime(0, t + espera);
    setTimeout(() => {
      nodos.forEach((n) => { try { n.stop?.(); } catch { /* ya detenido */ } try { n.disconnect(); } catch { /* */ } });
      try { maestro.disconnect(); } catch { /* */ }
    }, espera * 1000 + 50);
  }
}

export const paisaje = new Paisaje();

/** Un tono suave para marcar el cambio de fase en Respira. */
export function campana(frecuencia = 528, volumen = 0.06) {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!campana.ctx) campana.ctx = new AC();
    const ctx = campana.ctx;
    if (ctx.state === "suspended") ctx.resume();
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = frecuencia;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(volumen, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g); g.connect(ctx.destination); o.start(t); o.stop(t + 1.7);
  } catch { /* sin audio */ }
}
