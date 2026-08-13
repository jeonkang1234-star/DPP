/**
 * Pure style builders shared across screens (pills, chips, tabs, bars).
 * Each returns a plain React style object — no state, safe to call during render.
 */
export function pill(active) {
  return active
    ? { height: 44, border: 0, borderRadius: 10, background: '#0045A9', color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,69,169,.26)' }
    : { height: 44, border: 0, borderRadius: 10, background: 'transparent', color: '#5A6B85', fontSize: 14.5, fontWeight: 600, cursor: 'pointer' };
}

export function roleCard(active) {
  return {
    display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start', textAlign: 'left',
    padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
    border: active ? '1.5px solid #0045A9' : '1.5px solid rgba(16,32,64,.12)',
    background: active ? 'rgba(0,69,169,.05)' : '#fff',
    boxShadow: active ? '0 4px 14px rgba(0,69,169,.14)' : 'none'
  };
}

export function pillDot(color) {
  return { width: 8, height: 8, flex: 'none', borderRadius: 999, background: color };
}

export function domainCard(active) {
  return {
    display: 'grid', placeItems: 'center', height: 92, padding: '0 14px', cursor: 'pointer',
    border: active ? '1.5px solid #0045A9' : '1.5px solid rgba(16,32,64,.12)',
    background: active ? 'rgba(0,69,169,.05)' : '#fff',
    color: active ? '#0045A9' : '#0B1B33',
    boxShadow: active ? '0 4px 14px rgba(0,69,169,.14)' : 'none'
  };
}


export function tabStyle(active) {
  return active
    ? { height: 40, padding: '0 18px', border: 0, borderRadius: 11, background: '#0045A9', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,69,169,.26)', whiteSpace: 'nowrap' }
    : { height: 40, padding: '0 18px', border: 0, borderRadius: 11, background: 'transparent', color: '#5A6B85', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
}

export function chip(bg, fg) {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 24, padding: '0 11px', borderRadius: 999, background: bg, color: fg, fontSize: 11.5, fontWeight: 700, width: 'fit-content' };
}

export function domainChipFor(d) {
  if (d === '철강') return chip('rgba(0,69,169,.10)', '#0045A9');
  if (d === '배터리') return chip('rgba(18,161,80,.12)', '#0E7A3D');
  if (d === '섬유·패션') return chip('rgba(227,160,8,.16)', '#96660A');
  return chip('rgba(16,32,64,.07)', '#44546F');
}

export function avatarStyle(hue) {
  return { width: 30, height: 30, flex: 'none', borderRadius: 999, background: hue, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 };
}

export function bar(pct, color) { return { display: 'block', height: '100%', width: pct + '%', borderRadius: 6, background: color }; }

export function pctStyle(pct) {
  const c = pct === 0 ? '#C22B2B' : pct >= 100 ? '#0E7A3D' : '#96660A';
  return { fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700, color: c, textAlign: 'right' };
}

export function segStyle(w, color) { return { display: 'block', width: w + '%', height: '100%', background: color }; }

export function dot(color) { return { width: 9, height: 9, marginTop: 5, flex: 'none', borderRadius: 5, background: color }; }
