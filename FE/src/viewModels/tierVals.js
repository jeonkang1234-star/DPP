import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function tierVals(ctx) {
  const { state, setState, props, data } = ctx;
  const rows = data.tierReviews;
  const cur = state.tierFilter || 'fail';
  const shown = rows.filter(r => r[3] === cur);
  const tabs = [['fail', '자동심사 실패', rows.filter(r => r[3] === 'fail').length], ['pass', '자동심사 완료', rows.filter(r => r[3] === 'pass').length]];
  return {
    tierTabs: tabs.map(([k, label, count]) => ({
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
      go: () => setState({ tierFilter: k })
    })),
    tierQueue: shown.map(([name, domain, tier, mode, reason, at, doc]) => ({
      key: name + at, name, domain, tier, reason, at, doc,
      passed: mode === 'pass',
      failed: mode === 'fail',
      domainDot: { width: 8, height: 8, flex: 'none', borderRadius: 999, background: domain === '철강' ? '#0045A9' : domain === '배터리' ? '#12A150' : '#E3A008' },
      tierDot: { width: 8, height: 8, flex: 'none', borderRadius: 999, background: tier === 'Tier 3' ? '#0045A9' : tier === 'Tier 2' ? '#5B8DEF' : '#9AA8BE' },
      openDocs: () => setState({ tierDocs: { name, tier, doc } }),
      approve: () => ctx.say(name + ' ' + tier + ' 신청을 승인했습니다.'),
      hold: () => ctx.say(name + '에 자동심사 실패 사유를 발송하고 보류로 처리했습니다.'),
      reject: () => ctx.say(name + ' ' + tier + ' 신청을 반려했습니다.')
    })),
    tierDocsOpen: !!state.tierDocs,
    tierDocsName: state.tierDocs && state.tierDocs.name,
    tierDocsTier: state.tierDocs && state.tierDocs.tier,
    tierDocsCount: state.tierDocs && state.tierDocs.doc,
    closeTierDocs: () => setState({ tierDocs: null }),
    tierDocList: [
      ['사업자등록증.pdf', 'PDF · 1.2MB', '검증 완료'],
      ['ISO_14001_인증서.pdf', 'PDF · 2.4MB', '검증 실패'],
      ['ESG_보고서_2025.pdf', 'PDF · 5.1MB', '검증 완료'],
      ['공급망_연동_동의서.pdf', 'PDF · 0.9MB', '확인 필요']
    ].map(([name, meta, status]) => ({
      key: name, name, meta, status,
      chip: status === '검증 완료' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : status === '검증 실패' ? ctx.chip('rgba(224,59,59,.12)', '#C22B2B') : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
      view: () => setState({ docPreview: { name, meta, status } })
    })),
  };
}
