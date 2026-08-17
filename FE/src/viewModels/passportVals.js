import React from 'react';

const MATERIAL_LABEL = { steel: '철강', battery: '배터리', textile: '섬유' };

const EMPTY_BASE = {
  passportExpired: false, passportValid: false,
  passportName: '', passportBrand: '', passportModel: '', passportGtin: '', passportBatch: '',
  passportOrigin: '', passportMade: '',
  ecoCarbon: '', ecoCarbonUnit: '', ecoRecycled: 0, ecoWater: '', ecoWaterUnit: '',
  repairScore: '0.0', repairVerdict: '', careItems: [], partItems: [], manualName: '',
  hazardSafe: true, hazardRisk: false, hazardNote: '', disposalItems: [], takebackName: '',
  basicStatus: '', basicMaterialLabel: '', basicFields: []
};

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 *
 * DPP 발급과 동시에 QR 발급(2026-08-17 강 요청) - 아직 비로그인 공개 조회용 백엔드
 * 엔드포인트가 없어서(scPassport는 원래 완전 목데이터 화면이었다), 이번 세션에 발급한
 * DPP는 issuedPassportCache(useAppLogic.js, makerVals.js의 issueDpp가 채움)에서 먼저
 * 찾는다. 특별사항대로 파싱된(=입력된) 데이터만 보여준다 - 큐레이션된 소비자용 목데이터
 * (data.passports)는 기존 5건 그대로 유지.
 */
export function passportVals(ctx) {
  const { state, setState, data } = ctx;
  const passports = data.passports || [];
  const id = (state.pubId || '').trim();

  const cached = id ? (state.issuedPassportCache || {})[id] : null;
  const curated = id ? passports.find((d) => d.id === id) : null;
  const notFound = !!id && !curated && !cached;

  let out;
  if (curated) {
    const pp = curated;
    const repairColor = pp.repair >= 8 ? '#12A150' : pp.repair >= 6 ? '#E3A008' : '#E03B3B';
    out = {
      ...EMPTY_BASE,
      passportExpired: !!pp.unverified,
      passportValid: !pp.unverified,
      passportName: pp.name, passportBrand: pp.brand,
      passportModel: pp.model, passportGtin: pp.gtin, passportBatch: pp.batch,
      passportOrigin: pp.origin, passportMade: pp.made,
      ecoCarbon: pp.carbon, ecoCarbonUnit: pp.carbonUnit,
      ecoRecycled: pp.recycled, ecoWater: pp.water, ecoWaterUnit: pp.waterUnit,
      repairScore: pp.repair.toFixed(1),
      repairVerdict: pp.repair >= 8 ? '수리하기 쉬운 제품입니다' : pp.repair >= 6 ? '전문 서비스센터 수리를 권장합니다' : '자가 수리가 어려운 제품입니다',
      careItems: pp.care.map(([t, d]) => ({ key: t, title: t, detail: d })),
      partItems: pp.parts.map(([t, d]) => ({ key: t, title: t, detail: d })),
      manualName: pp.manual,
      hazardSafe: !pp.hazard, hazardRisk: pp.hazard, hazardNote: pp.hazardNote,
      disposalItems: pp.disposal.map(([t, d]) => ({ key: t, title: t, detail: d })),
      takebackName: pp.brand + ' 제품 회수 바로가기',
      repairColor
    };
  } else if (cached) {
    out = {
      ...EMPTY_BASE,
      passportValid: true,
      passportName: cached.formLabel || id,
      basicStatus: '발급 완료',
      basicMaterialLabel: MATERIAL_LABEL[cached.material] || cached.material,
      basicFields: (cached.fields || []).map((f) => ({
        key: f.label, label: f.label, value: f.value || '미입력',
        sourceChip: ctx.chip('rgba(18,161,80,.12)', '#0E7A3D'),
        sourceLabel: '파싱'
      }))
    };
  } else {
    out = { ...EMPTY_BASE };
  }

  return {
    passportNotFound: notFound,
    passportBasic: !curated && !!cached,
    passportId: id,
    passportExpired: out.passportExpired,
    passportValid: out.passportValid,
    passportName: out.passportName, passportBrand: out.passportBrand,
    passportModel: out.passportModel, passportGtin: out.passportGtin, passportBatch: out.passportBatch,
    passportOrigin: out.passportOrigin, passportMade: out.passportMade,
    ecoCarbon: out.ecoCarbon, ecoCarbonUnit: out.ecoCarbonUnit,
    ecoRecycled: out.ecoRecycled, ecoRecycledBar: ctx.bar(out.ecoRecycled, '#0045A9'),
    ecoWater: out.ecoWater, ecoWaterUnit: out.ecoWaterUnit,
    repairScore: out.repairScore,
    repairBar: { display: 'block', height: '100%', width: (parseFloat(out.repairScore) * 10) + '%', borderRadius: 6, background: out.repairColor || '#9AA8BE' },
    repairColorStyle: { fontSize: 40, fontWeight: 700, color: out.repairColor || '#9AA8BE', fontFamily: "'JetBrains Mono',monospace", lineHeight: 1 },
    repairVerdict: out.repairVerdict,
    careItems: out.careItems, partItems: out.partItems, manualName: out.manualName,
    openManual: () => ctx.say('수리 매뉴얼 PDF를 다운로드합니다.'),
    openVideo: () => ctx.say('수리 영상 페이지로 이동합니다.'),
    hazardSafe: out.hazardSafe, hazardRisk: out.hazardRisk, hazardNote: out.hazardNote,
    disposalItems: out.disposalItems, takebackName: out.takebackName,
    openTakeback: () => ctx.say((out.passportBrand || '제조사') + ' 제품 회수 페이지로 이동합니다.'),
    basicStatus: out.basicStatus, basicMaterialLabel: out.basicMaterialLabel, basicFields: out.basicFields,
    backToScans: () => setState({ tab: 'scans' })
  };
}
