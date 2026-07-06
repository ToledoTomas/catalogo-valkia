import { useState, useEffect } from 'react';
import { apiFetch } from '../../lib/api.js';

export default function ProductList({ onEdit }) {
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
                <p className="text-sm font-semibold text-gray-700">
                  ${Number(p.price ?? 0).toLocaleString('es-AR')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onEdit(p.id)}
                className="rounded border border-gray-300 px-3 py-1 text-sm text-gray-700 hover:bg-gray-100"
              >
                Editar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
