// 디자인 토큰 — 화면 코드에서 하드코딩 색상을 쓰지 않기 위한 단일 출처
export const color = {
  brand: '#0045A9',
  brandDark: '#00398C',
  ink: '#0B1B33',
  body: '#44546F',
  muted: '#6B7A93',
  soft: '#8494AC',
  faint: '#9AA8BE',
  line: 'rgba(16,32,64,.07)',
  lineStrong: 'rgba(16,32,64,.12)',
  bg: '#F7F9FD',
  surface: '#FFFFFF',
  surfaceAlt: '#FBFCFE',
  fill: '#F2F6FC',
  ok: '#12A150',
  okInk: '#0E7A3D',
  warn: '#E3A008',
  warnInk: '#96660A',
  danger: '#E03B3B',
  dangerInk: '#C22B2B'
};

export const radius = { sm: 11, md: 14, lg: 18, xl: 22, pill: 999 };

export const shadow = {
  card: '0 1px 2px rgba(16,32,64,.05)',
  cta: '0 8px 18px rgba(0,69,169,.22)',
  toast: '0 12px 30px rgba(11,27,51,.28)'
};

export const card = {
  background: color.surface,
  border: `1px solid ${color.line}`,
  borderRadius: radius.lg,
  boxShadow: shadow.card
};

export const SAFE_TOP = 'max(20px, env(safe-area-inset-top))';
export const SAFE_BOTTOM = 'max(20px, env(safe-area-inset-bottom))';