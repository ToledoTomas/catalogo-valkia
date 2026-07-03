# Edición completa de productos en el panel — Diseño

**Fecha:** 2026-07-03
**Estado:** Aprobado (pendiente revisión de spec)

## Problema

El panel `/admin` hoy permite **crear** productos (con varias fotos) y **borrarlos** en tanda, pero no **editarlos**. Si un producto ya existe y hay que corregir el nombre, cambiar la categoría, ajustar talles/colores o agregar/quitar fotos, no hay forma desde la UI.

## Alcance

Edición **completa** de un producto existente desde `/admin`: sus datos (nombre, descripción, categoría, talles, colores) **y** sus fotos (agregar nuevas / quitar existentes). Un solo usuario técnico (el dueño).

## Backend

Dos endpoints nuevos, ambos protegidos por `authenticateToken`. La edición de datos reutiliza el `PUT /api/products/:id` (`updateProduct`) que ya existe.

- **`POST /api/products/:id/images`** (multipart/form-data, `upload.array('images', 10)`):
  - Verifica que el producto existe (404 si no).
  - Sube cada `file.buffer` a Cloudinary con el helper `uploadToCloudinary` ya existente (`Promise.all`).
  - Crea las filas `Images` asociadas al producto.
  - Devuelve el producto actualizado con `include: { category: true, images: true }`, formato `{ success, data, message }`.

- **`DELETE /api/products/images/:imageId`**:
  - Verifica que la imagen existe (404 si no).
  - Borra la fila `Images`.
  - Devuelve `{ success, message }`.
  - **Nota:** solo se borra la fila en la base. La imagen queda en Cloudinary (mismo trade-off ya aceptado en el proyecto: no guardamos `public_id`, así que la limpieza en Cloudinary queda fuera de alcance).

## Admin UI

- **`ProductList.jsx`**: cada fila suma un botón **"Editar"** que dispara un callback `onEdit(productId)`.
- **`AdminPanel.jsx`**: suma un estado de vista `'edit'` con el `editingId`. `ProductList` recibe `onEdit`; al editar, cambia a la vista de edición. La vista de edición tiene un "← Volver" que regresa a la lista.
- **`ProductEdit.jsx`** (componente nuevo):
  - Al montar, hace `GET /api/products/:id` y pre-carga los campos.
  - Campos de texto: nombre, descripción, categoría (dropdown, con el "＋ nueva categoría" reutilizado del alta), talles y colores (con `TagInput`). Botón **"Guardar cambios"** → `PUT /api/products/:id` con `{ name, description, categoryId, sizes, colors }`.
  - **Sección de fotos** (gestión inmediata, independiente del "Guardar cambios"):
    - Muestra las imágenes actuales; cada una con una **"✕"** → confirm → `DELETE /api/products/images/:imageId` → recarga el producto.
    - Input **"Agregar fotos"** (múltiple) → `POST /api/products/:id/images` → recarga el producto.
  - Muestra errores devueltos por la API y un aviso de éxito al guardar.

## Reutilización

- `TagInput.jsx`, el dropdown de categorías + "nueva categoría" y el patrón de previews se comparten conceptualmente con `ProductForm.jsx`. Donde el código sea idéntico y valga la pena, extraer piezas comunes; si el costo de abstraer supera el beneficio, duplicar de forma controlada. No refactorizar `ProductForm` más allá de lo necesario.

## Fuera de alcance (YAGNI)

- Reordenar imágenes / marcar principal (se sigue usando `images[0]`).
- Borrado en Cloudinary de las imágenes eliminadas.
- Edición masiva de varios productos a la vez.

## Criterios de éxito

- Desde la lista, "Editar" abre un formulario pre-cargado con los datos reales del producto.
- Cambiar datos + "Guardar cambios" persiste vía `PUT`.
- Agregar y quitar fotos de un producto existente funciona y se refleja al instante.
- Los cambios se ven en el catálogo público (que hace fetch client-side).
