# Rediseño del Hero — Diseño

**Fecha:** 2026-07-03
**Estado:** Aprobado (pendiente revisión de spec)

## Problema

El hero actual (`client/src/components/Hero.astro`) no gusta: usa **emojis** (✨ 👗 📱) en una fila de "features" y tiene un **overlay blanco plano muy fuerte** (`from-white/90 via-white/80 to-white/70`) que lava la foto de portada. Se quiere un **rediseño completo**, no un retoque.

## Dirección elegida

**Inmersivo full-bleed**: la foto ocupa todo el viewport con overlay sutil y el contenido encima.

## Contexto visual (la foto define el layout)

`public/Portada.jpg` es una imagen **cálida y luminosa**: perchero con tejidos en tonos beige/tostado/óxido a la derecha, y pampas grass sobre pared crema a la izquierda.

- El **tercio izquierdo es espacio negativo limpio** (pared + plumas).
- La **derecha es la zona cargada** (la ropa).

Consecuencias de diseño:
- **Texto blanco no funciona** (imagen clara) → se usa texto oscuro cálido.
- **Centrar el texto lo pondría sobre la ropa** (zona ocupada) → el contenido va **alineado a la izquierda**, sobre el espacio calmo.

## Diseño

### Composición
- `Portada.jpg` cubriendo todo el viewport (`h-screen min-h-[600px]`, `object-cover object-center`), **sin lavarla**.
- Overlay en **gradiente cálido de izquierda a derecha**: crema semi-opaco a la izquierda (legibilidad del texto) → transparente a la derecha (la ropa se ve nítida). Reemplaza el overlay blanco plano actual.
- Contenido **alineado a la izquierda**, centrado verticalmente, sobre las plumas/pared.

### Texto y color
- Tipografía en **espresso / marrón oscuro** (tomado del caño de madera y el tejido óxido de la foto), no negro puro ni blanco — integrado con la paleta beige/tierra del sitio.
- **Headline** grande y fino, se mantiene el copy actual: **"Viví la esencia VALKIA"** con "VALKIA" destacado.
- **Bajada**: una sola línea, más corta y sobria que la actual.

### CTA
- Un único botón fuerte **"Ver Catálogo"** con el scroll suave a `#catalogo` que ya existe (se conserva el script). Sin segundo botón que compita.

### Fila de features / emojis
- **Se elimina por completo.** No se reemplaza por nada (decisión (a)): el hero respira, estilo más editorial.

### Animación
- Se conserva el `fade-in-up` suave existente.

## Fuera de alcance (YAGNI)

- Cambiar la foto de portada.
- Reescribir el copy del headline (se mantiene).
- Tocar el resto de las secciones (Header, GridCards, Contacto).

## Criterios de éxito

- El hero muestra la foto de portada con fuerza (sin el lavado blanco actual).
- No hay emojis.
- El texto se lee con claridad sobre el espacio negativo izquierdo y armoniza con la paleta.
- El botón "Ver Catálogo" mantiene el scroll suave.
- Responsive: en mobile el contenido sigue legible (el gradiente/overlay se adapta para no competir con la ropa).
