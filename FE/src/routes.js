/**
 * URL ↔ 화면 상태 매핑.
 *
 * 앱 상태는 { view, role, tab } 세 값으로 화면을 결정합니다.
 * 아래 표가 그 조합에 URL 경로를 하나씩 붙여 줍니다.
 */

export const ROUTES = [
  { path: '/login', view: 'login' },
  { path: '/signup', view: 'signup' },

  { path: '/admin/dashboard', view: 'app', role: 'admin', tab: 'dash' },
  { path: '/admin/approvals', view: 'app', role: 'admin', tab: 'approve' },
  { path: '/admin/tier-reviews', view: 'app', role: 'admin', tab: 'tier' },
  { path: '/admin/documents', view: 'app', role: 'admin', tab: 'docs' },

  { path: '/steel/dashboard', view: 'app', role: 'steel', tab: 'dash' },
  { path: '/steel/input', view: 'app', role: 'steel', tab: 'input' },
  { path: '/steel/partners', view: 'app', role: 'steel', tab: 'partners' },
  { path: '/steel/products', view: 'app', role: 'steel', tab: 'products' },
  { path: '/steel/my-page', view: 'app', role: 'steel', tab: 'my' },

  { path: '/battery/dashboard', view: 'app', role: 'battery', tab: 'dash' },
  { path: '/battery/input', view: 'app', role: 'battery', tab: 'input' },
  { path: '/battery/partners', view: 'app', role: 'battery', tab: 'partners' },
  { path: '/battery/products', view: 'app', role: 'battery', tab: 'products' },
  { path: '/battery/my-page', view: 'app', role: 'battery', tab: 'my' },

  { path: '/textile/dashboard', view: 'app', role: 'textile', tab: 'dash' },
  { path: '/textile/input', view: 'app', role: 'textile', tab: 'input' },
  { path: '/textile/partners', view: 'app', role: 'textile', tab: 'partners' },
  { path: '/textile/products', view: 'app', role: 'textile', tab: 'products' },
  { path: '/textile/my-page', view: 'app', role: 'textile', tab: 'my' },

  { path: '/market-surveillance/registry', view: 'app', role: 'eu', tab: 'registry' },
  { path: '/market-surveillance/audit-log', view: 'app', role: 'eu', tab: 'audit' },

  { path: '/customs/clearance', view: 'app', role: 'customs', tab: 'clearance' },

  { path: '/me/history', view: 'app', role: 'personal', tab: 'scans' },
  { path: '/me/passport', view: 'app', role: 'personal', tab: 'passport' },
  { path: '/me/account', view: 'app', role: 'personal', tab: 'my' },
];

export const DEFAULT_PATH = '/login';

/** 경로 → { view, role, tab }. 모르는 경로면 null. */
export function stateFromPath(pathname) {
  const hit = ROUTES.find((r) => r.path === pathname);
  if (!hit) return null;
  const { path, ...rest } = hit;
  return rest;
}

/** { view, role, tab } → 경로. 매칭이 없으면 null. */
export function pathFor(view, role, tab) {
  if (view !== 'app') {
    const hit = ROUTES.find((r) => r.view === view);
    return hit ? hit.path : null;
  }
  const hit = ROUTES.find((r) => r.view === 'app' && r.role === role && r.tab === tab);
  return hit ? hit.path : null;
}
