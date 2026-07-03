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
    const onUnauthorized = () => setAuthed(false);
    window.addEventListener('valkia-unauthorized', onUnauthorized);
    return () => window.removeEventListener('valkia-unauthorized', onUnauthorized);
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
