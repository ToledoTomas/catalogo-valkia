# Precio en productos — Diseño

**Fecha:** 2026-07-06

## Objetivo

Agregar un campo de **precio** a los productos del catálogo y reflejarlo en la UI pública (cards) y en el panel de administración (alta, edición y listado).

## Decisiones

- **Obligatorio:** todo producto debe tener precio. La validación real la fuerza Zod en la API.
- **Tipo de dato:** entero en pesos argentinos (ARS). Sin centavos, sin errores de redondeo.
- **Formato en UI:** `$12.500` — símbolo `$` + separador de miles con punto (`toLocaleString('es-AR')`).

## Alcance

### Base de datos (`server/prisma/schema.prisma`)

Agregar a `Product`:

```prisma
price Int @default(0)
```

El `@default(0)` permite que la migración corra sobre productos existentes (les asigna 0) sin fallar. La obligatoriedad para altas nuevas la garantiza Zod, no la base. Migración con `npm run db:migrate` seguida de `npm run db:generate`.

### Server

- **`src/utils/validation.ts`** — `createProductSchema` suma `price: z.coerce.number().int().nonnegative()`. El `coerce` convierte el string del form-data a número. `updateProductSchema` (`.partial()`) lo hereda como opcional.
- **`src/types/index.ts`** — `price: number` en `Product` y `CreateProductRequest`.
- **`src/controllers/productController.ts`:**
  - `createProduct`: agregar `price` al `data` del `create` (viene de la data validada).
  - `updateProduct`: ya pasa `updateData` completo, `price` fluye automáticamente.
  - `createProductWithImages` (ruta `/api/products/with-images`, la que usa el panel): agregar `price` al objeto que se valida y al `create`.
  - `createProductWithImage` (single-image, legacy): parsear `price` del body por consistencia.
- **`scripts/init.js`** — agregar `price` a los 2 productos de ejemplo.

### Client

- **`src/components/admin/ProductForm.jsx`** — input numérico "Precio (ARS)", se agrega al `FormData`. Validar `price > 0` antes de enviar.
- **`src/components/admin/ProductEdit.jsx`** — cargar el precio actual, input editable, incluirlo en el body del PUT.
- **`src/components/Card.jsx`** — recibir prop `price`, mostrarlo destacado debajo del nombre: `$${price.toLocaleString('es-AR')}`.
- **`src/components/GridCardsFilterIsland.jsx`** — pasar `price={item.price}` a la `Card`.
- **`src/components/admin/ProductList.jsx`** — mostrar el precio junto a la categoría en cada fila.

## Fuera de alcance

- Filtrar u ordenar por precio.
- Rango de precios.
- Descuentos / precio tachado.
- Moneda configurable (siempre ARS).

## Nota de entorno

La migración requiere la base de datos levantada (local: Docker en `:5434`). El código puede quedar listo y la migración correrse cuando la DB esté disponible.
