// Dispara un rebuild del frontend estático en Vercel posteando a su Deploy Hook.
//
// El catálogo público de Astro incrusta los productos en tiempo de build
// (ver client/src/components/GridCards.astro). Cuando el admin cambia productos
// o renombra categorías, el HTML estático queda desactualizado hasta el próximo
// build. Este helper dispara ese build automáticamente.
//
// - Es fire-and-forget: nunca bloquea ni rompe la respuesta de la API.
// - Si DEPLOY_HOOK_URL no está seteada (p. ej. en desarrollo local), es un no-op.
// - Debounce: si se hacen varias mutaciones seguidas (crear producto + subir
//   imágenes, borrar varios, etc.), se coalescen en un único rebuild para no
//   gastar builds de más.

const DEBOUNCE_MS = 10_000;

let pending: NodeJS.Timeout | null = null;

export function triggerDeploy(reason: string): void {
  const url = process.env.DEPLOY_HOOK_URL;
  if (!url) return; // Sin hook configurado (local): no hacemos nada.

  // Coalesce ráfagas de cambios en un solo rebuild.
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    fetch(url, { method: 'POST' })
      .then((res) => {
        if (res.ok) {
          console.log(`🚀 [deploy-hook] rebuild disparado — ${reason}`);
        } else {
          console.error(`[deploy-hook] rebuild falló (HTTP ${res.status}) — ${reason}`);
        }
      })
      .catch((err) => {
        console.error(`[deploy-hook] error posteando al hook — ${reason}:`, err?.message);
      });
  }, DEBOUNCE_MS);

  // No mantener vivo el proceso solo por este timer pendiente.
  pending.unref();
}
