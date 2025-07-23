export default function Card({ image, title, color, category, alt, sizes = [], colors = [] }) {
  return (
    <article className="group relative overflow-hidden rounded-lg bg-white shadow-md transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
      <div className="aspect-[3/4] overflow-hidden">
        <img
          src={image || "/placeholder.svg"}
          alt={alt || title}
          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
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