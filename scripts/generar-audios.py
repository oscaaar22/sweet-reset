#!/usr/bin/env python3
"""
Genera los audios de la sección Escucha de Sweet Reset (public/audio/*.mp3).

Todo se sintetiza aquí, sin grabaciones de terceros: no hay derechos de autor que pagar.
Cada pista es un bucle perfecto de P segundos: todo se construye de forma circular
(eventos que pasan del final regresan al inicio, filtros y reverberación en el dominio
de la frecuencia), así que el final empata exacto con el principio.
Al archivo se le agrega al final una copia de los primeros segundos (COLA) para que el
reproductor encime dos copias sin que se note la unión.

Uso:  pip install numpy scipy  &&  python3 scripts/generar-audios.py [id ...]
Requiere ffmpeg con libmp3lame.
"""
import json
import os
import subprocess
import sys
import tempfile

import numpy as np
from scipy.io import wavfile

SR = 44100
COLA = 1.5  # segundos extra al final (copia del inicio)
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, "public", "audio")


# ----------------------------------------------------------------- utilidades
def midi(n, la=440.0):
    return la * 2 ** ((n - 69) / 12)


def paneo(sig, p):
    """Paneo de igual potencia, p en [-1, 1]. Devuelve (2, n)."""
    a = (p + 1) * np.pi / 4
    return np.vstack([sig * np.cos(a), sig * np.sin(a)])


class Pista:
    def __init__(self, segundos, semilla):
        self.P = segundos
        self.N = int(segundos * SR)
        self.buf = np.zeros((2, self.N))
        self.rng = np.random.default_rng(semilla)

    def agregar(self, est, t):
        """Suma una señal estéreo (2, n) que empieza en t segundos, dando la vuelta al final."""
        pos = int(round(t * SR)) % self.N
        while est.shape[1]:
            n = min(est.shape[1], self.N - pos)
            self.buf[:, pos:pos + n] += est[:, :n]
            est = est[:, n:]
            pos = 0

    def ruido(self):
        return self.rng.standard_normal((2, self.N))


def frecuencias(n):
    return np.fft.rfftfreq(n, 1 / SR)


def filtrar(x, bajo=None, alto=None, orden=2):
    """Filtro Butterworth de fase cero aplicado de forma circular (mantiene el bucle)."""
    X = np.fft.rfft(x, axis=-1)
    f = frecuencias(x.shape[-1])
    H = np.ones_like(f)
    if alto:
        H /= np.sqrt(1 + (f / alto) ** (2 * orden))
    if bajo:
        with np.errstate(divide="ignore"):
            H /= np.sqrt(1 + (bajo / np.maximum(f, 1e-9)) ** (2 * orden))
    return np.fft.irfft(X * H, n=x.shape[-1], axis=-1)


def color(x, exponente, desde=20.0):
    """Ruido de color: espectro de potencia 1/f^exponente (0 blanco, 1 rosa, 2 café)."""
    X = np.fft.rfft(x, axis=-1)
    f = np.maximum(frecuencias(x.shape[-1]), desde)
    X *= f ** (-exponente / 2)
    X[..., 0] = 0
    y = np.fft.irfft(X, n=x.shape[-1], axis=-1)
    return y / np.sqrt(np.mean(y ** 2))


def respuesta_sala(t60=3.0, largo=4.5, predelay=0.022, semilla=7, brillo=1.0):
    """Respuesta al impulso de una sala suave: ruido con caída exponencial más rápida en agudos."""
    rng = np.random.default_rng(semilla)
    n = int(largo * SR)
    t = np.arange(n) / SR
    ir = np.zeros((2, n))
    for (lo, hi, factor) in [(None, 700, 1.15), (700, 3500, 1.0), (3500, None, 0.55 * brillo)]:
        banda = filtrar(rng.standard_normal((2, n)), lo, hi, 2)
        ir += banda * np.exp(-6.9 * t / (t60 * factor))
    ir *= np.minimum(1, t / 0.012)  # entrada suave
    d = int(predelay * SR)
    ir = np.concatenate([np.zeros((2, d)), ir[:, : n - d]], axis=1)
    return ir / np.sqrt(np.sum(ir ** 2) / 2)


def reverberar(x, mezcla=0.3, **kw):
    ir = respuesta_sala(**kw)
    n = x.shape[-1]
    irp = np.zeros((2, n))
    irp[:, : ir.shape[1]] = ir
    mojado = np.fft.irfft(np.fft.rfft(x, axis=-1) * np.fft.rfft(irp, axis=-1), n=n, axis=-1)
    seco_rms = np.sqrt(np.mean(x ** 2)) + 1e-12
    mojado *= seco_rms / (np.sqrt(np.mean(mojado ** 2)) + 1e-12)
    return x * np.sqrt(1 - mezcla) + mojado * np.sqrt(mezcla)


def envolvente_lenta(rng, n, hz=0.2, prof=0.3):
    """Variación aleatoria suave y periódica (1 ± prof)."""
    e = filtrar(rng.standard_normal(n), None, hz, 2)
    e /= np.max(np.abs(e)) + 1e-12
    return 1 + prof * e


# ----------------------------------------------------------------- instrumentos
def piano(f, vel=0.4, dur=7.0, rng=None):
    """Piano suave (de fieltro): parciales casi armónicos con caída propia y dos cuerdas."""
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    B = 0.00035
    altura = (f / 261.6) ** 0.45
    for n in range(1, 12):
        fn = n * f * np.sqrt(1 + B * n * n)
        if fn > 9000:
            break
        amp = n ** -1.6 * np.exp(-(n - 1) * (1.05 - vel) * 0.55)
        caida = (0.45 + 0.32 * n) * altura
        fase = rng.uniform(0, 2 * np.pi) if rng is not None else 0
        desafin = 2 ** (0.8 / 1200)
        s += amp * np.exp(-caida * t) * 0.5 * (np.sin(2 * np.pi * fn * desafin * t + fase) + np.sin(2 * np.pi * fn / desafin * t + fase * 1.3))
    s *= 1 - np.exp(-t / 0.006)
    s *= np.minimum(1, (dur - t) / 0.4)
    return s * vel


def pad(notas, dur, ataque=3.0, salida=3.5, corte=1600, rng=None):
    """Colchón cálido: sierras de banda limitada, tres voces desafinadas por nota, en estéreo."""
    t = np.arange(int(dur * SR)) / SR
    est = np.zeros((2, t.size))
    for f in notas:
        for k, (cents, p) in enumerate([(-7, -0.6), (0, 0.0), (7, 0.6)]):
            fv = f * 2 ** (cents / 1200)
            v = np.zeros_like(t)
            fase = rng.uniform(0, 2 * np.pi, 16)
            for n in range(1, 16):
                if n * fv > corte * 2.5:
                    break
                v += (1 / n) / np.sqrt(1 + (n * fv / corte) ** 4) * np.sin(2 * np.pi * n * fv * t + fase[n])
            est += paneo(v, p * 0.7)
    env = np.minimum(1, t / ataque) * np.minimum(1, (dur - t) / salida)
    env = np.clip(env, 0, 1) ** 1.5
    return est * env / max(1, len(notas))


def cuenco(f, vel=0.6, dur=24.0, rng=None):
    """Cuenco tibetano: parciales inarmónicos con batimiento lento."""
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for r, a, T, bat in [(1, 1, 16, 0.9), (2.76, 0.42, 9, 1.7), (5.40, 0.2, 5, 2.6), (8.93, 0.08, 3, 3.3), (13.3, 0.03, 1.8, 4.1)]:
        fr = f * r
        if fr > 12000:
            continue
        ph = rng.uniform(0, 2 * np.pi, 2)
        s += a * np.exp(-t * 3 / T) * 0.5 * (np.sin(2 * np.pi * (fr - bat / 2) * t + ph[0]) + np.sin(2 * np.pi * (fr + bat / 2) * t + ph[1]))
    s *= 1 - np.exp(-t / 0.004)
    s *= np.minimum(1, (dur - t) / 1.0)
    return s * vel


def kalimba(f, vel=0.5, dur=3.5, rng=None):
    t = np.arange(int(dur * SR)) / SR
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 1.6)
    s += 0.12 * np.sin(2 * np.pi * 2.0 * f * t) * np.exp(-t * 4)
    s += 0.05 * np.sin(2 * np.pi * 5.9 * f * t) * np.exp(-t * 14)
    golpe = rng.standard_normal(int(0.004 * SR)) * np.exp(-np.arange(int(0.004 * SR)) / (0.0008 * SR))
    s[: golpe.size] += 0.05 * golpe
    s *= 1 - np.exp(-t / 0.002)
    s *= np.minimum(1, (dur - t) / 0.3)
    return s * vel


def campanita(f, vel=0.2, dur=6.0, rng=None):
    t = np.arange(int(dur * SR)) / SR
    s = np.zeros_like(t)
    for r, a, k in [(1, 1, 0.9), (2.4, 0.3, 1.8), (4.1, 0.12, 3.5)]:
        s += a * np.sin(2 * np.pi * f * r * t + rng.uniform(0, 6.3)) * np.exp(-t * k)
    s *= 1 - np.exp(-t / 0.003)
    s *= np.minimum(1, (dur - t) / 0.5)
    return s * vel


# ----------------------------------------------------------------- composiciones
def melodia_sobre_acordes(p, acordes, escala, dur_acorde, base_rh=(67, 84), vel=(0.18, 0.32), bajo=True, notas_por_acorde=(2, 4)):
    """Mano izquierda con la fundamental y mano derecha con una melodía tranquila (paso a paso)."""
    rng = p.rng
    actual = int(rng.choice([n for n in escala if base_rh[0] + 5 <= n <= base_rh[1] - 5]))
    for i, acorde in enumerate(acordes):
        t0 = i * dur_acorde
        if bajo:
            raiz = acorde[0]
            while raiz > 52:
                raiz -= 12
            p.agregar(paneo(piano(midi(raiz), 0.30, 9, rng), -0.25), t0 + rng.uniform(0, 0.03))
            p.agregar(paneo(piano(midi(raiz + 7), 0.20, 8, rng), -0.15), t0 + 0.35 + rng.uniform(0, 0.05))
            p.agregar(paneo(piano(midi(acorde[1] + 12 if acorde[1] < 60 else acorde[1]), 0.17, 8, rng), 0.0), t0 + 0.75 + rng.uniform(0, 0.05))
        k = int(rng.integers(notas_por_acorde[0], notas_por_acorde[1] + 1))
        tiempos = np.sort(rng.uniform(1.0, dur_acorde - 0.6, k))
        for tt in tiempos:
            candidatos = [n for n in escala if base_rh[0] <= n <= base_rh[1] and abs(n - actual) <= 4]
            pesos = np.array([2.5 if (n % 12) in [a % 12 for a in acorde] else 1.0 for n in candidatos])
            actual = int(rng.choice(candidatos, p=pesos / pesos.sum()))
            p.agregar(paneo(piano(midi(actual), rng.uniform(*vel), 7, rng), rng.uniform(0.05, 0.35)), t0 + tt)


def escala(raiz, tipo):
    pasos = {"penta": [0, 2, 4, 7, 9], "pentamenor": [0, 3, 5, 7, 10], "mayor": [0, 2, 4, 5, 7, 9, 11]}[tipo]
    return [raiz + o * 12 + s for o in range(-3, 4) for s in pasos]


def piano_calma(semilla=11):
    p = Pista(150, semilla)
    # Fa maj7 – Do maj9 – La m7 – Sol 6: progresión abierta y luminosa.
    ciclo = [[53, 57, 60, 64], [48, 52, 55, 59, 62], [57, 60, 64, 67], [55, 59, 62, 64]]
    melodia_sobre_acordes(p, ciclo * 5, escala(60, "penta"), 7.5)
    return reverberar(p.buf, 0.38, t60=3.2)


def atardecer(semilla=21):
    p = Pista(144, semilla)
    acordes = [[50, 54, 57, 61], [47, 50, 54, 57, 61], [43, 47, 50, 54, 57], [45, 47, 52, 57]] * 3
    for i, a in enumerate(acordes):
        p.agregar(pad([midi(n) for n in a], 15.5, 3.5, 4.0, 1500, p.rng) * 0.55, i * 12)
    esc = escala(62, "penta")
    t = 2.0
    while t < p.P:
        n = int(p.rng.choice([x for x in esc if 74 <= x <= 88]))
        p.agregar(paneo(piano(midi(n), p.rng.uniform(0.12, 0.22), 7, p.rng), p.rng.uniform(-0.4, 0.4)), t)
        t += p.rng.uniform(3.5, 7.5)
    return reverberar(p.buf, 0.45, t60=4.0)


def cuencos(semilla=31):
    p = Pista(120, semilla)
    t = np.arange(p.N) / SR
    zumbido = 0.035 * (np.sin(2 * np.pi * 98 * t) + 0.5 * np.sin(2 * np.pi * 147 * t)) * (1 + 0.25 * np.sin(2 * np.pi * t / 30))
    p.buf += paneo(zumbido, 0)
    notas = [196.0, 261.6, 293.7, 329.6, 392.0]
    tt = 0.5
    while tt < p.P:
        f = float(p.rng.choice(notas))
        p.agregar(paneo(cuenco(f, p.rng.uniform(0.35, 0.6), 24, p.rng), p.rng.uniform(-0.5, 0.5)), tt)
        tt += p.rng.uniform(8, 13)
    return reverberar(p.buf, 0.32, t60=4.5)


def kalimba_cuna(semilla=41):
    p = Pista(128, semilla)
    beat = 60 / 75
    acordes = [[55, 59, 62], [52, 55, 59], [48, 52, 55], [50, 54, 57]] * 5  # Sol – Mi m – Do – Re
    esc = escala(67, "penta")
    for i, a in enumerate(acordes):
        t0 = i * 8 * beat
        p.agregar(pad([midi(n) for n in a], 8 * beat + 4, 2.0, 3.0, 1100, p.rng) * 0.22, t0)
        tonos = [n for n in esc if 69 <= n <= 88]
        patron = [x for x in range(16) if p.rng.random() < (0.85 if x % 4 == 0 else 0.4)]
        ultimo = int(p.rng.choice(tonos))
        for x in patron:
            cand = [n for n in tonos if abs(n - ultimo) <= 5] or tonos
            ultimo = int(p.rng.choice(cand))
            p.agregar(paneo(kalimba(midi(ultimo), p.rng.uniform(0.18, 0.3), 3.5, p.rng), p.rng.uniform(-0.45, 0.45)), t0 + x * beat / 2 + p.rng.uniform(0, 0.015))
    return reverberar(p.buf, 0.33, t60=2.8)


def sueno(semilla=51):
    p = Pista(160, semilla)
    acordes = [[45, 52, 59, 60], [41, 48, 52, 57], [36, 43, 52, 55], [40, 47, 50, 55]] * 2
    for i, a in enumerate(acordes):
        p.agregar(pad([midi(n) for n in a], 26, 6, 7, 900, p.rng) * 0.6, i * 20)
    t = 6.0
    while t < p.P:
        f = float(p.rng.choice([880.0, 987.8, 1174.7, 1318.5]))
        p.agregar(paneo(campanita(f, 0.05, 6, p.rng), p.rng.uniform(-0.6, 0.6)), t)
        t += p.rng.uniform(11, 19)
    return reverberar(p.buf, 0.5, t60=5.0, brillo=0.7)


def lluvia_piano():
    lluvia_ = lluvia(150, semilla=62)
    p = Pista(150, 71)
    ciclo = [[57, 60, 64, 67], [53, 57, 60, 64], [48, 52, 55, 59], [55, 59, 62, 65]]
    melodia_sobre_acordes(p, ciclo * 5, escala(57, "pentamenor"), 7.5, vel=(0.16, 0.28))
    musica = reverberar(p.buf, 0.42, t60=3.4)
    musica /= np.sqrt(np.mean(musica ** 2)) + 1e-12
    lluvia_ /= np.sqrt(np.mean(lluvia_ ** 2)) + 1e-12
    return musica + 0.55 * lluvia_


# ----------------------------------------------------------------- naturaleza
def lluvia(segundos=60, semilla=61):
    p = Pista(segundos, semilla)
    rng = p.rng
    # Lluvia constante: ruido rosa en banda con leves cambios de intensidad.
    base = filtrar(color(p.ruido(), 0.9), 500, 9000, 2)
    base *= envolvente_lenta(rng, p.N, 0.08, 0.12)
    # Golpes de gotas: miles de impulsos cortos, repartidos en estéreo.
    gotas = np.zeros((2, p.N))
    tasa = 1600
    for c in range(2):
        k = rng.poisson(tasa * p.P)
        pos = rng.integers(0, p.N, k)
        amp = np.minimum(rng.pareto(4.0, k), 2.5) * rng.choice([-1, 1], k)  # sin gotas exageradas
        np.add.at(gotas[c], pos, amp)
    nucleo = rng.standard_normal(int(0.004 * SR)) * np.exp(-np.arange(int(0.004 * SR)) / (0.0007 * SR))
    K = np.fft.rfft(nucleo, n=p.N)
    gotas = np.fft.irfft(np.fft.rfft(gotas, axis=-1) * K, n=p.N, axis=-1)
    gotas = filtrar(gotas, 1200, 11000, 2)
    gotas /= np.sqrt(np.mean(gotas ** 2))
    # Algunas gotas cercanas, más grandes, sobre una superficie.
    cercanas = Pista(segundos, semilla + 1)
    for _ in range(int(p.P * 3)):
        f = rng.uniform(1800, 4200)
        d = int(0.05 * SR)
        tt = np.arange(d) / SR
        s = np.sin(2 * np.pi * f * (1 + 6 * tt) * tt) * np.exp(-tt / 0.008) * rng.uniform(0.2, 0.6)
        cercanas.agregar(paneo(s, rng.uniform(-0.8, 0.8)), rng.uniform(0, p.P))
    retumbo = filtrar(color(p.ruido(), 2.0), 30, 280, 2)
    mezcla = 0.9 * base + 0.42 * gotas + 0.35 * cercanas.buf / (np.sqrt(np.mean(cercanas.buf ** 2)) + 1e-12) * 0.25 + 0.35 * retumbo
    return reverberar(mezcla, 0.15, t60=1.2)


def olas(semilla=71):
    p = Pista(96, semilla)
    rng = p.rng
    env = np.zeros((2, p.N))
    t = 0.0
    while t < p.P:
        sube, baja = rng.uniform(2.2, 3.6), rng.uniform(4.5, 7.0)
        n = int((sube + baja + 1) * SR)
        tt = np.arange(n) / SR
        e = np.where(tt < sube, (tt / sube) ** 2.2, np.exp(-(tt - sube) / (baja / 3.2)))
        fuerza = rng.uniform(0.6, 1.0)
        p.agregar(paneo(e * fuerza, rng.uniform(-0.45, 0.45)), t)
        t += rng.uniform(7.5, 11)
    env = env + p.buf
    env /= env.max()
    ruido = p.ruido()
    grave = filtrar(color(ruido, 1.6), 40, 450, 2)
    medio = filtrar(color(ruido, 1.0), 450, 2200, 2)
    agudo = filtrar(color(ruido, 0.6), 2200, 9000, 2)
    fondo = filtrar(color(p.ruido(), 2.0), 30, 300, 2)
    mezcla = grave * (0.25 + 0.75 * env) + medio * (0.08 + 0.75 * env ** 1.6) + agudo * (0.02 + 0.45 * env ** 2.6) + 0.35 * fondo
    return reverberar(mezcla, 0.12, t60=1.5)


def lago(semilla=81):
    """Orilla de un lago en calma: agua que llega despacio, brisa y alguna gota lejana."""
    p = Pista(96, semilla)
    rng = p.rng
    # Pequeñas ondas que tocan la orilla, cada 3 a 5 s, suaves y redondas.
    env = Pista(96, semilla + 1)
    t = 0.0
    while t < p.P:
        sube, baja = rng.uniform(0.9, 1.5), rng.uniform(1.8, 3.0)
        n = int((sube + baja * 2) * SR)
        tt = np.arange(n) / SR
        e = np.where(tt < sube, np.sin(np.pi / 2 * tt / sube) ** 2, np.exp(-(tt - sube) / (baja / 2.5)))
        env.agregar(paneo(e * rng.uniform(0.5, 1.0), rng.uniform(-0.5, 0.5)), t)
        t += rng.uniform(3.0, 5.0)
    e = env.buf / (env.buf.max() + 1e-12)
    ruido = p.ruido()
    agua = filtrar(color(ruido, 1.5), 60, 900, 2) * (0.15 + 0.85 * e) + filtrar(color(ruido, 1.0), 900, 3500, 2) * (0.02 + 0.3 * e ** 2)
    brisa = filtrar(color(p.ruido(), 1.6), 80, 1200, 2) * envolvente_lenta(rng, p.N, 0.05, 0.45) * 0.35
    # Gotitas lejanas, muy pocas y quietas.
    gotas = Pista(96, semilla + 2)
    for _ in range(int(p.P * 0.6)):
        f = rng.uniform(700, 1400)
        n = int(0.12 * SR)
        tt = np.arange(n) / SR
        s_ = np.sin(2 * np.pi * f * (1 + 2.5 * tt) * tt) * np.exp(-tt / 0.03) * (1 - np.exp(-tt / 0.002))
        gotas.agregar(paneo(s_ * rng.uniform(0.05, 0.14), rng.uniform(-0.8, 0.8)), rng.uniform(0, p.P))
    mezcla = agua / (np.sqrt(np.mean(agua ** 2)) + 1e-12) + 0.45 * brisa / (np.sqrt(np.mean(brisa ** 2)) + 1e-12) * 0.6
    mezcla = mezcla + gotas.buf * 3
    return reverberar(mezcla, 0.3, t60=2.4, brillo=0.6)


def campanas_viento(semilla=91):
    """Campanas de viento de tubo con escala pentatónica, movidas por una brisa suave."""
    p = Pista(120, semilla)
    rng = p.rng
    ventarron = envolvente_lenta(rng, p.N, 0.04, 0.6)
    brisa = filtrar(color(p.ruido(), 1.5), 90, 1400, 2) * ventarron
    notas = [midi(n) for n in (72, 74, 76, 79, 81, 84)]  # do mayor pentatónica
    parciales = [(1.0, 1.0, 1.0), (2.76, 0.35, 0.55), (5.40, 0.12, 0.3), (8.93, 0.04, 0.18)]  # tubo libre
    t = rng.uniform(0, 1)
    while t < p.P:
        f = notas[rng.integers(len(notas))]
        dur = 7.0
        n = int(dur * SR)
        tt = np.arange(n) / SR
        s_ = np.zeros(n)
        for (r_, a, dec) in parciales:
            s_ += a * np.sin(2 * np.pi * f * r_ * tt + rng.uniform(0, 6.28)) * np.exp(-tt / (dur * dec / 2.2))
        s_ *= 1 - np.exp(-tt / 0.003)
        p.agregar(paneo(s_ * rng.uniform(0.08, 0.2), rng.uniform(-0.7, 0.7)), t)
        fuerza = ventarron[int(t * SR) % p.N]
        t += rng.exponential(1.6 / max(fuerza, 0.4)) + 0.25
    c = reverberar(p.buf, 0.45, t60=4.0, brillo=0.8)
    c /= np.sqrt(np.mean(c ** 2)) + 1e-12
    b = brisa / (np.sqrt(np.mean(brisa ** 2)) + 1e-12)
    return c + 0.35 * b


def noche(semilla=101):
    p = Pista(60, semilla)
    rng = p.rng
    viento = filtrar(color(p.ruido(), 1.4), 120, 1500, 2) * envolvente_lenta(rng, p.N, 0.06, 0.5) * 0.35
    grillos = Pista(60, semilla + 1)
    for g in range(5):
        f = rng.uniform(4200, 5200)
        pan = rng.uniform(-0.8, 0.8)
        dist = rng.uniform(0.25, 1.0)
        periodo = rng.uniform(0.55, 0.95)
        t = rng.uniform(0, periodo)
        while t < p.P:
            if rng.random() < 0.9:
                pulsos = int(rng.integers(3, 5))
                n = int(pulsos * 0.033 * SR)
                tt = np.arange(n) / SR
                am = np.clip(np.sin(np.pi * (tt % 0.033) / 0.033), 0, 1) ** 2
                s = np.sin(2 * np.pi * f * tt) * am * dist * 0.25
                grillos.agregar(paneo(s, pan), t)
            t += periodo * rng.uniform(0.95, 1.05)
    gr = filtrar(grillos.buf, 3000, None, 2)
    return reverberar(viento + gr, 0.35, t60=2.2, brillo=0.8)


# ----------------------------------------------------------------- ruido
def ruido_blanco():
    p = Pista(24, 111)
    return p.ruido()  # ruido blanco real: plano en todo el espectro


def ruido_rosa():
    p = Pista(24, 112)
    return color(p.ruido(), 1.0)


def ruido_cafe():
    p = Pista(24, 113)
    return color(p.ruido(), 2.0, desde=25)


def lluvia_sola():
    return lluvia(60, 61)


# ----------------------------------------------------------------- frecuencias
def tono(f, segundos=60, semilla=121):
    """Tono puro con su octava baja y su quinta, respirando lento. Todo da ciclos enteros en el bucle."""
    p = Pista(segundos, semilla)
    t = np.arange(p.N) / SR
    resp = 1 + 0.12 * np.sin(2 * np.pi * 0.1 * t)
    s = 0.55 * np.sin(2 * np.pi * f * t) + 0.55 * np.sin(2 * np.pi * f / 2 * t) + 0.10 * np.sin(2 * np.pi * f * 1.5 * t + 1.0) + 0.05 * np.sin(2 * np.pi * f * 2 * t + 2.0)
    est = np.vstack([s * resp, s * (1 + 0.12 * np.sin(2 * np.pi * 0.1 * t + 0.6))])
    return reverberar(est, 0.22, t60=3.5)


def binaural(base, pulso, segundos=60, semilla=131, pad_notas=()):
    p = Pista(segundos, semilla)
    t = np.arange(p.N) / SR
    izq = np.sin(2 * np.pi * base * t)
    der = np.sin(2 * np.pi * (base + pulso) * t)
    tonos = np.vstack([izq, der]) * 0.6
    cama = filtrar(color(p.ruido(), 1.2), 60, 2500, 2) * 0.06
    # Colchón suave en notas enteras (ciclos completos) para que no suene "pelón".
    colchon = np.zeros(p.N)
    for i, f in enumerate(pad_notas):
        colchon += np.sin(2 * np.pi * f * t + i) * (1 + 0.3 * np.sin(2 * np.pi * t / 20 + i))
    colchon = paneo(colchon * 0.08, 0)
    return tonos + cama + reverberar(colchon, 0.5, t60=4)


# ----------------------------------------------------------------- catálogo
# id: (función, kbps, nivel RMS en dBFS)
CATALOGO = {
    "lluvia": (lluvia_sola, 128, -21),
    "olas": (olas, 128, -21),
    "lago": (lago, 128, -22),
    "campanas": (campanas_viento, 128, -22),
    "noche": (noche, 112, -24),
    "piano": (piano_calma, 128, -21),
    "atardecer": (atardecer, 112, -21),
    "cuencos": (cuencos, 112, -21),
    "kalimba": (kalimba_cuna, 112, -21),
    "sueno": (sueno, 112, -22),
    "lluvia-piano": (lluvia_piano, 128, -21),
    "ruido-blanco": (ruido_blanco, 192, -24),
    "ruido-rosa": (ruido_rosa, 160, -21),
    "ruido-cafe": (ruido_cafe, 128, -19),
    "hz-396": (lambda: tono(396), 96, -20),
    "hz-432": (lambda: tono(432), 96, -20),
    "hz-528": (lambda: tono(528), 96, -20),
    "alfa": (lambda: binaural(220, 10, pad_notas=(110, 165)), 128, -21),
    "theta": (lambda: binaural(180, 6, pad_notas=(90, 135)), 128, -21),
    "delta": (lambda: binaural(140, 2, pad_notas=(70, 105)), 128, -22),
}


def finalizar(x, rms_db):
    x = x - x.mean(axis=1, keepdims=True)
    x *= 10 ** (rms_db / 20) / (np.sqrt(np.mean(x ** 2)) + 1e-12)
    # Limitador suave: nada pasa de -3 dBFS (margen para el MP3).
    techo = 10 ** (-3 / 20)
    x = techo * np.tanh(x / techo)
    return x


def exportar(ident, x, kbps):
    periodo = x.shape[1] / SR
    cola = x[:, : int(COLA * SR)]
    completo = np.concatenate([x, cola], axis=1).T.astype(np.float32)
    os.makedirs(SALIDA, exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        wavfile.write(tmp.name, SR, completo)
        destino = os.path.join(SALIDA, f"{ident}.mp3")
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-i", tmp.name, "-codec:a", "libmp3lame", "-b:a", f"{kbps}k", "-joint_stereo", "1" if ident not in ("alfa", "theta", "delta") else "0", destino],
            check=True,
        )
    os.unlink(tmp.name)
    return periodo, os.path.getsize(destino)


def main():
    pedidos = sys.argv[1:] or list(CATALOGO)
    # Duración exacta de cada bucle; la app la necesita para encimar las copias en el punto justo.
    manifiesto_ruta = os.path.join(RAIZ, "src", "lib", "audio-periodos.json")
    try:
        manifiesto = json.load(open(manifiesto_ruta))
    except Exception:
        manifiesto = {}
    for ident in pedidos:
        fn, kbps, nivel = CATALOGO[ident]
        x = finalizar(fn(), nivel)
        periodo, peso = exportar(ident, x, kbps)
        manifiesto[ident] = periodo
        print(f"{ident:14s} {periodo:6.1f} s  {peso / 1e6:5.2f} MB")
    json.dump(manifiesto, open(manifiesto_ruta, "w"), indent=2, sort_keys=True)


if __name__ == "__main__":
    main()
