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
