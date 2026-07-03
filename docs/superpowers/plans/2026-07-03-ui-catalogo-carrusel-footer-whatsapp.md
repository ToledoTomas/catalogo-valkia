# UI del catálogo: carrusel, footer, WhatsApp flotante — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mostrar un carrusel de fotos por producto en el catálogo, agregar un footer simple con Instagram, eliminar la sección Contacto (con su cuadro de horarios) y poner el WhatsApp como botón circular flotante siempre visible.

**Architecture:** Cambios solo en el cliente. `Card.jsx` incorpora un carrusel propio (scroll-snap + dots, sin librerías). Nuevos componentes Astro `Footer.astro` y `WhatsAppButton.astro`. `index.astro` deja de renderizar `Contacto` y suma footer + botón flotante. `Header.astro` pierde el link "Contacto".

**Tech Stack:** Astro 5 + React 19 + Tailwind 4.

> **Nota sobre verificación:** cambios visuales, sin tests. Verificación: `cd client && npm run build` y prueba en el navegador (`npm run dev`, desktop + mobile).

---

## File Structure

- Modify `client/src/components/Card.jsx` — carrusel minimalista (scroll-snap + dots).
- Modify `client/src/components/GridCardsFilterIsland.jsx` — pasar `images` (array) a `Card`.
- Create `client/src/components/Footer.astro` — footer con nombre, copyright, Instagram.
- Create `client/src/components/WhatsAppButton.astro` — FAB circular fijo abajo a la derecha.
- Modify `client/src/pages/index.astro` — sacar `Contacto`, sumar `Footer` + `WhatsAppButton`.
- Modify `client/src/components/Header.astro` — quitar el link "Contacto".
- Delete `client/src/components/Contacto.astro` — ya no se usa.

---

## Task 1: Carrusel minimalista en `Card.jsx`

**Files:**
- Modify: `client/src/components/Card.jsx`
- Modify: `client/src/components/GridCardsFilterIsland.jsx`

- [ ] **Step 1: Reescribir `Card.jsx` con el carrusel**

Reemplazar el contenido completo de `client/src/components/Card.jsx` por:

```jsx
import { useState, useRef } from 'react';

export default function Card({ images = [], title, category, alt, sizes = [], colors = [] }) {
  const list = images.length > 0 ? images : [{ url: '/placeholder.svg' }];
  const [active, setActive] = useState(0);
  const scrollerRef = useRef(null);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <article className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="aspect-[3/4] flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {list.map((img, i) => (
            <img
              key={i}
              src={img.url || '/placeholder.svg'}
              alt={alt || title}
              className="h-full w-full flex-shrink-0 snap-center object-cover"
              loading="lazy"
            />
          ))}
        </div>
        {list.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir a la foto ${i + 1}`}
                className={`h-2 w-2 rounded-full shadow transition-colors ${i === active ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-primary-800 uppercase tracking-wide">
            {category}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-primary-900 mb-2 line-clamp-2">
          {title}
        </h3>
        {/* Talles */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-primary-600">Talles:</span>
          <span className="text-sm font-medium text-primary-800 capitalize">
            {sizes.length > 0 ? sizes.join(', ') : 'N/A'}
          </span>
        </div>
        {/* Colores */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-primary-600">Colores:</span>
          <div className="flex items-center gap-2">
            {colors.length > 0 ? colors.map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border-2 border-primary-200"
                style={{ backgroundColor: c.toLowerCase() }}
              ></div>
            )) : <span className="text-sm font-medium text-primary-800 capitalize">N/A</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Pasar el array de imágenes desde la isla**

En `client/src/components/GridCardsFilterIsland.jsx`, en el `.map` que renderiza las `Card`, reemplazar el bloque:

```jsx
          <Card
            key={item.id}
            image={item.images[0]?.url || '/placeholder.svg'}
            title={item.name}
            color={item.colors[0] || 'N/A'}
            category={item.category.name}
            sizes={item.sizes}
            colors={item.colors}
          />
```

por:

```jsx
          <Card
            key={item.id}
            images={item.images}
            title={item.name}
            category={item.category.name}
            sizes={item.sizes}
            colors={item.colors}
          />
```

- [ ] **Step 3: Verificar build**

Run: `cd client && npm run build`
Expected: build exitoso.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Card.jsx client/src/components/GridCardsFilterIsland.jsx
git commit -m "feat(client): carrusel de fotos en las tarjetas del catalogo"
```

---

## Task 2: Footer

**Files:**
- Create: `client/src/components/Footer.astro`

- [ ] **Step 1: Crear el footer**

Crear `client/src/components/Footer.astro`:

```astro
---
---

<footer class="bg-white border-t border-beige-200">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
    <div class="flex flex-col items-center sm:items-start">
      <span class="text-lg font-bold text-elegant-black leading-tight">VALKIA</span>
      <span class="text-xs text-beige-700 font-modern uppercase tracking-wide">Indumentaria</span>
    </div>

    <a
      href="https://www.instagram.com/valkia.ind/"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Instagram de Valkia"
      class="text-beige-700 hover:text-primary-800 transition-colors"
    >
      <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    </a>

    <p class="text-xs text-beige-700">© 2026 Valkia. Todos los derechos reservados.</p>
  </div>
</footer>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/Footer.astro
git commit -m "feat(client): footer con nombre, copyright e instagram"
```

---

## Task 3: Botón de WhatsApp flotante

**Files:**
- Create: `client/src/components/WhatsAppButton.astro`

- [ ] **Step 1: Crear el FAB**

Crear `client/src/components/WhatsAppButton.astro` (usa el mismo número y mensaje que tenía `Contacto.astro`):

```astro
---
const whatsappNumber = "3417565215";
const message = "¡Hola! Me interesa conocer más sobre sus productos🤍";
const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
---

<a
  href={whatsappUrl}
  target="_blank"
  rel="noopener noreferrer"
  aria-label="Escribinos por WhatsApp"
  class="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 rounded-full bg-whatsapp-500 text-white shadow-lg shadow-whatsapp-500/30 transition-all duration-300 hover:bg-whatsapp-600 hover:-translate-y-1"
>
  <svg class="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.864 3.687"/>
  </svg>
</a>
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/WhatsAppButton.astro
git commit -m "feat(client): boton de whatsapp flotante"
```

---

## Task 4: Integrar en la home, sacar Contacto y limpiar el header

**Files:**
- Modify: `client/src/pages/index.astro`
- Modify: `client/src/components/Header.astro`
- Delete: `client/src/components/Contacto.astro`

- [ ] **Step 1: Actualizar `index.astro`**

Reemplazar el contenido completo de `client/src/pages/index.astro` por:

```astro
---
import Layout from '../layouts/Layout.astro';
import "../styles/global.css";
import Header from "../components/Header.astro";
import GridCards from '../components/GridCards.astro';
import Hero from '../components/Hero.astro';
import Footer from '../components/Footer.astro';
import WhatsAppButton from '../components/WhatsAppButton.astro';
---

<Layout>
	<Header/>
    <Hero />
    <GridCards />
    <Footer />
    <WhatsAppButton />
</Layout>
```

- [ ] **Step 2: Quitar el link "Contacto" del header (desktop)**

En `client/src/components/Header.astro`, eliminar este bloque (nav desktop):

```astro
        <a href="#contacto" class="text-elegant-black hover:text-beige-600 font-modern text-sm font-medium transition-colors duration-200 relative group">
          Contacto
          <span class="absolute -bottom-1 left-0 w-0 h-0.5 bg-beige-400 transition-all duration-300 group-hover:w-full"></span>
        </a>
```

- [ ] **Step 3: Quitar el link "Contacto" del header (mobile)**

En `client/src/components/Header.astro`, eliminar este bloque (menú mobile):

```astro
        <a href="#contacto" class="text-elegant-black hover:text-beige-600 font-modern text-base font-medium transition-colors duration-200 px-2">
          Contacto
        </a>
```

- [ ] **Step 4: Borrar `Contacto.astro`**

```bash
git rm client/src/components/Contacto.astro
```

- [ ] **Step 5: Verificar build**

Run: `cd client && npm run build`
Expected: build exitoso (sin referencias colgadas a `Contacto`).

- [ ] **Step 6: Verificar en el navegador (con API + front corriendo)**

Abrir `http://localhost:4321/`:
- Las tarjetas con varias fotos muestran carrusel (puntitos + swipe en mobile); las de una sola foto no muestran puntitos.
- Hay footer con nombre, © 2026 e Instagram (abre en pestaña nueva).
- No existe la sección Contacto ni el cuadro de horarios.
- El botón circular de WhatsApp queda fijo abajo a la derecha y acompaña al scrollear.
- El menú del header ya no tiene "Contacto"; sí "Catálogo".
- En `http://localhost:4321/admin` NO aparece el botón flotante.

Expected: todo correcto en desktop y mobile.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/index.astro client/src/components/Header.astro
git commit -m "feat(client): sumar footer y whatsapp flotante, quitar seccion contacto del home y del menu"
```

---

## Verificación final

- [ ] `cd client && npm run build` compila sin errores.
- [ ] Carrusel, footer, WhatsApp flotante y ausencia de Contacto verificados en navegador (desktop + mobile).
