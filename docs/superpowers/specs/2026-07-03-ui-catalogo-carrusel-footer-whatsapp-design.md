# UI del catálogo: carrusel, footer, WhatsApp flotante — Diseño

**Fecha:** 2026-07-03
**Estado:** Aprobado (pendiente revisión de spec)

## Problema

Mejoras de UI del sitio público:
- Las tarjetas del catálogo muestran **solo la primera foto** de cada producto, aunque un producto puede tener varias.
- Falta un **footer**.
- La sección "Contacto" tiene un **cuadro de horarios** que no se quiere, y el botón de WhatsApp está embebido en esa sección en vez de estar siempre a mano.

## Alcance

Cambios **solo del cliente** (sitio público). No toca backend.

## Cambios

### 1. Carrusel minimalista en las tarjetas (`Card.jsx`)
- `Card.jsx` pasa a recibir el **array completo de imágenes** del producto (en vez de una sola `image`).
- Muestra un **carrusel minimalista**: contenedor con **scroll-snap horizontal** (swipe nativo en mobile) + **puntitos** (dots) debajo que indican y permiten saltar a cada foto. **Sin flechas, sin auto-reproducción.**
- El índice activo se deriva de la posición de scroll; click en un dot hace scroll a esa imagen.
- Si el producto no tiene imágenes, muestra el placeholder actual.
- El resto de la tarjeta (categoría, título, talles, colores) se mantiene igual.
- **`GridCardsFilterIsland.jsx`**: pasa `images={item.images}` (array) en lugar de `image={item.images[0]?.url}`. Se conservan `title`, `category`, `sizes`, `colors`.
- Implementación **propia y liviana**, sin librerías de carrusel externas.

### 2. Footer (`Footer.astro`, nuevo)
- Contenido: **"VALKIA · Indumentaria"**, línea de copyright **"© 2026 Valkia"**, e ícono-link a **Instagram** → `https://www.instagram.com/valkia.ind/` (abre en pestaña nueva, `rel="noopener noreferrer"`, ícono SVG inline).
- Estilo sobrio acorde a la paleta (beige/stone). Se agrega al final de la home.

### 3. Eliminar la sección "Contacto"
- Se saca `<Contacto />` de `index.astro` (elimina el cuadro de horarios y el WhatsApp embebido de una).
- `Contacto.astro` queda sin uso; se elimina el archivo.

### 4. WhatsApp flotante (`WhatsAppButton.astro`, nuevo)
- **Círculo fijo abajo a la derecha** (`position: fixed; bottom; right;`, `z-index` alto), siempre visible al scrollear.
- Ícono de WhatsApp (SVG, el mismo que ya se usa en `Contacto.astro`), fondo verde WhatsApp.
- Link a `https://wa.me/<numero>?text=<mensaje>` con el número (`3417565215`) y mensaje que ya estaban en `Contacto.astro`.
- Aparece en la **home** (sitio público). No en `/admin`.

### 5. Header (`Header.astro`)
- Se **quita el link "Contacto"** del menú (desktop y mobile), ya que la sección desaparece. Queda "Catálogo".

## Fuera de alcance (YAGNI)

- Lightbox / zoom de imágenes.
- Flechas o autoplay en el carrusel.
- Más redes que Instagram.

## Criterios de éxito

- Cada tarjeta con varias fotos muestra un carrusel navegable por puntitos y swipe.
- Hay un footer con nombre, copyright e Instagram funcional.
- Ya no existe la sección Contacto ni el cuadro de horarios.
- Un botón de WhatsApp circular acompaña siempre abajo a la derecha en la home.
- El menú ya no tiene "Contacto".
