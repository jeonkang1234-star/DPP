import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function customsVals(ctx) {
  const { state, setState, props, data } = ctx;
  const items = data.customsItems;
  const match = q => {
    const k = (q || '').trim().toLowerCase();
    if (!k) return null;
    return items.find(i => i.id.toLowerCase() === k || i.declared.toLowerCase() === k || i.eori.toLowerCase() === k)
      || items.find(i => i.id.toLowerCase().includes(k) || i.name.toLowerCase().includes(k) || i.importer.toLowerCase().includes(k))
      || null;
  };
  const found = items.find(i => i.id === state.customsId) || null;
  const cur = found || items[0];
  const noResult = !!state.customsSearched && !found;
  const green = '#12A150', red = '#E03B3B';
  return {
    cSearchMode: !state.customsSearched,
    cResultMode: !!state.customsSearched && !noResult,
    cNoResult: noResult,
    cQuery: state.customsQuery || '',
    onCustomsQuery: e => setState({ customsQuery: e.target.value }),
    runCustomsSearch: () => {
      const hit = match(state.customsQuery);
      setState({ customsSearched: true, customsId: hit ? hit.id : null });
    },
    resetCustomsSearch: () => setState({ customsSearched: false, customsQuery: '', customsId: null }),
    cRecent: ['DPP-KR-ST-2607-0142', 'DPP-KR-BT-2607-0311', 'DPP-KR-TX-2607-0521'].map(q => ({
      key: q, label: q,
      pick: () => {
        const hit = match(q);
        setState({ customsQuery: q, customsSearched: true, customsId: hit ? hit.id : null });
      }
    })),
    customsList: items.map(i => ({
      key: i.id, id: i.id, name: i.name, importer: i.importer, hs: i.hs, declared: i.declared,
      verdict: i.pass ? '통관 요건 충족' : '통관 요건 미충족',
      dot: ctx.pillDot(i.pass ? green : red),
      rowStyle: {
        display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1.1fr .8fr 1fr 74px', gap: 12, padding: '13px 14px',
        alignItems: 'center', border: 'none', width: '100%', textAlign: 'left', cursor: 'pointer',
        borderBottom: '1px solid rgba(16,32,64,.06)',
        background: i.id === cur.id ? 'rgba(0,69,169,.04)' : 'transparent'
      },
      pick: () => setState({ customsId: i.id })
    })),
    cVerdict: cur.pass ? '통관 요건 충족' : '통관 요건 미충족',
    cVerdictSub: cur.pass ? '모든 필수 검증 항목을 충족합니다' : '아래 미충족 항목 해소 전까지 반출할 수 없습니다',
    cVerdictStyle: {
      display: 'flex', flexDirection: 'column', gap: 10, padding: '26px 28px', borderRadius: 20,
      background: '#fff', border: '1px solid rgba(16,32,64,.07)', boxShadow: '0 1px 2px rgba(16,32,64,.05)'
    },
    cVerdictBarStyle: { width: 5, alignSelf: 'stretch', minHeight: 84, flex: 'none', borderRadius: 999, background: cur.pass ? green : red },
    cVerdictDot: { width: 9, height: 9, flex: 'none', borderRadius: 999, background: cur.pass ? green : red },
    cVerdictBadge: {
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 999,
      background: cur.pass ? green : red, color: '#fff', fontSize: 20, fontWeight: 700, flex: 'none'
    },
    cVerdictMark: cur.pass ? '✓' : '!',
    cVerdictTextStyle: { fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#0B1B33' },
    cId: cur.id, cName: cur.name, cEori: cur.eori, cImporter: cur.importer, cImporterAddr: cur.importerAddr,
    cExporter: cur.exporter, cHs: cur.hs, cHsName: cur.hsName, cQty: cur.qty, cDeclared: cur.declared,
    cCeNote: cur.ceNote, cDoc: cur.doc, cTech: cur.tech,
    cCeOk: cur.ce, cCeFail: !cur.ce,
    cIssued: cur.issued, cUpdated: cur.updated, cStatus: cur.status,
    cStatusDot: ctx.pillDot(cur.status === '유효' ? green : cur.status === '정지' ? '#E3A008' : red),
    cChecks: cur.checks.map(([label, ok, detail]) => ({
      key: label, label, detail,
      mark: ok ? '✓' : '✕',
      markStyle: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: ok ? green : red, color: '#fff', fontSize: 11, fontWeight: 700 },
      detailStyle: { fontSize: 11.5, lineHeight: 1.5, color: ok ? '#8494AC' : '#C22B2B' }
    })),
    cDownloadAll: () => ctx.say('적합성 선언서·기술문서·DPP 증명서를 하나의 ZIP으로 내려받습니다.'),
    cDownloadDoc: () => ctx.say(cur.doc + ' 을(를) 내려받습니다.'),
    cApprove: () => ctx.say(cur.id + ' 통관 승인 처리했습니다.'),
    cHold: () => ctx.say(cur.id + ' 통관 보류 사유를 수입업체에 통보했습니다.'),
    clearLog: [
      ['2026-08-07 09:12', 'DPP-KR-ST-2607-0142', 'Nordwerk GmbH', '7208.39', '통관 가능', '승인'],
      ['2026-08-06 17:44', 'DPP-KR-BT-2607-0311', 'Voltique SAS', '8507.60', '통관 보류', '보류'],
      ['2026-08-06 14:20', 'DPP-KR-TX-2607-0521', 'Deltamode B.V.', '6006.21', '통관 가능', '승인'],
      ['2026-08-05 11:38', 'DPP-DE-ST-2607-0088', 'Hanseatic Metals', '7208.51', '통관 가능', '승인'],
      ['2026-08-04 08:55', 'DPP-FR-TX-2607-0204', 'Deltamode B.V.', '5407.52', '통관 보류', '보류'],
      ['2026-08-03 16:07', 'DPP-KR-ST-2607-0138', 'Nordwerk GmbH', '7208.51', '통관 가능', '승인']
    ].map(([at, id, importer, hs, verdict, action]) => ({
      key: at + id, at, id, importer, hs, verdict, action,
      dot: ctx.pillDot(verdict === '통관 가능' ? green : red)
    }))
  };
}
