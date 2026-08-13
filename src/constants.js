// 검증 상태 코드 ↔ 화면 표기 매핑. 서버는 코드만 내려주고, 라벨/색은 프론트가 소유한다.
export const VERIFICATION_STATUS = {
  VERIFIED: { code: 'VERIFIED', label: '검증됨', tone: 'ok' },
  UPDATED: { code: 'UPDATED', label: '정보 갱신됨', tone: 'brand' },
  FAILED: { code: 'FAILED', label: '검증 실패', tone: 'danger' }
};

export function statusMeta(code) {
  return VERIFICATION_STATUS[code] || VERIFICATION_STATUS.VERIFIED;
}

export const SOCIAL_PROVIDERS = [
  { id: 'kakao', label: '카카오로 로그인', background: '#FEE500', color: '#1B1B1B', border: 'rgba(16,32,64,.10)' },
  { id: 'naver', label: '네이버로 로그인', background: '#03C75A', color: '#FFFFFF', border: 'rgba(16,32,64,.10)' },
  { id: 'google', label: '구글로 로그인', background: '#FFFFFF', color: '#1B1B1B', border: 'rgba(16,32,64,.14)' }
];

export const TABS = [
  { id: 'scan', to: '/scan', label: '스캔' },
  { id: 'history', to: '/history', label: '조회 기록' },
  { id: 'my', to: '/my', label: '마이' }
];

export const ROUTES = {
  login: '/login',
  scan: '/scan',
  history: '/history',
  my: '/my',
  passport: (id) => `/passport/${id}`
};

export const STORAGE_KEYS = {
  token: 'ieum.dpp.token'
};