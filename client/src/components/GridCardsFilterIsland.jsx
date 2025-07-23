import { useState } from 'react';
import Card from './Card.jsx';

export default function FilterIsland({ products, categories }) {
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const filteredProducts = selectedCategory === 'Todas'
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