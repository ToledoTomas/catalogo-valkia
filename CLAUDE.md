# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Catálogo Valkia es un catálogo online de indumentaria femenina (con panel de administración), no un e-commerce: muestra productos con imágenes, talles y colores y permite filtrar por categoría, pero no tiene carrito ni pagos. Monorepo con dos apps independientes: `client/` (sitio público en Astro) y `server/` (API REST en Express). No comparten `package.json` ni workspace — cada una se instala y ejecuta por separado.

## Comandos

### Server (`cd server`)
- `npm run dev` — arranca la API con hot-reload (`ts-node-dev`) en el puerto `PORT` (default `3001`).
- `npm run build` — compila TypeScript a `dist/`.
- `npm start` — corre el build compilado (`node dist/index.js`). Es lo que usa Render en producción.
- `npm run db:generate` — regenera el cliente Prisma en `server/generated/prisma` (correr tras cambiar `schema.prisma`).
- `npm run db:migrate` — crea/aplica una migración en desarrollo.
- `npm run db:push` — sincroniza el schema sin migración (prototipado).
- `npm run db:studio` — abre Prisma Studio.
- `npm run init` — corre `scripts/init.js`: seed de categorías, productos de ejemplo y **admin inicial** (`admin@valkia.com` / `admin123`).

### Client (`cd client`)
- `npm run dev` — dev server de Astro (default `http://localhost:4321`).
- `npm run build` — build de producción.
- `npm run preview` — sirve el build local.

No hay suite de tests ni linter configurados en ninguna de las dos apps.

## Arquitectura

### Server — Express + TypeScript + Prisma (PostgreSQL)
- **Entrada:** `server/src/index.ts` — configura Cloudinary, instancia y exporta un singleton de Prisma (`export const prisma`), monta middleware y rutas. Todos los controllers importan ese `prisma` desde `../index`.
- **Capas:** `routes/` → `controllers/` → Prisma. Las rutas montan bajo `/api/products`, `/api/categories`, `/api/admin`, `/api/auth`. Hay un `/health`.
- **Auth:** JWT en `middleware/auth.ts`. `authenticateToken` valida el header `Bearer`, verifica el token con `JWT_SECRET` y **reconsulta el admin en la DB** en cada request. Las mutaciones (POST/PUT/DELETE de productos) están protegidas; los GET de productos/categorías son públicos. Passwords con `bcrypt` (saltRounds 10).
- **Validación:** toda entrada pasa por Zod en `utils/validation.ts` mediante el helper `validateDataSafe` (nunca tira excepción: devuelve `{ success, data }` o `{ success, error }`). Al agregar endpoints, seguir este patrón en vez de validar a mano.
- **Imágenes:** se suben a **Cloudinary** vía `multer` (`memoryStorage`, el buffer va directo al `upload_stream`); solo la `secure_url` se persiste en la tabla `images`. Endpoints relevantes en `productController.ts`: `uploadProductImage` (agrega imagen a un producto existente) y `createProductWithImage` (crea producto + imagen en un paso, con `sizes`/`colors` como JSON stringificado en form-data).
- **Respuestas:** formato uniforme `{ success, data?, error?, message? }` (tipos `ApiResponse`/`PaginatedResponse` en `src/types/index.ts`). El cliente lee `data`.
- **Rebuild del frontend (deploy hook):** el catálogo público incrusta los productos en el **build** de Astro (ver Client), así que tras cada mutación del catálogo hay que rebuildeaer el frontend. `utils/deployHook.ts` expone `triggerDeploy(reason)`, que postea al **Deploy Hook de Vercel** (`DEPLOY_HOOK_URL`). Es fire-and-forget (no bloquea la respuesta), **no-op** si la env var no está seteada (dev local), y tiene **debounce de 10s** para coalescer ráfagas en un solo rebuild. Está enganchado en las mutaciones de `productController.ts` (create/update/delete, alta/baja de imágenes, `createProductWithImage(s)`) y en el rename de categoría (`categoryController.ts`). Al agregar mutaciones que cambien lo que se ve en el catálogo, llamar `triggerDeploy` tras responder.
- **Prisma generado:** el cliente se genera en `server/generated/prisma` (no en `node_modules`), y ese directorio **está commiteado**. Importar siempre desde `../generated/prisma`, no desde `@prisma/client`.

### Modelo de datos (`server/prisma/schema.prisma`)
`Product` (name, description, `sizes[]`, `colors[]`) → N:1 `Category` (name único) → 1:N `Images` (URLs de Cloudinary). `Admin` (email único + password hasheada) es independiente. Los borrados de Product/Category cascadean a Images.

### Client — Astro + islas de React + Tailwind 4
- Sitio de una sola página: `src/pages/index.astro` compone `Header`, `Hero`, `GridCards` y `Contacto`.
- **Precarga de productos en el build (híbrido):** `GridCards.astro` hace `fetch` a la API **en tiempo de build** (`PUBLIC_API_URL` o el fallback hardcodeado `https://catalogo-valkia.onrender.com`) y pasa los productos como `initialProducts` a la isla, así el HTML estático llega con el catálogo ya renderizado — **sin depender de que el backend en Render esté despierto** en cada visita. El fetch reintenta 3 veces (tolera el cold start) y cae a `[]` sin romper el build. Como el sitio es estático, esos productos reflejan el último build: por eso las mutaciones disparan un rebuild vía deploy hook (ver Server).
- **Interactividad:** casi todo es Astro estático. La única isla React es `GridCardsFilterIsland.jsx` (`client:load`), que arranca con los `initialProducts` del build, **refresca en segundo plano** (re-fetch a `/api/products`; si falla teniendo datos del build no muestra error) y filtra por categoría/búsqueda **en el cliente**. Las categorías se derivan de los productos, no de un fetch aparte.
- Tailwind 4 se integra vía el plugin de Vite (`astro.config.mjs`), no vía config file tradicional.

## Configuración / entorno

- **Server** (`server/env.example`): `DATABASE_URL` (Postgres), `PORT`, `NODE_ENV`, `JWT_SECRET`, más las credenciales de Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) que consume `index.ts`. `JWT_SECRET` es obligatorio: sin él, la generación/validación de tokens tira error. `DEPLOY_HOOK_URL` (opcional) es el Deploy Hook de Vercel que dispara el rebuild del frontend; si falta, `triggerDeploy` es no-op.
- **Client:** `PUBLIC_API_URL` para apuntar a la API (se usa tanto en el fetch del build como en el runtime de la isla). En local, `client/.env` la fija a `http://localhost:3001`.

## Despliegue

El backend corre en **Render** (`https://catalogo-valkia.onrender.com`) vía `npm run build` + `npm start`. El frontend estático se despliega en **Vercel** y consume esa URL pública.

**Flujo de actualización del catálogo:** el admin muta productos vía la API en Render → el server postea al Deploy Hook de Vercel (`DEPLOY_HOOK_URL`) → Vercel rebuildea el frontend, que vuelve a incrustar los productos en el HTML. El catálogo público refleja el último build (más el refresh en segundo plano de la isla). Nota: el free tier de Render duerme el web service tras ~15 min; por eso el fetch del build reintenta y la carga pública no depende de que esté despierto.
