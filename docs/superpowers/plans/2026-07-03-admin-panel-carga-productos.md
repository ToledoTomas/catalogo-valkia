# Panel de administración para carga de productos — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir un panel `/admin` en el sitio Astro para loguearse, borrar productos en tandas y crear productos con varias fotos de una, y hacer que el catálogo público traiga los datos en el navegador.

**Architecture:** Backend Express gana un endpoint multipart que sube N imágenes a Cloudinary y crea el producto en una transacción Prisma. El frontend gana una página `/admin` con una isla React (`client:only`) que hace login (JWT en localStorage), lista/borra productos y los crea vía FormData. El catálogo público mueve su fetch de build-time a client-side.

**Tech Stack:** Express + TypeScript + Prisma + Cloudinary + multer (backend); Astro 5 + React 19 + Tailwind 4 (frontend).

> **Nota sobre verificación:** este repo **no tiene runner de tests**. La verificación de cada tarea es manual: levantar la API (`cd server && npm run dev`) y/o el front (`cd client && npm run dev`), y ejercitar los flujos con `curl` o el navegador. Montar un framework de tests está fuera de alcance. Prerrequisitos para verificar el backend localmente: `server/.env` configurado (`DATABASE_URL`, `JWT_SECRET`, `CLOUDINARY_*`) y `npm run init` corrido (crea `admin@valkia.com` / `admin123`).

---

## File Structure

**Backend (crear/modificar):**
- Modify `server/src/controllers/productController.ts` — helper `uploadToCloudinary` + controller `createProductWithImages`.
- Modify `server/src/routes/products.ts` — ruta `POST /api/products/with-images`.

**Frontend admin (crear):**
- Create `client/src/lib/api.js` — helper de fetch con token + base URL.
- Create `client/src/pages/admin.astro` — cascarón de la página.
- Create `client/src/components/AdminPanel.jsx` — raíz de la isla (auth + switch de vistas).
- Create `client/src/components/admin/LoginForm.jsx` — login.
- Create `client/src/components/admin/ProductList.jsx` — lista + borrado masivo.
- Create `client/src/components/admin/ProductForm.jsx` — alta con fotos múltiples.
- Create `client/src/components/admin/TagInput.jsx` — input de tags reutilizable (talles/colores).

**Catálogo público (modificar):**
- Modify `client/src/components/GridCardsFilterIsland.jsx` — fetch client-side + estados.
- Modify `client/src/components/GridCards.astro` — deja de recibir/propagar `products`.
- Modify `client/src/pages/index.astro` — elimina el fetch de build-time.

---

## Task 1: Endpoint backend para crear producto con varias imágenes

**Files:**
- Modify: `server/src/controllers/productController.ts`
- Modify: `server/src/routes/products.ts`

- [ ] **Step 1: Agregar el helper `uploadToCloudinary` en el controller**

En `server/src/controllers/productController.ts`, después de la definición de `upload` (línea ~10), agregar:

```ts
// Sube un buffer a Cloudinary y devuelve la secure_url (versión promisificada)
function uploadToCloudinary(buffer: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { resource_type: 'image' },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error('Cloudinary no devolvió resultado'));
          return;
        }
        resolve(result.secure_url);
      }
    );
    stream.end(buffer);
  });
}
```

- [ ] **Step 2: Agregar el controller `createProductWithImages`**

Al final de `server/src/controllers/productController.ts`, agregar:

```ts
export const createProductWithImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, description, categoryId } = req.body;
    const files = (req.files as Express.Multer.File[]) || [];

    // sizes/colors llegan como JSON string (o array); normalizar a string[]
    const parseArray = (val: unknown): string[] => {
      if (Array.isArray(val)) return val as string[];
      if (typeof val === 'string') {
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : (val ? [val] : []);
        } catch {
          return val ? [val] : [];
        }
      }
      return [];
    };
    const sizes = parseArray(req.body.sizes);
    const colors = parseArray(req.body.colors);

    // Validar campos de texto (las imágenes son archivos, no URLs)
    const validation = validateDataSafe(createProductSchema.omit({ images: true }), {
      name,
      description,
      categoryId,
      sizes,
      colors
    });
    if (!validation.success) {
      res.status(400).json({ success: false, error: validation.error });
      return;
    }

    if (files.length === 0) {
      res.status(400).json({ success: false, error: 'Se requiere al menos una imagen' });
      return;
    }

    // Verificar que la categoría existe
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      res.status(400).json({ success: false, error: 'Categoría no encontrada' });
      return;
    }

    // Subir todas las imágenes a Cloudinary
    const urls = await Promise.all(files.map((f) => uploadToCloudinary(f.buffer)));

    // Crear producto + imágenes en una transacción
    const product = await prisma.$transaction(async (tx) => {
      return tx.product.create({
        data: {
          name: validation.data.name,
          description: validation.data.description,
          categoryId: validation.data.categoryId,
          sizes: validation.data.sizes,
          colors: validation.data.colors,
          images: { create: urls.map((url) => ({ url })) }
        },
        include: { category: true, images: true }
      });
    });

    res.status(201).json({
      success: true,
      data: product,
      message: 'Producto creado exitosamente'
    });
  } catch (error) {
    console.error('Error creating product with images:', error);
    res.status(500).json({ success: false, error: 'Error interno del servidor' });
  }
};
```

> Nota: `createProductSchema` y `validateDataSafe` ya están importados al inicio del archivo. `createProductSchema` es un `z.object`, por lo que `.omit({ images: true })` es válido.

- [ ] **Step 3: Registrar la ruta**

En `server/src/routes/products.ts`, agregar `createProductWithImages` al import de controllers y agregar la ruta junto a las otras protegidas:

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
  createProductWithImages
} from '../controllers/productController';
```

```ts
// Ruta para crear producto con varias imágenes en un solo paso
router.post('/with-images', authenticateToken, upload.array('images', 10), createProductWithImages);
```

- [ ] **Step 4: Verificar que compila y arranca**

Run: `cd server && npm run dev`
Expected: arranca sin errores de TypeScript y loguea `🚀 Server running on port 3001` y `✅ Database connected successfully`.

- [ ] **Step 5: Verificar el endpoint con curl (requiere una imagen local)**

Con el server corriendo, en otra terminal (git bash), obtener token y crear un producto. Reemplazar `./foto.jpg` por una imagen real y `<CATEGORY_ID>` por un id de `GET /api/categories`:

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@valkia.com","password":"admin123"}' | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')

curl -s -X POST http://localhost:3001/api/products/with-images \
  -H "Authorization: Bearer $TOKEN" \
  -F "name=Prueba Sweater" \
  -F "description=Producto de prueba" \
  -F "categoryId=<CATEGORY_ID>" \
  -F 'sizes=["S","M","L"]' \
  -F 'colors=["Beige","Óxido"]' \
  -F "images=@./foto.jpg" \
  -F "images=@./foto.jpg"
```

Expected: respuesta `{"success":true,"data":{...,"images":[{...},{...}]},"message":"Producto creado exitosamente"}` con 2 imágenes con `url` de Cloudinary.

- [ ] **Step 6: Commit**

```bash
git add server/src/controllers/productController.ts server/src/routes/products.ts
git commit -m "feat(server): endpoint para crear producto con varias imagenes"
```

---

## Task 2: Helper de API en el frontend

**Files:**
- Create: `client/src/lib/api.js`

- [ ] **Step 1: Crear el helper**

Crear `client/src/lib/api.js`:

```js
const BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://catalogo-valkia.onrender.com';
const TOKEN_KEY = 'valkia_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// fetch con Authorization automático. NO fija Content-Type:
// para JSON lo fija el caller; para FormData lo pone el navegador (con boundary).
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }
  return res;
}

export { BASE_URL };
```

- [ ] **Step 2: Commit**

```bash
git add client/src/lib/api.js
git commit -m "feat(client): helper de API con token para el panel admin"
```

---

## Task 3: Input de tags reutilizable

**Files:**
- Create: `client/src/components/admin/TagInput.jsx`

- [ ] **Step 1: Crear el componente**

Crear `client/src/components/admin/TagInput.jsx`:

```jsx
import { useState } from 'react';

export default function TagInput({ label, tags, setTags, placeholder }) {
  const [value, setValue] = useState('');

  function add() {
    const v = value.trim();
    if (v && !tags.includes(v)) setTags([...tags, v]);
    setValue('');
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      add();
    }
  }

  function remove(tag) {
    setTags(tags.filter((t) => t !== tag));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex flex-wrap gap-2 mb-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-100 px-3 py-1 text-sm text-primary-800"
          >
            {tag}
            <button
              type="button"
              onClick={() => remove(tag)}
              className="text-primary-600 hover:text-primary-900"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={add}
          className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/TagInput.jsx
git commit -m "feat(client): componente TagInput para talles y colores"
```

---

## Task 4: Formulario de login

**Files:**
- Create: `client/src/components/admin/LoginForm.jsx`

- [ ] **Step 1: Crear el componente**

Crear `client/src/components/admin/LoginForm.jsx`:

```jsx
import { useState } from 'react';
import { setToken, BASE_URL } from '../../lib/api.js';

export default function LoginForm({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'Credenciales inválidas');
        return;
      }
      setToken(data.data.token);
      onLogin();
    } catch (err) {
      setError('Error de conexión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm bg-white rounded-xl shadow-md p-8 space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center">Admin · Valkia</h1>
        {error && <p className="text-sm text-red-600 text-center">{error}</p>}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded bg-gray-800 px-4 py-2 text-white text-sm hover:bg-gray-700 disabled:opacity-50"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/LoginForm.jsx
git commit -m "feat(client): formulario de login del panel admin"
```

---

## Task 5: Lista de productos con borrado masivo

**Files:**
- Create: `client/src/components/admin/ProductList.jsx`

- [ ] **Step 1: Crear el componente**

Crear `client/src/components/admin/ProductList.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function ProductList() {
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState(null); // { done, total } | null

  async function load() {
    setLoading(true);
    setError('');
    try {
      const res = await apiFetch('/api/products');
      const data = await res.json();
      setProducts(data.data || []);
      setSelected(new Set());
    } catch (e) {
      setError('No se pudieron cargar los productos');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p.id))
    );
  }

  async function deleteSelected() {
    if (selected.size === 0) return;
    if (!confirm(`¿Eliminar ${selected.size} producto(s)? Esta acción no se puede deshacer.`)) return;
    const ids = [...selected];
    setProgress({ done: 0, total: ids.length });
    for (let i = 0; i < ids.length; i++) {
      try {
        await apiFetch(`/api/products/${ids[i]}`, { method: 'DELETE' });
      } catch (e) {
        // seguir con el resto
      }
      setProgress({ done: i + 1, total: ids.length });
    }
    setProgress(null);
    await load();
  }

  if (loading) return <p className="text-center text-gray-500 py-12">Cargando productos…</p>;
  if (error) return <p className="text-center text-red-600 py-12">{error}</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input
            type="checkbox"
            checked={products.length > 0 && selected.size === products.length}
            onChange={toggleAll}
          />
          Seleccionar todos ({products.length})
        </label>
        <button
          type="button"
          onClick={deleteSelected}
          disabled={selected.size === 0 || progress !== null}
          className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700 disabled:opacity-50"
        >
          {progress ? `Borrando ${progress.done}/${progress.total}…` : `Eliminar seleccionados (${selected.size})`}
        </button>
      </div>

      {products.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No hay productos.</p>
      ) : (
        <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {products.map((p) => (
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
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/ProductList.jsx
git commit -m "feat(client): lista de productos con borrado masivo"
```

---

## Task 6: Formulario de alta con fotos múltiples

**Files:**
- Create: `client/src/components/admin/ProductForm.jsx`

- [ ] **Step 1: Crear el componente**

Crear `client/src/components/admin/ProductForm.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';
import TagInput from './TagInput.jsx';

export default function ProductForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [sizes, setSizes] = useState([]);
  const [colors, setColors] = useState([]);
  const [files, setFiles] = useState([]); // File[]
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  async function loadCategories() {
    try {
      const res = await apiFetch('/api/categories');
      const data = await res.json();
      setCategories(data.data || []);
    } catch (e) {
      setError('No se pudieron cargar las categorías');
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

  function onFilesChange(e) {
    setFiles(Array.from(e.target.files || []));
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setOk('');
    if (!categoryId) return setError('Elegí una categoría');
    if (sizes.length === 0) return setError('Agregá al menos un talle');
    if (colors.length === 0) return setError('Agregá al menos un color');
    if (files.length === 0) return setError('Agregá al menos una foto');

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', name);
      fd.append('description', description);
      fd.append('categoryId', categoryId);
      fd.append('sizes', JSON.stringify(sizes));
      fd.append('colors', JSON.stringify(colors));
      files.forEach((f) => fd.append('images', f));

      const res = await apiFetch('/api/products/with-images', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo crear el producto');
        return;
      }
      // reset para el próximo alta
      setName('');
      setDescription('');
      setSizes([]);
      setColors([]);
      setFiles([]);
      setOk('Producto creado ✓');
    } catch (err) {
      setError('Error al crear el producto');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-5 bg-white rounded-lg border border-gray-200 p-6">
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
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <div className="flex gap-2 mt-2">
          <input
            type="text"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            placeholder="Nueva categoría"
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={addCategory}
            className="rounded bg-gray-800 px-4 py-2 text-sm text-white hover:bg-gray-700"
          >
            ＋ Crear
          </button>
        </div>
      </div>

      <TagInput label="Talles" tags={sizes} setTags={setSizes} placeholder="Ej: S, M, L" />
      <TagInput label="Colores" tags={colors} setTags={setColors} placeholder="Ej: Beige, Óxido" />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Fotos</label>
        <input type="file" accept="image/*" multiple onChange={onFilesChange} />
        {files.length > 0 && (
          <div className="flex flex-wrap gap-3 mt-3">
            {files.map((f, i) => (
              <div key={i} className="relative">
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  className="h-20 w-20 rounded object-cover"
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-600 text-white text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="submit"
        disabled={saving}
        className="rounded bg-gray-800 px-6 py-2 text-white text-sm hover:bg-gray-700 disabled:opacity-50"
      >
        {saving ? 'Guardando…' : 'Crear producto'}
      </button>
    </form>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add client/src/components/admin/ProductForm.jsx
git commit -m "feat(client): formulario de alta de producto con fotos multiples"
```

---

## Task 7: Isla raíz del panel + página `/admin`

**Files:**
- Create: `client/src/components/AdminPanel.jsx`
- Create: `client/src/pages/admin.astro`

- [ ] **Step 1: Crear la isla raíz**

Crear `client/src/components/AdminPanel.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { getToken, clearToken } from '../lib/api.js';
import LoginForm from './admin/LoginForm.jsx';
import ProductList from './admin/ProductList.jsx';
import ProductForm from './admin/ProductForm.jsx';

export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState('list'); // 'list' | 'create'

  useEffect(() => {
    setAuthed(!!getToken());
    setReady(true);
  }, []);

  if (!ready) return null;

  if (!authed) {
    return <LoginForm onLogin={() => setAuthed(true)} />;
  }

  const tabClass = (active) =>
    `px-4 py-2 rounded text-sm ${active ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`;

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
        {view === 'list' ? <ProductList /> : <ProductForm />}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Crear la página**

Crear `client/src/pages/admin.astro`:

```astro
---
import Layout from '../layouts/Layout.astro';
import "../styles/global.css";
import AdminPanel from '../components/AdminPanel.jsx';
---

<Layout>
  <AdminPanel client:only="react" />
</Layout>
```

- [ ] **Step 3: Verificar el panel end-to-end en el navegador**

Con la API corriendo (`cd server && npm run dev`), en otra terminal:

Run: `cd client && npm run dev`
Luego abrir `http://localhost:4321/admin` y verificar:
- Aparece el login. Ingresar con `admin@valkia.com` / `admin123` → entra al panel.
- Pestaña "Productos": se ve la lista; seleccionar 1-2 y "Eliminar seleccionados" los borra (con confirmación y progreso).
- Pestaña "Nuevo producto": crear una categoría nueva, cargar nombre/descripción, agregar talles y colores como tags, elegir 2 fotos (se ven las previews), "Crear producto" → mensaje "Producto creado ✓" y el form se limpia.
- Volver a "Productos" y confirmar que el nuevo producto aparece.
- "Salir" vuelve al login.

Expected: todo el flujo funciona sin errores en consola.

- [ ] **Step 4: Commit**

```bash
git add client/src/components/AdminPanel.jsx client/src/pages/admin.astro
git commit -m "feat(client): pagina /admin con panel de gestion de productos"
```

---

## Task 8: Catálogo público con fetch client-side

**Files:**
- Modify: `client/src/components/GridCardsFilterIsland.jsx`
- Modify: `client/src/components/GridCards.astro`
- Modify: `client/src/pages/index.astro`

- [ ] **Step 1: Reescribir la isla para que traiga los datos**

Reemplazar el contenido completo de `client/src/components/GridCardsFilterIsland.jsx` por:

```jsx
import { useState, useEffect } from 'react';
import Card from './Card.jsx';

const BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://catalogo-valkia.onrender.com';

export default function FilterIsland() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas');

  useEffect(() => {
    fetch(`${BASE_URL}/api/products`)
      .then((r) => r.json())
      .then((d) => setProducts(d.data || []))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-center text-primary-600 py-12">Cargando productos…</p>;
  if (error) return <p className="text-center text-red-500 py-12">No se pudieron cargar los productos.</p>;
  if (products.length === 0) return <p className="text-center text-primary-600 py-12">Todavía no hay productos.</p>;

  const categories = Array.from(new Set(products.map((item) => item.category.name)));
  const filteredProducts =
    selectedCategory === 'Todas'
      ? products
      : products.filter((item) => item.category.name === selectedCategory);

  return (
    <>
      <div className="flex flex-wrap justify-center gap-2 mb-8">
        <button
          className={`px-4 py-2 rounded border border-primary-300 text-primary-800 text-sm cursor-pointer hover:bg-orange-100 hover:text-black hover:border-primary-800 transition-colors duration-200 ${selectedCategory === 'Todas' ? 'bg-white text-primary-800 border-primary-800' : ''}`}
          onClick={() => setSelectedCategory('Todas')}
        >Todas</button>
        {categories.map((category) => (
          <button
            key={category}
            className={`px-4 py-2 rounded border border-primary-300 text-primary-800 text-sm cursor-pointer hover:bg-orange-100 hover:text-black hover:border-primary-800 transition-colors duration-200 ${selectedCategory === category ? 'bg-white text-primary-800 border-primary-800' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >{category}</button>
        ))}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-12">
        {filteredProducts.map((item) => (
          <Card
            key={item.id}
            image={item.images[0]?.url || '/placeholder.svg'}
            title={item.name}
            color={item.colors[0] || 'N/A'}
            category={item.category.name}
            sizes={item.sizes}
            colors={item.colors}
          />
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Simplificar `GridCards.astro`**

Reemplazar el contenido completo de `client/src/components/GridCards.astro` por (sin props de productos ni cálculo de categorías):

```astro
---
import FilterIsland from './GridCardsFilterIsland.jsx';
---

<section id="catalogo" class="py-12 bg-primary-50">
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="text-center mb-12">
      <h2 class="text-3xl font-bold text-primary-900 mb-4">
        Colección Femenina
      </h2>
      <p class="text-lg text-primary-600 max-w-2xl mx-auto">
        Descubre nuestra exclusiva selección de indumentaria femenina, 
        diseñada para la mujer moderna y elegante.
      </p>
    </div>

    <FilterIsland client:load />
  </div>
</section>
```

- [ ] **Step 3: Quitar el fetch de build-time en `index.astro`**

Reemplazar el contenido completo de `client/src/pages/index.astro` por:

```astro
---
import Layout from '../layouts/Layout.astro';
import "../styles/global.css";
import Header from "../components/Header.astro";
import GridCards from '../components/GridCards.astro';
import Hero from '../components/Hero.astro';
import Contacto from '../components/Contacto.astro';
---

<Layout>
	<Header/>
    <Hero />
    <GridCards />
    <Contacto />
</Layout>
```

- [ ] **Step 4: Verificar el catálogo público**

Con la API corriendo, en el front (`cd client && npm run dev`), abrir `http://localhost:4321/` y verificar:
- Aparece brevemente "Cargando productos…" y luego la grilla de productos.
- Los filtros por categoría funcionan.
- Crear un producto desde `/admin` y **recargar** la home: el nuevo producto aparece sin rebuild.

Expected: catálogo se abastece solo desde la API, sin errores en consola.

- [ ] **Step 5: Commit**

```bash
git add client/src/components/GridCardsFilterIsland.jsx client/src/components/GridCards.astro client/src/pages/index.astro
git commit -m "feat(client): catalogo publico con fetch client-side"
```

---

## Verificación final

- [ ] `cd server && npm run build` compila sin errores de TypeScript.
- [ ] `cd client && npm run build` compila sin errores.
- [ ] El flujo completo funciona con API + front corriendo: login → borrar en tanda → crear con fotos → ver reflejado en la home.
