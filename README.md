# Sweet Reset · by NutraSweets

Experiencia digital que acompaña al empaque de NutraSweets. El cliente escanea el QR de su bolsa y llega a un espacio de calma con:

- **Escucha**: lluvia, olas, bosque y música ambiental generados en vivo en el celular (Web Audio, sin archivos ni derechos de autor), con temporizador y volumen.
- **Respira**: pausas guiadas (caja, 4·7·8 y coherente) con un círculo animado, campana opcional y vibración.
- **Mi reto**: tarjeta sorpresa diaria que se voltea, racha semanal y botón para que **Claude** genere un reto o una frase nueva.
- **Recompensas**: cada bolsa trae un código único (`NS-XXXX-XXXX`). Con 10 códigos se desbloquea la pantalla **¡Premio ganado!** con un cupón para un paquete gratis.

Los códigos usados y los cupones se guardan en el servidor (PostgreSQL), así que un código no se puede usar dos veces y un cupón no se puede inventar ni canjear dos veces. La caja verifica y canjea los cupones en `/tienda`.

**Para publicarla en internet sigue [PUBLICAR.md](PUBLICAR.md).**

## Requisitos

- Node.js 20 o superior
- Una clave de la API de Anthropic (opcional: sin clave la app usa su propio banco de retos y frases)

## Cómo correrlo

```bash
npm install
cp .env.example .env        # y pega tu ANTHROPIC_API_KEY
npm run dev                 # web en http://localhost:5173 y API en http://localhost:8787
```

Producción:

```bash
npm run build               # compila la app en dist/
npm start                   # el servidor sirve dist/ y la API en el puerto 8787
```

## Estructura

```
src/
  App.jsx                   navegación por secciones (#inicio, #escucha, #respira, #reto, #recompensas)
  views/                    las cinco pantallas
  components/               cielo estrellado (canvas), barra inferior, mini reproductor, encabezado
  lib/
    codes.js                formato y dígito verificador de los códigos de empaque (lo usa también el servidor)
    store.jsx               estado global con persistencia local (sellos, cupones, retos, estadísticas)
    api.js                  conexión con el servidor y con Claude, con respaldo local
    prompt.js               instrucciones y esquema JSON para Claude
    audio.js                motor de sonidos ambientales
    contenido.js            retos, frases, patrones de respiración y sonidos base
server/
  index.js                  Express: /api/salud, /api/reto, /api/codigos/registrar, /api/cupones, /tienda
  db.js                     PostgreSQL (DATABASE_URL) o archivo local para pruebas
  tienda.html               página de caja para verificar y canjear cupones
  claude.js                 llamada a la API de Anthropic
render.yaml                 despliegue gratuito en Render (base de datos en Neon)
scripts/
  generar-codigos.mjs       genera códigos únicos y el CSV para la imprenta
```

## Integración con Claude

`server/claude.js` usa el SDK oficial `@anthropic-ai/sdk` con el modelo `claude-opus-5-5`:

- **Salida estructurada** (`output_config.format` con JSON Schema): la respuesta siempre trae `categoria`, `titulo`, `texto` y `minutos`.
- **Esfuerzo `low`**: es una tarea corta, así responde rápido y cuesta menos.
- **Respaldo del lado del servidor** (`fallbacks: "default"` con el beta `server-side-fallback-2026-07-01`): si el modelo declina una solicitud, la API la reintenta con el modelo de respaldo recomendado.
- La clave vive solo en el servidor; el navegador nunca la ve. Hay un límite de 8 solicitudes por minuto por IP.

Si el servidor no tiene clave o Claude no responde, la app muestra un reto de su banco local y un aviso; nunca se queda sin contenido.

## Códigos de empaque y QR

Cada código tiene 7 caracteres aleatorios y 1 dígito verificador (alfabeto de 31 símbolos sin 0/O/1/I/L), así que un error al teclear se detecta siempre.

```bash
npm run codigos -- 500      # genera 500 códigos nuevos
```

Los guarda en la base de datos (con `DATABASE_URL`) y crea `data/codigos-para-imprenta.csv` con la URL de cada QR, por ejemplo `https://sweet-reset.onrender.com/?codigo=NS-7KQ3-M9TB`. Al escanearlo, la app abre **Recompensas** y registra el código sola. En cuanto existe al menos un código impreso, el servidor solo acepta códigos de esa lista y la app oculta los códigos de prueba.

Reglas del servidor (todo en una transacción):

- Un código solo se usa una vez, en cualquier celular.
- Al juntar 10 códigos, el **servidor** emite el cupón `NSR-XXXXXX`; el teléfono no puede generarlo.
- El cupón se canjea una sola vez, desde `/tienda` con el `PIN_TIENDA`. El cliente ve su cupón como "canjeado" al volver a abrir la app.

## Demo en un solo archivo

```bash
npm run build:demo          # dist-demo/index.html, todo incluido
```

Esa versión no tiene servidor: valida los códigos con el dígito verificador y, publicada como Artifact de Claude, genera los retos con la cuenta de quien la abre.

## Aviso

Sweet Reset es contenido de bienestar y no sustituye la atención profesional. La app muestra la Línea de la Vida (800 911 2000) en cada sección.
