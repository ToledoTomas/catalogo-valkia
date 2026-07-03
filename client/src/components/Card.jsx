import { useState, useRef } from 'react';

export default function Card({ images = [], title, category, alt, sizes = [], colors = [] }) {
  const list = images.length > 0 ? images : [{ url: '/placeholder.svg' }];
  const [active, setActive] = useState(0);
  const scrollerRef = useRef(null);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    setActive(Math.round(el.scrollLeft / el.clientWidth));
  }

  function goTo(i) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
  }

  return (
    <article className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="relative">
        <div
          ref={scrollerRef}
          onScroll={onScroll}
          className="aspect-[3/4] flex overflow-x-auto snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {list.map((img, i) => (
            <img
              key={i}
              src={img.url || '/placeholder.svg'}
              alt={alt || title}
              className="h-full w-full flex-shrink-0 snap-center object-cover"
              loading="lazy"
            />
          ))}
        </div>
        {list.length > 1 && (
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Ir a la foto ${i + 1}`}
                className={`h-2 w-2 rounded-full shadow transition-colors ${i === active ? 'bg-white' : 'bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="mb-2">
          <span className="inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-primary-800 uppercase tracking-wide">
            {category}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-primary-900 mb-2 line-clamp-2">
          {title}
        </h3>
        {/* Talles */}
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm text-primary-600">Talles:</span>
          <span className="text-sm font-medium text-primary-800 capitalize">
            {sizes.length > 0 ? sizes.join(', ') : 'N/A'}
          </span>
        </div>
        {/* Colores */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-primary-600">Colores:</span>
          <div className="flex items-center gap-2">
            {colors.length > 0 ? colors.map((c, i) => (
              <div
                key={i}
                className="w-4 h-4 rounded-full border-2 border-primary-200"
                style={{ backgroundColor: c.toLowerCase() }}
              ></div>
            )) : <span className="text-sm font-medium text-primary-800 capitalize">N/A</span>}
          </div>
        </div>
      </div>
    </article>
  );
}
