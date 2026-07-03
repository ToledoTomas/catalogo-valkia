const BASE_URL = import.meta.env.PUBLIC_API_URL || 'https://catalogo-valkia.onrender.com';
const TOKEN_KEY = 'valkia_admin_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// fetch con Authorization automático. NO fija Content-Type:
// para JSON lo fija el caller; para FormData lo pone el navegador (con boundary).
export async function apiFetch(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401 || res.status === 403) {
    clearToken();
    throw new Error('UNAUTHORIZED');
  }
  return res;
}

export { BASE_URL };
