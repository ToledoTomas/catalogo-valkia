# Panel de administración para carga de productos — Diseño

**Fecha:** 2026-07-03
**Estado:** Aprobado (pendiente revisión de spec)

## Problema

Hoy la única forma de cargar productos y sus fotos es pegándole a la API a mano (Postman): armar el `form-data`, el token JWT y los arrays de talles/colores manualmente. El usuario necesita ahora **borrar muchos productos y agregar muchos** (renovación de colección), y hacerlo así es lento y propenso a errores. El `client/` actual es solo el catálogo público; no existe ninguna UI de administración.

## Alcance

Lo usa **una sola persona técnica** (el dueño del proyecto). No se requiere una UI pulida para usuarios no técnicos, sino algo **rápido y a prueba de errores** para: (1) el borrado masivo actual, (2) el alta cómoda de muchos productos, (3) altas sueltas ocasionales a futuro.

## Decisiones tomadas

- **Opción elegida:** panel `/admin` mínimo dentro del mismo sitio Astro (no widget de Cloudinary directo, no script de importación).
- **Frescura del catálogo:** el catálogo público pasa a traer los productos **en el navegador** (client-side fetch), para que los cambios del panel se vean al instante sin rebuild.

## Arquitectura

### Frontend — página `/admin`

- **`client/src/pages/admin.astro`**: cascarón estático que monta una única isla React con `client:only="react"` (todo es dinámico y detrás de auth; no hay SSR ni fetch en build).
- **`AdminPanel.jsx`**: componente raíz que enruta entre 3 vistas por estado interno (no hay router; `useState` con la vista activa):
  1. **Login** — se muestra si no hay token válido.
  2. **Lista de productos** — borrado en tandas.
  3. **Alta de producto** — formulario con fotos múltiples.
- **`api.js`** (helper): wrapper de `fetch` que adjunta `Authorization: Bearer <token>` desde `localStorage` y centraliza la base URL (`PUBLIC_API_URL` con el mismo fallback que usa el catálogo). Ante 401/403 limpia el token y fuerza volver al login.

### Autenticación

- Formulario email + password → `POST /api/auth/login` → guarda el JWT en `localStorage` (clave, ej. `valkia_admin_token`).
- Si hay token, se saltea el login. Si una request protegida devuelve 401/403, se borra el token y se vuelve al login.
- **Modelo de seguridad:** es un gate del lado del cliente. Cualquiera puede cargar el JS de `/admin`, pero **sin JWT válido la API no devuelve ni permite mutar datos** (todas las mutaciones ya están protegidas por `authenticateToken`). Suficiente para uso personal.

### Vista Lista (borrar muchos)

- `GET /api/products` (sin `limit` → devuelve todos) → grilla/tabla con miniatura (`images[0].url`), nombre y categoría.
- **Checkbox por fila** + "Seleccionar todos".
- Botón **"Eliminar seleccionados"** con confirmación → itera `DELETE /api/products/:id` (las imágenes caen en cascada por el schema). Indicador de progreso simple ("borrando 3/12"). Al terminar, refresca la lista.

### Vista Alta (agregar muchos)

Formulario con:
- **Nombre**, **descripción** (texto).
- **Categoría**: dropdown poblado con `GET /api/categories`, más un control inline **"＋ nueva categoría"** que hace `POST /api/categories` y agrega la opción al vuelo (necesario para la colección nueva).
- **Talles** y **colores**: inputs tipo "tags" (escribir + Enter genera chips removibles). Se envían como arrays.
- **Fotos**: `<input type="file" multiple accept="image/*">` con **arrastrar-soltar y preview** de las imágenes seleccionadas (miniaturas con opción de quitar antes de subir).
- **Submit** → nuevo endpoint multipart (ver abajo) → crea el producto con todas sus fotos en una sola llamada. Tras éxito: limpia el formulario y deja el foco listo para el siguiente alta (carga rápida en serie). Muestra errores de validación devueltos por la API.

## Cambio de backend

Nuevo endpoint, protegido por `authenticateToken`:

```
POST /api/products/with-images   (multipart/form-data)
```

- Middleware `upload.array('images', 10)` (multer en memoria, ya configurado).
- Campos: `name`, `description`, `categoryId`, `sizes`, `colors` (los arrays llegan como JSON string o campos repetidos; se parsean igual que en el `createProductWithImage` actual).
- Sube cada `file.buffer` a Cloudinary mediante un helper promisificado nuevo:
  ```ts
  function uploadToCloudinary(buffer: Buffer): Promise<string> // devuelve secure_url
  ```
  envolviendo `cloudinary.uploader.upload_stream` en una `Promise`, y resolviendo todas con `Promise.all`.
- Crea el producto y sus `images` en una **transacción Prisma** (`prisma.$transaction`).
- Valida con Zod (reutilizar/extender `createProductSchema`; las imágenes vienen como archivos, no URLs, así que la validación de `images` aplica a los campos de texto).
- Responde con el formato uniforme `{ success, data, message }`.

Los endpoints existentes (`createProduct`, `createProductWithImage`, `uploadProductImage`) quedan intactos.

## Cambio en el catálogo público (frescura instantánea)

- **`GridCardsFilterIsland.jsx`** pasa a ser el dueño de los datos: hace `fetch` a `/api/products` en un `useEffect` al montar, con estados de **cargando / vacío / error**. Deriva las categorías desde los productos traídos (como ya hace).
- **`index.astro`**: se elimina el `fetch` de build-time y el paso de `products` por props.
- **`GridCards.astro`**: deja de recibir/propagar `products`; solo renderiza la sección y la isla (que ahora se auto-abastece). Las categorías ya no se calculan en Astro sino dentro de la isla.
- Resultado: el sitio sigue siendo estático pero muestra siempre data fresca; lo que se carga/borra en `/admin` se ve sin rebuild.

## Fuera de alcance (YAGNI)

- Edición de productos existentes (solo alta y borrado por ahora).
- Gestión de múltiples usuarios/roles.
- Reordenar imágenes o marcar imagen principal (se usa `images[0]`).
- Paginación en la lista del panel (se listan todos).

## Criterios de éxito

- Poder loguearse una vez y quedar logueado.
- Seleccionar y borrar varios productos de una.
- Crear un producto con varias fotos en una sola operación, incluyendo crear una categoría nueva si hace falta.
- Ver los cambios reflejados en el catálogo público sin redeploy.
