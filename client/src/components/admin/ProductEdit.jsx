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
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudo cargar el producto');
        return;
      }
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
    setError('');
    setOk('');
    try {
      const res = await apiFetch(`/api/products/images/${imageId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!data.success) {
        setError(data.error || 'No se pudo quitar la foto');
        return;
      }
      setImages((prev) => prev.filter((img) => img.id !== imageId));
    } catch (e) {
      setError('No se pudo quitar la foto');
    }
  }

  async function addImages(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setError('');
    setOk('');
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('images', f));
      const res = await apiFetch(`/api/products/${productId}/images`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || 'No se pudieron agregar las fotos');
        return;
      }
      setImages(data.data.images || []);
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
        <label className="flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors">
          <svg className="w-6 h-6 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <span className="text-sm font-medium text-gray-700">Agregar fotos</span>
          <span className="text-xs text-gray-400">Elegí una o varias imágenes</span>
          <input type="file" accept="image/*" multiple onChange={addImages} className="hidden" />
        </label>
      </div>
    </div>
  );
}
