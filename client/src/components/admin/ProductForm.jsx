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
