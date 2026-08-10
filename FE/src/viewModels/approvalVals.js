import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function approvalVals(ctx) {
  const { state, setState, props, data } = ctx;
  const rows = data.signupApprovals;
  const cur = state.apFilter || 'all';
  const shown = rows.filter(r => cur === 'all' || r[5] === cur);
  const tabs = [['all', '전체', rows.length], ['auto', '자동 승인 완료', rows.filter(r => r[5] === 'auto').length], ['manual', '수동 승인 필요', rows.filter(r => r[5] === 'manual').length]];
  return {
    apTabs: tabs.map(([k, label, count]) => ({
      key: k, label, count,
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 42, padding: '0 16px', border: 0, borderRadius: 999,
        background: cur === k ? '#0045A9' : '#fff', color: cur === k ? '#fff' : '#44546F',
        fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
      },
      countStyle: {
        display: 'inline-grid', placeItems: 'center', minWidth: 22, height: 22, padding: '0 6px', borderRadius: 999,
        background: cur === k ? 'rgba(255,255,255,.22)' : 'rgba(16,32,64,.07)',
        color: cur === k ? '#fff' : '#6B7A93', fontSize: 11.5, fontWeight: 700
      },
      go: () => setState({ apFilter: k })
    })),
    apManualOnly: cur === 'manual',
    approvals: shown.map(([name, country, cc, biz, at, mode, route, doc]) => ({
      key: name + at, name, country, cc, biz, at, route, doc,
      isAuto: mode === 'auto',
      isManual: mode === 'manual',
      routeStyle: { fontSize: 12.5, fontWeight: 600, color: mode === 'auto' ? '#0E7A3D' : '#C22B2B' },
      ccStyle: { display: 'inline-grid', placeItems: 'center', width: 30, height: 22, borderRadius: 6, background: 'rgba(16,32,64,.07)', color: '#44546F', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700 },
      approve: () => ctx.say(name + ' 가입을 승인했습니다.'),
      reject: () => ctx.say(name + ' 가입을 반려하고 사유를 발송했습니다.'),
      detail: () => setState({ docPreview: { name: name + ' · 사업자 등록본.pdf', meta: country + ' · ' + biz, status: '검증 중' } })
    }))
  };
}
