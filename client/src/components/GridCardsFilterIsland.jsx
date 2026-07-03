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
