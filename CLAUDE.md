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
- **Prisma generado:** el cliente se genera en `server/generated/prisma` (no en `node_modules`), y ese directorio **está commiteado**. Importar siempre desde `../generated/prisma`, no desde `@prisma/client`.

### Modelo de datos (`server/prisma/schema.prisma`)
`Product` (name, description, `sizes[]`, `colors[]`) → N:1 `Category` (name único) → 1:N `Images` (URLs de Cloudinary). `Admin` (email único + password hasheada) es independiente. Los borrados de Product/Category cascadean a Images.

### Client — Astro + islas de React + Tailwind 4
- Sitio de una sola página: `src/pages/index.astro` compone `Header`, `Hero`, `GridCards` y `Contacto`.
- **Fetch de datos en build/SSR:** `index.astro` hace `fetch` a la API (`PUBLIC_API_URL` o el fallback hardcodeado `https://catalogo-valkia.onrender.com`) y pasa los productos como props. Cambiar el fallback si se apunta a otro backend.
- **Interactividad:** casi todo es Astro estático. La única isla React es `GridCardsFilterIsland.jsx` (`client:load`), que filtra por categoría **en el cliente** sobre los productos ya cargados. Las categorías se derivan de los productos, no de un fetch aparte.
- Tailwind 4 se integra vía el plugin de Vite (`astro.config.mjs`), no vía config file tradicional.

## Configuración / entorno

- **Server** (`server/env.example`): `DATABASE_URL` (Postgres), `PORT`, `NODE_ENV`, `JWT_SECRET`, más las credenciales de Cloudinary (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) que consume `index.ts`. `JWT_SECRET` es obligatorio: sin él, la generación/validación de tokens tira error.
- **Client:** `PUBLIC_API_URL` para apuntar a la API.

## Despliegue

El backend corre en **Render** (`https://catalogo-valkia.onrender.com`) vía `npm run build` + `npm start`. El frontend consume esa URL pública.
