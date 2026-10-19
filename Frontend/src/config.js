const _raw = import.meta.env.VITE_API_URL || 'http://localhost:3001';
export const API_BASE_URL = _raw.replace(/\/+$/, ''); // strip trailing slashes
export const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL || _raw).replace(/\/+$/, '');
