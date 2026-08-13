import { api } from './client.js';

// 화면은 엔드포인트 문자열을 모른다. 서버 스펙이 바뀌면 이 파일만 고친다.
export const authApi = {
  loginWithProvider: (provider) => api.post(`/auth/social/${provider}`),
  me: (opts) => api.get('/me', opts)
};

export const scanApi = {
  list: (query = '', opts) =>
    api.get(`/me/scans${query ? `?query=${encodeURIComponent(query)}` : ''}`, opts),
  remove: (scanId) => api.del(`/me/scans/${scanId}`),
  submitCode: (code) => api.post('/scans', { code })
};

export const passportApi = {
  detail: (passportId, opts) => api.get(`/passports/${passportId}`, opts)
};

export const settingsApi = {
  update: (patch) => api.patch('/me/settings', patch)
};