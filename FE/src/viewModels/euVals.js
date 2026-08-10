import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function euVals(ctx) {
  const { state, setState, props } = ctx;
  return {
    exportCsv: () => ctx.say('조회 결과 6건을 CSV로 내보냈습니다.'),
    searchRegistry: () => ctx.say('레지스트리에서 6건을 조회했습니다.'),
    registry: [
      ['DPP-KR-ST-2607-0142', 'KRST-HRC-032', '2026-07-24', '11:04:22', '열연코일 HR-SPHC 3.2t', '대성제강', '7208.39'],
      ['DPP-KR-BT-2607-0311', 'KRBT-MOD-072', '2026-07-22', '09:18:47', 'EV 배터리 모듈 M3-72', '루멘셀', '8507.60'],
      ['DPP-KR-TX-2607-0521', 'KRTX-JSY-180', '2026-07-19', '16:41:03', '오가닉 코튼 저지 180g', '아라텍스', '6006.21'],
      ['DPP-DE-ST-2607-0088', 'DEST-PLT-020', '2026-07-16', '08:02:55', 'Hot-rolled plate S355', 'Nordwerk GmbH', '7208.51'],
      ['DPP-KR-ST-2607-0138', 'KRST-PLT-020', '2026-07-14', '13:27:10', '후판 SM490A 20t', '대성제강', '7208.51'],
      ['DPP-FR-TX-2607-0204', 'FRTX-WVN-120', '2026-07-11', '10:55:38', 'Recycled poly woven', 'Fibrelune SAS', '5407.52']
    ].map(([id, code, date, time, name, company, hs]) => ({
      key: id, id, code, date, time, name, company, hs,
      open: () => ctx.say(id + ' DPP 원본을 열람했습니다. (열람 이력 기록됨)')
    })),
    auditLog: [
      ['2026-07-30 07:41:12', '대성제강 · 박지우', 'DPP 발급', 'DPP-KR-ST-2607-0142', '성공', '0x8a41…c92d'],
      ['2026-07-30 07:12:04', 'IEUM · 김도현', 'Tier 심사 승인', '우진메탈 · Tier 3', '성공', '0x71bc…4f08'],
      ['2026-07-29 22:08:55', '루멘셀 · 이서준', 'ZKP 증명 제출', 'DPP-KR-BT-2607-0298', '반려', '0x33ef…a1b7'],
      ['2026-07-29 18:44:31', '시장감독기관 · 윤가람', '레지스트리 열람', 'DPP-DE-ST-2607-0088', '성공', '0x0d92…77aa'],
      ['2026-07-29 15:20:09', '아라텍스 · 최유진', '데이터 수정', 'DPP-KR-TX-2607-0533', '성공', '0xb410…2e51'],
      ['2026-07-29 11:03:47', 'IEUM · 시스템', '블록체인 앵커링', 'BATCH-2607-118 (240건)', '성공', '0xf7a2…9c30'],
      ['2026-07-28 20:31:18', '우진메탈 · 초대계정', '문서 업로드', 'DOC-2607-1151', '검증 실패', '0x5511…be6f'],
      ['2026-07-28 09:14:52', 'IEUM · 김도현', '가입 승인', 'Fibrelune SAS', '성공', '0x2cd8…10f4']
    ].map(([at, actor, action, target, result, hash]) => ({
      key: hash + at, at, actor, action, target, result, hash,
      chip: result === '성공' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(224,59,59,.10)', '#C22B2B')
    }))
  };
}
