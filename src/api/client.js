import { STORAGE_KEYS } from '../constants.js';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const USE_MOCK = String(import.meta.env.VITE_USE_MOCK ?? 'true') !== 'false';

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.token);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
    else localStorage.removeItem(STORAGE_KEYS.token);
  } catch {
    /* 저장소 접근 불가 환경 무시 */
  }
}

// 모든 네트워크 호출의 단일 통로.
// 서버가 준비되면 .env 에서 VITE_USE_MOCK=false 로만 바꾸면 된다.
export async function request(method, path, { body, signal, headers } = {}) {
  if (USE_MOCK) {
    const { mockRequest } = await import('../mocks/server.js');
    return mockRequest(method, path, { body });
  }

  const token = getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : null),
      ...(token ? { Authorization: `Bearer ${token}` } : null),
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 204) return null;

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(payload?.message || `요청에 실패했습니다. (${res.status})`, res.status, payload);
  }
  return payload;
}

export const api = {
  get: (path, opts) => request('GET', path, opts),
  post: (path, body, opts) => request('POST', path, { ...opts, body }),
  patch: (path, body, opts) => request('PATCH', path, { ...opts, body }),
  del: (path, opts) => request('DELETE', path, opts)
};