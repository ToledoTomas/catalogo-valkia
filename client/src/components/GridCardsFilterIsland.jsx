import { useState, useEffect } from 'react';
import Card from './Card.jsx';
import { BASE_URL } from '../lib/api.js';

export default function FilterIsland({ initialProducts = [] }) {
  const [products, setProducts] = useState(initialProducts);
  // Si el build ya trajo productos, no mostramos "Cargando…": pintamos de una.
  const [loading, setLoading] = useState(initialProducts.length === 0);
  const [error, setError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [search, setSearch] = useState('');

  // Refresca en segundo plano: los productos incrustados en el build pueden
  // estar desactualizados. Si ya teníamos datos del build, un fallo de red
  // (p. ej. el backend dormido en Render) no rompe la vista.
  useEffect(() => {
    fetch(`${BASE_URL}/api/products`)
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.data)) setProducts(d.data);
      })
      .catch(() => {
        if (initialProducts.length === 0) setError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Escucha el buscador del header y filtra en el cliente.
  useEffect(() => {
    const handler = (e) => setSearch(e.detail || '');
    window.addEventListener('valkia-search', handler);
    return () => window.removeEventListener('valkia-search', handler);
  }, []);

  if (loading) return <p className="text-center text-primary-600 py-12">Cargando productos…</p>;
  if (error) return <p className="text-center text-red-500 py-12">No se pudieron cargar los productos.</p>;
  if (products.length === 0) return <p className="text-center text-primary-600 py-12">Todavía no hay productos.</p>;

  const categories = Array.from(new Set(products.map((item) => item.category.name)));
  const q = search.trim().toLowerCase();
  const filteredProducts = products.filter((item) => {
    const matchesCategory = selectedCategory === 'Todas' || item.category.name === selectedCategory;
    const matchesSearch =
      !q ||
      item.name.toLowerCase().includes(q) ||
      (item.description || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

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
      {filteredProducts.length === 0 ? (
        <p className="text-center text-primary-600 py-12">No se encontraron productos.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-12">
          {filteredProducts.map((item) => (
            <Card
              key={item.id}
              images={item.images}
              title={item.name}
              category={item.category.name}
              sizes={item.sizes}
              colors={item.colors}
              price={item.price}
            />
          ))}
        </div>
      )}
    </>
  );
}
