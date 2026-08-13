import { MOCK_USER, MOCK_PASSPORTS, MOCK_SCANS, MOCK_QR_LOOKUP } from './data.js';
import { ApiError } from '../api/client.js';

// 실제 서버가 붙기 전까지 fetch 를 대신하는 인메모리 어댑터.
// client.js 의 request() 가 USE_MOCK 일 때만 이 함수를 호출한다.
const LATENCY = Number(import.meta.env.VITE_MOCK_LATENCY ?? 600);

const db = {
  user: structuredClone(MOCK_USER),
  scans: structuredClone(MOCK_SCANS),
  passports: structuredClone(MOCK_PASSPORTS)
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

function match(pattern, path) {
  const p = pattern.split('/').filter(Boolean);
  const t = path.split('?')[0].split('/').filter(Boolean);
  if (p.length !== t.length) return null;
  const params = {};
  for (let i = 0; i < p.length; i += 1) {
    if (p[i].startsWith(':')) params[p[i].slice(1)] = decodeURIComponent(t[i]);
    else if (p[i] !== t[i]) return null;
  }
  return params;
}

const routes = [
  {
    method: 'POST',
    path: '/auth/social/:provider',
    handle: ({ provider }) => ({
      token: `mock-token-${provider}-${Date.now()}`,
      user: db.user
    })
  },
  { method: 'GET', path: '/me', handle: () => db.user },
  {
    method: 'PATCH',
    path: '/me/settings',
    handle: (_p, body) => {
      db.user = { ...db.user, settings: { ...db.user.settings, ...body } };
      return db.user;
    }
  },
  {
    method: 'GET',
    path: '/me/scans',
    handle: (_p, _b, query) => {
      const q = (query.get('query') || '').trim().toLowerCase();
      const items = q
        ? db.scans.filter((s) => `${s.name} ${s.brand} ${s.passportId}`.toLowerCase().includes(q))
        : db.scans;
      return { items, total: items.length };
    }
  },
  {
    method: 'DELETE',
    path: '/me/scans/:id',
    handle: ({ id }) => {
      const before = db.scans.length;
      db.scans = db.scans.filter((s) => s.id !== id);
      if (db.scans.length === before) throw new ApiError('조회 기록을 찾을 수 없습니다.', 404);
      return { ok: true };
    }
  },
  {
    method: 'POST',
    path: '/scans',
    handle: (_p, body) => {
      const passportId = MOCK_QR_LOOKUP[body?.code] || MOCK_QR_LOOKUP.DEFAULT;
      const passport = db.passports.find((x) => x.id === passportId);
      if (!passport) throw new ApiError('등록되지 않은 QR 코드입니다.', 404);
      const scan = {
        id: `scn_${Math.random().toString(36).slice(2, 8)}`,
        passportId: passport.id,
        name: passport.name,
        brand: passport.brand,
        thumbnailUrl: passport.imageUrl,
        status: passport.verification.status,
        scannedAt: new Date().toISOString(),
        passportUpdatedAt: passport.verification.verifiedAt
      };
      db.scans = [scan, ...db.scans.filter((s) => s.passportId !== passport.id)];
      return scan;
    }
  },
  {
    method: 'GET',
    path: '/passports/:id',
    handle: ({ id }) => {
      const found = db.passports.find((p) => p.id === id);
      if (!found) throw new ApiError('제품 여권을 찾을 수 없습니다.', 404);
      return found;
    }
  }
];

export async function mockRequest(method, path, { body } = {}) {
  await wait(LATENCY);
  const query = new URLSearchParams(path.split('?')[1] || '');
  for (const route of routes) {
    if (route.method !== method) continue;
    const params = match(route.path, path);
    if (params) return route.handle(params, body, query);
  }
  throw new ApiError(`목 서버에 정의되지 않은 엔드포인트: ${method} ${path}`, 501);
}