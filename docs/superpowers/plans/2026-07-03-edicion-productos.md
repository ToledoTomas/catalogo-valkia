# Edición completa de productos en el panel — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir editar productos existentes desde `/admin`: datos (nombre, descripción, categoría, talles, colores) y fotos (agregar/quitar).

**Architecture:** Dos endpoints backend nuevos (agregar imágenes a un producto; borrar una imagen), reutilizando el `PUT /api/products/:id` existente para los datos. En el frontend, un botón "Editar" por producto en la lista y una vista `ProductEdit.jsx` que precarga el producto, guarda los datos con "Guardar cambios" y gestiona las fotos de forma inmediata.

**Tech Stack:** Express + TypeScript + Prisma + Cloudinary + multer (backend); Astro 5 + React 19 + Tailwind 4 (frontend).

> **Nota sobre verificación:** el repo no tiene runner de tests. Verificación: backend con `npx tsc --noEmit` (server) y smoke test con `curl` contra la API local; frontend con `npm run build` (client) y prueba en el navegador. Prerrequisito para smoke tests: API local corriendo contra una base con al menos un producto (ver planes previos / entorno local).

---

## File Structure

**Backend:**
- Modify `server/src/controllers/productController.ts` — `addProductImages` + `deleteProductImage`.
- Modify `server/src/routes/products.ts` — rutas `POST /:id/images` y `DELETE /images/:imageId`.

**Frontend:**
- Create `client/src/components/admin/ProductEdit.jsx` — vista de edición.
- Modify `client/src/components/admin/ProductList.jsx` — botón "Editar" + prop `onEdit`.
- Modify `client/src/components/AdminPanel.jsx` — estado de vista `'edit'` + `editingId`.

---

## Task 1: Endpoints backend (agregar imágenes / borrar imagen)

**Files:**
- Modify: `server/src/controllers/productController.ts`
- Modify: `server/src/routes/products.ts`

- [ ] **Step 1: Agregar el controller `addProductImages` al final de `productController.ts`**

```ts
export const addProductImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const files = (req.files as Express.Multer.File[]) || [];

    if (files.length === 0) {
      res.status(400).json({ success: false, error: 'No se enviaron imágenes' });
      return;
    }

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ success: false, error: 'Producto no encontrado' });
      return;
    }

    const urls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

    await prisma.images.createMany({
      data: urls.map((url) => ({ url, productId: id }))
    });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { category: true, images: true }
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Imágenes agregadas exitosamente'
    });
  } catch (error) {
    console.error('Error adding product images:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
```

> `uploadToCloudinary`, `prisma`, `Request`, `Response` ya están disponibles en el archivo.

- [ ] **Step 2: Agregar el controller `deleteProductImage` al final de `productController.ts`**

```ts
export const deleteProductImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const { imageId } = req.params;

    const image = await prisma.images.findUnique({ where: { id: imageId } });
    if (!image) {
      res.status(404).json({ success: false, error: 'Imagen no encontrada' });
      return;
    }

    await prisma.images.delete({ where: { id: imageId } });

    res.json({ success: true, message: 'Imagen eliminada exitosamente' });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
```

> Nota (por diseño): solo se borra la fila en la base; la imagen queda en Cloudinary.

- [ ] **Step 3: Registrar las rutas en `products.ts`**

Agregar los dos controllers al import:

```ts
import {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  upload,
  uploadProductImage,
  createProductWithImage,
  createProductWithImages,
  addProductImages,
  deleteProductImage
} from '../controllers/productController';
```

Agregar las rutas (protegidas). **Importante:** la ruta `DELETE /images/:imageId` debe ir declarada **antes** de `DELETE /:id` para que `/images/...` no sea capturado por `:id`:

```ts
// Imágenes de un producto existente (edición)
router.post('/:id/images', authenticateToken, upload.array('images', 10), addProductImages);
router.delete('/images/:imageId', authenticateToken, deleteProductImage);
```

Colocar esas dos líneas **arriba** de la línea existente `router.delete('/:id', authenticateToken, deleteProduct);`.

- [ ] **Step 4: Verificar typecheck**

Run: `cd server && npx tsc --noEmit`
Expected: sin errores.

- [ ] **Step 5: Smoke test con curl (API local corriendo, con un producto existente)**

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login -H "Content-Type: application/json" -d '{"email":"admin@valkia.com","password":"admin123"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
# Tomar un id de producto existente:
PID=$(curl -s http://localhost:3001/api/products | sed -n 's/.*"data":\[{"id":"\([^"]*\)".*/\1/p')
echo "producto: $PID"
# Agregar una imagen (usar una imagen real ./foto.jpg):
curl -s -X POST "http://localhost:3001/api/products/$PID/images" -H "Authorization: Bearer $TOKEN" -F "images=@./foto.jpg" | head -c 400
```
Expected: `{"success":true,"data":{...,"images":[...]},"message":"Imágenes agregadas exitosamente"}`. Luego, tomar un `imageId` de esa respuesta y:
```bash
curl -s -X DELETE "http://localhost:3001/api/products/images/<IMAGE_ID>" -H "Authorization: Bearer $TOKEN"
```
Expected: `{"success":true,"message":"Imagen eliminada exitosamente"}`.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/productController.ts server/src/routes/products.ts
git commit -m "feat(server): endpoints para agregar y borrar imagenes de un producto"
```

---

## Task 2: Vista de edición en el panel (`ProductEdit.jsx`)

**Files:**
- Create: `client/src/components/admin/ProductEdit.jsx`

- [ ] **Step 1: Crear el componente**

Crear `client/src/components/admin/ProductEdit.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';
import TagInput from './TagInput.jsx';

export default function ProductEdit({ productId, onBack }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [images, setImages] = useState([]); // [{ id, url }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
    loadProduct();
  }, [productId]);

  async function loadCategories() {
    try {
      const res = await apiFetch('/api/categories');
      const data = await res.json();
      setCategories(data.data || []);
    } catch (e) {
      setError('No se pudieron cargar las categorías');
    }
  }

  async function loadProduct() {
    setLoading(true);
    try {
      const res = await apiFetch(`/api/products/${productId}`);
      const data = await res.json();
      const p = data.data;
      setName(p.name);
      setDescription(p.description);
      setCategoryId(p.categoryId);
      setSizes(p.sizes || []);
      setColors(p.colors || []);
      setImages(p.images || []);
    } catch (e) {
      setError('No se pudo cargar el producto');
    } finally {
      setLoading(false);
    }
  }

  async function addCategory() {
    const nombre = newCategory.trim();
    if (!nombre) return;
    try {
      const res = await apiFetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nombre })
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'No se pudo crear la categoría');
        return;
      }
      setCategories((prev) => [...prev, data.data]);
      setCategoryId(data.data.id);
      setNewCategory('');
    } catch (e) {
      setError('No se pudo crear la categoría');
    }
  }

  async function saveFields(e) {
    e.preventDefault();
    setError('');
    setOk('');
    if (!categoryId) return setError('Elegí una categoría');
    if (sizes.length === 0) return setError('Agregá al menos un talle');
    if (colors.length === 0) return setError('Agregá al menos un color');
    setSaving(true);
    try {
      const res = await apiFetch(`/api/products/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description, categoryId, sizes, colors })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudieron guardar los cambios');
        return;
      }
      setOk('Cambios guardados ✓');
    } catch (err) {
      setError('Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function removeImage(imageId) {
    if (!confirm('¿Quitar esta foto?')) return;
    try {
      const res = await apiFetch(`/api/products/images/${imageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'No se pudo quitar la foto');
        return;
      }
      await loadProduct();
    } catch (e) {
      setError('No se pudo quitar la foto');
    }
  }

  async function addImages(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const res = await apiFetch(`/api/products/${productId}/images`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudieron agregar las fotos');
        return;
      }
      await loadProduct();
    } catch (err) {
      setError('No se pudieron agregar las fotos');
    } finally {
      e.target.value = '';
    }
  }

  if (loading) return <p className="text-center text-gray-500 py-12">Cargando producto…</p>;

  return (
    <div className="max-w-2xl space-y-6">
      <button type="button" onClick={onBack} className="text-sm text-gray-600 hover:text-gray-900">
        ← Volver
      </button>

      <form onSubmit={saveFields} className="space-y-5 bg-white rounded-lg border border-gray-200 p-6">
        {error && <p className="text-sm text-red-600">{error}</p>}
        {ok && <p className="text-sm text-green-600">{ok}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">— Elegir —</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCategory();
                }
              }}
              placeholder="Nueva categoría"
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
            />
            <button type="button" onClick={addCategory} className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700">
              ＋ Crear
            </button>
          </div>
        </div>

        <TagInput label="Talles" tags={sizes} setTags={setSizes} placeholder="Ej: S, M, L" />
        <TagInput label="Colores" tags={colors} setTags={setColors} placeholder="Ej: Beige, Óxido" />

        <button type="submit" disabled={saving} className="rounded bg-gray-800 px-6 py-2 text-white text-sm hover:bg-gray-700 disabled:opacity-50">
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Fotos</h3>
        <div className="flex flex-wrap gap-3 mb-4">
          {images.length === 0 && <p className="text-sm text-gray-500">Sin fotos.</p>}
          {images.map((img) => (
            <div key={img.id} className="relative">
              <img src={img.url} alt="" className="h-20 w-20 rounded object-cover" />
              <button
                type="button"
                onClick={() => removeImage(img.id)}
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 text-white text-xs"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <label className="inline-block text-sm text-gray-700">
          <span className="rounded bg-gray-800 px-4 py-2 text-white cursor-pointer hover:bg-gray-700">Agregar fotos</span>
          <input type="file" accept="image/*" multiple onChange={addImages} className="hidden" />
        </label>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/ProductEdit.jsx
git commit -m "feat(client): vista de edicion de producto"
```

---

## Task 3: Integrar la edición en la lista y el panel

**Files:**
- Modify: `client/src/components/admin/ProductList.jsx`
- Modify: `client/src/components/AdminPanel.jsx`

- [ ] **Step 1: Agregar el botón "Editar" y la prop `onEdit` en `ProductList.jsx`**

Cambiar la firma del componente para aceptar `onEdit`:

```jsx
export default function ProductList({ onEdit }) {
```

En el `<li>` de cada producto, agregar un botón "Editar" a la derecha del bloque de nombre/categoría. Reemplazar el `<li>` actual por:

```jsx
            <li key={p.id} className="flex items-center gap-4 p-3">
              <input
                type="checkbox"
                checked={selected.has(p.id)}
                onChange={() => toggle(p.id)}
              />
              <img
                src={p.images[0]?.url || '/placeholder.svg'}
                alt={p.name}
                className="h-14 w-14 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{p.name}</p>
                <p className="text-sm text-gray-500">{p.category?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(p.id)}
                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                Editar
              </button>
            </li>
```

- [ ] **Step 2: Manejar la vista de edición en `AdminPanel.jsx`**

Importar `ProductEdit` y agregar estado para el producto en edición. Reemplazar el contenido completo de `client/src/components/AdminPanel.jsx` por:

```jsx
import { useState, useEffect } from 'react';
import { getToken, clearToken } from '../lib/api.js';
import LoginForm from './admin/LoginForm.jsx';
import ProductList from './admin/ProductList.jsx';
import ProductForm from './admin/ProductForm.jsx';
import ProductEdit from './admin/ProductEdit.jsx';

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener('valkia-unauthorized', onUnauthorized);
    return () => window.removeEventListener('valkia-unauthorized', onUnauthorized);
  }, []);

  if (!ready) return null;

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  const tabClass = (active) =>
    `px-4 py-2 rounded text-sm ${active ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;

  function startEdit(id) {
    setEditingId(id);
    setView('edit');
  }

  return (
    <div className="min-h-screen bg-primary-50">
      <div className="max-w-5xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin · Valkia</h1>
          <div className="flex gap-2">
            <button className={tabClass(view === 'list')} onClick={() => setView('list')}>
              Productos
            </button>
            <button className={tabClass(view === 'create')} onClick={() => setView('create')}>
              Nuevo producto
            </button>
            <button
              className="px-4 py-2 rounded text-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={() => {
                clearToken();
                setAuthed(false);
              }}
            >
              Salir
            </button>
          </div>
        </div>
        {view === 'list' && <ProductList onEdit={startEdit} />}
        {view === 'create' && <ProductForm />}
        {view === 'edit' && <ProductEdit productId={editingId} onBack={() => setView('list')} />}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verificar build**

Run: `cd client && npm run build`
Expected: build exitoso.

- [ ] **Step 4: Verificar en el navegador (con API + front corriendo)**

Abrir `http://localhost:4321/admin`, loguearse, en "Productos" click "Editar" en uno:
- El formulario aparece precargado con los datos reales.
- Cambiar el nombre + "Guardar cambios" → "Cambios guardados ✓"; recargar la lista y confirmar el cambio.
- En "Fotos": "Agregar fotos" sube y aparecen; la "×" quita una (con confirm).
- "← Volver" regresa a la lista.

Expected: edición completa funciona sin errores en consola.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/admin/ProductList.jsx client/src/components/AdminPanel.jsx
git commit -m "feat(client): integrar edicion de productos en el panel"
```

---

## Verificación final

- [ ] `cd server && npm run build` compila sin errores.
- [ ] `cd client && npm run build` compila sin errores.
- [ ] Flujo completo: editar datos + agregar/quitar fotos de un producto existente, reflejado en el catálogo público.
