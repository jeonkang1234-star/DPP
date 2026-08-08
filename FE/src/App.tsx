import React, { useCallback, useRef, useState } from 'react';
import './App.css';

/**
 * IEUM Digital Product Passport — 단일 파일 버전
 *
 * 이 파일 하나만 src/App.jsx 에 붙여넣으면 전체 프로토타입이 동작합니다.
 * (스타일은 App.css, 로고는 public/logo-ieum.png 에 넣어주세요)
 *
 * React 18 + 함수형 컴포넌트 + Hooks. 외부 라이브러리 없음.
 */


/* ==================================================================
 * 공통 스타일 빌더 (칩 · 탭 · 바)
 * ================================================================== */

/**
 * Pure style builders shared across screens (pills, chips, tabs, bars).
 * Each returns a plain React style object — no state, safe to call during render.
 */
function pill(active) {
  return active
    ? { height: 44, border: 0, borderRadius: 10, background: '#0045A9', color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,69,169,.26)' }
    : { height: 44, border: 0, borderRadius: 10, background: 'transparent', color: '#5A6B85', fontSize: 14.5, fontWeight: 600, cursor: 'pointer' };
}

function roleCard(active) {
  return {
    display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start', textAlign: 'left',
    padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
    border: active ? '1.5px solid #0045A9' : '1.5px solid rgba(16,32,64,.12)',
    background: active ? 'rgba(0,69,169,.05)' : '#fff',
    boxShadow: active ? '0 4px 14px rgba(0,69,169,.14)' : 'none'
  };
}

function pillDot(color) {
  return { width: 8, height: 8, flex: 'none', borderRadius: 999, background: color };
}

function domainCard(active) {
  return {
    display: 'grid', placeItems: 'center', height: 92, padding: '0 14px', cursor: 'pointer',
    border: active ? '1.5px solid #0045A9' : '1.5px solid rgba(16,32,64,.12)',
    background: active ? 'rgba(0,69,169,.05)' : '#fff',
    color: active ? '#0045A9' : '#0B1B33',
    boxShadow: active ? '0 4px 14px rgba(0,69,169,.14)' : 'none'
  };
}

function switchBtn(active) {
  return {
    height: 30, padding: '0 13px', border: 0, borderRadius: 10, cursor: 'pointer',
    fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap', flex: 'none',
    background: active ? '#fff' : 'rgba(255,255,255,.10)',
    color: active ? '#0B1B33' : 'rgba(255,255,255,.72)'
  };
}

function tabStyle(active) {
  return active
    ? { height: 40, padding: '0 18px', border: 0, borderRadius: 11, background: '#0045A9', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,69,169,.26)', whiteSpace: 'nowrap' }
    : { height: 40, padding: '0 18px', border: 0, borderRadius: 11, background: 'transparent', color: '#5A6B85', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
}

function chip(bg, fg) {
  return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', height: 24, padding: '0 11px', borderRadius: 999, background: bg, color: fg, fontSize: 11.5, fontWeight: 700, width: 'fit-content' };
}

function domainChipFor(d) {
  if (d === '철강') return chip('rgba(0,69,169,.10)', '#0045A9');
  if (d === '배터리') return chip('rgba(18,161,80,.12)', '#0E7A3D');
  if (d === '섬유·패션') return chip('rgba(227,160,8,.16)', '#96660A');
  return chip('rgba(16,32,64,.07)', '#44546F');
}

function avatarStyle(hue) {
  return { width: 30, height: 30, flex: 'none', borderRadius: 999, background: hue, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 };
}

function bar(pct, color) { return { display: 'block', height: '100%', width: pct + '%', borderRadius: 6, background: color }; }

function pctStyle(pct) {
  const c = pct === 0 ? '#C22B2B' : pct >= 100 ? '#0E7A3D' : '#96660A';
  return { fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700, color: c, textAlign: 'right' };
}

function segStyle(w, color) { return { display: 'block', width: w + '%', height: '100%', background: color }; }

function dot(color) { return { width: 9, height: 9, marginTop: 5, flex: 'none', borderRadius: 5, background: color }; }


/* ==================================================================
 * 데모 데이터
 * ================================================================== */

/**
 * Demo dataset for the prototype. Replace with API responses on integration.
 */
function compDataFor(role) {
  const r = role;
  const sets = {
    steel: [
      ['DPP-KR-ST-2607-0142', '열연코일 HR-SPHC 3.2t', 100, 0, 0, 'Heat H26-0817 · 12.4t'],
      ['DPP-KR-ST-2607-0157', 'H형강 SS400 300×300', 88, 12, 0, 'Heat H26-0791 · 8.2t'],
      ['DPP-KR-ST-2607-0138', '후판 SM490A 20t', 72, 18, 10, 'Heat H26-0774 · 21.0t'],
      ['DPP-KR-ST-2607-0169', '도금강판 GI Z275', 60, 30, 10, 'Heat H26-0802 · 5.6t'],
      ['DPP-KR-ST-2607-0151', '냉연강판 CR-SPCC 1.2t', 45, 25, 30, 'Heat H26-0768 · 9.8t'],
      ['DPP-KR-ST-2607-0163', '선재 SWRCH22A 5.5φ', 0, 0, 100, 'Heat H26-0811 · 14.2t']
    ],
    battery: [
      ['DPP-KR-BT-2607-0311', 'EV 배터리 모듈 M3-72', 100, 0, 0, '72kWh · NCM811'],
      ['DPP-KR-BT-2607-0288', 'BMS 통합 팩 P-88', 91, 9, 0, '88kWh · LFP'],
      ['DPP-KR-BT-2607-0298', '파우치 셀 NCM811', 68, 22, 10, '3.7V · 62Ah'],
      ['DPP-KR-BT-2607-0305', 'ESS 랙 R-480', 40, 25, 35, '480kWh · LFP'],
      ['DPP-KR-BT-2607-0319', '재사용 모듈 RM-12', 0, 0, 100, 'SOH 82% · 12kWh']
    ],
    textile: [
      ['DPP-KR-TX-2607-0521', '오가닉 코튼 저지 180g', 100, 0, 0, 'GOTS · 180g/m²'],
      ['DPP-KR-TX-2607-0517', '데님 12oz 셀비지', 85, 15, 0, '12oz · 리지드'],
      ['DPP-KR-TX-2607-0508', '리사이클 폴리 우븐', 74, 16, 10, 'GRS 82% · 120g/m²'],
      ['DPP-KR-TX-2607-0533', '울 블렌드 코트지', 38, 22, 40, 'RWS · 340g/m²'],
      ['DPP-KR-TX-2607-0540', '텐셀 니트 라이트', 0, 0, 100, 'Lyocell 100%']
    ]
  };
  return sets[r] || sets.steel;
}

/** Seeded demo accounts: email -> role. */
const SEEDED_ACCOUNTS = {
  'dh.kim@daesungsteel.co.kr': 'steel',
  'sj.lee@lumencell.co.kr': 'battery',
  'yj.choi@aratex.co.kr': 'textile',
  'ops@ieum.io': 'admin',
  'jw.han@customs.go.kr': 'customs',
  'inspector@douane.gouv.fr': 'customs',
  'gr.yoon@korea.kr': 'eu',
  'audit@zoll.de': 'eu',
};


/* ==================================================================
 * 화면별 뷰모델
 * ================================================================== */

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function makerVals(ctx) {
  const { state, setState, props } = ctx;
  const r = state.role;
  const p = ctx.profile();
  const kpi = { steel: ['1,204', 86, 42, 24, 18, 78], battery: ['842', 61, 31, 17, 14, 74], textile: ['506', 38, 22, 12, 10, 71] }[r] || ['0', 0, 0, 0, 0, 0];
  const queues = {
    steel: [['D-1', 'ISO 14001 인증서 갱신본 첨부', 'DPP-KR-ST-2607-0138'], ['D-2', 'Heat 번호 누락 6건 보완', '배치 B-2607-03'], ['D-3', '협력사 제출 데이터 검증 승인', '우진메탈 · 압연 공정'], ['D-4', 'ZKP 증명 제출 요구 응답', 'DPP-KR-ST-2607-0151'], ['D-6', 'Tier 3 심사 추가서류 제출', '심사번호 T-0417']],
    battery: [['D-1', '셀 제조번호 매핑 오류 수정', 'DPP-KR-BT-2607-0298'], ['D-2', '재활용 원료 함량 증빙 첨부', 'DPP-KR-BT-2607-0305'], ['D-3', '탄소발자국 검증기관 회신 확인', 'DPP-KR-BT-2607-0311'], ['D-5', '협력사 데이터 미제출 독촉', '케이볼트 · 양극재'], ['D-7', 'ZKP 증명 유효기간 갱신', 'DPP-KR-BT-2607-0288']],
    textile: [['D-1', '소재 혼용률 합계 보정 (92%)', 'DPP-KR-TX-2607-0533'], ['D-2', 'OEKO-TEX 인증번호 재확인', 'DPP-KR-TX-2607-0508'], ['D-4', '염색 공정 폐수 데이터 입력', 'DPP-KR-TX-2607-0540'], ['D-5', '협력사 초대 응답 독촉', '청우섬유 · 방적'], ['D-8', '케어 라벨 다국어 번역 검수', 'DPP-KR-TX-2607-0521']]
  }[r] || [];
  const inputMeta = {
    steel: { title: '철강 데이터 입력 (Mill Sheet)', upload: '밀시트 업로드', hint: 'PDF · XLSX · 스캔 이미지 지원 · 최대 20MB', file: 'MillSheet_H26-0817.pdf', ocr: 14, form: '강재 기본 정보', count: 18 },
    battery: { title: '배터리 데이터 입력', upload: '셀 시험성적서 업로드', hint: 'PDF · CSV · 최대 20MB', file: 'CellTestReport_NCM811.pdf', ocr: 11, form: '배터리 기본 정보', count: 21 },
    textile: { title: '섬유 데이터 입력', upload: '소재 시험성적서 업로드', hint: 'PDF · XLSX · 최대 20MB', file: 'FabricSpec_OC180.pdf', ocr: 9, form: '소재 기본 정보', count: 16 }
  }[r] || {};
  const fieldSets = {
    steel: [['강종', '필수', 'SPHC', 'SPHC', 'KS D 3501 기준 강종 코드'], ['규격 (치수)', '필수', '3.2t × 1219 × Coil', '3.2t × 1219 × Coil', '두께 × 폭 × 형태'], ['Heat 번호', '필수', 'H26-0817', 'H26-0817', '용강 단위 고유번호'], ['제철소', '필수', '광양 제2공장', '광양 제2공장', '생산 사업장'], ['용광로', '필수', 'BF-3', 'BF-3', '고로/전기로 식별자'], ['제조일자', '필수', '2026-07-24', '2026-07-24', ''], ['인장강도 (MPa)', '선택', '295', '295', '시험성적서 값 자동 매핑'], ['재생원료 비율 (%)', '필수', '32.4', '32.4', 'ZKP 증명 대상 항목']],
    battery: [['셀 화학조성', '필수', 'NCM811', 'NCM811', '양극재 조성 코드'], ['정격용량 (Ah)', '필수', '62', '62', ''], ['정격전압 (V)', '필수', '3.7', '3.7', ''], ['셀 제조번호', '필수', 'LC-2607-88421', 'LC-2607-88421', '셀 단위 고유번호'], ['제조일자', '필수', '2026-07-22', '2026-07-22', ''], ['재활용 원료 함량 (%)', '필수', '18.6', '18.6', 'EU 배터리 규정 기준'], ['탄소발자국 (kgCO₂e)', '필수', '54.2', '54.2', '검증기관 확인 필요'], ['예상 수명 (사이클)', '선택', '4,000', '4,000', '']],
    textile: [['소재 혼용률', '필수', 'Cotton 100%', 'Cotton 100%', '합계 100% 필요'], ['원사 번수', '선택', '30/1', '30/1', ''], ['원산지', '필수', '대한민국 (KR)', '대한민국 (KR)', '가공 단계별 원산지'], ['염색 공정', '필수', '반응성 염색 · 저온', '반응성 염색 · 저온', '폐수 처리 정보 포함'], ['중량 (g/m²)', '필수', '180', '180', ''], ['인증', '필수', 'GOTS 6.0', 'GOTS 6.0', 'GRS · OEKO-TEX 등'], ['재생원료 비율 (%)', '필수', '0', '', 'ZKP 증명 대상 항목'], ['제조일자', '필수', '2026-07-19', '2026-07-19', '']]
  }[r] || [];
  const isBatch = state.issueMode === 'batch';
  return {
    kpiTotal: kpi[0], kpiNew: kpi[1], kpiIncomplete: kpi[2], kpiMissing: kpi[3], kpiWaiting: kpi[4], kpiAvg: kpi[5],
    kpiAvgBar: ctx.bar(kpi[5], '#0045A9'),
    goInput: () => setState({ tab: 'input' }),
    queue: queues.map(([due, task, target]) => ({
      key: task, due, task, target,
      dueDot: ctx.pillDot(due === 'D-1' ? '#E03B3B' : due === 'D-2' ? '#E3A008' : '#9AA8BE'),
      act: () => ctx.say('작업을 처리 화면으로 이동했습니다 · ' + task)
    })),
    completeness: ctx.compData().map((row, i) => {
      const [id, name, done, prog, none] = row;
      return {
        key: id, id, name, pct: done,
        pctStyle: ctx.pctStyle(done),
        segs: [{ key: 'a', style: ctx.segStyle(done, '#12A150') }, { key: 'b', style: ctx.segStyle(prog, '#E3A008') }, { key: 'c', style: ctx.segStyle(none, '#E03B3B') }],
        open: () => setState({ dppOpen: true, dppId: id })
      };
    }),
    inputTitle: inputMeta.title, uploadTitle: inputMeta.upload, uploadHint: inputMeta.hint,
    uploadedName: inputMeta.file, ocrCount: inputMeta.ocr, formTitle: inputMeta.form, fieldCount: inputMeta.count,
    isBatch,
    singleBtn: ctx.pill(!isBatch), batchBtn: ctx.pill(isBatch),
    setSingle: () => setState({ issueMode: 'single' }),
    setBatch: () => setState({ issueMode: 'batch' }),
    issueLabel: isBatch ? '배치 240건 발급' : 'DPP 발급',
    doUpload: () => ctx.say('파일을 업로드하고 필드를 자동 매핑했습니다.'),
    saveDraft: () => ctx.say('임시저장했습니다.'),
    issueDpp: () => ctx.say(isBatch ? '배치 240건의 DPP 발급을 시작했습니다.' : 'DPP를 발급하고 블록체인에 앵커링했습니다.'),
    fields: fieldSets.map(([label, req, ph, value, hint]) => ({
      key: label, label, req, ph, value, hint
    })),
    fieldCheck: fieldSets.map(([label, req, ph, value]) => ({
      key: label, label, filled: !!value,
      dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
      mark: value ? '✓' : '',
      valueText: value || '미입력',
      valueStyle: { fontSize: 12.5, color: value ? '#44546F' : '#C22B2B', fontWeight: value ? 500 : 600 }
    })),
    fieldFilledCount: fieldSets.filter(f => !!f[3]).length,
    fieldTotalCount: fieldSets.length,
    fieldCheckOpen: !!state.fieldCheckOpen,
    openFieldCheck: () => setState({ fieldCheckOpen: true }),
    closeFieldCheck: () => setState({ fieldCheckOpen: false }),
    validations: [
      ['필수 필드 충족', fieldSets.filter(f => !!f[3]).length + ' / ' + fieldSets.length + '개 입력 완료', fieldSets.every(f => !!f[3]) ? '#12A150' : '#E3A008', true],
      ['단위·형식 검증', '모든 수치 항목 단위 일치', '#12A150', false],
      ['제3자 인증서', 'ISO 14001 유효기간 D-12', '#E3A008', false],
      ['재생원료 비율', 'ZKP 증명 미생성 · 발급 전 필요', '#E03B3B', false]
    ].map(([label, detail, c, clickable]) => ({
      key: label, label, detail, dot: ctx.dot(c),
      arrow: clickable ? '→' : '',
      rowStyle: {
        display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 11, alignItems: 'flex-start',
        padding: clickable ? '10px 12px' : '10px 12px',
        margin: '0 -12px',
        border: clickable ? '1px solid rgba(16,32,64,.09)' : '1px solid transparent',
        borderRadius: 12,
        background: clickable ? '#FBFCFE' : 'transparent',
        cursor: clickable ? 'pointer' : 'default',
        textAlign: 'left'
      },
      open: () => { if (clickable) setState({ fieldCheckOpen: true }); }
    })),
    invites: [
      ['우진메탈', 'contact@woojinmetal.co.kr', '2026-07-29', '수락'],
      ['태강특수강', 'dpp@taekang.co.kr', '2026-07-28', '대기'],
      ['신흥압연', 'admin@shinheung.kr', '2026-07-26', '수락'],
      ['동보물류', 'log@dongbo.co.kr', '2026-07-24', '대기'],
      ['한영코팅', 'plant@hanyoung.kr', '2026-07-18', '거절'],
      ['세림리사이클', 'eco@serim.co.kr', '2026-07-15', '수락']
    ].map(([name, email, at, status]) => ({
      key: email, name, email, at, status,
      statusDot: ctx.pillDot(status === '수락' ? '#12A150' : status === '대기' ? '#E3A008' : '#E03B3B'),
      canResend: status !== '수락',
      resendStyle: status === '수락'
        ? { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.08)', borderRadius: 9, background: '#F7F9FD', fontSize: 12, fontWeight: 600, color: '#C3CBD9', cursor: 'not-allowed' }
        : { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.12)', borderRadius: 9, background: '#fff', fontSize: 12, fontWeight: 600, color: '#44546F', cursor: 'pointer' },
      resend: () => { if (status !== '수락') ctx.say(name + '에 초대를 재발송했습니다.'); }
    })),
    invRole1: ctx.roleCard(state.invRole !== 2 && state.invRole !== 3),
    invRole2: ctx.roleCard(state.invRole === 2),
    invRole3: ctx.roleCard(state.invRole === 3),
    pickRole1: () => setState({ invRole: 1 }),
    pickRole2: () => setState({ invRole: 2 }),
    pickRole3: () => setState({ invRole: 3 }),
    sendInvite: () => ctx.say('초대 메일을 발송했습니다. (유효기간 7일)'),
    products: ctx.compData().filter(r => !state.removedProducts.includes(r[0])).map((row, i) => {
      const [id, name, done, , , spec] = row;
      const status = done === 100 ? '발급 완료' : done === 0 ? '입력 대기' : '작성 중';
      return {
        key: id, id, name, spec, pct: done,
        lot: spec.split(' · ')[0],
        at: ['2026-07-24', '2026-07-22', '2026-07-19', '2026-07-16', '2026-07-12', '2026-07-08'][i] || '2026-07-05',
        pctStyle: ctx.pctStyle(done),
        statusDot: ctx.pillDot(done === 100 ? '#12A150' : done === 0 ? '#E03B3B' : '#E3A008'),
        status,
        canDelete: done < 100,
        isIssued: done === 100,
        open: () => setState({ dppOpen: true, dppId: id }),
        remove: () => setState({
          confirm: done === 100
            ? {
                title: '발급 완료된 DPP는 삭제할 수 없습니다',
                body: name + ' 은(는) 이미 블록체인에 앵커링되어 DPP 레지스트리에 등록되었습니다. 잘못된 정보라면 폐기 신청으로 무효화 이력을 남길 수 있습니다.',
                label: '폐기 신청',
                danger: false,
                run: () => { setState({ confirm: null }); ctx.say('폐기 신청을 접수했습니다. 관리자 승인 후 무효 처리됩니다.'); }
              }
            : {
                title: 'DPP를 삭제할까요?',
                body: name + ' (' + id + ') 의 작성 중 데이터와 업로드한 문서가 함께 삭제됩니다. 되돌릴 수 없습니다.',
                label: '삭제',
                danger: true,
                run: () => {
                  setState(s => ({ removedProducts: s.removedProducts.concat(id), confirm: null }));
                  ctx.say('DPP를 삭제했습니다.');
                }
              }
        })
      };
    }),
    myBiz: { steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '',
    myUrl: { steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || '',
    myTier: r === 'steel' ? 'Tier 3' : 'Tier 2',
    myTierName: r === 'steel' ? '엔터프라이즈 / Full DPP' : '표준 / 검증 등록',
    myTierDesc: r === 'steel' ? '공급망 하위 업체를 초대해 전체 추적망을 연동할 수 있습니다.' : '제3자 인증서 기반 검증 등록이 가능합니다. Tier 3 신청 시 하위 협력사 연동이 열립니다.',
    requestTier: () => ctx.say('상위 Tier 신청서를 제출했습니다. 자동심사 진행 중입니다.'),
    requestPerm: () => ctx.say('권한 추가 신청이 관리자에게 전달되었습니다.'),
    saveProfile: () => ctx.say('기업 정보를 수정했습니다.'),
    myPerms: [['DPP 발급·수정', 1], ['협력사 초대', 1], ['ZKP 증명 제출', r === 'steel' ? 1 : 0], ['감사 로그 열람', 0], ['배치 대량 발급', r === 'steel' ? 1 : 0]].map(([label, on]) => ({
      key: label, label, style: on ? ctx.chip('rgba(0,69,169,.10)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#9AA8BE')
    })),
    myDocs: [
      ['사업자등록증.pdf', 'PDF · 1.2MB · 2026-01-04 업로드', '승인'],
      ['공장등록증.pdf', 'PDF · 0.8MB · 2026-01-04 업로드', '승인'],
      ['ISO_14001.pdf', 'PDF · 2.4MB · 2026-06-11 업로드', '검증 중'],
      ['ESG_보고서_2025.pdf', 'PDF · 5.1MB · 2026-03-22 업로드', '승인']
    ].map(([name, meta, status]) => ({
      key: name, name, meta, status,
      dot: ctx.pillDot(status === '승인' ? '#12A150' : '#E3A008'),
      view: () => setState({ docPreview: { name, meta, status } })
    })),
    profileName: state.profile ? state.profile.name : p.ws,
    profileBiz: state.profile ? state.profile.biz : ({ steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || ''),
    profilePhone: state.profile ? state.profile.phone : '02-3480-1200',
    profileUrl: state.profile ? state.profile.url : ({ steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || ''),
    openProfileEdit: () => setState({
      profileEdit: state.profile || {
        name: p.ws,
        biz: { steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '',
        phone: '02-3480-1200',
        url: { steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || ''
      }
    }),
    profileEditOpen: !!state.profileEdit,
    editName: state.profileEdit && state.profileEdit.name,
    editBiz: state.profileEdit && state.profileEdit.biz,
    editPhone: state.profileEdit && state.profileEdit.phone,
    editUrl: state.profileEdit && state.profileEdit.url,
    onEditName: e => setState(s => ({ profileEdit: { ...s.profileEdit, name: e.target.value } })),
    onEditBiz: e => setState(s => ({ profileEdit: { ...s.profileEdit, biz: e.target.value } })),
    onEditPhone: e => setState(s => ({ profileEdit: { ...s.profileEdit, phone: e.target.value } })),
    onEditUrl: e => setState(s => ({ profileEdit: { ...s.profileEdit, url: e.target.value } })),
    cancelProfileEdit: () => setState({ profileEdit: null }),
    commitProfileEdit: () => {
      setState(s => ({ profile: s.profileEdit, profileEdit: null }));
      ctx.say('기업 기본정보를 저장했습니다.');
    }
  };
}

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function passportVals(ctx) {
  const { state, setState, props } = ctx;
  const data = [
    {
      id: 'DPP-KR-ST-2607-0142', name: '열연코일 HR-SPHC 3.2t', brand: '대성제강',
      model: 'HRC-SPHC-32', gtin: '8801234567890', batch: 'H26-0817',
      origin: '대한민국 광양 제2공장', made: '2026년 7월 생산',
      carbon: '1,842', carbonUnit: 'kgCO₂e / t', recycled: 32, water: '1.4', waterUnit: 'm³ / t',
      repair: 8.5,
      care: [['재가공 시 유의', '절단 후 절단면 방청 처리를 권장합니다.'], ['보관 조건', '습도 60% 이하 실내 보관 시 표면 산화를 늦출 수 있습니다.']],
      parts: [['방청 코팅제 재도포 서비스', '대성제강 가공 지원센터'], ['절단·교정 재가공', '전국 5개 코일센터']],
      manual: '강재 취급·보관 가이드 (PDF)',
      hazard: false,
      hazardNote: 'REACH 고위험 우려물질(SVHC) 0.1% 초과 함유 없음',
      disposal: [['본체 (강재)', '고철 재활용 · 전기로 재용해 가능'], ['포장재 (밴딩)', '금속 밴드는 고철, 방청지는 일반 종이 분리배출']],
      takeback: '대성제강 스크랩 회수 프로그램'
    },
    {
      id: 'DPP-KR-BT-2607-0311', name: 'EV 배터리 모듈 M3-72', brand: '루멘셀',
      model: 'LC-M3-72', gtin: '8802345678901', batch: 'B26-1104',
      origin: '대한민국 청주 1공장', made: '2026년 7월 생산',
      carbon: '4,320', carbonUnit: 'kgCO₂e / 팩', recycled: 18.6, water: '12.8', waterUnit: 'm³ / 팩',
      repair: 6.2,
      care: [['충전 습관', '상시 20~80% 구간 충전 시 수명을 최대 30% 연장할 수 있습니다.'], ['보관 온도', '-10℃ ~ 45℃ 범위를 벗어난 환경에서 장기 방치하지 마세요.']],
      parts: [['모듈 단위 교체 셀', '루멘셀 공식 서비스센터 · 전국 32곳'], ['BMS 제어보드', '지정 정비소 주문 가능']],
      manual: '모듈 교체 및 진단 매뉴얼 (PDF)',
      hazard: true,
      hazardNote: '리튬염 전해질 함유 · 파손 시 내부 물질에 직접 접촉하지 마세요',
      disposal: [['배터리 모듈', '지정 회수처 배출 · 일반쓰레기 배출 금지'], ['외장 케이스', '알루미늄 분리 후 금속 재활용']],
      takeback: '루멘셀 사용후 배터리 회수 프로그램'
    },
    {
      id: 'DPP-KR-TX-2607-0521', name: '오가닉 코튼 저지 180g', brand: '아라텍스',
      model: 'OC-JSY-180', gtin: '8803456789012', batch: 'T26-0519',
      origin: '대한민국 대구 염색공장', made: '2026년 7월 생산',
      carbon: '4.2', carbonUnit: 'kgCO₂e / kg', recycled: 0, water: '2.6', waterUnit: 'm³ / kg',
      repair: 9.1,
      care: [['세탁', '30℃ 이하 약한 손세탁 · 표백제 사용 금지'], ['건조', '자연 그늘 건조 권장 · 기계 건조 시 수축 우려']],
      parts: [['수선용 여분 원단', '아라텍스 온라인 스토어'], ['봉제 수선 서비스', '제휴 리페어숍 12곳']],
      manual: '케어 라벨 해설 및 수선 가이드 (PDF)',
      hazard: false,
      hazardNote: 'OEKO-TEX Standard 100 인증 · 유해 화학물질 기준 이내',
      disposal: [['원단 본체', '의류 수거함 배출 · 섬유 재활용 가능'], ['라벨·부자재', '플라스틱 라벨 분리 후 배출']],
      takeback: '아라텍스 헌 옷 회수 캠페인'
    },
    {
      id: 'DPP-FR-TX-2607-0204', name: 'Recycled poly woven', brand: 'Fibrelune SAS',
      model: 'FL-WVN-120', gtin: '3401234567893', batch: 'F26-0330',
      origin: '프랑스 리옹 공장', made: '2026년 6월 생산', expired: false,
      carbon: '3.1', carbonUnit: 'kgCO₂e / kg', recycled: 82, water: '0.9', waterUnit: 'm³ / kg',
      repair: 8.8,
      care: [['세탁', '40℃ 이하 세탁 · 섬유유연제 사용 자제'], ['다림질', '중온(110℃) 이하 · 스팀 사용 금지']],
      parts: [['수선용 여분 원단', 'Fibrelune 리페어 스토어'], ['지퍼·부자재 키트', '유럽 내 배송 지원']],
      manual: 'Care & repair guide (PDF)',
      hazard: false,
      hazardNote: 'GRS 인증 · 우려 물질 무첨가',
      disposal: [['원단 본체', '섬유 재활용 수거함 배출'], ['포장재', '재생 종이 · 종이류 분리배출']],
      takeback: 'Fibrelune take-back program'
    },
    {
      id: 'DPP-KR-TX-2506-0388', name: '리사이클 나일론 셔츠', brand: '아라텍스', expired: true,
      model: 'AR-NYL-SHT', gtin: '8803456780015', batch: 'T25-1128',
      origin: '대한민국 대구 봉제공장', made: '2025년 11월 생산', unverified: true,
      carbon: '6.8', carbonUnit: 'kgCO₂e / 벌', recycled: 64, water: '1.8', waterUnit: 'm³ / 벌',
      repair: 8.2,
      care: [['세탁', '30℃ 이하 세탁 · 망 사용 권장'], ['건조', '자연 건조 · 직사광선 피하기']],
      parts: [['단추·지퍼 수선 키트', '아라텍스 온라인 스토어'], ['봉제 수선 서비스', '제휴 리페어숍 12곳']],
      manual: '수선 가이드 (PDF)',
      hazard: false,
      hazardNote: 'OEKO-TEX Standard 100 인증 · 유해 화학물질 기준 이내',
      disposal: [['원단 본체', '의류 수거함 배출 · 섬유 재활용 가능'], ['부자재', '금속 단추 분리 후 배출']],
      takeback: '아라텍스 헌 옷 회수 캠페인'
    }
  ];
  const p = data.find(d => d.id === state.pubId) || data[0];
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

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function tierVals(ctx) {
  const { state, setState, props } = ctx;
  const rows = [
    ['우진메탈', '철강', 'Tier 3', 'fail', '공급망 하위 업체 연동 동의서 3건 중 1건 미확인', '2026-07-30 09:02', '심사서류 5건'],
    ['그린볼트', '배터리', 'Tier 2', 'fail', 'ISO 14001 인증서 발급기관 검증 실패', '2026-07-30 08:26', '심사서류 3건'],
    ['한솔니트', '섬유·패션', 'Tier 2', 'fail', 'OEKO-TEX 인증번호 형식 불일치', '2026-07-29 17:41', '심사서류 2건'],
    ['Nordwerk GmbH', '철강', 'Tier 3', 'fail', '해외 사업자번호 자동 조회 불가 (수동 대조 필요)', '2026-07-29 15:10', '심사서류 6건'],
    ['청우섬유', '섬유·패션', 'Tier 3', 'fail', '하위 협력사 초대 응답률 40% (기준 70% 미달)', '2026-07-28 13:55', '심사서류 4건'],
    ['대성제강', '철강', 'Tier 3', 'pass', '전체 항목 충족 · 인증서 유효성 확인', '2026-07-30 09:41', '심사서류 6건'],
    ['루멘셀', '배터리', 'Tier 2', 'pass', '제3자 인증서 검증 통과', '2026-07-29 20:18', '심사서류 4건'],
    ['아라텍스', '섬유·패션', 'Tier 2', 'pass', 'GOTS·OEKO-TEX 인증 확인', '2026-07-29 13:02', '심사서류 3건'],
    ['태강특수강', '철강', 'Tier 1', 'pass', '자체 선언 등급 · 서류 심사 면제', '2026-07-28 09:24', '심사서류 1건']
  ];
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

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function approvalVals(ctx) {
  const { state, setState, props } = ctx;
  const rows = [
    ['태강특수강', '대한민국', 'KR', '218-81-99012', '2026-07-30 08:12', 'auto', '국세청 API', '사업자등록증 외 2건'],
    ['그린볼트', '대한민국', 'KR', '135-86-44120', '2026-07-30 07:48', 'auto', '국세청 API', '사업자등록증 외 3건'],
    ['Fibrelune SAS', '프랑스', 'FR', 'FR-2290-11834', '2026-07-29 18:04', 'auto', 'VIES API', 'VAT 증명 외 2건'],
    ['Nordwerk GmbH', '독일', 'DE', 'DE-8841-22007', '2026-07-29 16:22', 'auto', 'VIES API', 'VAT 증명 외 1건'],
    ['Pacific Alloy Inc.', '미국', 'US', '873-201-449', '2026-07-29 14:08', 'manual', '수동 확인 필요', 'EIN 증명 · 등록본 첨부'],
    ['Yamato Steel Co.', '일본', 'JP', 'T-7013-0022-8841', '2026-07-29 11:35', 'manual', '수동 확인 필요', '사업자 등록본 첨부'],
    ['Anhui Textile Group', '중국', 'CN', '91340100MA2CXK9Q1H', '2026-07-28 19:47', 'manual', '수동 확인 필요', '영업허가증 첨부'],
    ['한솔니트', '대한민국', 'KR', '404-81-27756', '2026-07-28 10:12', 'auto', '국세청 API', '사업자등록증 외 1건']
  ];
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

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function customsVals(ctx) {
  const { state, setState, props } = ctx;
  const items = [
    {
      id: 'DPP-KR-ST-2607-0142', name: '열연코일 HR-SPHC 3.2t', pass: true,
      eori: 'DE7412880033100', importer: 'Nordwerk GmbH', importerAddr: '독일 뒤스부르크 · Hafenstraße 22',
      exporter: '대성제강 (대한민국)', hs: '7208.39', hsName: '철 또는 비합금강의 평판압연제품 · 열간압연',
      qty: '12.4 t', declared: 'KRN-2608-004417',
      ce: true, ceNote: 'EU 적합성 선언서(DoC) 등록 · CE 마크 부착',
      doc: 'DoC_2026_HRC_SPHC.pdf', tech: '기술문서 4건 첨부',
      issued: '2026-07-24', updated: '2026-08-02', status: '유효',
      checks: [['DPP 서명 검증', true, '블록체인 앵커 해시 일치'], ['EORI 번호 조회', true, 'EU EORI 데이터베이스 등록 확인'], ['HS 코드 정합성', true, '신고 품목과 DPP 품목 일치'], ['EU 적합성 선언서', true, 'DoC 서명 유효 · 2026-07-24 발행'], ['CE 마크', true, '부착 확인 · 기술문서 4건 제출'], ['우려 물질(SVHC)', true, '0.1% 초과 함유 없음']]
    },
    {
      id: 'DPP-KR-BT-2607-0311', name: 'EV 배터리 모듈 M3-72', pass: false,
      eori: 'FR3390221100078', importer: 'Voltique SAS', importerAddr: '프랑스 리옹 · Rue Garibaldi 148',
      exporter: '루멘셀 (대한민국)', hs: '8507.60', hsName: '리튬이온 축전지',
      qty: '240 EA', declared: 'KRN-2608-004392',
      ce: false, ceNote: 'CE 마크 부착 확인 불가 · 기술문서 미제출',
      doc: 'DoC_2026_LC_M372.pdf', tech: '기술문서 1건 (2건 누락)',
      issued: '2026-07-22', updated: '2026-07-22', status: '정지',
      checks: [['DPP 서명 검증', true, '블록체인 앵커 해시 일치'], ['EORI 번호 조회', true, 'EU EORI 데이터베이스 등록 확인'], ['HS 코드 정합성', true, '신고 품목과 DPP 품목 일치'], ['EU 적합성 선언서', false, '배터리 규정 부속서 기술문서 2건 누락'], ['CE 마크', false, '부착 여부 확인 불가'], ['우려 물질(SVHC)', true, '신고 기준 충족']]
    },
    {
      id: 'DPP-KR-TX-2607-0521', name: '오가닉 코튼 저지 180g', pass: true,
      eori: 'NL8842100220055', importer: 'Deltamode B.V.', importerAddr: '네덜란드 로테르담 · Wilhelminakade 90',
      exporter: '아라텍스 (대한민국)', hs: '6006.21', hsName: '메리야스 편물 · 면제',
      qty: '3,200 m', declared: 'KRN-2608-004365',
      ce: true, ceNote: 'EU 적합성 선언서 등록 · 섬유 라벨링 규정 준수',
      doc: 'DoC_2026_AR_OC180.pdf', tech: '기술문서 3건 첨부',
      issued: '2026-07-19', updated: '2026-07-29', status: '유효',
      checks: [['DPP 서명 검증', true, '블록체인 앵커 해시 일치'], ['EORI 번호 조회', true, 'EU EORI 데이터베이스 등록 확인'], ['HS 코드 정합성', true, '신고 품목과 DPP 품목 일치'], ['EU 적합성 선언서', true, 'DoC 서명 유효 · 2026-07-19 발행'], ['CE 마크', true, '섬유 제품 · 라벨링 규정 준수 확인'], ['우려 물질(SVHC)', true, 'OEKO-TEX 인증 기준 이내']]
    }
  ];
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

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function euVals(ctx) {
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

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function notifVals(ctx) {
  const { state, setState, props } = ctx;
  const cats = [['all', '전체'], ['cert', '인증서'], ['tier', 'Tier 신청'], ['sys', '시스템'], ['zkp', 'ZKP']];
  const all = [
    ['zkp', 'ZKP', '상위 기업이 ZKP 증명 제출을 요구했습니다', '대성제강이 재생원료 비율 증명을 요청했습니다. 기한 2026-08-02', '2분 전', '증명 생성하기'],
    ['zkp', 'ZKP', 'ZKP 증명 생성·제출 완료 (승인)', 'DPP-KR-ST-2607-0138 · 검증자 서명 확인됨', '1시간 전', ''],
    ['zkp', 'ZKP', 'ZKP 조건 미달로 반려되었습니다', '재생원료 비율 기준 30% 미충족 (제출값 24.8%)', '3시간 전', '반려 사유 보기'],
    ['zkp', 'ZKP', '증명 유효기간이 임박했습니다 (D-5)', 'DPP-KR-ST-2607-0142 · 2026-08-04 만료', '어제', '갱신 신청'],
    ['cert', '인증서', 'ISO 14001 인증서 만료 12일 전', '갱신본을 업로드하지 않으면 Tier 2 자격이 정지됩니다', '어제', '업로드'],
    ['tier', 'Tier 신청', 'Tier 3 신청이 심사 예외 큐로 이관되었습니다', '하위 협력사 연동 동의서 1건 미확인', '2일 전', '서류 보완'],
    ['sys', '시스템', '우진메탈에 문서 업로드 독촉을 발송했습니다', '압연 공정 데이터 · 응답 대기 중', '2일 전', ''],
    ['sys', '시스템', '블록체인 앵커링이 완료되었습니다', 'BATCH-2607-118 · 240건 · 블록 #8,412,930', '3일 전', '']
  ];
  const cur = state.notifCat;
  const colorFor = { zkp: '#0045A9', cert: '#E3A008', tier: '#12A150', sys: '#8494AC' };
  return {
    notifOpen: state.notifOpen,
    closeNotif: () => setState({ notifOpen: false }),
    notifCats: cats.map(([k, label]) => ({
      key: k, label,
      style: { height: 34, padding: '0 14px', border: 0, borderRadius: 11, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: cur === k ? '#0B1B33' : '#F2F6FC', color: cur === k ? '#fff' : '#44546F' },
      go: () => setState({ notifCat: k })
    })),
    notifications: all.filter(n => cur === 'all' || n[0] === cur).map(([k, cat, title, body, at, action]) => ({
      key: title, cat, title, body, at,
      dot: ctx.dot(colorFor[k]),
      chip: ctx.chip(k === 'zkp' ? 'rgba(0,69,169,.10)' : k === 'cert' ? 'rgba(227,160,8,.16)' : k === 'tier' ? 'rgba(18,161,80,.12)' : 'rgba(16,32,64,.07)', k === 'zkp' ? '#0045A9' : k === 'cert' ? '#96660A' : k === 'tier' ? '#0E7A3D' : '#44546F'),
      hasAction: !!action, actionLabel: action,
      act: () => ctx.say(action + ' · 처리 화면으로 이동했습니다.')
    }))
  };
}

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function dppVals(ctx) {
  const { state, setState, props } = ctx;
  const rows = ctx.compData();
  const row = rows.find(r => r[0] === state.dppId) || rows[0];
  const [id, name, done, , , spec] = row;
  const stages = [
    ['원자재 조달', '완료', '공급사 3곳 데이터 연동 완료'],
    ['제조·가공', done >= 60 ? '완료' : '진행중', done >= 60 ? '공정 데이터 및 시험성적서 등록' : '압연 공정 데이터 미제출'],
    ['유통·물류', done >= 88 ? '완료' : '대기', done >= 88 ? '운송 구간 2건 기록' : '출하 후 자동 기록 예정'],
    ['사용·수리', '대기', '판매 이후 이벤트 수집 예정'],
    ['재활용·폐기', '대기', '재활용 사업자 스캔 시 기록']
  ];
  const missing = [
    ['재생원료 비율 증명', '우진메탈', '데이터 입력자', '#E03B3B'],
    ['압연 공정 온도 로그', '신흥압연', '데이터 입력자', '#E03B3B'],
    ['ISO 14001 갱신본', '자사 · 품질보증팀', '검증자', '#E3A008'],
    ['운송 구간 CO₂ 데이터', '동보물류', '데이터 입력자', '#E3A008']
  ];
  return {
    dppOpen: state.dppOpen,
    closeDpp: () => setState({ dppOpen: false }),
    dppId: id, dppName: name, dppPct: done, dppSpec: spec,
    dppStatusChip: done === 100 ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : done === 0 ? ctx.chip('rgba(224,59,59,.10)', '#C22B2B') : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
    dppMissingCount: done === 100 ? 0 : missing.length,
    lifecycle: stages.map(([stage, state, detail], i) => ({
      key: stage, stage, state, detail,
      dot: { width: 14, height: 14, flex: 'none', borderRadius: 8, background: state === '완료' ? '#12A150' : state === '진행중' ? '#E3A008' : '#fff', border: state === '대기' ? '2px solid #D5DCE8' : '2px solid transparent' },
      line: { width: 2, flex: 1, minHeight: i === stages.length - 1 ? 0 : 30, background: state === '완료' ? 'rgba(18,161,80,.32)' : 'rgba(16,32,64,.10)' },
      chip: state === '완료' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : state === '진행중' ? ctx.chip('rgba(227,160,8,.16)', '#96660A') : ctx.chip('rgba(16,32,64,.07)', '#8494AC')
    })),
    missingFields: (done === 100 ? [] : missing).map(([field, owner, role, c]) => ({
      key: field, field, owner, role,
      sevDot: { width: 7, height: 7, flex: 'none', borderRadius: 4, background: c },
      nudge: () => ctx.say(owner + '에 문서 업로드 독촉 알림을 전송했습니다.')
    }))
  };
}

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
function obVals(ctx) {
  const { state, setState, props } = ctx;
  const st = state.obStep;
  const kind = state.obKind || 'maker';
  const isCustoms = kind === 'customs';
  const isEu = kind === 'eu';
  const titles = isCustoms
    ? ['공식 기관 식별 코드', '시스템 연동 인증 정보', '공공 전자 인증서', '통관 조회 권한']
    : isEu
      ? ['공식 기관 식별 코드', '조사관 개별 신원 정보', '공공 전자 인증서', '민감 데이터 열람 권한']
      : ['도메인 선택하기', '기업 기본정보 입력', '증빙서류 업로드', 'Tier 신청', '권한 신청'];
  const lastStep = (isCustoms || isEu) ? 4 : 5;
  const hints = isCustoms
    ? ['국가 및 관할 세관을 나타내는 고유 ID를 등록합니다', '국가 통관 시스템(Single Window)과 자동 연동됩니다', 'eIDAS 적격 전자신원 인증서를 등록합니다', '승인된 범위의 UPI만 조회·검증할 수 있습니다']
    : isEu
      ? ['국가 및 담당 관할 구역을 나타내는 기관 ID를 등록합니다', '단속 담당 공무원의 사번과 통합 로그인을 연결합니다', 'eIDAS 적격 전자신원 인증서를 등록합니다', '제한된 데이터 열람에는 법적 권한 증명과 조사 목적 기록이 필요합니다']
      : ['선택한 도메인에 맞는 입력 화면이 제공됩니다', '사업자등록번호는 국세청 정보와 자동 대조됩니다', '사업자등록증은 필수 서류입니다', '자동심사 실패 시 관리자 수동 심사로 이관됩니다', '승인 즉시 대시보드에서 사용할 수 있습니다'];
  const d = state.obDomain;
  const t = state.obTier;
  const finish = () => {
    if (isCustoms) {
      setState({ obOpen: false, obSaved: lastStep, role: 'customs', tab: 'clearance' });
      ctx.say('온보딩을 완료했습니다. 통관 검증 화면으로 이동합니다.');
      return;
    }
    if (isEu) {
      setState({ obOpen: false, obSaved: lastStep, role: 'eu', tab: 'registry' });
      ctx.say('온보딩을 완료했습니다. DPP 레지스트리 화면으로 이동합니다.');
      return;
    }
    setState({ obOpen: false, obSaved: 5, role: d, tab: 'dash' });
    ctx.say('온보딩을 완료했습니다. ' + (d === 'steel' ? '철강' : d === 'battery' ? '배터리' : '섬유·패션') + ' 대시보드로 이동합니다.');
  };
  return {
    obOpen: state.obOpen,
    obStep: st,
    obLastStep: lastStep,
    obTitle: titles[st - 1],
    obHint: hints[st - 1],
    obNextLabel: st >= lastStep ? '온보딩 완료' : '다음 단계',
    obBars: Array.from({ length: lastStep }, (_, i) => i + 1).map(i => ({ key: i, style: { flex: 1, height: 5, borderRadius: 3, background: i <= st ? '#0045A9' : '#E7EDF7' } })),
    obIsCustoms: isCustoms,
    obIsGov: isCustoms || isEu,
    obGovBanner: (isCustoms || isEu) && (state.obSaved || 0) > 0 && (state.obSaved || 0) < lastStep,
    obGovBannerText: '온보딩 ' + (state.obSaved || 1) + '단계 「' + titles[(state.obSaved || 1) - 1] + '」에서 중단되었습니다.',
    obIs1: st === 1 && kind === 'maker', obIs2: st === 2 && kind === 'maker', obIs3: st === 3 && kind === 'maker', obIs4: st === 4 && kind === 'maker', obIs5: st === 5 && kind === 'maker',
    obG1: st === 1 && (isCustoms || isEu),
    obG3: st === 3 && (isCustoms || isEu),
    obC2: st === 2 && isCustoms, obC4: st === 4 && isCustoms,
    obM2: st === 2 && isEu, obM4: st === 4 && isEu,
    obGovIdLabel: isCustoms ? '관할 세관' : '담당 관할 구역',
    obGovIdPlaceholder: isCustoms ? '예) 인천세관 (INC)' : '예) 수도권 관할 (KR-SEO)',
    obGovCodeSample: isCustoms ? 'KR-INC-020' : 'KR-MSA-011',
    obGovOrgPlaceholder: isCustoms ? '예) 관세청 인천세관 수입통관과' : '예) 국가기술표준원 제품안전조사과',
    obClose: () => {
      const done = (state.obSaved || 0) >= lastStep;
      const backTab = isCustoms ? 'clearance' : isEu ? 'registry' : 'my';
      setState({ obOpen: false, obSaved: Math.max(state.obSaved || 0, st), tab: backTab });
      if (done) ctx.say('온보딩 내용을 닫았습니다.');
      else if (isCustoms || isEu) ctx.say('작성 중인 내용을 저장했습니다. 상단 「온보딩 이어서 작성」에서 다시 열 수 있습니다.');
      else ctx.say('작성 중인 내용을 저장했습니다. 마이페이지에서 이어서 진행할 수 있습니다.');
    },
    obResume: () => setState({ obOpen: true, obStep: state.obSaved || 1 }),
    obIncomplete: (state.obSaved || 0) > 0 && (state.obSaved || 0) < lastStep,
    obComplete: (state.obSaved || 0) >= lastStep,
    obDomainLabel: d === 'steel' ? '철강' : d === 'battery' ? '배터리' : '섬유·패션',
    obTierLabel: 'Tier ' + t,
    obTierSub: t === 1 ? '기초 / 셀프 등록' : t === 2 ? '표준 / 검증 등록' : '엔터프라이즈 / Full DPP',
    obPermList: [['DPP 발급·수정', true], ['협력사 초대', true], ['ZKP 증명 제출', t === 3], ['감사 로그 열람', false]].map(([label, on]) => ({
      key: label, label,
      style: on ? ctx.chip('rgba(0,69,169,.10)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#9AA8BE')
    })),
    obReview: () => setState({ obOpen: true, obStep: 1 }),
    obSavedStep: state.obSaved || 1,
    obSavedTitle: titles[(state.obSaved || 1) - 1],
    obSavedBar: { display: 'block', height: '100%', width: (((state.obSaved || 1) - 1) / 5 * 100) + '%', borderRadius: 6, background: '#0045A9' },
    obSavedPct: Math.round(((state.obSaved || 1) - 1) / 5 * 100),
    obPrev: () => setState({ obStep: Math.max(1, st - 1) }),
    obNext: () => (st >= lastStep ? finish() : setState({ obStep: st + 1 })),
    obDocs: [
      ['사업자등록증.pdf', 'PDF · 1.2MB · 2026-08-03 업로드', '업로드 완료'],
      ['공장등록증.pdf', 'PDF · 0.8MB · 2026-08-03 업로드', '업로드 완료'],
      ['ISO_14001.pdf', 'PDF · 2.4MB · 2026-08-03 업로드', '검증 중']
    ].filter(f => !(state.obRemovedDocs || []).includes(f[0])).map(([name, meta, status]) => ({
      key: name, name, meta, status,
      chip: status === '업로드 완료' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
      view: () => setState({ docPreview: { name, meta, status } }),
      remove: () => {
        setState(s => ({ obRemovedDocs: (s.obRemovedDocs || []).concat(name) }));
        ctx.say(name + ' 을(를) 삭제했습니다.');
      }
    })),
    docPreviewOpen: !!state.docPreview,
    docPreviewName: state.docPreview && state.docPreview.name,
    docPreviewMeta: state.docPreview && state.docPreview.meta,
    docPreviewStatus: state.docPreview && state.docPreview.status,
    docPreviewChip: state.docPreview && (state.docPreview.status === '업로드 완료' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(227,160,8,.16)', '#96660A')),
    closeDocPreview: () => setState({ docPreview: null }),
    downloadDoc: () => ctx.say('원본 파일을 내려받습니다.'),
    obSteelCard: ctx.domainCard(d === 'steel'), obBatteryCard: ctx.domainCard(d === 'battery'), obTextileCard: ctx.domainCard(d === 'textile'),
    obPickSteel: () => setState({ obDomain: 'steel' }),
    obPickBattery: () => setState({ obDomain: 'battery' }),
    obPickTextile: () => setState({ obDomain: 'textile' }),
    obTier1Card: ctx.roleCard(t === 1), obTier2Card: ctx.roleCard(t === 2), obTier3Card: ctx.roleCard(t === 3),
    obTier1: () => setState({ obTier: 1 }), obTier2: () => setState({ obTier: 2 }), obTier3: () => setState({ obTier: 3 })
  };
}


/* ==================================================================
 * 전역 상태 훅
 * ================================================================== */

const DEFAULT_PROPS = {
  startView: 'login',      // 'login' | 'signup' | 'app'
  startRole: 'steel',      // 'admin' | 'steel' | 'battery' | 'textile' | 'eu' | 'customs' | 'personal'
  showRoleSwitcher: true,  // prototype-only role switcher pinned to the bottom
};

/**
 * Whole-app state + view-model hook.
 *
 * State is kept as one object with a merge-style setState so the shape stays
 * flat and predictable; swap in useReducer or a store when wiring real APIs.
 */
function useAppLogic(userProps) {
  const props = { ...DEFAULT_PROPS, ...userProps };
  const timer = useRef(null);

  const compData = () => compDataFor(state.role);

  const [state, setStateRaw] = useState(() => ({
    view: props.startView || 'login',
    role: props.startRole || 'steel',
    tab: 'dash',
    loginTab: 'company',
    suTab: 'company',
    suRole: 'maker',
    obOpen: false, obStep: 1, obDomain: 'steel', obTier: 3,
    notifOpen: false, notifCat: 'all',
    dppOpen: false, dppId: null, pubId: null,
    issueMode: 'single',
    removedScans: [],
    removedProducts: [],
    confirm: null,
    toast: ''
  }));

  const setState = useCallback((patch) => {
    setStateRaw((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  /** Demo account directory: seeded users plus anyone registered this session. */
  function accounts() {
    return { ...SEEDED_ACCOUNTS, ...(state.registered || {}) };
  }

  function domainHint(v) {
    const at = (v || '').indexOf('@');
    const domain = at >= 0 ? v.slice(at + 1).toLowerCase().trim() : '';
    if (!domain) return null;
    if (/^(gmail|naver|daum|hanmail|kakao|outlook|hotmail|yahoo|nate|icloud)\./.test(domain + '.')) return 'personal';
    if (/(^|\.)customs\.go\.kr$|(^|\.)kcs\.go\.kr$/.test(domain)) return 'customs';
    if (/(^|\.)korea\.kr$|(^|\.)kats\.go\.kr$|(^|\.)motie\.go\.kr$/.test(domain)) return 'eu';
    if (/(^|\.)ieum\.io$/.test(domain)) return 'admin';
    return 'unknown';
  }

  function roleFromEmail(v) {
    const key = (v || '').toLowerCase().trim();
    if (domainHint(key) === 'personal') return 'personal';
    return accounts()[key] || null;
  }

  function firstTab(r) { return r === 'eu' ? 'registry' : r === 'personal' ? 'scans' : r === 'customs' ? 'clearance' : 'dash'; }

  function say(msg) {
    setState({ toast: msg });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState({ toast: '' }), 2600);
  }

  function go(role) { setState({ view: 'app', role, tab: firstTab(role), notifOpen: false, dppOpen: false, customsSearched: false, customsQuery: '' }); }

  function profile() {
    const m = {
      admin: { ws: 'IEUM 운영 콘솔', dl: '관리자', un: '김도현', ur: '플랫폼 운영자', ini: '김' },
      steel: { ws: '대성제강', dl: '철강', un: '박지우', ur: 'DPP 담당자 · Tier 3', ini: '박' },
      battery: { ws: '루멘셀', dl: '배터리', un: '이서준', ur: 'DPP 담당자 · Tier 2', ini: '이' },
      textile: { ws: '아라텍스', dl: '섬유·패션', un: '최유진', ur: 'DPP 담당자 · Tier 2', ini: '최' },
      eu: { ws: '국가기술표준원 · 제품안전조사과', dl: '시장감독기관', un: '윤가람', ur: 'DPP 감독관', ini: '윤' },
      customs: { ws: '인천세관 · 수입통관과', dl: '세관', un: '한지원', ur: '통관 심사관', ini: '한' },
      personal: { ws: '개인 회원', dl: '개인', un: '정민수', ur: '개인 계정', ini: '정' }
    };
    return m[state.role];
  }

  function tabList() {
    const r = state.role;
    if (r === 'admin') return [['dash', '대시보드'], ['approve', '가입 승인 관리'], ['tier', 'Tier 심사 예외'], ['docs', '문서 반려 관리']];
    if (r === 'eu') return [['registry', 'DPP 레지스트리'], ['audit', '감사 로그']];
    if (r === 'personal') return [['scans', '제품 조회 기록'], ['my', '마이페이지']];
    if (r === 'customs') return [['clearance', '통관 검증']];
    const inputLabel = r === 'steel' ? '철강 데이터 입력' : r === 'battery' ? '배터리 데이터 입력' : '섬유 데이터 입력';
    return [['dash', '대시보드'], ['input', inputLabel], ['partners', '협력사 초대'], ['products', '제품 조회'], ['my', '마이페이지']];
  }

  function renderVals() {
    const s = state;
    const roles = [['admin', '관리자'], ['steel', '철강'], ['battery', '배터리'], ['textile', '섬유·패션'], ['eu', '시장감독기관']];
    const p = profile();
    const isMaker = s.role === 'steel' || s.role === 'battery' || s.role === 'textile';
    const anchorSeq = [42, 58, 34, 66, 50, 74, 46, 62, 38, 70, 54, 82, 44, 60, 76, 52];
    const inqData = [['계정·인증', 140, 34], ['DPP 등록', 115, 28], ['Tier 심사', 78, 19], ['데이터 검증', 49, 12], ['기타', 30, 7]];
    const memberData = [
      ['대성제강', '218-81-04471', '2025-11-04', '대한민국', '철강', '1,204', '982', '#0045A9', '대'],
      ['루멘셀', '124-86-77203', '2026-01-19', '대한민국', '배터리', '842', '731', '#0E7A3D', '루'],
      ['아라텍스', '312-81-55910', '2026-02-27', '대한민국', '섬유·패션', '506', '418', '#96660A', '아'],
      ['우진메탈', '506-81-31228', '2026-03-12', '대한민국', '철강', '188', '96', '#0045A9', '우'],
      ['Nordwerk GmbH', 'DE-8841-220', '2026-04-08', '독일', '철강', '742', '640', '#10305F', 'N'],
      ['Fibrelune SAS', 'FR-2290-118', '2026-05-21', '프랑스', '섬유·패션', '311', '274', '#96660A', 'F']
    ];
    return {
      workspace: p.ws,
      domainLabel: p.dl,
      domainChip: domainChipFor(p.dl),
      userName: p.un, userRole: p.ur, userInitial: p.ini,
      showTabs: tabList().length > 1,
      tabs: tabList().map(([k, label]) => ({ key: k, label, style: tabStyle(s.tab === k), go: () => setState(k === 'clearance' ? { tab: k, customsSearched: false, customsQuery: '' } : { tab: k }) })),
      openNotif: () => setState({ notifOpen: true }),
      isMaker,
      scAdminDash: s.role === 'admin' && s.tab === 'dash',
      scApprove: s.role === 'admin' && s.tab === 'approve',
      scTier: s.role === 'admin' && s.tab === 'tier',
      scDocs: s.role === 'admin' && s.tab === 'docs',
      scMakerDash: isMaker && s.tab === 'dash',
      scInput: isMaker && s.tab === 'input',
      scPartners: isMaker && s.tab === 'partners',
      scProducts: isMaker && s.tab === 'products',
      scMy: isMaker && s.tab === 'my',
      scScans: s.role === 'personal' && s.tab === 'scans',
      scPersonalMy: s.role === 'personal' && s.tab === 'my',
      scPassport: s.role === 'personal' && s.tab === 'passport',
      scans: [
        ['DPP-KR-ST-2607-0142', '열연코일 HR-SPHC 3.2t', '대성제강', '2026-07-28 14:02', '검증됨', '2026-07-24'],
        ['DPP-KR-BT-2607-0311', 'EV 배터리 모듈 M3-72', '루멘셀', '2026-07-21 09:35', '검증됨', '2026-07-22'],
        ['DPP-KR-TX-2607-0521', '오가닉 코튼 저지 180g', '아라텍스', '2026-07-14 18:47', '정보 갱신됨', '2026-07-31'],
        ['DPP-FR-TX-2607-0204', 'Recycled poly woven', 'Fibrelune SAS', '2026-07-02 11:20', '검증됨', '2026-06-30'],
        ['DPP-KR-TX-2506-0388', '리사이클 나일론 셔츠', '아라텍스', '2026-06-11 20:14', '검증 실패', '2026-05-28']
      ].filter(r => !state.removedScans.includes(r[0])).map(([id, name, company, at, status, updated], i) => ({
        key: id, id, name, company, at, status, updated,
        remove: () => setState({
          confirm: {
            title: '조회 기록을 삭제할까요?',
            body: name + ' 의 열람 기록이 내 계정에서 삭제됩니다. 제품의 여권 자체는 삭제되지 않습니다.',
            label: '기록 삭제',
            run: () => {
              setState(s => ({ removedScans: s.removedScans.concat(id), confirm: null }));
              say('조회 기록을 삭제했습니다.');
            }
          }
        }),
        ok: status === '검증됨',
        renewed: status === '정보 갱신됨',
        failed: status === '검증 실패',
        statusIconStyle: { display: 'grid', placeItems: 'center', flex: 'none', color: status === '검증됨' ? '#12A150' : status === '정보 갱신됨' ? '#0045A9' : '#C22B2B' },
        rowStyle: { display: 'grid', gridTemplateColumns: '1.7fr 1.1fr 1.1fr 1fr 116px', gap: 12, padding: '13px 14px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' },
        open: () => setState({ tab: 'passport', pubId: id })
      })),
      scanQr: () => say('QR 스캐너를 실행했습니다.'),
      scansEmpty: false,
      ...passportVals(ctx),
      scClearance: s.role === 'customs' && s.tab === 'clearance',
      scClearLog: s.role === 'customs' && s.tab === 'clearlog',
      ...customsVals(ctx),
      scRegistry: s.role === 'eu' && s.tab === 'registry',
      scAudit: s.role === 'eu' && s.tab === 'audit',
      goApprove: () => setState({ tab: 'approve' }),
      goTier: () => setState({ tab: 'tier' }),
      goDocs: () => setState({ tab: 'docs' }),
      bulkApprove: () => say('선택한 기업의 가입을 승인했습니다.'),
      ...approvalVals(ctx),
      tier1Chip: chip('rgba(16,32,64,.07)', '#44546F'),
      tier2Chip: chip('rgba(0,69,169,.10)', '#0045A9'),
      tier3Chip: chip('rgba(18,161,80,.12)', '#0E7A3D'),
      ...tierVals(ctx),
      rejects: [
        ['대성제강', 'DOC-2607-1180', '필수 입력 데이터 누락', 'Heat 번호 · 제철소 코드 미입력', '2026-07-30 08:55'],
        ['루멘셀', 'DOC-2607-1174', '데이터 적합성 오류', '정격용량 단위 불일치 (Ah ↔ Wh)', '2026-07-30 07:20'],
        ['아라텍스', 'DOC-2607-1166', '필수 입력 데이터 누락', '소재 혼용률 합계 92% (100% 필요)', '2026-07-29 19:02'],
        ['우진메탈', 'DOC-2607-1151', '데이터 적합성 오류', 'CO₂ 배출계수 범위 초과', '2026-07-29 14:38']
      ].map(([name, id, kind, detail, at]) => ({
        key: id, name, id, kind, detail, at,
        kindChip: kind === '데이터 적합성 오류' ? chip('rgba(224,59,59,.12)', '#C22B2B') : chip('rgba(227,160,8,.16)', '#96660A')
      })),
      sendRejects: () => say('4건의 반려사유를 자동 발송했습니다.'),
      anchorBars: anchorSeq.map((h, i) => ({ key: i, style: { display: 'block', width: 6, height: h, borderRadius: 3, background: i > 12 ? 'rgba(134,239,172,.9)' : 'rgba(255,255,255,.24)' } })),
      inquiries: inqData.map(([label, count, pct]) => ({ key: label, label, count, pct, style: bar(pct * 2.6, '#0045A9') })),
      members: memberData.map(([name, biz, joined, country, domain, held, issued, hue, initial]) => ({
        key: name, name, biz, joined, country, domain, held, issued, initial,
        avatar: avatarStyle(hue), domainChip: domainChipFor(domain),
        domainDot: { width: 8, height: 8, flex: 'none', borderRadius: 999, background: domain === '철강' ? '#0045A9' : domain === '배터리' ? '#12A150' : '#E3A008' },
        view: () => say(name + ' 회원 상세 정보를 조회했습니다.')
      })),
      isLogin: s.view === 'login',
      isSignup: s.view === 'signup',
      isApp: s.view === 'app',
      toast: s.toast,
      showSwitcher: props.showRoleSwitcher !== false,

      loginIsPersonal: s.loginTab === 'personal',
      loginIsCompany: s.loginTab === 'company',
      loginPersonalTab: pill(s.loginTab === 'personal'),
      loginCompanyTab: pill(s.loginTab === 'company'),
      setPersonal: () => setState({ loginTab: 'personal' }),
      setCompany: () => setState({ loginTab: 'company' }),

      suIsPersonal: s.suTab === 'personal',
      suIsCompany: s.suTab === 'company',
      suPersonalTab: pill(s.suTab === 'personal'),
      suCompanyTab: pill(s.suTab === 'company'),
      setSuPersonal: () => setState({ suTab: 'personal' }),
      setSuCompany: () => setState({ suTab: 'company' }),
      suRoleAdmin: roleCard(s.suRole === 'admin'),
      suRoleMaker: roleCard(s.suRole === 'maker'),
      suRoleEu: roleCard(s.suRole === 'eu'),
      suRoleCustoms: roleCard(s.suRole === 'customs'),
      pickAdmin: () => setState({ suRole: 'admin' }),
      pickMaker: () => setState({ suRole: 'maker' }),
      pickEu: () => setState({ suRole: 'eu' }),
      pickCustoms: () => setState({ suRole: 'customs' }),
      suEmail: s.suEmail || '',
      onSuEmail: e => {
        const v = e.target.value;
        const at = v.indexOf('@');
        const domain = at >= 0 ? v.slice(at + 1).toLowerCase().trim() : '';
        const hint = domainHint(v);
        const map = { customs: 'customs', eu: 'eu', admin: 'admin' };
        const role = map[hint] || null;
        setState({ suEmail: v, suDetected: domain ? (hint === 'unknown' ? 'unknown' : hint) : null, suRole: role || s.suRole });
      },
      suDetectedShow: !!s.suDetected && s.suDetected !== 'personal' && s.suDetected !== 'unknown',
      suDetectedPersonal: s.suDetected === 'personal',
      suDetectedUnknown: s.suDetected === 'unknown',
      suDetectedLabel: { admin: '관리자', maker: '제조사', customs: '세관', eu: '시장감독기관' }[s.suDetected] || '',
      suDetectedNote: {
        admin: '등록된 운영 도메인 · 관리자 계정으로 제안되었습니다',
        customs: '등록된 세관 도메인 · 세관 계정으로 제안되었습니다',
        eu: '등록된 기관 도메인 · 시장감독기관 계정으로 제안되었습니다'
      }[s.suDetected] || '',

      goSignup: () => setState({ view: 'signup' }),
      goLogin: () => setState({ view: 'login' }),
      loginEmail: s.loginEmail === undefined ? 'dh.kim@daesungsteel.co.kr' : s.loginEmail,
      onLoginEmail: e => setState({ loginEmail: e.target.value }),
      loginRoleShow: !!state.loginRoleLabel,
      loginRoleLabel: state.loginRoleLabel || '',
      doLogin: () => {
        const v = s.loginEmail === undefined ? 'dh.kim@daesungsteel.co.kr' : s.loginEmail;
        const r = roleFromEmail(v);
        if (r === 'personal') { say('기업 계정 이메일을 입력해 주세요.'); return; }
        if (!r) { say('등록되지 않은 계정입니다. 가입 승인 후 이용할 수 있습니다.'); return; }
        go(r);
      },
      snsLogin: () => go('personal'),
      sendOtp: () => say('인증번호를 발송했습니다. (유효시간 3분)'),
      verifyEmail: () => say('인증 메일을 발송했습니다.'),
      refreshCaptcha: () => say('새로운 이미지를 불러왔습니다.'),
      submitSignup: () => {
        const email = (s.suEmail || '').toLowerCase().trim();
        if (domainHint(email) === 'personal') { say('개인 메일 도메인으로는 기업 회원가입을 할 수 없습니다.'); return; }
        const mapped = s.suRole === 'maker' ? 'steel' : s.suRole;
        if (email) setState(st2 => ({ registered: Object.assign({}, st2.registered, { [email]: mapped }) }));
        if (s.suRole === 'maker') setState({ view: 'app', role: 'steel', tab: 'dash', obKind: 'maker', obOpen: true, obStep: 1, obSaved: 1 });
        else if (s.suRole === 'customs') setState({ view: 'app', role: 'customs', tab: 'clearance', obKind: 'customs', obOpen: true, obStep: 1, obSaved: 1 });
        else if (s.suRole === 'eu') setState({ view: 'app', role: 'eu', tab: 'registry', obKind: 'eu', obOpen: true, obStep: 1, obSaved: 1 });
        else go('admin');
      },

      ...makerVals(ctx),
      ...euVals(ctx),
      ...notifVals(ctx),
      ...dppVals(ctx),
      ...obVals(ctx),
      confirmOpen: !!s.confirm,
      confirmTitle: s.confirm && s.confirm.title,
      confirmBody: s.confirm && s.confirm.body,
      confirmLabel: s.confirm && s.confirm.label,
      confirmStyle: s.confirm && s.confirm.danger
        ? { height: 46, padding: '0 22px', border: 0, borderRadius: 13, background: '#E03B3B', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 18px rgba(224,59,59,.24)' }
        : { height: 46, padding: '0 22px', border: 0, borderRadius: 13, background: '#0045A9', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.22)' },
      confirmRun: () => s.confirm && s.confirm.run(),
      confirmCancel: () => setState({ confirm: null }),
      roleBtns: roles.concat([['customs', '세관']]).map(([k, label]) => ({ key: k, label, style: switchBtn(s.view === 'app' && s.role === k), go: () => go(k) }))
    };
  }

  const ctx = {
    state, setState, props,
    accounts, domainHint, roleFromEmail, firstTab, say, go, profile, tabList, compData,
    pill, roleCard, pillDot, domainCard, switchBtn, tabStyle,
    chip, domainChipFor, avatarStyle, bar, pctStyle, segStyle, dot,
    makerVals, passportVals, tierVals, approvalVals, customsVals, euVals, notifVals, dppVals, obVals,
  };

  return renderVals();
}


/* ==================================================================
 * 화면 마크업
 * ================================================================== */

/**
 * Presentational layer for the whole IEUM DPP prototype.
 * Every value it renders comes from useAppLogic() — this file is markup only.
 */
function AppView(v) {
  const {
    anchorBars,
    apTabs,
    approvals,
    auditLog,
    backToScans,
    batchBtn,
    bulkApprove,
    cCeFail,
    cCeNote,
    cCeOk,
    cChecks,
    cDeclared,
    cDoc,
    cDownloadAll,
    cDownloadDoc,
    cEori,
    cExporter,
    cHs,
    cHsName,
    cId,
    cImporter,
    cImporterAddr,
    cName,
    cNoResult,
    cQty,
    cQuery,
    cRecent,
    cResultMode,
    cSearchMode,
    cTech,
    cVerdict,
    cVerdictDot,
    cVerdictStyle,
    cVerdictTextStyle,
    cancelProfileEdit,
    careItems,
    closeDocPreview,
    closeDpp,
    closeFieldCheck,
    closeNotif,
    closeTierDocs,
    commitProfileEdit,
    completeness,
    confirmBody,
    confirmCancel,
    confirmLabel,
    confirmOpen,
    confirmRun,
    confirmStyle,
    confirmTitle,
    disposalItems,
    doLogin,
    doUpload,
    docPreviewChip,
    docPreviewMeta,
    docPreviewName,
    docPreviewOpen,
    docPreviewStatus,
    domainChip,
    domainLabel,
    downloadDoc,
    dppId,
    dppMissingCount,
    dppName,
    dppOpen,
    dppPct,
    dppSpec,
    dppStatusChip,
    ecoCarbon,
    ecoCarbonUnit,
    ecoRecycled,
    ecoRecycledBar,
    ecoWater,
    ecoWaterUnit,
    editBiz,
    editName,
    editPhone,
    editUrl,
    exportCsv,
    fieldCheck,
    fieldCheckOpen,
    fieldCount,
    fieldFilledCount,
    fieldTotalCount,
    fields,
    formTitle,
    goApprove,
    goDocs,
    goInput,
    goLogin,
    goSignup,
    goTier,
    hazardNote,
    hazardRisk,
    hazardSafe,
    inputTitle,
    inquiries,
    invites,
    isApp,
    isBatch,
    isLogin,
    isSignup,
    issueDpp,
    issueLabel,
    kpiAvg,
    kpiAvgBar,
    kpiIncomplete,
    kpiMissing,
    kpiNew,
    kpiTotal,
    kpiWaiting,
    lifecycle,
    loginCompanyTab,
    loginEmail,
    loginIsCompany,
    loginIsPersonal,
    loginPersonalTab,
    manualName,
    members,
    missingFields,
    myDocs,
    myPerms,
    myTier,
    myTierDesc,
    myTierName,
    notifCats,
    notifOpen,
    notifications,
    obBars,
    obBatteryCard,
    obC2,
    obC4,
    obClose,
    obComplete,
    obDocs,
    obDomainLabel,
    obG1,
    obG3,
    obGovBanner,
    obGovBannerText,
    obGovCodeSample,
    obGovIdLabel,
    obGovIdPlaceholder,
    obGovOrgPlaceholder,
    obIncomplete,
    obIs1,
    obIs2,
    obIs3,
    obIs4,
    obIs5,
    obLastStep,
    obM2,
    obM4,
    obNext,
    obNextLabel,
    obOpen,
    obPermList,
    obPickBattery,
    obPickSteel,
    obPickTextile,
    obPrev,
    obResume,
    obReview,
    obSavedBar,
    obSavedPct,
    obSavedStep,
    obSavedTitle,
    obSteelCard,
    obStep,
    obTextileCard,
    obTier1,
    obTier1Card,
    obTier2,
    obTier2Card,
    obTier3,
    obTier3Card,
    obTierLabel,
    obTierSub,
    obTitle,
    ocrCount,
    onCustomsQuery,
    onEditBiz,
    onEditName,
    onEditPhone,
    onEditUrl,
    onLoginEmail,
    onSuEmail,
    openManual,
    openNotif,
    openProfileEdit,
    openTakeback,
    openVideo,
    partItems,
    passportBatch,
    passportBrand,
    passportExpired,
    passportGtin,
    passportId,
    passportMade,
    passportModel,
    passportName,
    passportOrigin,
    passportValid,
    pickAdmin,
    pickCustoms,
    pickEu,
    pickMaker,
    products,
    profileBiz,
    profileEditOpen,
    profileName,
    profilePhone,
    profileUrl,
    queue,
    refreshCaptcha,
    registry,
    rejects,
    repairBar,
    repairColorStyle,
    repairScore,
    repairVerdict,
    requestPerm,
    requestTier,
    resetCustomsSearch,
    roleBtns,
    runCustomsSearch,
    saveDraft,
    scAdminDash,
    scApprove,
    scAudit,
    scClearance,
    scDocs,
    scInput,
    scMakerDash,
    scMy,
    scPartners,
    scPassport,
    scPersonalMy,
    scProducts,
    scRegistry,
    scScans,
    scTier,
    scans,
    searchRegistry,
    sendInvite,
    sendOtp,
    sendRejects,
    setBatch,
    setCompany,
    setPersonal,
    setSingle,
    setSuCompany,
    setSuPersonal,
    showSwitcher,
    showTabs,
    singleBtn,
    snsLogin,
    suCompanyTab,
    suDetectedLabel,
    suDetectedNote,
    suDetectedPersonal,
    suDetectedShow,
    suDetectedUnknown,
    suEmail,
    suIsCompany,
    suIsPersonal,
    suPersonalTab,
    suRoleAdmin,
    suRoleCustoms,
    suRoleEu,
    suRoleMaker,
    submitSignup,
    tabs,
    takebackName,
    tier1Chip,
    tier2Chip,
    tier3Chip,
    tierDocList,
    tierDocsCount,
    tierDocsName,
    tierDocsOpen,
    tierDocsTier,
    tierQueue,
    tierTabs,
    toast,
    uploadHint,
    uploadTitle,
    uploadedName,
    userInitial,
    userName,
    userRole,
    validations,
    verifyEmail,
    workspace
  } = v;

  return (
    <>


      <div style={{ width: '1440px', margin: '0 auto', position: 'relative', minHeight: '900px', background: '#FFFFFF' }}>

      {isLogin ? (<>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: '900px' }}>
        <div style={{ padding: '64px 72px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0045A9', color: '#fff' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '46px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ background: '#fff', borderRadius: '10px', padding: '9px 13px', display: 'flex' }}><img src="/logo-ieum.png" alt="IEUM" style={{ height: '20px', display: 'block' }} /></div>
              <span style={{ fontSize: '13px', letterSpacing: '.16em', color: 'rgba(255,255,255,.72)', fontWeight: '600' }}>DIGITAL PRODUCT PASSPORT SERVICE</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h1 style={{ margin: '0', fontSize: '46px', lineHeight: '1.24', fontWeight: '700', letterSpacing: '-.03em', textWrap: 'pretty' }}>제품의 전 생애주기를<br />하나의 여권으로 잇습니다</h1>
              <p style={{ margin: '0', maxWidth: '430px', fontSize: '16px', lineHeight: '1.7', color: 'rgba(255,255,255,.78)', textWrap: 'pretty' }}>EU ESPR 규정에 대응하는 디지털 제품 여권 발급·검증 플랫폼. <br />원자재부터 재활용까지의 데이터를 블록체인에 앵커링하고, <br />영업기밀은 ZKP로 보호합니다.</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto auto max-content', gap: '1px', background: 'rgba(255,255,255,.16)', borderRadius: '14px', overflow: 'hidden', width: 'fit-content' }}>
            <div style={{ background: 'rgba(255,255,255,.06)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ height: '28px', display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', lineHeight: '1' }}>48,392</span><span style={{ fontSize: '12px', color: 'rgba(255,255,255,.66)', lineHeight: '1' }}>발급된 DPP</span></div>
            <div style={{ background: 'rgba(255,255,255,.06)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ height: '28px', display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', lineHeight: '1' }}>1,284</span><span style={{ fontSize: '12px', color: 'rgba(255,255,255,.66)', lineHeight: '1' }}>참여 기업</span></div>
            <div style={{ background: 'rgba(255,255,255,.06)', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ height: '28px', display: 'flex', alignItems: 'center', fontSize: '16px', fontWeight: '700', lineHeight: '1', whiteSpace: 'nowrap' }}>철강 · 배터리 · 섬유·패션</span><span style={{ fontSize: '12px', color: 'rgba(255,255,255,.66)', lineHeight: '1' }}>대응 도메인</span></div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '64px 72px' }}>
          <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '26px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h2 style={{ margin: '0', fontSize: '26px', fontWeight: '700', letterSpacing: '-.02em' }}>로그인</h2>
              <p style={{ margin: '0', fontSize: '14px', color: '#6B7A93' }}>계정 유형을 선택하고 로그인하세요.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '5px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px' }}>
              <button onClick={setPersonal} style={loginPersonalTab}>개인</button>
              <button onClick={setCompany} style={loginCompanyTab}>기업</button>
            </div>

            {loginIsPersonal ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={snsLogin} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#FEE500', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} className="hv0"><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="#1B1B1B" d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z" /></svg></span>카카오로 로그인</button>
              <button onClick={snsLogin} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#03C75A', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} className="hv1"><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M4 3h5.4l5.1 7.6V3H20v18h-5.4L9.5 13.4V21H4V3Z" /></svg></span>네이버로 로그인</button>
              <button onClick={snsLogin} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '14px', background: '#fff', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }} className="hv2"><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 48 48" width="21" height="21" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.6Z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.4 15.4 46 24 46Z" /><path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.5Z" /><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8 6.6 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9Z" /></svg></span>구글로 로그인</button>
              <p style={{ margin: '6px 0 0', fontSize: '12.5px', lineHeight: '1.6', color: '#8494AC' }}>개인 회원은 QR로 스캔한 제품의 DPP 열람 이력을 관리할 수 있습니다.</p>
            </div>
            </>) : null}

            {loginIsCompany ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>기업 이메일 (ID)</span><input type="email" value={loginEmail} onChange={onLoginEmail} style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', background: '#fff', fontSize: '14.5px', color: '#0B1B33' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>비밀번호</span><input type="password" defaultValue="dppsecure2026!" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', background: '#fff', fontSize: '14.5px' }} /></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>이메일 인증</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <input inputMode="numeric" placeholder="6자리 인증번호" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', background: '#fff', fontSize: '14.5px' }} />
                  <button onClick={verifyEmail} style={{ height: '50px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="hv3">인증메일 발송</button>
                </div>
                <span style={{ fontSize: '11.5px', color: '#8494AC' }}>위 기업 이메일 주소로 인증번호가 발송됩니다.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
          
          
              </div>
            </div>
            </>) : null}

            {loginIsCompany ? (<>
            <button onClick={doLogin} style={{ height: '54px', border: '0', borderRadius: '14px', background: '#0045A9', color: '#fff', fontSize: '15.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.28)' }} className="hv4">로그인</button>
            </>) : null}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', fontSize: '13px', color: '#6B7A93' }}>
              아직 계정이 없으신가요?
              <button onClick={goSignup} style={{ border: '0', background: 'transparent', padding: '0', fontSize: '13px', fontWeight: '600', color: '#0045A9', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>회원가입</button>
            </div>
          </div>
        </div>
      </div>
      </>) : null}

      {isSignup ? (<>
      <div style={{ minHeight: '900px', padding: '44px 0 72px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '26px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}><img src="/logo-ieum.png" alt="IEUM" style={{ height: '18px', display: 'block' }} /><span style={{ fontSize: '12px', letterSpacing: '.14em', color: '#6B7A93', fontWeight: '600' }}>DPP PLATFORM</span></div>
            <button onClick={goLogin} style={{ border: '1px solid rgba(16,32,64,.12)', background: '#fff', borderRadius: '11px', height: '38px', padding: '0 14px', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv5">로그인으로 돌아가기</button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', textAlign: 'center' }}>
            <h2 style={{ margin: '0', fontSize: '28px', fontWeight: '700', letterSpacing: '-.02em' }}>회원가입</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', padding: '5px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px', width: '320px', margin: '0 auto' }}>
            <button onClick={setSuPersonal} style={suPersonalTab}>개인</button>
            <button onClick={setSuCompany} style={suCompanyTab}>기업</button>
          </div>

          {suIsPersonal ? (<>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '20px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '32px 34px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '460px', width: '100%', margin: '0 auto' }}>
            <h3 style={{ margin: '0', fontSize: '16px', fontWeight: '600' }}>SNS 계정으로 3초 만에 가입</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button onClick={snsLogin} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#FEE500', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true"><path fill="#1B1B1B" d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z" /></svg></span>카카오로 가입</button>
              <button onClick={snsLogin} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '14px', background: '#03C75A', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path fill="#fff" d="M4 3h5.4l5.1 7.6V3H20v18h-5.4L9.5 13.4V21H4V3Z" /></svg></span>네이버로 가입</button>
              <button onClick={snsLogin} style={{ display: 'flex', alignItems: 'center', gap: '12px', height: '54px', padding: '0 18px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '14px', background: '#fff', color: '#1B1B1B', fontSize: '15px', fontWeight: '600', cursor: 'pointer' }}><span style={{ width: '22px', height: '22px', display: 'grid', placeItems: 'center', flex: 'none' }}><svg viewBox="0 0 48 48" width="21" height="21" aria-hidden="true"><path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.6Z" /><path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.4 15.4 46 24 46Z" /><path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.5Z" /><path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8 6.6 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9Z" /></svg></span>구글로 가입</button>
            </div>
          </div>
          </>) : null}

          {suIsCompany ? (<>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,760px)', gap: '20px', alignItems: 'start', justifyContent: 'center' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '20px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '30px 32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '700', color: '#0B1B33' }}>계정 유형 <span style={{ fontWeight: '500', color: '#8494AC' }}>· 등록된 도메인이면 자동 선택, 아니면 직접 선택</span></span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '10px' }}>
                  <button onClick={pickAdmin} style={suRoleAdmin}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>관리자</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>플랫폼 운영·심사</span></button>
                  <button onClick={pickMaker} style={suRoleMaker}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>제조사</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>DPP 등록·발급</span></button>
                  <button onClick={pickCustoms} style={suRoleCustoms}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>세관</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>통관 적법성 검증</span></button>
                  <button onClick={pickEu} style={suRoleEu}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>시장감독기관</span><span style={{ fontSize: '11.5px', color: '#6B7A93', lineHeight: '1.5' }}>감사·레지스트리</span></button>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(16,32,64,.07)' }}></div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>사용할 ID (기업 이메일)</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input type="email" value={suEmail} onChange={onSuEmail} placeholder="name@company.co.kr" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} />
                    <button onClick={verifyEmail} style={{ height: '50px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>이메일 인증</button>
                  </div>
                  {suDetectedShow ? (<>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(0,69,169,.05)', border: '1px solid rgba(0,69,169,.18)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', flex: 'none', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#0045A9' }}></span><span style={{ fontSize: '12px', fontWeight: '700', color: '#0045A9' }}>{suDetectedLabel}</span></span>
                    <span style={{ fontSize: '12px', lineHeight: '1.55', color: '#44546F' }}>{suDetectedNote} · 관리자 승인으로 확정됩니다</span>
                  </div>
                  </>) : null}
                  {suDetectedUnknown ? (<>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '11px', padding: '13px 15px', borderRadius: '13px', background: 'rgba(227,160,8,.08)', border: '1px solid rgba(227,160,8,.28)' }}>
                    <span style={{ width: '8px', height: '8px', flex: 'none', borderRadius: '999px', background: '#E3A008' }}></span>
                    <span style={{ fontSize: '12px', lineHeight: '1.55', color: '#44546F' }}>등록되지 않은 도메인입니다. 계정 유형을 직접 선택하고, 다음 단계에서 기관 지정 공문 또는 사업자등록증을 제출하면 관리자가 확인 후 승인합니다.</span>
                  </div>
                  </>) : null}
                  {suDetectedPersonal ? (<>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#C22B2B' }}>개인 메일 도메인(gmail, naver 등)은 기업 회원가입에 사용할 수 없습니다.</span>
                  </>) : null}
                  <span style={{ fontSize: '11.5px', color: '#8494AC' }}>도메인은 유형을 제안할 뿐이며, 최종 유형은 관리자 승인 시 확정됩니다.</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>비밀번호</span><input type="password" placeholder="특수문자, 숫자, 영문 포함 12자 이상" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} /></label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>비밀번호 확인</span><input type="password" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} /></label>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            
            
            
            
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>전화번호 인증</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                    <input inputMode="tel" style={{ height: '50px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px', fontFamily: '\'JetBrains Mono\',monospace' }} />
                    <button onClick={sendOtp} style={{ height: '50px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>인증번호 발송</button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>자동입력 방지</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '190px auto 1fr', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', height: '56px', borderRadius: '12px', overflow: 'hidden', background: '#EEF2F9', border: '1px solid rgba(16,32,64,.14)', display: 'grid', placeItems: 'center' }}>
                      <svg viewBox="0 0 190 56" width="190" height="56" role="img" aria-label="캡차 이미지" style={{ display: 'block' }}>
                        <rect width="190" height="56" fill="#EEF2F9" />
                        <path d="M-5 14 Q40 4 95 18 T195 10" stroke="rgba(11,27,51,.20)" strokeWidth="1.6" fill="none" />
                        <path d="M-5 34 Q50 50 100 30 T195 44" stroke="rgba(0,69,169,.22)" strokeWidth="1.6" fill="none" />
                        <path d="M-5 48 Q60 30 120 46 T195 26" stroke="rgba(11,27,51,.14)" strokeWidth="1.4" fill="none" />
                        <circle cx="30" cy="44" r="1.6" fill="rgba(11,27,51,.22)" />
                        <circle cx="88" cy="12" r="1.4" fill="rgba(11,27,51,.20)" />
                        <circle cx="150" cy="38" r="1.5" fill="rgba(11,27,51,.18)" />
                        <circle cx="118" cy="50" r="1.3" fill="rgba(11,27,51,.16)" />
                        <g fill="#20304C" fontFamily="Georgia, 'Times New Roman', serif" fontSize="30" fontWeight="700">
                          <text x="18" y="40" transform="rotate(-14 18 40) skewX(-8)">k</text>
                          <text x="46" y="42" transform="rotate(11 46 42) skewX(6)">7</text>
                          <text x="74" y="38" transform="rotate(-7 74 38) skewX(-12)">Q</text>
                          <text x="106" y="43" transform="rotate(17 106 43)">2</text>
                          <text x="132" y="37" transform="rotate(-12 132 37) skewX(9)">m</text>
                          <text x="162" y="41" transform="rotate(6 162 41) skewX(-6)">9</text>
                        </g>
                        <path d="M8 30 Q95 44 182 24" stroke="rgba(11,27,51,.38)" strokeWidth="1.8" fill="none" />
                      </svg>
                    </div>
                    <button onClick={refreshCaptcha} title="다른 이미지 보기" style={{ width: '50px', height: '56px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', background: '#fff', color: '#44546F', cursor: 'pointer' }} className="hv6"><svg viewBox="0 0 20 20" width="17" height="17" aria-hidden="true"><path fill="currentColor" d="M10 3.2a6.8 6.8 0 0 0-6.2 4l1.7.7A5 5 0 0 1 10 5a4.9 4.9 0 0 1 4.1 2.2h-2.3v1.8h5V4h-1.8v1.7A6.8 6.8 0 0 0 10 3.2Zm-6.8 8v5h1.8v-1.7A6.8 6.8 0 0 0 16.4 12.8l-1.7-.7A5 5 0 0 1 10 15a4.9 4.9 0 0 1-4.1-2.2h2.3V11h-5Z" /></svg></button>
                    <input placeholder="위 문자를 입력하세요" style={{ height: '56px', padding: '0 15px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14.5px' }} />
                  </div>
                  <span style={{ fontSize: '11.5px', color: '#8494AC' }}>대소문자를 구분하지 않습니다. 잘 보이지 않으면 새로고침 버튼을 누르세요.</span>
                </div>
              </div>

              <div style={{ height: '1px', background: 'rgba(16,32,64,.07)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'flex-start', gap: '9px', fontSize: '12px', lineHeight: '1.6', color: '#44546F', cursor: 'pointer', maxWidth: '420px' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '1px', accentColor: '#0045A9' }} />서비스 이용약관 및 개인정보 처리방침, DPP 데이터 제공 정책에 동의합니다.</label>
                <button onClick={submitSignup} style={{ height: '52px', padding: '0 30px', border: '0', borderRadius: '14px', background: '#0045A9', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.26)', whiteSpace: 'nowrap' }}>가입 신청</button>
              </div>
            </div>

          </div>
          </>) : null}
        </div>
      </div>
      </>) : null}

      {isApp ? (<>
      <div style={{ padding: '22px 40px 96px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
            <img src="/logo-ieum.png" alt="IEUM" style={{ height: '19px', display: 'block' }} />
            <span style={{ width: '1px', height: '20px', background: 'rgba(16,32,64,.14)' }}></span>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#44546F' }}>{workspace}</span>
            <span style={domainChip}>{domainLabel}</span>
          </div>
          {showTabs ? (<>
          <div style={{ display: 'flex', gap: '4px', padding: '6px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
            {(tabs || []).map((t, $index) => (<React.Fragment key={$index}><button onClick={t.go} style={t.style}>{t.label}</button></React.Fragment>))}
          </div>
          </>) : null}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button onClick={openNotif} style={{ position: 'relative', height: '46px', padding: '0 16px', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,32,64,.05)', display: 'inline-flex', alignItems: 'center', gap: '8px' }} className="hv7"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M10 2.2a1.1 1.1 0 0 1 1.1 1.1v.5a4.9 4.9 0 0 1 3.8 4.8v2.6l1.3 2.2a.8.8 0 0 1-.7 1.2H4.5a.8.8 0 0 1-.7-1.2l1.3-2.2V8.6a4.9 4.9 0 0 1 3.8-4.8v-.5A1.1 1.1 0 0 1 10 2.2Zm0 15.6a2.1 2.1 0 0 1-2-1.5h4a2.1 2.1 0 0 1-2 1.5Z" /></svg>알림센터<span style={{ position: 'absolute', top: '9px', right: '9px', width: '8px', height: '8px', borderRadius: '5px', background: '#E03B3B', boxShadow: '0 0 0 2px #fff' }}></span></button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '11px', height: '46px', padding: '0 14px 0 8px', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px', background: '#fff', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '32px', height: '32px', borderRadius: '999px', background: '#0045A9', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '12.5px', fontWeight: '700' }}>{userInitial}</span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.25' }}><span style={{ fontSize: '12.5px', fontWeight: '600' }}>{userName}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{userRole}</span></span>
            </div>
          </div>
        </div>

        {scAdminDash ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>운영 대시보드</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '560px', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="회사명으로 회원 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
              <span style={{ height: '36px', padding: '0 16px', display: 'grid', placeItems: 'center', borderRadius: '11px', background: '#F2F6FC', color: '#6B7A93', fontSize: '12.5px', fontWeight: '600' }}>검색</span>
            </div>
            <span style={{ marginLeft: 'auto', fontSize: '12.5px', color: '#8494AC' }}>최근 갱신 2026-07-30 09:41 KST</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.6fr', gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>전체 가입자 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', letterSpacing: '-.02em', lineHeight: '1' }}>1,284</span><span style={{ padding: '3px 8px', borderRadius: '8px', background: 'rgba(18,161,80,.12)', color: '#0E7A3D', fontSize: '12px', fontWeight: '700' }}>+4.2%</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>기업 1,097 · 개인 187</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>등록 DPP 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '10px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', letterSpacing: '-.02em', lineHeight: '1' }}>48,392</span><span style={{ padding: '3px 8px', borderRadius: '8px', background: 'rgba(18,161,80,.12)', color: '#0E7A3D', fontSize: '12px', fontWeight: '700' }}>+1,204</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>철강 26,110 · 배터리 13,482 · 섬유 8,800</span>
            </div>
            <div style={{ background: '#0B1B33', borderRadius: '18px', padding: '20px 22px', color: '#fff', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '8px', height: '8px', borderRadius: '5px', background: '#4ADE80', boxShadow: '0 0 0 4px rgba(74,222,128,.20)' }}></span><span style={{ fontSize: '14px', fontWeight: '600' }}>블록체인 앵커 상태</span><span style={{ padding: '3px 9px', borderRadius: '8px', background: 'rgba(74,222,128,.16)', color: '#86EFAC', fontSize: '11.5px', fontWeight: '700' }}>정상</span></div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,auto)', gap: '22px', justifyContent: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '19px', fontWeight: '700' }}>2분 전</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>최근 앵커링</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '19px', fontWeight: '700' }}>#8,412,930</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>블록 높이</span></div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '19px', fontWeight: '700' }}>99.98%</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>30일 성공률</span></div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '64px' }}>
                {(anchorBars || []).map((b, $index) => (<React.Fragment key={$index}><span style={b.style}></span></React.Fragment>))}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>운영현황</span><span style={{ fontSize: '12px', color: '#8494AC' }}>처리 대기 37건</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={goApprove} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '14px', padding: '16px 18px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE', cursor: 'pointer', textAlign: 'left' }} className="hv8">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>가입 승인 대기</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>증빙서류 검토 후 승인 필요</span></span>
                  <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', color: '#0045A9' }}>18</span>
                  <span style={{ fontSize: '12px', color: '#8494AC' }}>→</span>
                </button>
                <button onClick={goTier} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '14px', padding: '16px 18px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE', cursor: 'pointer', textAlign: 'left' }} className="hv9">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>Tier 심사 예외</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>자동심사 실패 · 수동 판정 대기</span></span>
                  <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', color: '#B47800' }}>7</span>
                  <span style={{ fontSize: '12px', color: '#8494AC' }}>→</span>
                </button>
                <button onClick={goDocs} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: '14px', padding: '16px 18px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE', cursor: 'pointer', textAlign: 'left' }} className="hv10">
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>문서 반려 재요청</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>누락·적합성 오류 자동 반려 발송</span></span>
                  <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '22px', fontWeight: '700', color: '#C22B2B' }}>12</span>
                  <span style={{ fontSize: '12px', color: '#8494AC' }}>→</span>
                </button>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>유형별 문의</span></div>
                <span style={{ height: '32px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#F2F6FC', color: '#44546F', fontSize: '12px', fontWeight: '600' }}>최근 30일 · 412건</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(inquiries || []).map((q, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}><span style={{ fontSize: '13px', fontWeight: '500', color: '#44546F' }}>{q.label}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', fontWeight: '600', color: '#0B1B33' }}>{q.count}건 · {q.pct}%</span></div>
                  <div style={{ height: '9px', borderRadius: '6px', background: '#EEF2F8', overflow: 'hidden' }}><span style={q.style}></span></div>
                </div>
                </React.Fragment>))}
              </div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>회원 관리</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px', width: '280px', height: '40px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px' }}><span style={{ width: '12px', height: '12px', border: '1.8px solid #9AA8BE', borderRadius: '7px', flex: 'none' }}></span><input placeholder="회사명 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '13.5px' }} /></div>
                <button style={{ height: '40px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv11">도메인 전체</button>
                <button style={{ height: '40px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv12">국가 전체</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr .8fr 1fr .9fr .9fr 64px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>회사명</span><span>가입시기</span><span>국가</span><span>도메인</span><span style={{ textAlign: 'right' }}>보유 DPP</span><span style={{ textAlign: 'right' }}>발행 DPP</span><span></span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {(members || []).map((m, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr .8fr 1fr .9fr .9fr 64px', gap: '12px', padding: '0 14px', height: '56px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={m.avatar}>{m.initial}</span><span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.3' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{m.name}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{m.biz}</span></span></span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{m.joined}</span>
                <span style={{ fontSize: '13px', color: '#44546F' }}>{m.country}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content', height: '30px', padding: '0 13px 0 11px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={m.domainDot}></span><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#2A3A55' }}>{m.domain}</span></span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', textAlign: 'right', fontWeight: '600' }}>{m.held}</span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', textAlign: 'right', fontWeight: '600' }}>{m.issued}</span>
                <button onClick={m.view} style={{ width: '100%', height: '32px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv13">상세</button>
              </div>
              </React.Fragment>))}
            </div>
          </div>
        </div>
        </>) : null}

        {scApprove ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>한국 국세청 API · EU VIES API 자동 검증 · 그 외 국가 수동 심사</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>가입 승인 관리</h1>
            </div>
            <button onClick={bulkApprove} style={{ height: '42px', padding: '0 18px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,69,169,.24)' }}>선택 항목 일괄 승인</button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '999px', width: 'fit-content', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
            {(apTabs || []).map((t, $index) => (<React.Fragment key={$index}>
            <button onClick={t.go} style={t.style}>{t.label}<span style={t.countStyle}>{t.count}</span></button>
            </React.Fragment>))}
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '16px 1.5fr 1fr 1.5fr 1.1fr 1.1fr 1.4fr', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span></span><span>회사명</span><span>국가</span><span>사업자등록번호</span><span>신청일시</span><span>검증 경로</span><span style={{ textAlign: 'right' }}>심사</span>
            </div>
            {(approvals || []).map((a, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '16px 1.5fr 1fr 1.5fr 1.1fr 1.1fr 1.4fr', gap: '12px', padding: '13px 14px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} />
              <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.3' }}>{a.name}</span><span style={{ fontSize: '11px', color: '#8494AC', lineHeight: '1.3' }}>{a.doc}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={a.ccStyle}>{a.cc}</span><span style={{ fontSize: '13px', color: '#44546F' }}>{a.country}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{a.biz}</span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{a.at}</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                {a.isAuto ? (<><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#2A3A55' }}>{a.route}</span></>) : null}
                {a.isManual ? (<><span style={{ fontSize: '12.5px', fontWeight: '700', color: '#E03B3B' }}>{a.route}</span></>) : null}
              </span>
              <span style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                {a.isAuto ? (<>
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>자동 승인 처리됨</span>
                </>) : null}
                {a.isManual ? (<>
                <button onClick={a.detail} style={{ height: '34px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', color: '#44546F', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="hv14">서류 확인</button>
                <button onClick={a.approve} style={{ height: '34px', padding: '0 14px', border: '0', borderRadius: '10px', background: 'rgba(0,69,169,.10)', color: '#0045A9', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }} className="hv15">승인</button>
                <button onClick={a.reject} style={{ height: '34px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', color: '#6B7A93', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }} className="hv16">반려</button>
                </>) : null}
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scTier ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>자동심사 결과에 따라 자동 승인 또는 관리자 판정으로 분기됩니다</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>Tier 심사 관리</h1>
            </div>
            <span style={{ fontSize: '12.5px', color: '#8494AC', maxWidth: '380px', textAlign: 'right', lineHeight: '1.6' }}>판정 결과와 실패 사유는 신청 기업에 즉시 통보됩니다.</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '999px', width: 'fit-content', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
            {(tierTabs || []).map((t, $index) => (<React.Fragment key={$index}>
            <button onClick={t.go} style={t.style}>{t.label}<span style={t.countStyle}>{t.count}</span></button>
            </React.Fragment>))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '9px' }}><span style={tier1Chip}>Tier 1 · 기초/셀프 등록</span><p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>자체 선언 데이터만 입력하는 기본 등급. 서류 심사 없이 즉시 승인.</p></div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '9px' }}><span style={tier2Chip}>Tier 2 · 표준/검증 등록</span><p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>ISO·ESG 등 제3자 인증서를 첨부해 데이터 신뢰도를 높인 등급.</p></div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: '9px' }}><span style={tier3Chip}>Tier 3 · 엔터프라이즈 / Full DPP</span><p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>공급망 하위 업체까지 초대해 전체 추적망을 연동하는 최고 등급.</p></div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr .9fr 1.9fr 1.1fr 1fr 1.5fr', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>회사명</span><span>요청 Tier</span><span>자동심사 결과</span><span>신청 일자·시간</span><span>제출 문서</span><span style={{ textAlign: 'right' }}>판정</span>
            </div>
            {(tierQueue || []).map((t, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr .9fr 1.9fr 1.1fr 1fr 1.5fr', gap: '12px', padding: '13px 14px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{t.name}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={t.domainDot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{t.domain}</span></span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', width: 'fit-content', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={t.tierDot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{t.tier}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                {t.passed ? (<><span style={{ fontSize: '12.5px', lineHeight: '1.5', color: '#2A3A55' }}>{t.reason}</span></>) : null}
                {t.failed ? (<><span style={{ fontSize: '12.5px', lineHeight: '1.5', color: '#C22B2B', fontWeight: '600' }}>{t.reason}</span></>) : null}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{t.at}</span>
              <span style={{ display: 'flex', alignItems: 'center' }}>
                <button onClick={t.openDocs} style={{ height: '32px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv17">{t.doc}</button>
              </span>
              <span style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                {t.passed ? (<>
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>자동 승인 처리됨</span>
                </>) : null}
                {t.failed ? (<>
                <button onClick={t.approve} style={{ height: '34px', padding: '0 13px', border: '0', borderRadius: '10px', background: 'rgba(0,69,169,.10)', color: '#0045A9', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer' }} className="hv18">승인</button>
                <button onClick={t.hold} style={{ height: '34px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', color: '#44546F', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }} className="hv19">사유 발송 · 보류</button>
                </>) : null}
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scDocs ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#C22B2B' }}>운영현황 · 재요청 대상 12건</span>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>문서 반려 재요청</h1>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>반려 대상 문서</span><span style={{ fontSize: '12px', color: '#8494AC' }}>검증 엔진이 자동 판정</span></div>
              {(rejects || []).map((d, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '13px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                <input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} />
                <span style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{d.name}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>{d.id}</span></span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={d.kindChip}>{d.kind}</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>{d.detail}</span></span>
                </span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>{d.at}</span>
              </div>
              </React.Fragment>))}
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>자동 반려사유 발송</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#44546F', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} />필수 입력 데이터 누락</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#44546F', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} />데이터 적합성 오류</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '13px', color: '#44546F', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} />인증서 유효기간 만료</label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>발송 문구 미리보기</span>
                <div style={{ padding: '14px 15px', borderRadius: '13px', background: '#F7F9FD', border: '1px solid rgba(16,32,64,.07)', fontSize: '12.5px', lineHeight: '1.7', color: '#44546F' }}>제출하신 문서에서 <b>필수 입력 데이터 누락</b> 및 <b>데이터 적합성 오류</b>가 확인되어 반려되었습니다. 누락 항목을 보완해 7일 이내 재제출해 주세요.</div>
              </div>
              <button onClick={sendRejects} style={{ height: '48px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>선택 4건 반려사유 자동 발송</button>
            </div>
          </div>
        </div>
        </>) : null}

        {scMakerDash ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>DPP 현황</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '520px', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="제품명 · DPP 식별자 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
              <span style={{ height: '36px', padding: '0 16px', display: 'grid', placeItems: 'center', borderRadius: '11px', background: '#F2F6FC', color: '#6B7A93', fontSize: '12.5px', fontWeight: '600' }}>검색</span>
            </div>
            <button onClick={goInput} style={{ marginLeft: 'auto', height: '52px', padding: '0 22px', border: '0', borderRadius: '15px', background: '#0045A9', color: '#fff', fontSize: '14.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.26)' }}>+ 새 DPP 발급</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '16px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>등록 DPP 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '9px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '32px', fontWeight: '700', lineHeight: '1', letterSpacing: '-.02em' }}>{kpiTotal}</span><span style={{ padding: '3px 8px', borderRadius: '8px', background: 'rgba(18,161,80,.12)', color: '#0E7A3D', fontSize: '12px', fontWeight: '700' }}>+{kpiNew}</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>이번 달 신규 {kpiNew}건</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>미완성 DPP 수</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '9px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '32px', fontWeight: '700', lineHeight: '1', letterSpacing: '-.02em', color: '#C22B2B' }}>{kpiIncomplete}</span><span style={{ padding: '3px 8px', borderRadius: '8px', background: 'rgba(224,59,59,.10)', color: '#C22B2B', fontSize: '12px', fontWeight: '700' }}>조치 필요</span></div>
              <span style={{ fontSize: '12.5px', color: '#6B7A93' }}>필드 누락 {kpiMissing}건 · 서류 대기 {kpiWaiting}건</span>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '14px', fontWeight: '600' }}>평균 완성도</span></div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '9px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '32px', fontWeight: '700', lineHeight: '1', letterSpacing: '-.02em' }}>{kpiAvg}%</span></div>
              <div style={{ height: '9px', borderRadius: '6px', background: '#EEF2F8', overflow: 'hidden' }}><span style={kpiAvgBar}></span></div>
            </div>
            <div style={{ background: '#0B1B33', borderRadius: '18px', padding: '20px 22px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '8px', height: '8px', borderRadius: '5px', background: '#4ADE80', boxShadow: '0 0 0 4px rgba(74,222,128,.20)' }}></span><span style={{ fontSize: '14px', fontWeight: '600' }}>ZKP 증명 상태</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '20px', fontWeight: '700' }}>2</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>제출 요구 대기</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '20px', fontWeight: '700', color: '#FCA5A5' }}>1</span><span style={{ fontSize: '11.5px', color: 'rgba(255,255,255,.6)' }}>조건 미달 반려</span></div>
              </div>
              <button onClick={openNotif} style={{ height: '34px', border: '0', borderRadius: '10px', background: 'rgba(255,255,255,.14)', color: '#fff', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>알림센터에서 확인</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>대기작업 큐</span><span style={{ height: '28px', padding: '0 11px', display: 'grid', placeItems: 'center', borderRadius: '9px', background: '#F2F6FC', color: '#44546F', fontSize: '11.5px', fontWeight: '600' }}>마감 임박순</span></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {(queue || []).map((w, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={w.dueDot}></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '700', color: '#2A3A55' }}>{w.due}</span></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.35' }}>{w.task}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>{w.target}</span></span>
                  <button onClick={w.act} style={{ height: '32px', padding: '0 13px', border: '1px solid rgba(0,69,169,.22)', borderRadius: '10px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }} className="hv20">처리</button>
                </div>
                </React.Fragment>))}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>DPP 완성도</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6B7A93' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#12A150' }}></span>완성</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6B7A93' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E3A008' }}></span>진행중</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11.5px', color: '#6B7A93' }}><span style={{ width: '9px', height: '9px', borderRadius: '3px', background: '#E03B3B' }}></span>미입력</span>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
                {(completeness || []).map((c, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: '190px 1fr 52px', gap: '14px', alignItems: 'center' }}>
                  <button onClick={c.open} style={{ display: 'flex', flexDirection: 'column', gap: '3px', alignItems: 'flex-start', textAlign: 'left', border: '0', background: 'transparent', padding: '0', cursor: 'pointer' }}>
                    <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '600', color: '#0045A9', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{c.id}</span>
                    <span style={{ fontSize: '12.5px', color: '#44546F', lineHeight: '1.35' }}>{c.name}</span>
                  </button>
                  <div style={{ display: 'flex', height: '22px', borderRadius: '7px', overflow: 'hidden', background: '#EEF2F8' }}>
                    {(c.segs || []).map((g, $index) => (<React.Fragment key={$index}><span style={g.style}></span></React.Fragment>))}
                  </div>
                  <span style={c.pctStyle}>{c.pct}%</span>
                </div>
                </React.Fragment>))}
              </div>
              <span style={{ fontSize: '12px', color: '#8494AC' }}>식별자를 클릭하면 생애주기 진행상태와 미충족 필드·책임주체를 확인할 수 있습니다.</span>
            </div>
          </div>
        </div>
        </>) : null}

        {scInput ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>{domainLabel} 도메인 · 필수 필드 {fieldCount}개</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>{inputTitle}</h1>
            </div>
            <div style={{ display: 'flex', gap: '6px', padding: '5px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px' }}>
              <button onClick={setSingle} style={singleBtn}>단일 발급</button>
              <button onClick={setBatch} style={batchBtn}>배치 대량 발급</button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.55fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>{uploadTitle}</span>
                <div style={{ border: '1.5px dashed rgba(0,69,169,.34)', borderRadius: '16px', background: 'rgba(0,69,169,.035)', padding: '28px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '11px' }}>
                  <span style={{ width: '44px', height: '44px', borderRadius: '999px', background: 'rgba(0,69,169,.10)', display: 'grid', placeItems: 'center' }}><span style={{ width: '14px', height: '14px', borderRadius: '3px', background: '#0045A9' }}></span></span>
                  <span style={{ fontSize: '14px', fontWeight: '600' }}>파일을 끌어다 놓거나 클릭해 업로드</span>
                  <span style={{ fontSize: '12px', color: '#6B7A93' }}>{uploadHint}</span>
                  <button onClick={doUpload} style={{ marginTop: '4px', height: '38px', padding: '0 18px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '11px', background: '#fff', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>파일 선택</button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 15px', borderRadius: '13px', background: '#F7F9FD', border: '1px solid rgba(16,32,64,.07)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ width: '26px', height: '26px', borderRadius: '999px', background: 'rgba(18,161,80,.14)', display: 'grid', placeItems: 'center' }}><span style={{ width: '9px', height: '9px', borderRadius: '5px', background: '#12A150' }}></span></span><span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.35' }}><span style={{ fontSize: '12.5px', fontWeight: '600' }}>{uploadedName}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>OCR 자동 추출 완료 · 필드 {ocrCount}개 매핑</span></span></span>
                  <span style={tier2Chip}>검증 통과</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>{formTitle}</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  {(fields || []).map((f, $index) => (<React.Fragment key={$index}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>{f.label}</span>
                    <input placeholder={f.ph} defaultValue={f.value} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', background: '#fff' }} />
                    <span style={{ fontSize: '11px', color: '#8494AC' }}>{f.hint}</span>
                  </label>
                  </React.Fragment>))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '16px', borderTop: '1px solid rgba(16,32,64,.07)' }}>
                  <span style={{ fontSize: '12.5px', color: '#8494AC' }}>마지막 임시저장 2026-07-30 09:38</span>
                  <div style={{ display: 'flex', gap: '9px' }}>
                    <button onClick={saveDraft} style={{ height: '48px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv21">임시저장</button>
                    <button onClick={issueDpp} style={{ height: '48px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>{issueLabel}</button>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {isBatch ? (<>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>배치 발급 설정</span>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>배치 번호</span><input defaultValue="B-2607-04" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>발급 수량</span><input defaultValue="240" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                <div style={{ padding: '13px 14px', borderRadius: '12px', background: 'rgba(227,160,8,.10)', fontSize: '12px', lineHeight: '1.6', color: '#96660A' }}>동일 Heat/Lot 단위로 묶인 제품에만 배치 발급이 허용됩니다.</div>
              </div>
              </>) : null}
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>입력 검증 결과</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(validations || []).map((v, $index) => (<React.Fragment key={$index}>
                  <button onClick={v.open} style={v.rowStyle}>
                    <span style={v.dot}></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'left' }}><span style={{ fontSize: '13px', fontWeight: '600', lineHeight: '1.35' }}>{v.label}</span><span style={{ fontSize: '11.5px', color: '#8494AC', lineHeight: '1.5' }}>{v.detail}</span></span>
                    <span style={{ fontSize: '12px', color: '#8494AC' }}>{v.arrow}</span>
                  </button>
                  </React.Fragment>))}
                </div>
              </div>
              <div style={{ background: '#0B1B33', borderRadius: '18px', padding: '20px 22px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>ZKP 공개 범위</span>
                <p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.65', color: 'rgba(255,255,255,.72)' }}>원가·공정 파라미터는 증명만 공개하고 원본은 비공개로 유지됩니다.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: 'rgba(255,255,255,.86)', cursor: 'pointer' }}>재생원료 비율 <input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#4ADE80' }} /></label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: 'rgba(255,255,255,.86)', cursor: 'pointer' }}>탄소배출량 (원본) <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#4ADE80' }} /></label>
                  <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12.5px', color: 'rgba(255,255,255,.86)', cursor: 'pointer' }}>공정 온도 프로파일 <input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#4ADE80' }} /></label>
                </div>
              </div>
            </div>
          </div>
        </div>
        </>) : null}

        {scPartners ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
            <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>Tier 3 권한 · 하위 협력사 연동</span>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>협력사 초대</h1>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>새 초대 보내기</span>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>협력사명</span><input placeholder="예) 우진메탈" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>초대 이메일</span><input type="email" placeholder="partner@company.co.kr" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>메시지</span><textarea rows="3" placeholder="협력사에 전달할 안내 문구를 입력하세요." style={{ padding: '12px 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '13.5px', lineHeight: '1.6', resize: 'vertical' }}></textarea></label>
              <button onClick={sendInvite} style={{ height: '50px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>초대 발송</button>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>초대 이력</span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <span style={{ height: '30px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#0B1B33', color: '#fff', fontSize: '12px', fontWeight: '600' }}>전체 12</span>
                  <span style={{ height: '30px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#F2F6FC', color: '#44546F', fontSize: '12px', fontWeight: '600' }}>대기 4</span>
                  <span style={{ height: '30px', padding: '0 12px', display: 'grid', placeItems: 'center', borderRadius: '10px', background: '#F2F6FC', color: '#44546F', fontSize: '12px', fontWeight: '600' }}>거절 1</span>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 70px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
                <span>협력사 / 이메일</span><span>발송일</span><span>상태</span><span></span>
              </div>
              {(invites || []).map((i, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr 1fr 70px', gap: '12px', padding: '0 14px', height: '58px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
                <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.35' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{i.name}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{i.email}</span></span>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{i.at}</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', width: 'fit-content', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={i.statusDot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{i.status}</span></span>
                <button onClick={i.resend} style={i.resendStyle}>재발송</button>
              </div>
              </React.Fragment>))}
            </div>
          </div>
        </div>
        </>) : null}

        {scProducts ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>제품 조회</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '520px', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="제품명 · 식별자 · Lot/Heat 번호" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
              <button style={{ height: '52px', padding: '0 16px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '15px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>상태 전체</button>
              <button style={{ height: '52px', padding: '0 16px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '15px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>기간 90일</button>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr 1fr .9fr 1fr 116px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>DPP 식별자</span><span>제품명 / 규격</span><span>Lot · Heat</span><span>발급일</span><span style={{ textAlign: 'right' }}>완성도</span><span>상태</span><span></span>
            </div>
            {(products || []).map((p, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1.6fr 1fr 1fr .9fr 1fr 116px', gap: '12px', padding: '0 14px', height: '60px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <button onClick={p.open} style={{ border: '0', background: 'transparent', padding: '0', textAlign: 'left', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '600', color: '#0045A9', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: '3px' }}>{p.id}</button>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.35' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{p.name}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{p.spec}</span></span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{p.lot}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{p.at}</span>
              <span style={p.pctStyle}>{p.pct}%</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', width: 'fit-content', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={p.statusDot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{p.status}</span></span>
              <span style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                <button onClick={p.open} style={{ height: '32px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv22">상세</button>
                <button onClick={p.remove} title="DPP 삭제" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', color: '#8494AC', cursor: 'pointer' }} className="hv23"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M7.5 2.8h5v1.4h4v1.7h-1.3l-.8 10a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5l-.8-10H3.5V4.2h4V2.8Zm-.9 3.1.8 9.8h5.2l.8-9.8H6.6Zm2.1 1.5h1.5v6.6H8.7V7.4Zm2.6 0h1.5v6.6h-1.5V7.4Z" /></svg></button>
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scMy ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>마이페이지</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>기업 기본정보</span><button onClick={openProfileEdit} style={{ height: '36px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '11px', background: '#fff', fontSize: '12.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv24">수정</button></div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>회사명</span><span style={{ fontSize: '14.5px', fontWeight: '600' }}>{profileName}</span></div>
                  <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>사업자등록번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '14.5px', fontWeight: '600' }}>{profileBiz}</span></div>
                  <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>대표번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '14.5px', fontWeight: '600' }}>{profilePhone}</span></div>
                  <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>홈페이지 URL</span><span style={{ fontSize: '14.5px', fontWeight: '600' }}>{profileUrl}</span></div>
                </div>
                <span style={{ fontSize: '11.5px', color: '#8494AC' }}>사업자등록번호는 국세청 정보와 연동되어 있어 변경 시 재심사가 진행됩니다.</span>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>증빙서류</span>
                {(myDocs || []).map((d, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.35' }}><span style={{ fontSize: '13px', fontWeight: '600' }}>{d.name}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{d.meta}</span></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={d.dot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{d.status}</span></span>
                  <button onClick={d.view} style={{ height: '32px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv25">확인</button>
                </div>
                </React.Fragment>))}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {obIncomplete ? (<>
              <div style={{ background: '#fff', border: '1.5px solid rgba(0,69,169,.28)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '13px', boxShadow: '0 4px 14px rgba(0,69,169,.10)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#E3A008' }}></span>
                  <span style={{ fontSize: '14px', fontWeight: '700' }}>온보딩 작성 중</span>
                </div>
                <p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>{obSavedStep}단계 「{obSavedTitle}」에서 중단되었습니다. 완료해야 DPP 발급 권한이 활성화됩니다.</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ height: '8px', borderRadius: '6px', background: '#EEF2F8', overflow: 'hidden' }}><span style={obSavedBar}></span></div>
                  <span style={{ fontSize: '11.5px', color: '#8494AC' }}>{obSavedPct}% 완료 · 5단계 중 {obSavedStep}단계</span>
                </div>
                <button onClick={obResume} style={{ height: '44px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,69,169,.22)' }}>이어서 작성하기</button>
              </div>
              </>) : null}

              {obComplete ? (<>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span>
                    <span style={{ fontSize: '14px', fontWeight: '700' }}>온보딩 완료</span>
                  </div>
                  <button onClick={obReview} style={{ height: '34px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '11px', background: '#fff', fontSize: '12.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv26">내용 보기</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>선택 도메인</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{obDomainLabel}</span></div>
                  <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>신청 Tier</span><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{obTierLabel}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{obTierSub}</span></span></div>
                  <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>제출 서류</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>3건</span></div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <span style={{ fontSize: '12px', color: '#8494AC' }}>신청 권한</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                    {(obPermList || []).map((p, $index) => (<React.Fragment key={$index}><span style={p.style}>{p.label}</span></React.Fragment>))}
                  </div>
                </div>
              </div>
              </>) : null}
              <div style={{ background: '#0045A9', borderRadius: '18px', padding: '24px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <span style={{ fontSize: '12px', letterSpacing: '.12em', fontWeight: '700', color: 'rgba(255,255,255,.62)' }}>CURRENT TIER</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}><span style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '-.02em' }}>{myTier}</span><span style={{ fontSize: '13px', color: 'rgba(255,255,255,.78)' }}>{myTierName}</span></div>
                <p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.65', color: 'rgba(255,255,255,.78)' }}>{myTierDesc}</p>
                <button onClick={requestTier} style={{ height: '42px', border: '0', borderRadius: '12px', background: '#fff', color: '#0045A9', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>상위 Tier 신청</button>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>보유 권한</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {(myPerms || []).map((p, $index) => (<React.Fragment key={$index}><span style={p.style}>{p.label}</span></React.Fragment>))}
                </div>
                <button onClick={requestPerm} style={{ marginTop: '4px', height: '40px', border: '1px solid rgba(0,69,169,.22)', borderRadius: '11px', background: 'rgba(0,69,169,.05)', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>권한 추가 신청</button>
              </div>
            </div>
          </div>
        </div>
        </>) : null}

        {scScans ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1120px', margin: '0 auto', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '22px', width: '100%' }}>
            <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', whiteSpace: 'nowrap' }}>제품 조회 기록</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', maxWidth: '460px', height: '52px', padding: '0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input placeholder="제품명 · 브랜드 검색" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
            </div>
          </div>
          <div style={{ width: '100%', background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.7fr 1.1fr 1.1fr 1fr 116px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>제품명</span><span>제조사</span><span>열람 일시</span><span>최근 갱신</span><span></span>
            </div>
            {(scans || []).map((p, $index) => (<React.Fragment key={$index}>
            <div style={p.rowStyle}>
              <span style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.3' }}>{p.name}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC', lineHeight: '1.3' }}>{p.id}</span></span>
              <span style={{ display: 'flex', alignItems: 'center', fontSize: '13px', color: '#44546F' }}>{p.company}</span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{p.at}</span>
              <span style={{ display: 'flex', alignItems: 'center', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', color: '#44546F' }}>{p.updated}</span>
              <span style={{ display: 'flex', gap: '7px', justifyContent: 'flex-end' }}>
                <button onClick={p.open} style={{ height: '32px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv27">열람</button>
                <button onClick={p.remove} title="조회 기록 삭제" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', color: '#8494AC', cursor: 'pointer' }} className="hv28"><svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true"><path fill="currentColor" d="M7.5 2.8h5v1.4h4v1.7h-1.3l-.8 10a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5l-.8-10H3.5V4.2h4V2.8Zm-.9 3.1.8 9.8h5.2l.8-9.8H6.6Zm2.1 1.5h1.5v6.6H8.7V7.4Zm2.6 0h1.5v6.6h-1.5V7.4Z" /></svg></button>
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scPassport ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <button onClick={backToScans} style={{ alignSelf: 'flex-start', height: '40px', padding: '0 16px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>← 제품 조회 기록으로</button>

          {passportExpired ? (<>
          <div style={{ display: 'flex', alignItems: 'center', gap: '13px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(224,59,59,.07)', border: '1px solid rgba(224,59,59,.20)' }}>
            <span style={{ width: '32px', height: '32px', flex: 'none', borderRadius: '999px', background: '#E03B3B', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '15px', fontWeight: '700' }}>!</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700', color: '#C22B2B' }}>블록체인 서명 검증에 실패했습니다</span>
              <span style={{ fontSize: '12.5px', lineHeight: '1.55', color: '#44546F' }}>원본 기록과 현재 데이터의 해시가 일치하지 않습니다. 아래 정보는 참고용이며, 제조사에 확인 후 이용하세요.</span>
            </span>
          </div>
          </>) : null}

          <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '26px', background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '22px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '26px' }}>
            <div style={{ height: '300px', borderRadius: '18px', border: '1.5px dashed rgba(16,32,64,.16)', background: '#F7F9FD', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#6B7A93' }}>제품 사진</span>
              <span style={{ fontSize: '12px', color: '#9AA8BE' }}>스캔한 제품의 대표 이미지</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', padding: '4px 0' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  {passportValid ? (<><span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(18,161,80,.12)', color: '#0E7A3D', fontSize: '12px', fontWeight: '700' }}><span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#12A150' }}></span>블록체인 검증 완료</span></>) : null}
                  {passportExpired ? (<><span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(224,59,59,.12)', color: '#C22B2B', fontSize: '12px', fontWeight: '700' }}><span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#E03B3B' }}></span>검증 실패 · 참고용</span></>) : null}
                  <span style={{ fontSize: '12.5px', color: '#8494AC' }}>Digital Product Passport</span>
                </div>
                <h1 style={{ margin: '0', fontSize: '32px', fontWeight: '700', textWrap: 'pretty' }}>{passportName}</h1>
                <span style={{ fontSize: '15px', color: '#44546F' }}>{passportBrand}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>모델명</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{passportModel}</span></div>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>바코드 (GTIN)</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{passportGtin}</span></div>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>제조 번호 (Batch)</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{passportBatch}</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '2px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>{passportOrigin}</span>
                <span style={{ fontSize: '13px', color: '#6B7A93' }}>{passportMade} · 식별자 {passportId}</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>지속가능성 요약</span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#44546F' }}>탄소 발자국</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', lineHeight: '1' }}>{ecoCarbon}</span><span style={{ fontSize: '13px', color: '#6B7A93' }}>{ecoCarbonUnit}</span></div>
                <span style={{ fontSize: '12px', lineHeight: '1.6', color: '#8494AC' }}>원자재 채굴부터 출하까지 발생한 온실가스 배출량입니다.</span>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#44546F' }}>재생 원료 사용률</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', lineHeight: '1', color: '#0045A9' }}>{ecoRecycled}</span><span style={{ fontSize: '13px', color: '#6B7A93' }}>%</span></div>
                <div style={{ height: '10px', borderRadius: '6px', background: '#EEF2F8', overflow: 'hidden' }}><span style={ecoRecycledBar}></span></div>
              </div>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: '#44546F' }}>물 발자국</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '34px', fontWeight: '700', lineHeight: '1' }}>{ecoWater}</span><span style={{ fontSize: '13px', color: '#6B7A93' }}>{ecoWaterUnit}</span></div>
                <span style={{ fontSize: '12px', lineHeight: '1.6', color: '#8494AC' }}>제조 공정에서 취수·소비된 담수 총량입니다.</span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ fontSize: '18px', fontWeight: '700' }}>내구성 및 수리 가이드</span>
            <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '16px', alignItems: 'start' }}>
              <div style={{ background: '#0B1B33', borderRadius: '18px', padding: '24px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '600', color: 'rgba(255,255,255,.66)' }}>수리 용이성 점수</span>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '7px' }}><span style={repairColorStyle}>{repairScore}</span><span style={{ fontSize: '16px', color: 'rgba(255,255,255,.6)' }}>/ 10</span></div>
                <div style={{ height: '10px', borderRadius: '6px', background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}><span style={repairBar}></span></div>
                <span style={{ fontSize: '12.5px', lineHeight: '1.6', color: 'rgba(255,255,255,.76)' }}>{repairVerdict}</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                  <button onClick={openManual} style={{ height: '44px', border: '0', borderRadius: '12px', background: '#fff', color: '#0B1B33', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>{manualName}</button>
                  <button onClick={openVideo} style={{ height: '44px', border: '1px solid rgba(255,255,255,.26)', borderRadius: '12px', background: 'rgba(255,255,255,.10)', color: '#fff', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}>수리 영상 보기</button>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>예비 부품 및 수리 서비스</span>
                  {(partItems || []).map((p, $index) => (<React.Fragment key={$index}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '14px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{p.title}</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>{p.detail}</span></span>
                    <a href="#" style={{ fontSize: '12.5px', fontWeight: '700', whiteSpace: 'nowrap' }}>구매처 보기</a>
                  </div>
                  </React.Fragment>))}
                </div>
                <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <span style={{ fontSize: '15px', fontWeight: '600' }}>오래 쓰는 관리 방법</span>
                  {(careItems || []).map((c, $index) => (<React.Fragment key={$index}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ width: '7px', height: '7px', marginTop: '6px', flex: 'none', borderRadius: '999px', background: '#0045A9' }}></span>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{c.title}</span><span style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>{c.detail}</span></span>
                  </div>
                  </React.Fragment>))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>우려 물질 및 안전 정보</span>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {hazardSafe ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(18,161,80,.08)' }}>
                  <span style={{ width: '36px', height: '36px', flex: 'none', borderRadius: '999px', background: '#12A150', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '16px', fontWeight: '700' }}>✓</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14.5px', fontWeight: '700', color: '#0E7A3D' }}>우려 물질 무첨가</span><span style={{ fontSize: '12.5px', color: '#44546F' }}>{hazardNote}</span></span>
                </div>
                </>) : null}
                {hazardRisk ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(227,160,8,.10)' }}>
                  <span style={{ width: '36px', height: '36px', flex: 'none', borderRadius: '999px', background: '#E3A008', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '16px', fontWeight: '700' }}>!</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14.5px', fontWeight: '700', color: '#96660A' }}>주의가 필요한 물질 포함</span><span style={{ fontSize: '12.5px', lineHeight: '1.55', color: '#44546F' }}>{hazardNote}</span></span>
                </div>
                </>) : null}
                <span style={{ fontSize: '12px', lineHeight: '1.65', color: '#8494AC' }}>EU REACH 규정 기준 고위험 우려물질(SVHC) 목록에 따라 신고된 정보입니다. 이상 증상이 있을 경우 사용을 중단하고 제조사에 문의하세요.</span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>올바른 폐기 및 재활용</span>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {(disposalItems || []).map((d, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start' }}>
                  <span style={{ width: '7px', height: '7px', marginTop: '6px', flex: 'none', borderRadius: '999px', background: '#12A150' }}></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{d.title}</span><span style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>{d.detail}</span></span>
                </div>
                </React.Fragment>))}
                <button onClick={openTakeback} style={{ height: '48px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.22)' }}>{takebackName}</button>
              </div>
            </div>
          </div>
        </div>
        </>) : null}

        {scPersonalMy ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '900px', margin: '0 auto', alignItems: 'center' }}>
          <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', textAlign: 'center' }}>마이페이지</h1>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '560px' }}>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>기본 정보</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12.5px', color: '#8494AC' }}>이름</span><span style={{ fontSize: '14px', fontWeight: '600' }}>정민수</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12.5px', color: '#8494AC' }}>이메일</span><span style={{ fontSize: '14px', fontWeight: '600' }}>minsu***@kakao.com</span></div>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>연결된 계정</span>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 17px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ width: '32px', height: '32px', flex: 'none', borderRadius: '999px', background: '#FEE500', display: 'grid', placeItems: 'center' }}><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="#1B1B1B" d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z" /></svg></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>카카오</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>minsu***@kakao.com</span></span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>연결됨</span></span>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: '600' }}>알림 설정</span>
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#2A3A55', cursor: 'pointer' }}>알림 받기 <input type="checkbox" checked={true} style={{ width: '18px', height: '18px', accentColor: '#0045A9' }} /></label>
            </div>
          </div>
        </div>
        </>) : null}

        {obGovBanner ? (<>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', borderRadius: '16px', background: 'rgba(0,69,169,.05)', border: '1.5px solid rgba(0,69,169,.24)' }}>
          <span style={{ width: '8px', height: '8px', flex: 'none', borderRadius: '999px', background: '#E3A008' }}></span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <span style={{ fontSize: '14px', fontWeight: '700' }}>온보딩이 완료되지 않았습니다</span>
            <span style={{ fontSize: '12.5px', color: '#44546F' }}>{obGovBannerText} 완료해야 모든 조회 권한이 활성화됩니다.</span>
          </span>
          <button onClick={obResume} style={{ marginLeft: 'auto', height: '44px', padding: '0 20px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,69,169,.22)', whiteSpace: 'nowrap' }}>온보딩 이어서 작성</button>
        </div>
        </>) : null}

        {scClearance ? (<>

        {cSearchMode ? (<>
        <div style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '30px', padding: '60px 0', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <h1 style={{ margin: '0', fontSize: '44px', fontWeight: '700', textAlign: 'center' }}>통관 검증</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '720px', height: '68px', padding: '0 10px 0 24px', background: '#fff', border: '1px solid rgba(16,32,64,.10)', borderRadius: '20px', boxShadow: '0 10px 30px rgba(11,27,51,.10)' }}>
            <span style={{ width: '18px', height: '18px', border: '2px solid #9AA8BE', borderRadius: '10px', flex: 'none' }}></span>
            <input value={cQuery} onChange={onCustomsQuery} placeholder="DPP-KR-ST-2607-0142" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '17px', color: '#0B1B33' }} />
            <button onClick={runCustomsSearch} style={{ height: '50px', padding: '0 28px', border: '0', borderRadius: '15px', background: '#0045A9', color: '#fff', fontSize: '15px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>검색</button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '12.5px', color: '#8494AC' }}>최근 조회</span>
            {(cRecent || []).map((r, $index) => (<React.Fragment key={$index}>
            <button onClick={r.pick} style={{ height: '34px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '999px', background: '#fff', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv29">{r.label}</button>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {cNoResult ? (<>
        <div style={{ minHeight: '600px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '26px', padding: '60px 0', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '52px', height: '52px', borderRadius: '999px', background: 'rgba(227,160,8,.14)', display: 'grid', placeItems: 'center', color: '#96660A', fontSize: '22px', fontWeight: '700' }}>!</span>
            <h1 style={{ margin: '0', fontSize: '26px', fontWeight: '700', textAlign: 'center' }}>조회 결과 없음</h1>
            <p style={{ margin: '0', fontSize: '14px', color: '#6B7A93', textAlign: 'center', lineHeight: '1.65' }}>입력하신 「{cQuery}」에 해당하는 화물을 찾을 수 없습니다.<br />DPP 식별자, 수입신고번호 또는 EORI 번호를 다시 확인해 주세요.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%', maxWidth: '620px', height: '60px', padding: '0 10px 0 22px', background: '#fff', border: '1px solid rgba(16,32,64,.10)', borderRadius: '18px', boxShadow: '0 6px 20px rgba(11,27,51,.08)' }}>
            <input value={cQuery} onChange={onCustomsQuery} placeholder="DPP-KR-ST-2607-0142" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '15.5px', color: '#0B1B33' }} />
            <button onClick={runCustomsSearch} style={{ height: '44px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>다시 검색</button>
          </div>
          <button onClick={resetCustomsSearch} style={{ height: '42px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '999px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv30">검색 화면으로</button>
        </div>
        </>) : null}

        {cResultMode ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '1120px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button onClick={resetCustomsSearch} style={{ height: '44px', padding: '0 18px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }} className="hv31">← 검색으로</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: '1', height: '52px', padding: '0 8px 0 18px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
              <span style={{ width: '14px', height: '14px', border: '1.8px solid #9AA8BE', borderRadius: '8px', flex: 'none' }}></span>
              <input value={cQuery} onChange={onCustomsQuery} placeholder="DPP 식별자 · 수입신고번호 · EORI 번호" style={{ flex: '1', border: '0', background: 'transparent', fontSize: '14.5px' }} />
              <button onClick={runCustomsSearch} style={{ height: '36px', padding: '0 16px', border: '0', borderRadius: '11px', background: '#F2F6FC', color: '#44546F', fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' }}>검색</button>
            </div>
            <button onClick={cDownloadAll} style={{ height: '52px', padding: '0 22px', border: '0', borderRadius: '15px', background: '#0045A9', color: '#fff', fontSize: '14.5px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 20px rgba(0,69,169,.26)', whiteSpace: 'nowrap', flex: 'none' }}>인증서 일괄 다운로드</button>
          </div>

          <div style={cVerdictStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={cVerdictDot}></span>
              <span style={cVerdictTextStyle}>{cVerdict}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: '16px', alignItems: 'start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>신원 및 신고 정보</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>제품 고유 식별 코드</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cId}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수입신고번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cDeclared}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>EORI 번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cEori}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수량</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13.5px', fontWeight: '600' }}>{cQty}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수입업체</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{cImporter}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{cImporterAddr}</span></div>
                  <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', flexDirection: 'column', gap: '5px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>수출업체</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{cExporter}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>품목 {cName}</span></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '15px 17px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>HS 코드</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '18px', fontWeight: '700' }}>{cHs}</span></span>
                  <span style={{ fontSize: '12.5px', lineHeight: '1.6', color: '#44546F' }}>{cHsName}</span>
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>EU 적합성 선언서 · CE 마크</span>
                {cCeOk ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(18,161,80,.08)' }}>
                  <span style={{ width: '34px', height: '34px', flex: 'none', borderRadius: '999px', background: '#12A150', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '15px', fontWeight: '700' }}>✓</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '700', color: '#0E7A3D' }}>적합성 요건 충족</span><span style={{ fontSize: '12.5px', color: '#44546F' }}>{cCeNote}</span></span>
                </div>
                </>) : null}
                {cCeFail ? (<>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px 18px', borderRadius: '14px', background: 'rgba(224,59,59,.07)' }}>
                  <span style={{ width: '34px', height: '34px', flex: 'none', borderRadius: '999px', background: '#E03B3B', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '15px', fontWeight: '700' }}>!</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '14px', fontWeight: '700', color: '#C22B2B' }}>적합성 요건 미충족</span><span style={{ fontSize: '12.5px', color: '#44546F' }}>{cCeNote}</span></span>
                </div>
                </>) : null}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{cDoc}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{cTech}</span></span>
                  <button onClick={cDownloadDoc} style={{ height: '36px', padding: '0 15px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '11px', background: '#fff', fontSize: '12.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer', whiteSpace: 'nowrap' }} className="hv32">다운로드</button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <span style={{ fontSize: '15px', fontWeight: '600' }}>검증 항목</span>
                {(cChecks || []).map((c, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '11px', alignItems: 'flex-start' }}>
                  <span style={c.markStyle}>{c.mark}</span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}><span style={{ fontSize: '13px', fontWeight: '600', lineHeight: '1.35' }}>{c.label}</span><span style={c.detailStyle}>{c.detail}</span></span>
                </div>
                </React.Fragment>))}
              </div>
            </div>
          </div>
        </div>
        </>) : null}

        </>) : null}

        {scRegistry ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>시장감독기관 · 제품안전조사과</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>DPP 레지스트리 조회</h1>
            </div>
            <button onClick={exportCsv} style={{ height: '46px', padding: '0 18px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>조회 결과 내보내기</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>식별자 코드</span><input placeholder="DPP-KR-ST-2607-0142" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>통관용 상품코드</span><input placeholder="KRST-HRC-032" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>HS 코드</span><input placeholder="7208.39" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            <button onClick={searchRegistry} style={{ height: '48px', padding: '0 26px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>조회</button>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>조회 결과 <span style={{ color: '#8494AC', fontWeight: '500' }}>6건</span></span><span style={{ fontSize: '12px', color: '#8494AC' }}>레지스트리 동기화 2026-07-30 09:40 CEST</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 1.2fr 1.5fr 1.2fr .9fr 64px', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>식별자 코드</span><span>상품코드</span><span>등록일 (시간)</span><span>상품명</span><span>등록회사</span><span>HS코드</span><span></span>
            </div>
            {(registry || []).map((r, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.1fr 1.2fr 1.5fr 1.2fr .9fr 64px', gap: '12px', padding: '0 14px', height: '58px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', fontWeight: '600', color: '#0045A9' }}>{r.id}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{r.code}</span>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.3' }}><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#0B1B33' }}>{r.date}</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11px', color: '#8494AC' }}>{r.time}</span></span>
              <span style={{ fontSize: '13px', fontWeight: '500' }}>{r.name}</span>
              <span style={{ fontSize: '12.5px', color: '#44546F' }}>{r.company}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#44546F' }}>{r.hs}</span>
              <button onClick={r.open} style={{ width: '100%', height: '32px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '9px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv33">열람</button>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

        {scAudit ? (<>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>변조 불가 · 블록체인 앵커링 검증</span>
              <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>감사 로그 조회</h1>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button style={{ height: '46px', padding: '0 16px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>2026-07-01 ~ 07-30</button>
              <button style={{ height: '46px', padding: '0 16px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>액션 전체</button>
            </div>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 1.4fr 1.5fr .9fr 1.3fr', gap: '12px', padding: '0 14px', height: '40px', alignItems: 'center', background: '#F7F9FD', borderRadius: '11px', fontSize: '12px', fontWeight: '600', color: '#6B7A93' }}>
              <span>시각 (UTC)</span><span>행위자</span><span>액션</span><span>대상</span><span>결과</span><span>트랜잭션 해시</span>
            </div>
            {(auditLog || []).map((l, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.2fr 1.4fr 1.5fr .9fr 1.3fr', gap: '12px', padding: '0 14px', height: '54px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12px', color: '#0B1B33' }}>{l.at}</span>
              <span style={{ fontSize: '12.5px', color: '#44546F' }}>{l.actor}</span>
              <span style={{ fontSize: '12.5px', fontWeight: '600' }}>{l.action}</span>
              <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#44546F' }}>{l.target}</span>
              <span style={l.chip}>{l.result}</span>
              <a href="#" style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '500' }}>{l.hash}</a>
            </div>
            </React.Fragment>))}
          </div>
        </div>
        </>) : null}

      </div>
      </>) : null}

      {notifOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '70', display: 'flex', justifyContent: 'flex-end' }}>
        <div onClick={closeNotif} style={{ position: 'absolute', inset: '0', background: 'rgba(11,27,51,.28)', backdropFilter: 'blur(2px)' }}></div>
        <div style={{ position: 'relative', width: '436px', height: '100%', background: '#fff', boxShadow: '-18px 0 44px rgba(11,27,51,.18)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '22px 24px 16px', display: 'flex', flexDirection: 'column', gap: '16px', borderBottom: '1px solid rgba(16,32,64,.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '17px', fontWeight: '700' }}>알림센터</span><span style={tier2Chip}>읽지 않음 5</span></div>
              <button onClick={closeNotif} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {(notifCats || []).map((c, $index) => (<React.Fragment key={$index}><button onClick={c.go} style={c.style}>{c.label}</button></React.Fragment>))}
            </div>
          </div>
          <div style={{ flex: '1', overflow: 'auto', padding: '16px 20px 28px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(notifications || []).map((n, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
              <span style={n.dot}></span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={n.chip}>{n.cat}</span><span style={{ fontSize: '11px', color: '#8494AC', marginLeft: 'auto' }}>{n.at}</span></span>
                <span style={{ fontSize: '13.5px', fontWeight: '600', lineHeight: '1.45' }}>{n.title}</span>
                <span style={{ fontSize: '12px', color: '#6B7A93', lineHeight: '1.55' }}>{n.body}</span>
                {n.hasAction ? (<>
                <button onClick={n.act} style={{ alignSelf: 'flex-start', marginTop: '2px', height: '32px', padding: '0 13px', border: '1px solid rgba(0,69,169,.22)', borderRadius: '10px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '12px', fontWeight: '700', cursor: 'pointer' }}>{n.actionLabel}</button>
                </>) : null}
              </span>
            </div>
            </React.Fragment>))}
          </div>
        </div>
      </div>
      </>) : null}

      {dppOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '72', display: 'flex', justifyContent: 'flex-end' }}>
        <div onClick={closeDpp} style={{ position: 'absolute', inset: '0', background: 'rgba(11,27,51,.32)', backdropFilter: 'blur(2px)' }}></div>
        <div style={{ position: 'relative', width: '560px', height: '100%', background: '#fff', boxShadow: '-18px 0 44px rgba(11,27,51,.20)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '24px 26px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '12.5px', fontWeight: '600', color: '#0045A9' }}>{dppId}</span>
                <span style={{ fontSize: '20px', fontWeight: '700', letterSpacing: '-.02em' }}>{dppName}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={dppStatusChip}>완성도 {dppPct}%</span><span style={{ fontSize: '12px', color: '#8494AC' }}>{dppSpec}</span></div>
              </div>
              <button onClick={closeDpp} style={{ width: '34px', height: '34px', flex: 'none', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
          <div style={{ flex: '1', overflow: 'auto', padding: '22px 26px 30px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <span style={{ fontSize: '14px', fontWeight: '700' }}>생애주기 진행상태</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
                {(lifecycle || []).map((l, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '14px' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0' }}><span style={l.dot}></span><span style={l.line}></span></span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingBottom: '18px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '9px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{l.stage}</span><span style={l.chip}>{l.state}</span></span>
                    <span style={{ fontSize: '12px', color: '#6B7A93', lineHeight: '1.55' }}>{l.detail}</span>
                  </span>
                </div>
                </React.Fragment>))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '14px', fontWeight: '700' }}>미충족 필드 및 책임주체</span><span style={{ fontSize: '12px', color: '#8494AC' }}>{dppMissingCount}건</span></div>
              {(missingFields || []).map((f, $index) => (<React.Fragment key={$index}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={f.sevDot}></span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{f.field}</span></span>
                  <span style={{ fontSize: '12px', color: '#6B7A93' }}>책임주체 · {f.owner} · {f.role}</span>
                </span>
                <button onClick={f.nudge} style={{ height: '36px', padding: '0 14px', border: '0', borderRadius: '11px', background: 'rgba(0,69,169,.10)', color: '#0045A9', fontSize: '12.5px', fontWeight: '700', cursor: 'pointer', whiteSpace: 'nowrap' }} className="hv34">독촉 알림 전송</button>
              </div>
              </React.Fragment>))}
              <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.6', color: '#8494AC' }}>책임주체를 클릭하면 문서 업로드 독촉 알림이 담당자 이메일과 알림센터로 동시에 발송됩니다.</p>
            </div>
          </div>
        </div>
      </div>
      </>) : null}

      {obOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '76', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)', backdropFilter: 'blur(3px)' }}></div>
        <div style={{ position: 'relative', width: '760px', maxHeight: '100%', background: '#fff', borderRadius: '24px', boxShadow: '0 30px 70px rgba(6,17,36,.34)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '26px 30px 20px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '700', letterSpacing: '.1em', color: '#0045A9' }}>ONBOARDING · STEP {obStep} / {obLastStep}</span>
                <span style={{ fontSize: '21px', fontWeight: '700', letterSpacing: '-.02em' }}>{obTitle}</span>
              </div>
              <button onClick={obClose} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {(obBars || []).map((b, $index) => (<React.Fragment key={$index}><span style={b.style}></span></React.Fragment>))}
            </div>
          </div>

          <div style={{ padding: '26px 30px', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'auto' }}>
            {obIs1 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>도메인에 따라 요구되는 필수 데이터와 입력 화면이 달라집니다. 주력 도메인을 선택해 주세요.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px' }}>
                <button onClick={obPickSteel} style={obSteelCard}><span style={{ fontSize: '20px', fontWeight: '700' }}>철강</span></button>
                <button onClick={obPickBattery} style={obBatteryCard}><span style={{ fontSize: '20px', fontWeight: '700' }}>배터리</span></button>
                <button onClick={obPickTextile} style={obTextileCard}><span style={{ fontSize: '20px', fontWeight: '700' }}>섬유·패션</span></button>
              </div>
            </div>
            </>) : null}

            {obG1 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>국가 및 관할을 식별하는 고유 기관 ID를 등록합니다. 등록된 코드로 모든 조회·처리 이력이 기록됩니다.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>기관명</span><input placeholder={obGovOrgPlaceholder} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>국가 코드 (ISO 3166)</span><input placeholder="KR" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>{obGovIdLabel}</span><input placeholder={obGovIdPlaceholder} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>공식 기관 식별 코드</span><input placeholder={obGovCodeSample} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              </div>
              <div style={{ padding: '14px 16px', borderRadius: '13px', background: '#F7F9FD', border: '1px solid rgba(16,32,64,.07)', fontSize: '12.5px', lineHeight: '1.65', color: '#44546F' }}>입력한 식별 코드는 국가 기관 등록부와 자동 대조되며, 일치하지 않으면 다음 단계로 진행할 수 없습니다.</div>
            </div>
            </>) : null}

            {obC2 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>국가 통관 시스템(Single Window)과 자동 연동하기 위한 인증 정보를 등록합니다.</p>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>Single Window 연동 API 키</span><input placeholder="sw_live_••••••••••••••••" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>API 시크릿</span><input type="password" placeholder="발급받은 시크릿 키" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                <span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>보안 IP 대역 (허용 목록)</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '8px' }}>
                  <input placeholder="203.245.10.0/24" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} />
                  <button style={{ height: '48px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>대역 추가</button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px', marginTop: '4px' }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(0,69,169,.08)', color: '#0045A9', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '600' }}>203.245.10.0/24</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', height: '28px', padding: '0 12px', borderRadius: '999px', background: 'rgba(0,69,169,.08)', color: '#0045A9', fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', fontWeight: '600' }}>210.94.32.0/22</span>
                </div>
                <span style={{ fontSize: '11.5px', color: '#8494AC' }}>등록된 대역 밖에서의 API 호출은 자동 차단됩니다.</span>
              </div>
            </div>
            </>) : null}

            {obM2 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>포털에 직접 접속해 단속을 수행할 담당 공무원의 신원 정보를 등록합니다. 모든 열람 기록은 이 사번으로 남습니다.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>조사관 성명</span><input placeholder="예) 윤가람" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>고유 사번</span><input placeholder="예) MSA-2026-0417" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>소속 부서 · 직위</span><input placeholder="예) 제품안전조사과 · 조사관" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>통합 로그인(SSO) 계정</span><input placeholder="name@korea.kr" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 17px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>정부 통합 SSO 연동</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>기관 계정으로 인증하면 사번이 자동 대조됩니다</span></span>
                <button style={{ height: '38px', padding: '0 16px', border: '1px solid rgba(0,69,169,.24)', borderRadius: '12px', background: 'rgba(0,69,169,.06)', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap' }}>SSO 연결</button>
              </div>
            </div>
            </>) : null}

            {obG3 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>eIDAS 등 정부 기관용 적격 전자신원 인증서를 등록합니다. 인증서는 열람 기록에 전자서명으로 첨부됩니다.</p>
              <div style={{ border: '1.5px dashed rgba(0,69,169,.34)', borderRadius: '16px', background: 'rgba(0,69,169,.035)', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '44px', height: '44px', borderRadius: '999px', background: 'rgba(0,69,169,.10)', display: 'grid', placeItems: 'center' }}><span style={{ width: '14px', height: '14px', background: '#0045A9', borderRadius: '3px' }}></span></span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>적격 전자신원 인증서를 업로드하세요</span>
                <span style={{ fontSize: '12px', color: '#6B7A93' }}>eIDAS QSeal / QWAC · .p12 · .pfx · .cer 형식</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>인증서 유형</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>eIDAS 적격 전자인장 (QSeal)</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>발급 기관</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>한국정보인증 (Qualified TSP)</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>인증서 일련번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', fontWeight: '600' }}>4A:2F:88:C1:07:E9</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>유효기간</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '13px', fontWeight: '600' }}>2026-01-15 ~ 2029-01-14</span></div>
                <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>검증 상태</span><span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>EU 신뢰목록 확인됨</span></span></div>
              </div>
            </div>
            </>) : null}

            {obC4 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>수입품의 고유 식별자(UPI)를 조회·검증할 수 있는 시스템 권한(Role)을 신청합니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>UPI 조회 (CUSTOMS_UPI_READ)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>수입품 고유 식별자로 DPP 원본 조회</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>필수</span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>유효성 검증 (CUSTOMS_VERIFY)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>여권 서명·정지 여부·적합성 선언서 검증</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>필수</span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>통관 판정 기록 (CUSTOMS_DECIDE)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>통관 가능·보류 판정 및 이력 저장</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>선택</span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>일괄 조회 (CUSTOMS_BULK)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>화물 단위 다건 UPI 동시 검증</span></span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '11.5px', color: '#8494AC' }}>선택</span></label>
              </div>
            </div>
            </>) : null}

            {obM4 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>기업의 영업비밀·세부 공급망 등 제한된 데이터를 열람하려면 법적 권한 증명과 조사 목적 기록이 필요합니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>공개 DPP 열람</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>일반 공개 항목 조회 · 별도 증명 불필요</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1.5px solid rgba(224,59,59,.28)', borderRadius: '13px', background: 'rgba(224,59,59,.04)', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#C22B2B' }}>영업비밀 데이터 열람 (제한)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>원가·공정 파라미터 등 ZKP 비공개 원본 조회</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1.5px solid rgba(224,59,59,.28)', borderRadius: '13px', background: 'rgba(224,59,59,.04)', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600', color: '#C22B2B' }}>세부 공급망 소급 조회 (제한)</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>Tier 2~4 협력사 및 원자재 단계까지 추적</span></span></label>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', padding: '20px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '16px', background: '#F7F9FD' }}>
                <span style={{ fontSize: '13.5px', fontWeight: '700' }}>법적 권한 증명 및 조사 목적 기록</span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>근거 법령</span><input placeholder="예) 제품안전기본법 제12조" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', background: '#fff' }} /></label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>조사 명령서 번호</span><input placeholder="예) MSA-INV-2026-0188" style={{ height: '46px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace', background: '#fff' }} /></label>
                </div>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>조사 목적</span><textarea rows="3" placeholder="열람이 필요한 사유와 조사 범위를 기재하세요. 입력 내용은 감사 로그에 영구 기록됩니다." style={{ padding: '12px 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '13.5px', lineHeight: '1.6', resize: 'vertical', background: '#fff' }}></textarea></label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#fff' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13px', fontWeight: '600' }}>조사_명령서_2026-0188.pdf</span><span style={{ fontSize: '11px', color: '#8494AC' }}>PDF · 0.4MB · 기관장 전자서명 포함</span></span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>서명 유효</span></span>
                </div>
              </div>
            </div>
            </>) : null}

            {obIs2 ? (<>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>회사명</span><input placeholder="주식회사 예시제강" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>사업자등록번호</span><input placeholder="000-00-00000" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>대표번호</span><input placeholder="02-0000-0000" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>홈페이지 URL <span style={{ fontWeight: '500', color: '#9AA8BE' }}>(선택)</span></span><input placeholder="https://" style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
            </div>
            </>) : null}

            {obIs3 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ border: '1.5px dashed rgba(0,69,169,.34)', borderRadius: '16px', background: 'rgba(0,69,169,.035)', padding: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                <span style={{ width: '44px', height: '44px', borderRadius: '999px', background: 'rgba(0,69,169,.10)', display: 'grid', placeItems: 'center' }}><span style={{ width: '14px', height: '14px', background: '#0045A9', borderRadius: '3px' }}></span></span>
                <span style={{ fontSize: '14px', fontWeight: '600' }}>증빙서류를 업로드하세요</span>
                <span style={{ fontSize: '12px', color: '#6B7A93' }}>사업자등록증(필수) · 공장등록증 · 제3자 인증서 · PDF/JPG 20MB 이하</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                {(obDocs || []).map((f, $index) => (<React.Fragment key={$index}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '10px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE' }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13px', fontWeight: '600' }}>{f.name}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{f.meta}</span></span>
                  <span style={f.chip}>{f.status}</span>
                  <button onClick={f.view} style={{ height: '32px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv35">확인</button>
                  <button onClick={f.remove} title="삭제" style={{ width: '32px', height: '32px', display: 'grid', placeItems: 'center', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', color: '#8494AC', cursor: 'pointer' }} className="hv36"><svg viewBox="0 0 20 20" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M7.5 2.8h5v1.4h4v1.7h-1.3l-.8 10a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5l-.8-10H3.5V4.2h4V2.8Zm-.9 3.1.8 9.8h5.2l.8-9.8H6.6Zm2.1 1.5h1.5v6.6H8.7V7.4Zm2.6 0h1.5v6.6h-1.5V7.4Z" /></svg></button>
                </div>
                </React.Fragment>))}
              </div>
            </div>
            </>) : null}

            {obIs4 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={obTier1} style={obTier1Card}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '700' }}>Tier 1</span><span style={tier1Chip}>기초 / 셀프 등록</span></span><span style={{ fontSize: '12.5px', color: '#6B7A93', lineHeight: '1.6', textAlign: 'left' }}>자체 선언 데이터만 입력하는 무료·기본 등급. 서류 심사 없이 즉시 사용할 수 있습니다.</span></button>
              <button onClick={obTier2} style={obTier2Card}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '700' }}>Tier 2</span><span style={tier2Chip}>표준 / 검증 등록</span></span><span style={{ fontSize: '12.5px', color: '#6B7A93', lineHeight: '1.6', textAlign: 'left' }}>ISO·ESG 등 제3자 인증서를 첨부해 데이터 신뢰도를 높인 등급. 자동심사 후 즉시 승인됩니다.</span></button>
              <button onClick={obTier3} style={obTier3Card}><span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}><span style={{ fontSize: '15px', fontWeight: '700' }}>Tier 3</span><span style={tier3Chip}>엔터프라이즈 / Full DPP</span></span><span style={{ fontSize: '12.5px', color: '#6B7A93', lineHeight: '1.6', textAlign: 'left' }}>공급망 하위 업체(Tier 2~4)까지 초대해 전체 추적망을 연동할 수 있는 최고 등급. 관리자 심사가 필요합니다.</span></button>
            </div>
            </>) : null}

            {obIs5 ? (<>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>담당 업무에 필요한 권한을 신청하세요. 관리자 승인 후 즉시 적용됩니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>DPP 발급 · 수정</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>제품 데이터 입력 및 여권 발급</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" checked={true} style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>협력사 초대</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>하위 공급망 계정 초대 및 역할 부여</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>ZKP 증명 제출</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>영업기밀 비공개 증명 생성·제출</span></span></label>
                <label style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '12px', alignItems: 'flex-start', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE', cursor: 'pointer' }}><input type="checkbox" style={{ width: '16px', height: '16px', marginTop: '2px', accentColor: '#0045A9' }} /><span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>감사 로그 열람</span><span style={{ fontSize: '12px', color: '#6B7A93' }}>자사 DPP 관련 감사 이력 조회</span></span></label>
              </div>
            </div>
            </>) : null}
          </div>

          <div style={{ padding: '18px 30px 22px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button onClick={obPrev} style={{ height: '46px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>이전</button>
            <span style={{ fontSize: '12.5px', color: '#8494AC' }}>닫으면 마이페이지에서 이어서 작성할 수 있습니다</span>
            <button onClick={obNext} style={{ height: '46px', padding: '0 26px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.24)' }}>{obNextLabel}</button>
          </div>
        </div>
      </div>
      </>) : null}

      {fieldCheckOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '89', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeFieldCheck} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '620px', maxHeight: '100%', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>필수 필드 충족 현황</span>
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{fieldFilledCount} / {fieldTotalCount}개 입력 완료 · 체크된 항목은 업로드 문서에서 자동 매핑되었습니다</span>
            </div>
            <button onClick={closeFieldCheck} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', margin: '22px 28px', borderRadius: '14px', overflow: 'auto' }}>
            {(fieldCheck || []).map((f, $index) => (<React.Fragment key={$index}>
            <div style={{ background: '#fff', padding: '14px 16px', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '12px', alignItems: 'center' }}>
              <span style={f.dot}>{f.mark}</span>
              <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{f.label}</span>
              <span style={f.valueStyle}>{f.valueText}</span>
            </div>
            </React.Fragment>))}
          </div>
          <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={closeFieldCheck} style={{ height: '46px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      </div>
      </>) : null}

      {tierDocsOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '89', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeTierDocs} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '640px', maxHeight: '100%', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>{tierDocsName} · 제출 문서</span>
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>{tierDocsTier} 신청 · {tierDocsCount}</span>
            </div>
            <button onClick={closeTierDocs} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: '9px', overflow: 'auto' }}>
            {(tierDocList || []).map((d, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', padding: '15px 16px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE' }}>
              <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{d.name}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{d.meta}</span></span>
              <span style={d.chip}>{d.status}</span>
              <button onClick={d.view} style={{ height: '32px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv37">확인</button>
            </div>
            </React.Fragment>))}
          </div>
          <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={closeTierDocs} style={{ height: '46px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
          </div>
        </div>
      </div>
      </>) : null}

      {profileEditOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '90', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={cancelProfileEdit} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '620px', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '24px 28px 18px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '18px', fontWeight: '700' }}>기업 기본정보 수정</span>
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>변경한 내용은 저장 후 즉시 반영됩니다.</span>
            </div>
            <button onClick={cancelProfileEdit} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
          </div>
          <div style={{ padding: '24px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>회사명</span><input value={editName} onChange={onEditName} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>사업자등록번호</span><input value={editBiz} onChange={onEditBiz} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>대표번호</span><input value={editPhone} onChange={onEditPhone} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px', fontFamily: '\'JetBrains Mono\',monospace' }} /></label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}><span style={{ fontSize: '12.5px', fontWeight: '600', color: '#44546F' }}>홈페이지 URL <span style={{ fontWeight: '500', color: '#9AA8BE' }}>(선택)</span></span><input value={editUrl} onChange={onEditUrl} style={{ height: '48px', padding: '0 14px', border: '1px solid rgba(16,32,64,.14)', borderRadius: '12px', fontSize: '14px' }} /></label>
          </div>
          <div style={{ padding: '18px 28px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', justifyContent: 'flex-end', gap: '9px' }}>
            <button onClick={cancelProfileEdit} style={{ height: '46px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>취소</button>
            <button onClick={commitProfileEdit} style={{ height: '46px', padding: '0 24px', border: '0', borderRadius: '13px', background: '#0045A9', color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.22)' }}>저장</button>
          </div>
        </div>
      </div>
      </>) : null}

      {docPreviewOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '90', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={closeDocPreview} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.52)' }}></div>
        <div style={{ position: 'relative', width: '680px', maxHeight: '100%', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.32)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '22px 26px', borderBottom: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
              <span style={{ fontSize: '17px', fontWeight: '700' }}>{docPreviewName}</span>
              <span style={{ fontSize: '12px', color: '#8494AC' }}>{docPreviewMeta}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={docPreviewChip}>{docPreviewStatus}</span>
              <button onClick={closeDocPreview} style={{ width: '34px', height: '34px', border: '1px solid rgba(16,32,64,.10)', borderRadius: '11px', background: '#fff', fontSize: '13px', color: '#6B7A93', cursor: 'pointer' }}>✕</button>
            </div>
          </div>
          <div style={{ padding: '26px', background: '#EEF2F9', display: 'grid', placeItems: 'center' }}>
            <div style={{ width: '400px', height: '300px', background: '#fff', border: '1px solid rgba(16,32,64,.10)', borderRadius: '6px', boxShadow: '0 8px 24px rgba(11,27,51,.12)', padding: '32px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ height: '14px', width: '55%', borderRadius: '3px', background: '#0B1B33' }}></div>
              <div style={{ height: '8px', width: '82%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '74%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '88%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '1px', background: 'rgba(16,32,64,.12)', margin: '4px 0' }}></div>
              <div style={{ height: '8px', width: '64%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '79%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ height: '8px', width: '48%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ height: '8px', width: '30%', borderRadius: '3px', background: 'rgba(16,32,64,.14)' }}></div>
                <div style={{ width: '52px', height: '52px', borderRadius: '999px', border: '2px solid rgba(224,59,59,.42)' }}></div>
              </div>
            </div>
          </div>
          <div style={{ padding: '18px 26px', borderTop: '1px solid rgba(16,32,64,.08)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '12px', color: '#8494AC' }}>1 / 1 페이지</span>
            <div style={{ display: 'flex', gap: '9px' }}>
              <button onClick={downloadDoc} style={{ height: '44px', padding: '0 18px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '12px', background: '#fff', fontSize: '13.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>원본 내려받기</button>
              <button onClick={closeDocPreview} style={{ height: '44px', padding: '0 22px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '13.5px', fontWeight: '600', cursor: 'pointer' }}>닫기</button>
            </div>
          </div>
        </div>
      </div>
      </>) : null}

      {confirmOpen ? (<>
      <div style={{ position: 'fixed', inset: '0', zIndex: '88', display: 'grid', placeItems: 'center', padding: '40px' }}>
        <div onClick={confirmCancel} style={{ position: 'absolute', inset: '0', background: 'rgba(6,17,36,.48)' }}></div>
        <div style={{ position: 'relative', width: '440px', background: '#fff', borderRadius: '22px', boxShadow: '0 30px 70px rgba(6,17,36,.30)', padding: '28px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={{ fontSize: '18px', fontWeight: '700' }}>{confirmTitle}</span>
          <p style={{ margin: '0', fontSize: '13.5px', lineHeight: '1.65', color: '#6B7A93' }}>{confirmBody}</p>
          <div style={{ display: 'flex', gap: '9px', justifyContent: 'flex-end', paddingTop: '6px' }}>
            <button onClick={confirmCancel} style={{ height: '46px', padding: '0 20px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '13px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }}>취소</button>
            <button onClick={confirmRun} style={confirmStyle}>{confirmLabel}</button>
          </div>
        </div>
      </div>
      </>) : null}

      {toast ? (<>
      <div style={{ position: 'fixed', left: '50%', bottom: '92px', transform: 'translateX(-50%)', zIndex: '90', display: 'flex', alignItems: 'center', gap: '10px', padding: '13px 20px', borderRadius: '13px', background: '#0B1B33', color: '#fff', fontSize: '13.5px', fontWeight: '500', boxShadow: '0 12px 30px rgba(11,27,51,.32)', animation: 'ieumUp .18s ease-out' }}><span style={{ width: '7px', height: '7px', borderRadius: '4px', background: '#4ADE80' }}></span>{toast}</div>
      </>) : null}

      {showSwitcher ? (<>
      <div style={{ position: 'fixed', left: '50%', bottom: '20px', transform: 'translateX(-50%)', zIndex: '80', display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 9px', borderRadius: '15px', background: 'rgba(11,27,51,.94)', boxShadow: '0 12px 34px rgba(11,27,51,.30)' }}>
        <span style={{ fontSize: '10.5px', letterSpacing: '.1em', fontWeight: '700', color: 'rgba(255,255,255,.45)', padding: '0 6px' }}>PROTOTYPE</span>
        {(roleBtns || []).map((r, $index) => (<React.Fragment key={$index}><button onClick={r.go} style={r.style}>{r.label}</button></React.Fragment>))}
        <button onClick={goLogin} style={{ height: '30px', padding: '0 12px', border: '0', borderRadius: '10px', background: 'rgba(255,255,255,.10)', color: 'rgba(255,255,255,.72)', fontSize: '12px', fontWeight: '600', cursor: 'pointer', whiteSpace: 'nowrap', flex: 'none' }}>로그인</button>
      </div>
      </>) : null}

      </div>

    </>
  );
}


/* ==================================================================
 * 진입 컴포넌트
 * ================================================================== */

export default function App(props) {
  const vals = useAppLogic(props);
  return <AppView {...vals} />;
}
