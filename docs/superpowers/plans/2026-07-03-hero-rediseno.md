# Rediseño del Hero — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el hero actual por uno inmersivo full-bleed, con la foto de portada sin lavar, contenido alineado a la izquierda en texto espresso, sin emojis, manteniendo el copy y el botón "Ver Catálogo".

**Architecture:** Es un cambio contenido en un solo componente Astro (`Hero.astro`). Se reemplaza el overlay blanco plano por un gradiente cálido de izquierda a derecha, se reposiciona el contenido a la izquierda sobre el espacio negativo de la foto, se recolorea el texto a marrón espresso y se elimina la fila de features con emojis. Se conservan la animación `fade-in-up` y el script de scroll suave.

**Tech Stack:** Astro 5 + Tailwind 4.

> **Nota sobre verificación:** cambio puramente visual, sin tests. La verificación es visual en el navegador (`cd client && npm run dev` → `http://localhost:4321/`), en desktop y mobile (responsive).

---

## File Structure

- Modify `client/src/components/Hero.astro` — único archivo afectado. Reemplazo completo de la sección; se conserva el `<style>` de la animación y el `<script>` de scroll.

---

## Task 1: Rediseñar el Hero

**Files:**
- Modify: `client/src/components/Hero.astro`

- [ ] **Step 1: Reemplazar el markup del hero**

Reemplazar el contenido completo de `client/src/components/Hero.astro` por lo siguiente. Los cambios respecto del original: overlay pasa a gradiente cálido izq→der (crema opaco a la izquierda, transparente a la derecha); contenido alineado a la izquierda; texto en tonos `stone` (espresso/marrón); se elimina por completo la fila de "features" con emojis; se conservan el botón "Ver Catálogo", la animación `fade-in-up` y el script de scroll.

```astro
<section class="relative h-screen min-h-[600px] overflow-hidden flex items-center">
    <!-- Background Image -->
    <div class="absolute inset-0 z-0">
      <img 
        src="/Portada.jpg" 
        alt="Indumentaria femenina Valkia" 
        class="w-full h-full object-cover object-center"
      />
      <!-- Overlay: gradiente cálido, más opaco a la izquierda para legibilidad, transparente a la derecha para no tapar la ropa -->
      <div class="absolute inset-0 bg-gradient-to-r from-stone-100/90 via-stone-100/50 to-transparent"></div>
    </div>
    
    <!-- Content -->
    <div class="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-8">
      <div class="max-w-xl animate-fade-in-up">
        <!-- Title -->
        <h1 class="text-4xl md:text-5xl lg:text-6xl font-light leading-tight text-stone-800 mb-6 tracking-tight">
          Viví la esencia
          <span class="block font-normal text-stone-900">
            VALKIA
          </span>
        </h1>
        
        <!-- Description -->
        <p class="text-lg md:text-xl leading-relaxed text-stone-700 mb-10 max-w-md">
          Descubrí nuestra colección de indumentaria femenina.
        </p>
        
        <!-- CTA -->
        <button id="ver-catalogo-btn" class="group bg-stone-900 text-white px-8 py-4 rounded-full font-medium transition-all duration-300 hover:bg-stone-800 hover:shadow-lg hover:-translate-y-0.5 flex items-center justify-center gap-2 min-w-[200px] cursor-pointer">
          Ver Catálogo
          <svg class="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14m-7-7l7 7-7 7"/>
          </svg>
        </button>
      </div>
    </div>
  </section>
  
  <style>
    @keyframes fade-in-up {
      from {
        opacity: 0;
        transform: translateY(40px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  
    .animate-fade-in-up {
      animation: fade-in-up 1s ease-out;
    }
  </style>

  <script>
    // Smooth scroll functionality for "Ver Catálogo" button
    const verCatalogoBtn = document.getElementById('ver-catalogo-btn');
    
    verCatalogoBtn?.addEventListener('click', () => {
      const catalogoSection = document.getElementById('catalogo');
      if (catalogoSection) {
        catalogoSection.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  </script>
```

- [ ] **Step 2: Verificar en el navegador (desktop)**

Run: `cd client && npm run dev`
Abrir `http://localhost:4321/` y verificar:
- La foto de portada se ve con fuerza (sin el lavado blanco anterior).
- El contenido está a la izquierda, sobre la zona calma (pared/plumas), legible.
- El texto es marrón espresso, no negro puro ni blanco.
- No hay emojis ni fila de features.
- El botón "Ver Catálogo" hace scroll suave hasta el catálogo.

Expected: hero inmersivo, texto legible sobre el espacio negativo izquierdo.

- [ ] **Step 3: Verificar responsive (mobile)**

En las DevTools del navegador, activar vista mobile (ej. 390px de ancho) y verificar:
- El contenido de la izquierda sigue legible.
- El gradiente cubre lo suficiente para que el texto no compita con la ropa a la derecha.

Expected: legible y prolijo en mobile.

> Si en mobile la ropa de la derecha quedara detrás del texto y molestara, ajustar el overlay a un gradiente vertical en breakpoints chicos, ej. cambiar la clase del overlay por `bg-gradient-to-r from-stone-100/90 via-stone-100/50 to-transparent max-md:bg-gradient-to-t max-md:from-stone-100/95 max-md:via-stone-100/70 max-md:to-stone-100/30`. Aplicar solo si hace falta tras la verificación visual.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/Hero.astro
git commit -m "feat(client): rediseno del hero inmersivo full-bleed sin emojis"
```

---

## Verificación final

- [ ] `cd client && npm run build` compila sin errores.
- [ ] El hero se ve bien en desktop y mobile, sin emojis, con la foto protagonista y el copy "Viví la esencia VALKIA".
