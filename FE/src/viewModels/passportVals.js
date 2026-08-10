import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function passportVals(ctx) {
  const { state, setState, props, data } = ctx;
  const passports = data.passports;
  const p = passports.find(d => d.id === state.pubId) || passports[0];
  const repairColor = p.repair >= 8 ? '#12A150' : p.repair >= 6 ? '#E3A008' : '#E03B3B';
  return {
    passportExpired: !!p.unverified,
    passportValid: !p.unverified,
    passportName: p.name, passportBrand: p.brand, passportId: p.id,
    passportModel: p.model, passportGtin: p.gtin, passportBatch: p.batch,
    passportOrigin: p.origin, passportMade: p.made,
    ecoCarbon: p.carbon, ecoCarbonUnit: p.carbonUnit,
    ecoRecycled: p.recycled, ecoRecycledBar: ctx.bar(p.recycled, '#0045A9'),
    ecoWater: p.water, ecoWaterUnit: p.waterUnit,
    repairScore: p.repair.toFixed(1),
    repairBar: { display: 'block', height: '100%', width: (p.repair * 10) + '%', borderRadius: 6, background: repairColor },
    repairColorStyle: { fontSize: 40, fontWeight: 700, color: repairColor, fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 },
    repairVerdict: p.repair >= 8 ? '수리하기 쉬운 제품입니다' : p.repair >= 6 ? '전문 서비스센터 수리를 권장합니다' : '자가 수리가 어려운 제품입니다',
    careItems: p.care.map(([t, d]) => ({ key: t, title: t, detail: d })),
    partItems: p.parts.map(([t, d]) => ({ key: t, title: t, detail: d })),
    manualName: p.manual,
    openManual: () => ctx.say('수리 매뉴얼 PDF를 다운로드합니다.'),
    openVideo: () => ctx.say('수리 영상 페이지로 이동합니다.'),
    hazardSafe: !p.hazard,
    hazardRisk: p.hazard,
    hazardNote: p.hazardNote,
    disposalItems: p.disposal.map(([t, d]) => ({ key: t, title: t, detail: d })),
    takebackName: p.brand + ' 제품 회수 바로가기',
    openTakeback: () => ctx.say(p.brand + ' 제품 회수 페이지로 이동합니다.'),
    backToScans: () => setState({ tab: 'scans' })
  };
}
