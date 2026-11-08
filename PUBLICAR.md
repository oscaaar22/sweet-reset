# Cómo publicar Sweet Reset en internet (gratis)

Resultado: una dirección pública (por ejemplo `https://sweet-reset.onrender.com`) que funciona en cualquier celular, con base de datos para los códigos y cupones. Tiempo: unos 25 minutos. Costo: **$0**.

| Pieza | Servicio | Costo |
|---|---|---|
| Código | GitHub | Gratis |
| App y servidor | Render (plan Free) | Gratis |
| Base de datos | Neon (plan Free, no vence) | Gratis |
| Retos generados por Claude | API de Claude | Opcional, de pago. Sin ella la app usa su banco propio de 28 retos y 16 frases |

Bolt, Netlify o GitHub Pages no sirven: solo publican la parte visual y los códigos no se guardarían en ningún lado.

## Lo que necesitas

1. Cuenta de **GitHub**: https://github.com/signup
2. Cuenta de **Neon** (entra con tu GitHub): https://neon.tech
3. Cuenta de **Render** (entra con tu GitHub): https://render.com

Ninguna pide pagar para estos planes. Si alguna te pide tarjeta solo para verificar, no hace cargos en el plan gratuito; si no quieres darla, avísame y vemos otra opción.

## Paso 1. Subir el código a GitHub

1. Descomprime `Sweet Reset - codigo fuente.zip`.
2. En GitHub, botón **+** (arriba a la derecha) → **New repository**. Nombre: `sweet-reset`. Puede ser **Private**. No marques "Add a README". **Create repository**.
3. En la página del repositorio vacío, haz clic en **uploading an existing file**.
4. Abre la carpeta `sweet-reset` que descomprimiste, selecciona **todo su contenido** (no la carpeta: lo de adentro, `package.json`, `render.yaml`, `src`, `server`…) y arrástralo a la página.
5. **Commit changes**.

Comprueba que en la raíz del repositorio se vean `package.json` y `render.yaml`. Si ves una sola carpeta `sweet-reset`, subiste la carpeta: bórrala y repite el punto 4.

## Paso 2. Crear la base de datos en Neon

1. En Neon: **New Project**. Nombre: `sweet-reset`. Región: la de EE. UU. que aparezca (por ejemplo *AWS US East*). **Create**.
2. En el panel del proyecto, botón **Connect**. Copia la **connection string**; se ve así:
   `postgresql://usuario:clave@ep-xxxx.us-east-2.aws.neon.tech/neondb?sslmode=require`
3. Guárdala un momento (la pegarás en Render). No la publiques: da acceso a tu base.

Las tablas se crean solas la primera vez que arranca la app.

## Paso 3. Publicar la app en Render

1. En Render: **New +** → **Blueprint**.
2. Conecta tu GitHub si te lo pide y elige el repositorio `sweet-reset`.
3. Render lee `render.yaml` y te pide dos valores:
   - `DATABASE_URL`: pega la connection string de Neon.
   - `PIN_TIENDA`: inventa un PIN de 6 dígitos o más para la caja (por ejemplo `582914`). No uses `1234`.
4. **Apply**. La primera vez tarda de 3 a 5 minutos.
5. Cuando el servicio diga **Live**, arriba aparece tu dirección: `https://sweet-reset-xxxx.onrender.com`. Ábrela en el celular.

Para comprobar, abre `https://TU-DIRECCION/api/salud`. Debe decir `"ok":true`.

## Paso 4. Generar los códigos para las bolsas

Se hace desde tu computadora, una sola vez:

1. Instala Node.js 20 o superior: https://nodejs.org
2. Abre una terminal en la carpeta `sweet-reset` que descomprimiste y ejecuta `npm install`.
3. Después (pon tu URL de Neon y tu dirección de Render):
   - Mac o Linux:
     ```
     DATABASE_URL="tu-url-de-neon" SWEET_RESET_URL=https://TU-DIRECCION npm run codigos -- 200
     ```
   - Windows (PowerShell):
     ```
     $env:DATABASE_URL="tu-url-de-neon"; $env:SWEET_RESET_URL="https://TU-DIRECCION"; npm run codigos -- 200
     ```

Esto guarda 200 códigos en la base de datos y crea `data/codigos-para-imprenta.csv`. Si no puedes instalar Node, mándame la dirección de Render y te preparo el archivo para que solo lo pegues en Neon.

El CSV trae una columna `url_qr` por código. Cualquier generador de QR por lotes (o la imprenta) convierte esa columna en los QR de las etiquetas. Desde que existe el primer código impreso, la app **solo acepta códigos impresos** y oculta los códigos de prueba.

## Paso 5. Usar la caja

En el punto de venta abre `https://TU-DIRECCION/tienda`:

- **Verificar**: dice si el cupón existe y si ya se usó.
- **Canjear**: lo marca como usado (pide el PIN). Un cupón no se puede canjear dos veces.
- **Ver resumen**: códigos impresos, registrados, cupones ganados y canjeados (útil para el reporte del proyecto).

## Lo que hay que saber del plan gratuito

- **La app se duerme** tras 15 minutos sin visitas. La siguiente persona espera unos 50 segundos mientras despierta; después va normal. Antes de presentarla, ábrela 1 minuto antes.
- **La base de Neon no vence** y guarda tus datos aunque la app se duerma. El plan gratuito trae 0.5 GB, suficiente para cientos de miles de códigos.
- **Claude es opcional.** Sin clave, el botón de "reto nuevo" toma uno del banco propio de la app y todo lo demás funciona igual. Si después consiguen crédito en https://platform.claude.com, agrega la variable `ANTHROPIC_API_KEY` en *Environment* del servicio y Render vuelve a publicar solo.

## Cambiar algo después

Edita el archivo en GitHub (ícono del lápiz) y guarda: Render vuelve a publicar solo en 2 o 3 minutos.

## Dominio propio (opcional)

Si compran `nutrasweets.mx`, en Render → servicio → **Settings → Custom Domains** agrega `sweetreset.nutrasweets.mx` y sigue las instrucciones de DNS. Hazlo **antes** de generar los códigos, para que los QR impresos apunten al dominio definitivo.

## Si algo falla

| Síntoma | Qué revisar |
|---|---|
| El despliegue falla en "Build" | Que `package.json` esté en la raíz del repositorio (Paso 1). |
| `/api/salud` no abre o da error | Revisa en *Logs* del servicio; casi siempre es la `DATABASE_URL` de Neon mal pegada (debe empezar con `postgresql://`). |
| Los retos dicen "te dejamos uno de los nuestros" | Es normal sin clave de Claude: la app usa su banco propio. |
| "Ese código no existe" con un código impreso | Los QR se generaron con otra base de datos. Genera los códigos con la URL de la base actual. |
| La caja dice "Falta configurar PIN_TIENDA" | Agrega `PIN_TIENDA` en *Environment* del servicio. |
