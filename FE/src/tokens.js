/**
 * Design tokens. Every value below is taken from the approved design.
 * Brand blue #0045A9 is sampled from the IEUM logo.
 */

export const color = {
  brand: '#0045A9',
  brandHover: '#00337E',
  brandTint: 'rgba(0,69,169,.10)',
  brandTintSoft: 'rgba(0,69,169,.05)',
  brandBorder: 'rgba(0,69,169,.24)',

  ink: '#0B1B33',
  inkSoft: '#2A3A55',
  body: '#44546F',
  muted: '#6B7A93',
  faint: '#8494AC',
  placeholder: '#9AA8BE',

  surface: '#FFFFFF',
  surfaceAlt: '#FBFCFE',
  surfaceSubtle: '#F7F9FD',
  surfaceChip: '#F2F6FC',
  hairline: 'rgba(16,32,64,.07)',
  hairlineStrong: 'rgba(16,32,64,.12)',
  divider: 'rgba(16,32,64,.08)',
  rowBorder: 'rgba(16,32,64,.06)',

  success: '#12A150',
  successText: '#0E7A3D',
  successTint: 'rgba(18,161,80,.12)',
  warning: '#E3A008',
  warningText: '#96660A',
  warningTint: 'rgba(227,160,8,.16)',
  danger: '#E03B3B',
  dangerText: '#C22B2B',
  dangerTint: 'rgba(224,59,59,.12)',
};

export const shadow = {
  card: '0 1px 2px rgba(16,32,64,.05)',
  pill: '0 1px 3px rgba(11,27,51,.10), 0 0 0 1px rgba(16,32,64,.05)',
  raised: '0 8px 20px rgba(0,69,169,.26)',
  raisedSoft: '0 8px 18px rgba(0,69,169,.22)',
  modal: '0 30px 70px rgba(6,17,36,.32)',
  drawer: '-18px 0 44px rgba(11,27,51,.18)',
  hero: '0 10px 30px rgba(11,27,51,.10)',
};

export const radius = {
  pill: 999,
  field: 12,
  card: 18,
  cardLg: 22,
  chip: 11,
};

export const mono = "'JetBrains Mono', monospace";

/** Domain accent colours used by the domain pills. */
export const domainColor = {
  '철강': color.brand,
  '배터리': color.success,
  '섬유·패션': color.warning,
};

/** Tier accent colours used by the tier pills. */
export const tierColor = {
  'Tier 3': color.brand,
  'Tier 2': '#5B8DEF',
  'Tier 1': color.placeholder,
};
