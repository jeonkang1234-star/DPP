import React from 'react';
import QRCode from 'qrcode';
import { publicPassportUrl } from '../publicUrl.js';
import { updateOrganization } from '../api/meApi.js';

function pad2(n) { return String(n).padStart(2, '0'); }
function nowStamp() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

// ZKP 문서별 검증 기준(정적 설명) - documentSlots의 detailLabel(실측 결과)과 별개로,
// "애초에 뭘 어떤 기준으로 보는지"를 항상 보여주기 위한 데이터. 결과가 아직 없어도(업로드 전)
// 표시된다. 2026-08-17 강 요청: 서술형 문장 대신 실제 회로/판정 로직에 쓰이는 정확한
// 수치·부등호를 그대로 적는다(zkp-o1js/circuits.mjs, parser/judge.py 기준 확인 완료).
// 2026-08-18 강 요청: 긴 문장 대신 토글로 열었을 때 항목별 "0.5 < aaa < 1.0" 형태로 담백하게
// 보이도록 {item, criterion}[] 구조로 변경.
const ZKP_CRITERIA = {
  // Mill Sheet만 예외 - 강종마다 KS 규격 상하한이 달라서 단일 수치가 없다(judge.py의
  // 의도적 설계: 성적서에 인쇄된 limit_text를 그대로 파싱해서 검증). 그래서 "고정값"
  // 대신 실제 판정 예시(테스트 데이터 기준)를 항목별로 보여준다.
  // vkey - zkp-o1js/server.mjs가 실제로 돌려주는 verdicts 맵의 키(항목별 참/거짓 판정).
  // 2026-08-18 강 요청: 실패한 항목만 기준 텍스트를 빨간색으로 표시하려면 항목별 판정이
  // 필요해서, 서버가 실제로 응답하는 verdicts 키를 그대로 매핑해 둔다(CBAM은 verdicts 자체가
  // 없음 - obligated는 적합/부적합이 아니라 "의무 발생 여부"라 실패 개념이 없다).
  MILL_SHEET: [
    { item: 'C(탄소)', criterion: 'C ≤ 0.240%', vkey: 'C' },
    { item: 'Mn(망간)', criterion: 'Mn ≤ 1.600%', vkey: 'Mn' },
    { item: 'P(인)', criterion: 'P ≤ 0.035%', vkey: 'P' },
    { item: 'S(황)', criterion: 'S ≤ 0.035%', vkey: 'S' },
    { item: 'ReH(항복강도)', criterion: 'ReH ≥ 355 N/mm²', vkey: 'ReH' },
    { item: 'Rm(인장강도)', criterion: '470 ≤ Rm ≤ 630 N/mm²', vkey: 'Rm' },
    { item: 'A(연신율)', criterion: 'A ≥ 22%', vkey: 'A' },
    { item: 'KV(충격흡수에너지)', criterion: 'KV ≥ 27 J', vkey: 'KV' },
  ],
  CBAM_REPORT: [
    { item: '연간 누적 수입량', criterion: '> 50t' },
  ],
  CARE_LABEL: [
    { item: '섬유 혼용률 합계', criterion: '99.5% ≤ 합계 ≤ 100.5%' },
  ],
  OEKOTEX_LABEL: [
    { item: 'pH', criterion: '4.0 ≤ pH ≤ 7.5' },
  ],
  BATTERY_CARBON_REPORT: [
    { item: 'Co(코발트) 재생원료 함유율', criterion: 'Co ≥ 16%', vkey: 'coOk' },
    { item: 'Li(리튬) 재생원료 함유율', criterion: 'Li ≥ 6%', vkey: 'liOk' },
    { item: 'Ni(니켈) 재생원료 함유율', criterion: 'Ni ≥ 6%', vkey: 'niOk' },
  ],
  RECYCLING_REPORT: [
    { item: 'Cu(구리) 물질회수율', criterion: 'Cu ≥ 90%', vkey: 'cuOk' },
    { item: 'Li(리튬) 물질회수율', criterion: 'Li ≥ 50%', vkey: 'liOk' },
    { item: 'Co(코발트) 물질회수율', criterion: 'Co ≥ 90%', vkey: 'coOk' },
  ]
};

// 백엔드가 실제로 문서에서 자동 채우는 필드코드만 정확히 나열 - 이 목록 밖의 필드는 절대
// 문서에서 채워지지 않고 항상 직접 입력이다(2026-08-17, 강이 "분명 파싱되는 애들인데 전부
// 수기입력으로 뜬다"고 지적해서 정적 화이트리스트로 정확히 구분하도록 수정).
// 2026-08-18(2차) 강 리포트: "파싱되는 데이터 밑에 파싱이라고도, 직접 입력 항목이라고도
// 동시에 뜬다" - 원인은 이 화이트리스트가 Round 4에서 새로 자동채움이 연결된 필드들
// (제강 성적서 Heat No 등, 배터리/섬유 ZKP 문서가 채우는 필드들)을 전혀 반영하지 못해서,
// 실제로는 파싱되는 필드인데 위쪽 정렬/블록 배정에서는 "수기 입력" 취급을 받아 섹션
// 헤더("직접 입력해야 하는 항목")와 필드 자체의 sourceLabel("파싱(...)")이 서로 다른
// 말을 하는 것처럼 보였다. 아래 목록을 백엔드 자동채움 로직과 정확히 동기화한다:
//  - COMMON(전 도메인): GTIN(9종 문서 공통 시도), PCF_VALUE/PCF_METHOD(PCF_REPORT·LCA_EPD),
//    RECYCLABILITY_NOTE(LCA_EPD), ORIGIN_COUNTRY(COO), UOI_MANUFACTURER(EU_DOC)
//    - DocumentSlotService.autoFillFieldsFromParsedDocument
//  - 철강: RECYCLED_SCRAP_RATE(SCRAP_PROOF), HEAT_NO/LOT_NO/STEEL_GRADE/STEEL_STANDARD/
//    DIMENSION/NET_WEIGHT_T(Mill Sheet) - DocumentIngestService.persistIdentityFields
//    (CAST_NO는 제외 - 문서에 Cast/Lot 결합값 하나만 있어서 Lot 쪽에만 채운다, 2026-08-18
//    리포트: "LOT-2026-0201-A가 CAST 번호에도 파싱되는 오류" 수정)
//  - 배터리: RECYCLED_COBALT_RATE/RECYCLED_LITHIUM_RATE/RECYCLED_NICKEL_RATE/
//    RECYCLED_LEAD_RATE/BATTERY_CARBON_DECLARATION_REQUIRED/RATED_CAPACITY_KWH/
//    BATTERY_CHEMISTRY(배터리 탄소발자국 선언) - BatteryCarbonIngestService,
//    RECYCLED_COPPER_RECOVERY_RATE/RECYCLED_LITHIUM_RECOVERY_RATE/
//    RECYCLED_COBALT_RECOVERY_RATE/OVERALL_RECYCLING_EFFICIENCY(재활용 처리결과보고서) -
//    RecyclingIngestService
//  - 섬유: OEKOTEX_CERT_NO(OEKO-TEX 라벨) - OekotexIngestService, FABRIC_LOT_NO/
//    RECYCLED_FIBER_RATE(케어라벨 또는 GRS/RCS 거래증명서) - CareLabelIngestService/
//    DocumentSlotService
// 2026-08-19: 이 화이트리스트는 이제 '폴백'이다. 어떤 필드가 문서에서 자동으로 채워지는지는
// requirement_field.data_source(PARSER/MANUAL/SYSTEM)가 정답이고, 서버가 폼 응답에 실어
// 보낸다(FieldFormItemDto.dataSource). 필드가 361개로 늘어난 이상 이 목록을 손으로 유지하는
// 건 불가능하고, 실제로 Round 4 때 이미 한 번 어긋나서 같은 필드가 "파싱됨"과 "직접 입력"으로
// 동시에 표시되는 버그가 났었다. 서버가 dataSource를 안 주는 경우(구버전 BE)에만 아래 목록을
// 쓴다 - 그때는 적어도 예전과 똑같이 동작한다.
const AUTO_FILL_FIELD_CODES = new Set([
  'GTIN', 'PCF_VALUE', 'PCF_METHOD', 'RECYCLABILITY_NOTE', 'ORIGIN_COUNTRY', 'UOI_MANUFACTURER',
  'RECYCLED_SCRAP_RATE', 'HEAT_NO', 'LOT_NO', 'STEEL_GRADE', 'STEEL_STANDARD', 'DIMENSION', 'NET_WEIGHT_T',
  'RECYCLED_COBALT_RATE', 'RECYCLED_LITHIUM_RATE', 'RECYCLED_NICKEL_RATE', 'RECYCLED_LEAD_RATE',
  'BATTERY_CARBON_DECLARATION_REQUIRED', 'RATED_CAPACITY_KWH', 'BATTERY_CHEMISTRY',
  'RECYCLED_COPPER_RECOVERY_RATE', 'RECYCLED_LITHIUM_RECOVERY_RATE', 'RECYCLED_COBALT_RECOVERY_RATE',
  'OVERALL_RECYCLING_EFFICIENCY',
  'OEKOTEX_CERT_NO', 'FABRIC_LOT_NO', 'RECYCLED_FIBER_RATE'
]);
// 위 필드가 아직 안 채워졌을 때 "어느 문서를 올리면 채워지는지" 구체적으로 안내할 때 쓰는
// 문서명(짧게). 2026-08-18 강 요청: "~페이지에서 파싱"이 반복되면 텍스트가 너무 길어지니
// "파싱(문서명)" 형태로 짧게 - 이 맵은 문서명만 담고, 조합은 사용하는 쪽에서 한다.
const AUTO_FILL_DOC_NAME = {
  GTIN: '업로드 문서',
  PCF_VALUE: '탄소발자국 산정보고서',
  PCF_METHOD: '탄소발자국 산정보고서',
  RECYCLABILITY_NOTE: 'LCA/EPD',
  ORIGIN_COUNTRY: '원산지증명서',
  UOI_MANUFACTURER: 'EU 적합성선언서',
  RECYCLED_SCRAP_RATE: '스크랩 매입증빙',
  HEAT_NO: '제강 성적서', LOT_NO: '제강 성적서', STEEL_GRADE: '제강 성적서',
  STEEL_STANDARD: '제강 성적서', DIMENSION: '제강 성적서', NET_WEIGHT_T: '제강 성적서',
  RECYCLED_COBALT_RATE: '배터리 탄소발자국 선언', RECYCLED_LITHIUM_RATE: '배터리 탄소발자국 선언',
  RECYCLED_NICKEL_RATE: '배터리 탄소발자국 선언', RECYCLED_LEAD_RATE: '배터리 탄소발자국 선언',
  BATTERY_CARBON_DECLARATION_REQUIRED: '배터리 탄소발자국 선언', RATED_CAPACITY_KWH: '배터리 탄소발자국 선언',
  BATTERY_CHEMISTRY: '배터리 탄소발자국 선언',
  RECYCLED_COPPER_RECOVERY_RATE: '재활용 처리결과 보고서', RECYCLED_LITHIUM_RECOVERY_RATE: '재활용 처리결과 보고서',
  RECYCLED_COBALT_RECOVERY_RATE: '재활용 처리결과 보고서', OVERALL_RECYCLING_EFFICIENCY: '재활용 처리결과 보고서',
  OEKOTEX_CERT_NO: 'OEKO-TEX 라벨',
  FABRIC_LOT_NO: '섬유 케어라벨', RECYCLED_FIBER_RATE: '섬유 케어라벨/GRS 거래증명서'
};

// ── 필드 메타데이터 해석 (2026-08-19, T0·T1 시딩) ───────────────────────────
// 아래 4개는 전부 "서버가 준 값이 있으면 그걸 쓰고, 없으면 예전처럼 동작한다" 구조다.
// 구버전 BE와 붙어도 화면이 깨지지 않게 하기 위한 것.

// 배지는 T0(법정필수)에만 붙인다. T1(조건부)·T2·T3·T4는 "써도 되고 안 써도 되는" 칸이라
// 굳이 라벨을 달 이유가 없고, 361개 필드 옆에 파란 "조건부"가 줄줄이 붙으면 정작 눈에
// 띄어야 할 빨간 "법정필수"가 묻힌다(2026-08-20 강 요청 "조건부 = 적어도 되고 안 적어도
// 되는 항목이라면 굳이 표시할 필요 X"). 등급 자체는 f.tier로 남아 있어서 정렬(법정필수
// 우선)과 근거 조항 툴팁은 그대로 동작한다.
const TIER_LABEL = { T0: '법정필수' };
// 2026-09-19 강 요청으로 RESTRICTED('권한자 한정')는 뺐다 - 어떤 항목이 필요한지는
// 배터리 분류에 따라 어차피 달라지고, 공개범위는 제조사가 입력하면서 판단할 거리가
// 아니라 조회 쪽 규칙이라 입력 폼에서는 소음이었다. TRADE_SECRET 은 남긴다 - 그 항목은
// 입력칸 자체가 없고 O/X 배지만 뜨기 때문에, 라벨을 빼면 왜 못 쓰는지 알 길이 없다.
const DISCLOSURE_LABEL = { TRADE_SECRET: '영업비밀(ZKP 대체)' };

/** 이 필드가 문서 파싱으로 채워지는가. 서버의 data_source가 정답, 없으면 구 화이트리스트. */
function isParserField(f) {
  if (f.dataSource) return f.dataSource === 'PARSER';
  return AUTO_FILL_FIELD_CODES.has(f.fieldCode);
}

/** data_type -> 입력 위젯 종류. code_group이 붙은 CODE만 드롭다운이 된다(선택지가 실제로
 *  있는 경우에만 - V22에서 선택지를 못 심은 Enum은 code_group을 비워뒀다). */
function inputKindOf(f) {
  if (f.dataType === 'CODE' && f.codeGroup) return 'select';
  switch (f.dataType) {
    case 'BOOLEAN': return 'boolean';
    case 'NUMBER': return 'number';
    case 'DATE': return 'date';
    case 'DATETIME': return 'datetime';
    case 'URL': return 'url';
    case 'TEXT': return 'textarea';
    default: return 'text';
  }
}

/** 폼 응답의 codeOptions에서 이 필드가 쓸 선택지만 뽑는다. */
function optionsFor(f, codeOptions) {
  if (!f.codeGroup || !codeOptions) return [];
  return codeOptions
    .filter(o => o.codeGroup === f.codeGroup)
    .map(o => ({ value: o.code, label: o.nameKo }));
}

/**
 * legal_basis 한 줄을 [규정명] + 기준 두 조각으로 쪼갠다.
 *   "CBAM Impl.Reg.(EU)2025/2547 Annex IV pt.2 추가 파라미터(Mn 질량%)"
 *   -> { name: "CBAM Impl.Reg.(EU)2025/2547", detail: "Annex IV pt.2 추가 파라미터(Mn 질량%)" }
 * 조문 표기가 없으면 전체를 규정명으로 본다.
 */
function splitLegalBasis(basis) {
  const text = (basis || '').trim();
  if (!text) return null;
  const m = text.match(/\s(Annex|Art\.|Article|Sec\.|Section|§|부속서|제\s?\d)/);
  if (!m || m.index <= 0) return { name: text, detail: '' };
  return { name: text.slice(0, m.index).trim(), detail: text.slice(m.index + 1).trim() };
}

/**
 * 영업비밀(TRADE_SECRET) 필드의 O/X 표시값. 그 외 필드는 zkpOnly:false만 돌려준다.
 *
 * 저장된 값은 실측치가 아니라 판정 토큰이다("충족"/"미충족", SpecFieldAutoFillService).
 * 혹시 예전 데이터에 숫자가 남아 있어도 화면에는 절대 숫자를 그리지 않는다 - 값이
 * 비어 있지 않으면 "충족"으로만 본다(미충족은 정확히 그 토큰일 때만).
 *
 * 2026-08-21 강 요청:
 *   - "한계값 충족" -> "규정 충족". 이 판정이 답하는 질문은 "어떤 수치인가"가 아니라
 *     "규정을 지켰는가"라서, 라벨도 그 말로 맞춘다.
 *   - 보조 문구를 "영지식증명으로 검증됨 · 실측값은 저장하지 않습니다" 대신 실제로
 *     어떤 규정을 만족한 건지 보여준다([규정명] 기준). 근거는 requirement_field.legal_basis.
 */
function zkpVerdictOf(f) {
  if (f.disclosureScope !== 'TRADE_SECRET') {
    return { zkpOnly: false };
  }
  const v = (f.value || '').trim();
  const failed = v === '미충족';
  const passed = !!v && !failed;
  const basis = splitLegalBasis(f.legalBasis);
  const basisText = basis ? ('[' + basis.name + ']' + (basis.detail ? ' ' + basis.detail : '')) : '';
  return {
    zkpOnly: true,
    zkpMark: passed ? 'O' : failed ? 'X' : '–',
    zkpLabel: passed ? '규정 충족' : failed ? '규정 미충족' : '미제출',
    zkpFg: passed ? '#0E7A3D' : failed ? '#C22B2B' : '#6B7A93',
    zkpBg: passed ? 'rgba(18,161,80,.14)' : failed ? 'rgba(194,43,43,.12)' : 'rgba(132,148,172,.14)',
    // 근거 규정이 시딩돼 있으면 그걸 보여주고, 없으면 예전 안내 문구로 되돌아간다.
    zkpHint: basisText || (passed ? '영지식증명으로 검증됨 · 실측값은 저장하지 않습니다'
      : failed ? '성적서 규격 미달 · 문서를 다시 제출해 주세요'
      : '성적서를 업로드하면 영지식증명으로 판정됩니다')
  };
}

/**
 * 섹션별로 필드를 묶는다. 서버가 sections를 주면 그 순서를 그대로 따르고(code_master의
 * FIELD_SECTION sort_order), 안 주면 필드에 나온 순서대로 만든다.
 *
 * 섹션 안에서 다시 파싱/수기로 나누는 이유: 이 두 축은 서로 대체하는 게 아니라 직교한다.
 * "화학 성분" 섹션 안에도 성적서에서 자동으로 오는 값과 직접 쳐야 하는 값이 같이 있다.
 * 예전엔 파싱/수기 두 덩어리만 있어서, 361개가 되면 각 덩어리가 그냥 긴 벽이 된다.
 */
function groupBySection(fields, sections, openMap, setState) {
  const order = (sections && sections.length)
    ? sections.map(sec => sec.section)
    : [...new Set(fields.map(f => f.section))];
  const labelOf = {};
  (sections || []).forEach(sec => { labelOf[sec.section] = sec.labelKo || sec.section; });

  // 법정필수(T0)를 맨 위로(2026-08-20 강 요청). 섹션 사이에서는 T0 필수 항목을 가진
  // 섹션이 먼저 오고, 섹션 안에서는 T0 필드가 먼저 온다. 같은 등급끼리는 서버가 준
  // sort_order 순서를 그대로 지킨다(안정 정렬).
  const t0First = (a, b) => (a.tier === 'T0' ? 0 : 1) - (b.tier === 'T0' ? 0 : 1);
  const hasT0 = key => fields.some(f => f.section === key && f.tier === 'T0');
  const sortedOrder = order
    .map((key, idx) => ({ key, idx }))
    .sort((a, b) => (hasT0(a.key) ? 0 : 1) - (hasT0(b.key) ? 0 : 1) || a.idx - b.idx)
    .map(o => o.key);

  return sortedOrder.map((key, idx) => {
    const mine = fields.filter(f => f.section === key).slice().sort(t0First);
    const required = mine.filter(f => f.req === '필수');
    const filled = required.filter(f => f.value && String(f.value).trim());
    // 첫 섹션만 기본으로 열어둔다. 21개 섹션이 전부 펼쳐진 채로 뜨면 스크롤이 수백 줄이다.
    const open = openMap && Object.prototype.hasOwnProperty.call(openMap, key)
      ? !!openMap[key]
      : idx === 0;
    return {
      key,
      label: labelOf[key] || key,
      total: mine.length,
      requiredCount: required.length,
      filledRequiredCount: filled.length,
      // 필수 항목이 하나도 안 채워졌으면 빨강, 다 채웠으면 초록, 그 사이는 주황.
      progressColor: required.length === 0 ? '#8494AC'
        : filled.length === required.length ? '#12A150'
        : filled.length === 0 ? '#E03B3B' : '#E3A008',
      open,
      toggle: () => setState(st => ({
        openFieldSections: { ...(st.openFieldSections || {}), [key]: !open }
      })),
      parsed: mine.filter(f => f.autoFillable),
      manual: mine.filter(f => !f.autoFillable)
    };
  }).filter(sec => sec.total > 0);
}

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
// 회사 프로필(GET /me/organization)에 이미 등록된 값으로 폼을 미리 채울 칸(2026-09-19 강 요청:
// "제조사명은 시스템에서 연동해서 바로 입력되게, 연락 이메일·웹사이트도 등록돼 있으면 바로").
// 값이 프로필에 없으면 그 칸은 건드리지 않는다 - 빈 값을 채워 넣는 건 채우지 않는 것과 같다.
// EORI(UOI_MANUFACTURER)는 일부러 뺐다 - 문서 파싱 필드라 값이 있으면 '파싱됨'으로 잠긴다.
const ORG_AUTOFILL_LABEL = '회사 프로필에서 자동 입력';
export function orgAutofillValues(org) {
  if (!org) return {};
  const src = {
    OPERATOR_MANUFACTURER: org.orgName,
    MANUFACTURER_EMAIL_CONTACT: org.contactEmail,
    MANUFACTURER_WEBSITE: org.websiteUrl,
    BRAND_CONTACT_EMAIL: org.contactEmail
  };
  const out = {};
  Object.keys(src).forEach((k) => {
    const v = src[k] == null ? '' : String(src[k]).trim();
    if (v) out[k] = v;
  });
  return out;
}

const DOC_TYPE_LABEL = {
  MILL_SHEET: '제강 성적서', CBAM_REPORT: 'CBAM 탄소보고서', CARE_LABEL: '섬유 케어라벨', OEKOTEX_LABEL: 'OEKO-TEX 인증서',
  BATTERY_CARBON_REPORT: '배터리 탄소발자국 선언서', RECYCLING_REPORT: '재활용 처리 결과 보고서',
};

export function makerVals(ctx) {
  const { state, setState, props, data } = ctx;
  /**
   * 저장 요청에 실어 보낼 DPP 이름. 사용자가 이름 칸을 한 번도 안 건드렸으면 undefined를
   * 돌려줘서 필드 자체를 안 보낸다 - 서버가 기존 이름을 그대로 둔다(meApi.js 주석 참고).
   */
  const dppNameToSend = () => (state.dppNameInput == null ? undefined : state.dppNameInput.trim());
  const r = state.role;
  const p = ctx.profile();
  const kpi = data.makerKpi[r] || ['0', 0, 0, 0, 0, 0];
  // ctx.dashboardData(GET /me/dashboard)가 로드됐으면 실데이터, 아니면 기존 목데이터로 폴백.
  // org_id 없는 계정이나 DPP를 아직 하나도 등록 안 한 조직은 dash가 와도 전부 0/빈 배열 -
  // 그 경우도 실데이터 분기를 그대로 타서 "0건/빈 목록"으로 정직하게 보여준다(가짜 숫자로
  // 안 채움). 목데이터로 폴백하는 건 dashboardData 자체가 아직 도착 전(null)이거나
  // 요청이 실패했을 때뿐.
  // dpps 배열까지 확인한다(2026-08-23). dash가 truthy이기만 하면 dash.dpps.map을 부르던
  // 코드라, /me/dashboard가 예상과 다른 모양(빈 배열 등)을 돌려주면 그 자리에서 TypeError가
  // 나고 앱 전체가 흰 화면이 됐다 - makerVals는 역할과 무관하게 항상 실행되므로 관리자
  // 화면까지 같이 죽는다. 모양이 아니면 목데이터 폴백으로 내려간다.
  const dash = ctx.dashboardData && Array.isArray(ctx.dashboardData.dpps) ? ctx.dashboardData : null;
  /**
   * "이 DPP가 발급됐는가". 서버가 내려주는 발급일시/상태를 그대로 본다.
   *
   * 2026-08-23 강 리포트: 발급을 취소(status를 DRAFT로 되돌림)했는데도 목록이 계속
   * "발급 완료"로 떴다. 화면이 완성도 100%를 발급 여부의 대용으로 쓰고 있었기 때문이다.
   * 그 둘은 원래 다른 값이다 - 필수 항목을 다 채우면 완성도는 100이 되지만, 발급은
   * 그때부터 "누를 수 있는" 것이지 "이미 눌린" 것이 아니다. 그래서 발급 직전 상태가
   * 화면상 발급 완료와 구분되지 않았고, QR·삭제 가능 여부까지 같이 어긋났다.
   *
   * issuedAtDate가 진짜 근거다(FieldFormService.issue가 status와 함께 채운다).
   * status는 옛 데이터 보정용 - 발급 후 SUSPENDED/EOL로 넘어간 DPP도 발급된 것이다.
   */
  const isIssuedDpp = (d) => !!(d && (d.issuedAtDate || d.status === 'ACTIVE'));

  const completenessRows = dash
    ? dash.dpps.map(d => {
        const done = Math.round(d.completeness);
        // 사용자가 붙인 이름이 있으면 그걸 먼저 보여준다(2026-08-20 강 요청) - 같은
        // 모델로 여러 DPP를 만들면 모델명만으로는 목록에서 서로 구분이 안 됐다.
        return [d.dppId, d.internalSku || ('DPP-' + d.dppId), d.displayName || d.modelName || '(이름 없음)', done, 0, 100 - done, isIssuedDpp(d)];
      })
    : ctx.compData().map(([id, name, done, prog, none]) => [id, id, name, done, prog, none, done === 100]);
  // 2026-09-17 강 요청: "등록 DPP 수"는 전체 등록 건수가 아니라 "작성 완료된"(완성도
  // 100%) DPP 기준으로 세고, "등록 DPP 수"/"작성중인 DPP 수" 카드를 클릭하면 그 목록을
  // 팝업으로 보여준다. completenessRows(위)를 그대로 필터링해서 카드 숫자와 팝업 목록이
  // 항상 같은 데이터를 보게 한다 - 백엔드 집계치(dash.totalCount/incompleteCount)를
  // 따로 또 믿지 않는다.
  // 2026-09-17 강 2차 피드백: 입력률 막대의 하늘색(#2FB2E8 고정)이 "색이 붕 뜬다"는
  // 지적 - 대시보드 "+ 새 DPP 생성" 버튼과 같은 브랜드 블루(#0045A9)를 100% 기준으로,
  // 입력률이 낮을수록 옅어지는 그라데이션 색으로 바꾼다(고정 색 대신 값 기반 색상).
  const hexToRgb = (hex) => {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  };
  const rgbToHex = (r, g, b) => '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
  const lerpHex = (c1, c2, t) => {
    const [r1, g1, b1] = hexToRgb(c1);
    const [r2, g2, b2] = hexToRgb(c2);
    return rgbToHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
  };
  // 0%는 옅은 하늘색, 100%는 "+ 새 DPP 생성" 버튼과 완전히 같은 브랜드 블루(#0045A9).
  const pctFillColor = (pct) => lerpHex('#CFE3FA', '#0045A9', Math.max(0, Math.min(100, pct)) / 100);

  const completedDppRows = completenessRows.filter(row => row[3] === 100);
  const incompleteDppRows = completenessRows.filter(row => row[3] !== 100);
  const toDppListRow = ([openId, displayId, name, done, , , issued]) => ({
    key: openId,
    serial: displayId,
    productName: name || '(이름 없음)',
    statusLabel: issued ? '발급 완료' : done === 100 ? '발급 대기' : done === 0 ? '입력 대기' : (done + '% 작성 중'),
    statusChip: { ...(issued ? ctx.badgeText3d('#0E7A3D') : done === 0 ? ctx.badgeText3d('#6B7A93') : ctx.badgeText3d('#96660A')), fontSize: '11.5px' },
    // 팝업에서 행을 클릭하면 팝업을 닫고 그 DPP의 상세(생애주기·미충족 필드) 모달을 연다.
    open: () => setState({ dppListOpen: null, dppOpen: true, dppId: openId })
  });

  const inputMeta = data.makerInputMeta[r] || {};
  const fieldSets = data.makerFieldSets[r] || [];
  // 배치 대량 발급은 철강 전용(강 지시, 2026-08-16: "이거는 철강 말고는 필요없는 것 같으니까
  // 섬유에는 적용시키지 말자") - 다른 도메인에서 issueMode가 어쩌다 'batch'로 남아있어도
  // (예: 역할 전환 전 상태 잔존) isBatch는 강제로 false, 토글 버튼 자체도 안 보여준다.
  const batchIssueEnabled = r === 'steel';
  const isBatch = batchIssueEnabled && state.issueMode === 'batch';
  // "기본 정보 입력" 폼 실데이터 - requirement_field 시딩이 STEEL/TEXTILE/BATTERY 도메인에
  // 있는 역할만 GET /me/field-form로 대체한다. 그 외 역할은 여전히 기존 목데이터 폼("SPHC"
  // 같은 예시값 포함) - 실 규정 필드가 시딩되기 전까지는 정직하게 흉내낼 수도, 비워둘
  // 수도 없어 손대지 않았다.
  const hasRealFieldForm = r === 'steel' || r === 'textile' || r === 'battery';
  const ff = hasRealFieldForm ? ctx.fieldFormData : null;
  const ffInputs = ctx.fieldFormInputs || {};
  // Enum 필드 드롭다운 선택지(code_master) - 폼 응답에 같이 온다. 구버전 BE면 빈 배열이라
  // inputKindOf가 select 대신 text로 떨어진다.
  const codeOptions = ff && ff.codeOptions ? ff.codeOptions : [];
  const ffFilledCount = ff ? ff.fields.filter(f => !!ffInputs[f.fieldCode]).length : 0;
  // 2026-08-23 강 지적: "99개를 안 채워도 발급이 된다". 화면 숫자(n/m 입력됨)는 전체 항목
  // 기준이었는데 발급 게이트는 필수(T0) 항목만 본다 - 같은 화면에서 두 기준이 섞여 있었다.
  // 숫자를 발급 조건과 같은 기준(필수)으로 통일하고, 선택 항목은 따로 세어 별도로 보여준다.
  // 2026-09-19: 발급 게이트는 "지금 채울 수 있는 항목"만 본다. BMS 동적데이터(사용 단계)나
  // 재활용 처리 결과(수명종료 단계)처럼 발급 이후 단계에 귀속된 항목은 필수여도 발급을
  // 막지 않는다 - 서버가 f.issueGate=false로 내려준다(V36 requirement_field.lifecycle_stage).
  // 구버전 BE는 이 값을 안 주므로 undefined면 기존처럼 전부 게이트 대상으로 본다.
  const inIssueGate = (f) => f.issueGate !== false;
  const ffRequired = ff ? ff.fields.filter(f => f.required && inIssueGate(f)) : [];
  const ffOptional = ff ? ff.fields.filter(f => !f.required && inIssueGate(f)) : [];
  // 발급 이후 단계 항목 - 화면에는 그대로 두되 "추후 제출"로 표시하고 발급 조건에서 뺀다.
  const ffLater = ff ? ff.fields.filter(f => !inIssueGate(f)) : [];
  // 문서 파싱값과 어긋난 입력값(dpp_field_cross_check). 남아 있으면 발급이 막힌다.
  const ffMismatches = ff && ff.crossChecks ? ff.crossChecks.filter(c => c.status === 'MISMATCH') : [];
  const ffRequiredFilled = ffRequired.filter(f => !!ffInputs[f.fieldCode]).length;
  const ffOptionalFilled = ffOptional.filter(f => !!ffInputs[f.fieldCode]).length;
  // 이번 세션에 문서 업로드로 "방금 채워진" 필드 - { [fieldCode]: 문서라벨 }. 파싱된
  // 데이터인지 수기 입력해야 하는 데이터인지 구별해서 보여주기 위함(2026-08-17 강 요청).
  // 이미 값이 있었지만 이번 세션에 파싱으로 채워진 게 아닌 경우(예: 이전 세션에 수기로
  // 입력해둔 값)까지 "파싱됨"이라고 단정할 근거가 없어서, 그 경우는 배지를 아예 안 보여준다 -
  // 근거 없는 라벨을 붙이는 것보다 정직하게 비워두는 쪽을 택했다.
  const parsedSources = state.parsedFieldSources || {};
  // "필수 문서" 업로드 실데이터(GET /me/documents) - ff와 마찬가지로 실데이터가 있는 역할,
  // 그리고 dppId가 이미 있을 때만(초안조차 없으면 문서를 붙일 곳이 없음).
  const df = hasRealFieldForm ? ctx.documentFormData : null;
  // 철강 - Mill Sheet/CBAM 업로드 결과 실데이터. 예전엔 이 카드 전체가 목데이터였다(버튼
  // 눌러도 실제 파일선택창 자체가 안 뜨고 가짜 토스트만 나옴, 2026-08-14 사용자 리포트로 발견).
  const msr = (r === 'steel') ? ctx.millSheetResult : null;
  const cbr = (r === 'steel') ? ctx.cbamResult : null;
  // 섬유 - 섬유 케어라벨/OEKO-TEX 업로드 결과 실데이터. Mill Sheet/CBAM과 같은 패턴
  // (2026-08-16).
  const clr = (r === 'textile') ? ctx.careLabelResult : null;
  const oer = (r === 'textile') ? ctx.oekotexResult : null;
  // 배터리 - 배터리 탄소발자국 선언/재활용 처리 결과 보고서 업로드 결과 실데이터. 같은 패턴
  // (2026-08-16).
  const bcr = (r === 'battery') ? ctx.batteryCarbonResult : null;
  const rcr = (r === 'battery') ? ctx.recyclingResult : null;
  // lifecycle_stage_def(V3__seed_master.sql)의 단계명. 도메인마다 2~4단계 이름이 조금씩
  // 다르지만(철강 '제강' vs 배터리 '셀 제조') 화면에는 "언제 채우는 항목인지"만 알려주면
  // 되는 자리라 공통 표현으로 둔다.
  const LIFECYCLE_STAGE_LABEL = {
    1: '원자재 조달', 2: '소재 생산', 3: '셀 제조', 4: '제조·조립', 5: '포장',
    6: '운송·물류', 7: '보관', 8: '유통·판매', 9: '사용', 10: '유지보수·재사용',
    11: '회수·수명종료', 12: '재활용·폐기'
  };
  const DOC_STATUS_LABEL = { NOT_UPLOADED: '미제출', PENDING: '검토 중', APPROVED: '제출 완료', REJECTED: '반려됨', EXPIRED: '만료됨' };
  const DOC_STATUS_COLOR = { NOT_UPLOADED: '#9AA8BE', PENDING: '#E3A008', APPROVED: '#12A150', REJECTED: '#E03B3B', EXPIRED: '#C22B2B' };
  // DPP 발급 조건(강 요청, 2026-08-17): 제조사가 반드시 채워야 하는 필수 데이터를 전부
  // 입력해야만 발급 가능, 그 전엔 임시저장만 가능. ff(실 폼)가 없는 레거시 경로(아직 시딩
  // 안 된 도메인)는 이 조건이 적용될 데이터 자체가 없으므로 기존 동작(항상 발급 가능)을
  // 그대로 둔다 - 정확한 검증 근거 없이 막으면 오히려 더 헷갈린다.
  // 제품조회 작성중/발급 완료 필터(2026-08-17 강 요청) - 완성도 100%(=isIssued)를
  // "발급 완료", 그 미만을 "작성중" 기준으로 나눈다. 라벨을 "작성완료"에서 바꾼 이유:
  // 같은 상태를 화면마다 다른 이름으로 부르고 있었다(2026-08-20 강 요청 - "발급 완료"로 통일). 기존에도 버튼 자리(상태 전체/기간
  // 90일)는 있었지만 onClick이 없어 눌러도 아무 동작이 없었다.
  const pStatusFilter = state.productStatusFilter || 'all';
  const requiredFieldsOk = ff ? ffRequired.every(f => !!ffInputs[f.fieldCode]) : true;
  // 발급 이후 단계에 제출하는 문서(재활용 처리 결과 보고서 등)는 발급을 막지 않는다 -
  // 서버가 d.issueGate=false로 내려준다(V36). 구버전 BE면 undefined라 기존 동작 유지.
  const inDocIssueGate = (d) => d.issueGate !== false;
  const requiredDocsOk = df
    ? df.documents.filter(d => d.required && inDocIssueGate(d)).every(d => d.status === 'APPROVED')
    : true;
  const crossCheckOk = ffMismatches.length === 0;
  const issueReady = ff ? (requiredFieldsOk && requiredDocsOk && crossCheckOk) : true;
  const issueDisabledHint = issueReady ? '' : !crossCheckOk
    // 교차검증 불일치가 먼저다 - 필수 칸이 다 차 있어도 그 값이 문서와 어긋나면
    // 발급된 여권이 검증을 통과할 수 없다.
    ? `문서에서 읽은 값과 다른 입력값이 ${ffMismatches.length}건 있습니다. 먼저 확인해 주세요.`
    : !requiredFieldsOk
    // 협력사가 수락해서 잠긴 칸이 비어 있는 것은 제조사가 손쓸 수 없는 일이다 - "입력하세요"가
    // 아니라 누구를 기다리는 중인지 말해준다(2026-08-23).
    ? (ffRequired.filter(f => !ffInputs[f.fieldCode]).every(f => f.partnerLockLabel)
        ? `협력사가 담당 항목을 제출하면 발급할 수 있습니다. (${ffRequiredFilled}/${ffRequired.length})`
        : `필수 필드를 모두 입력해야 발급할 수 있습니다. (${ffRequiredFilled}/${ffRequired.length})`)
    : '필수 문서를 모두 제출·검증 완료해야 발급할 수 있습니다.';
  // ── 배터리 분류 선택(2026-09-19 강 요청) ────────────────────────────────
  // 분류와 정격용량이 나머지 항목을 전부 결정하므로(여권 대상이면 140개, 비대상이면
  // 축약 세트) 폼 맨 위에서 먼저 고르게 한다. 섹션 목록 안쪽에 묻혀 있으면 순서가
  // 거꾸로다 - 무엇을 입력해야 하는지 모르는 채로 스크롤부터 하게 된다.
  // 같은 칸을 두 번 묻지 않도록 아래 formFields 에서는 이 두 개를 뺀다.
  const CLASSIFY_CODES = ['BATTERY_CATEGORY', 'RATED_CAPACITY_KWH'];
  const isBatteryForm = !!ff && ff.domain === 'BATTERY';
  const classifyField = (code) => (isBatteryForm ? ff.fields.find(f => f.fieldCode === code) : null);
  const catField = classifyField('BATTERY_CATEGORY');
  const capField = classifyField('RATED_CAPACITY_KWH');
  const catValue = catField ? (ffInputs[catField.fieldCode] || '') : '';
  const capValue = capField ? (ffInputs[capField.fieldCode] || '') : '';
  const setClassifyValue = (code, v) => ctx.setFieldFormInputs(prev => ({ ...prev, [code]: v }));
  // 서버가 이미 저장해 둔 분류값. 아래 항목이 어떤 것들로 채워질지는 서버가 "저장된" 값으로만
  // 판정한다(fn_battery_passport_required, V36) - 화면에서 값을 바꾸기만 하고 저장하지 않으면
  // 아래 목록은 절대 바뀌지 않는다. 예전엔 이걸 알려주는 표시도, 반영시키는 버튼도 없어서
  // 값을 바꿔도 아무 일도 안 일어나는 것처럼 보였다(2026-09-19 강 리포트). 입력값과 저장값이
  // 다르면 "아직 반영 안 됨"이고, 「확인」이 저장 + 폼 재조회로 아래 항목을 바꾼다.
  const savedCat = catField ? (catField.value || '') : '';
  const savedCap = capField ? (capField.value || '') : '';
  const classifyDirty = isBatteryForm && (catValue !== savedCat || capValue !== savedCap);
  const classifyReady = !!catValue && !!capValue;
  const classifyApplied = isBatteryForm && classifyReady && !classifyDirty;
  const applyClassification = async () => {
    if (!ff || state.classifyBusy) return;
    if (!catValue) { ctx.say('배터리 분류를 먼저 선택해 주세요.'); return; }
    const capNum = Number(String(capValue).replace(/,/g, ''));
    if (!capValue || !isFinite(capNum) || capNum <= 0) { ctx.say('정격용량은 0보다 큰 숫자(kWh)로 입력해 주세요.'); return; }
    setState({ classifyBusy: true });
    try {
      const isNewDpp = !ff.dppId;
      const result = await ctx.saveFieldFormDraft(ff.dppId, ffInputs, dppNameToSend());
      ctx.setFieldFormData(result);
      ctx.setFieldFormInputs(Object.fromEntries((result.fields || []).map(f => [f.fieldCode, f.value || ''])));
      setState(s => ({ fieldFormDppId: result.dppId, classifyBusy: false, draftSavedAt: { ...(s.draftSavedAt || {}), [r]: nowStamp() } }));
      if (isNewDpp) ctx.refreshDashboard();
      const shown = (result.fields || []).filter(f => CLASSIFY_CODES.indexOf(f.fieldCode) < 0).length;
      ctx.say('분류를 적용했습니다 · ' + (result.complianceTrackLabel ? result.complianceTrackLabel + ' · ' : '') + '입력 항목 ' + shown + '개');
    } catch (e) {
      setState({ classifyBusy: false });
      ctx.say((e && e.message) || '분류를 적용하지 못했습니다.');
    }
  };

  /**
   * 교차검증 불일치 1건을 정리한다(2026-09-19). KEEP_ENTERED=입력값이 맞다,
   * USE_PARSED=문서에서 읽은 값으로 바꾼다. 서버가 값까지 바꿔주므로 폼을 다시 읽어야
   * 화면과 맞는다 - refreshFieldForm이 fieldFormData/fieldFormInputs를 둘 다 갱신한다.
   */
  const resolveCrossCheckRow = (checkId, resolution) => {
    if (!ff || !ff.dppId) return;
    ctx.resolveCrossCheck(ff.dppId, checkId, resolution)
      .then(() => {
        ctx.refreshFieldForm(ff.dppId);
        ctx.say(resolution === 'USE_PARSED' ? '문서에서 읽은 값으로 바꿨습니다.' : '입력값을 그대로 유지합니다.');
      })
      .catch((err) => ctx.say((err && err.message) || '교차검증 항목을 정리하지 못했습니다.'));
  };

  // 입력 폼 필드 목록. 예전엔 return 객체 안에 인라인으로 있었는데, 섹션 묶음
  // (fieldSections)이 같은 목록을 다시 봐야 해서 밖으로 뺐다.
  const formFields = ff
    // 파싱되는(자동 채움) 필드를 위쪽에, 수기 입력 필드를 아래쪽에 배치(2026-08-18 강
    // 요청) - AUTO_FILL_FIELD_CODES 화이트리스트 기준 안정 정렬(같은 그룹 안에서는
    // 서버가 내려준 원래 순서 유지), documentSlots의 required 정렬과 동일한 패턴.
    ? [...ff.fields]
        // 분류/정격용량은 위 전용 칸에서 받는다 - 여기서 또 그리면 같은 값을 두 군데서
        // 고칠 수 있게 되고, 둘 중 어느 쪽이 진짜인지 화면만 봐서는 알 수 없다.
        .filter(f => !(isBatteryForm && CLASSIFY_CODES.indexOf(f.fieldCode) >= 0))
        .sort((a, b) => (isParserField(b) ? 1 : 0) - (isParserField(a) ? 1 : 0)).map(f => {
        const value = ffInputs[f.fieldCode] || '';
        const parsedFrom = parsedSources[f.fieldCode];
        const isAutoFillable = isParserField(f);
        // 파싱됨/수기 입력 구분(2026-08-17 강 요청, 재수정): 어떤 필드가 실제로 문서에서
        // 자동 채워지는지는 백엔드 로직(AUTO_FILL_FIELD_CODES 주석 참고)에 정확히 정의돼
        // 있으므로, 그 화이트리스트를 기준으로 판정한다 - 이번 세션에 업로드로 방금 채운
        // 게 감지되면 어느 문서에서 왔는지까지 표시하고, 새로고침 등으로 감지를 놓쳤어도
        // 화이트리스트 필드에 값이 있으면 "파싱됨"으로 인정한다. 화이트리스트 필드인데
        // 아직 비어있으면 "문서에 없음"이 아니라 "문서 업로드 시 자동 인식"으로 안내한다
        // (문서를 아직 안 올렸을 뿐, 언젠가 채워질 필드라는 뜻). 화이트리스트 밖의
        // 필드(Heat No/강종 등 26개)는 애초에 어떤 문서에서도 자동 추출되지 않는
        // 순수 수기입력 항목이라 "직접 입력 항목"으로 중립적으로 표시한다.
        // 2026-08-18 강 요청: "~페이지에서 파싱" 문구가 반복되면 너무 길어지니 "파싱(문서명)"
        // 형태로 축약. sourceChip(항목 이름 옆 배지)은 AppView.jsx에서 더 이상 렌더링하지
        // 않고(중복 표시 제거 요청) 이 sourceLabel 하나만 항목 아래에 표시한다.
        let sourceLabel; let sourceChip;
        if (parsedFrom) {
          sourceLabel = '파싱(' + parsedFrom + ')';
          sourceChip = ctx.chip('rgba(18,161,80,.12)', '#0E7A3D');
        } else if (isAutoFillable && value) {
          sourceLabel = '파싱(' + (AUTO_FILL_DOC_NAME[f.fieldCode] || '업로드 문서') + ')';
          sourceChip = ctx.chip('rgba(18,161,80,.12)', '#0E7A3D');
        } else if (isAutoFillable && !value) {
          sourceLabel = (AUTO_FILL_DOC_NAME[f.fieldCode] || '문서') + ' 업로드 시 자동 인식';
          sourceChip = ctx.chip('rgba(0,69,169,.10)', '#0045A9');
        } else if (!value) {
          sourceLabel = '직접 입력 항목';
          sourceChip = ctx.chip('rgba(132,148,172,.16)', '#6B7A93');
        } else {
          sourceLabel = '직접 입력됨';
          sourceChip = ctx.chip('rgba(132,148,172,.16)', '#6B7A93');
        }
        // 회사 프로필에서 미리 채운 값이면 출처를 그렇게 표시한다(값이 그대로일 때만 - 사용자가
        // 고쳐 썼다면 더 이상 프로필 값이 아니다).
        const orgAuto = orgAutofillValues(ctx.orgData)[f.fieldCode];
        if (orgAuto && value && value === orgAuto && !parsedFrom) {
          sourceLabel = ORG_AUTOFILL_LABEL;
          sourceChip = ctx.chip('rgba(0,69,169,.10)', '#0045A9');
        }
        // 2026-08-18 강 요청: "파싱된 이후로는 안지워지게 막기 - 수정하려면 수정 버튼
        // 누르고 수정". 파싱된 상태(이번 세션에 감지됐거나, 화이트리스트 필드에 값이
        // 이미 있는 경우)인 필드는 기본적으로 읽기 전용으로 잠그고, "수정" 버튼을 눌러
        // 이 세션에서 한 번 잠금 해제해야 편집 가능해진다. 수기 입력 필드는 애초에
        // 잠글 대상이 아니라 항상 편집 가능.
        const isParsed = !!parsedFrom || (isAutoFillable && !!value);
        const unlocked = !!(state.unlockedFields && state.unlockedFields[f.fieldCode]);
        // 협력사 잠금(2026-08-23): 그 역할의 협력사가 참여를 '수락'한 항목은 제조사가
        // 쓸 수 없다. 파싱 잠금과 달리 화면에서 풀 수 없다 - 서버도 이 필드의 저장을
        // 무시하므로(FieldFormService.upsertValues) '수정' 버튼을 주면 거짓말이 된다.
        const partnerLockLabel = f.partnerLockLabel || '';
        const locked = (isParsed && !unlocked) || !!partnerLockLabel;
        return {
          key: f.fieldCode, label: f.labelKo + (f.unit ? ' (' + f.unit + ')' : ''),
          labelEn: f.labelEn || '',
          req: f.required ? '필수' : '선택',
          // 발급 이후 단계에 채우는 항목(BMS 동적데이터·재활용 처리 결과 등)은 필수여도
          // 발급을 막지 않는다. 비어 있다고 빨간 테두리로 재촉하면 거짓말이 된다
          // (2026-09-19 강 요청 5번 - "발급 단계에서 받을 수 없는 문서는 이후 제출로").
          laterStage: !inIssueGate(f),
          laterLabel: !inIssueGate(f) ? (LIFECYCLE_STAGE_LABEL[f.lifecycleStage] || '발급 이후') + ' 단계 제출' : '',
          laterStyle: !inIssueGate(f) ? ctx.chip('rgba(0,69,169,.08)', '#0045A9') : null,
          // help_text가 길면 placeholder로 쓰지 않는다(2026-08-23). HS 코드처럼 설명이
          // 한 문장 이상인 항목은 입력칸 안에 들어가면 잘려서 오히려 안 읽힌다 -
          // 짧은 것만 placeholder로 쓰고, 전체 문장은 아래 hint로 보여준다.
          // 2026-08-23(2차) 강 요청: "HS코드 밑에 불필요한 설명 텍스트 삭제". 짧은 안내는
          // placeholder로만 쓰고 입력칸 아래에는 다시 그리지 않는다 - 같은 문장을 두 번
          // 보여주면서 칸 높이만 두 배가 되고 있었다. 긴 문장은 placeholder에 넣으면
          // 잘리니 반대로 아래 hint로만 보여준다. 둘 중 한 곳에만 나온다.
          ph: (f.helpText && f.helpText.length <= 40) ? f.helpText : '',
          value,
          hint: (f.helpText && f.helpText.length > 40) ? f.helpText : '', sourceLabel, sourceChip,
          autoFillable: isAutoFillable,
          section: f.section || 'SYSTEM',
          // 입력 위젯 종류. 지금까지 361개 필드를 전부 <input type=text>로 받았다 -
          // 날짜에 "2026/08/19"와 "26.8.19"가 섞여 들어오고, Enum에는 "코일"과 "Coil"이
          // 같이 들어왔다. data_type/code_group으로 위젯을 갈라준다.
          inputKind: inputKindOf(f),
          options: optionsFor(f, codeOptions),
          // T0(법정필수)인지 T1(조건부필수)인지. 제조사 입장에서 "EU 법이 요구하는 칸"과
          // "우리가 그냥 받는 칸"은 채우는 우선순위가 완전히 다른데 지금까지 화면에서
          // 구분이 안 됐다.
          tier: f.tier || '',
          tierLabel: TIER_LABEL[f.tier] || '',
          // 배경 없는 입체 글자(2026-08-20 강 요청) - 색만으로 등급을 구분한다.
          tierStyle: ctx.badgeText3d(f.tier === 'T0' ? '#C22B2B' : f.tier === 'T1' ? '#0045A9' : '#6B7A93'),
          // 근거 조항 + T1 발동 조건. 항상 펼쳐두면 폼이 법령 인용으로 뒤덮이니
          // 툴팁(title 속성)으로만 붙인다.
          basisTip: [f.legalBasis, f.t1Condition ? '발동 조건: ' + f.t1Condition : '']
            .filter(Boolean).join(' / '),
          restricted: f.disclosureScope && f.disclosureScope !== 'PUBLIC',
          disclosureLabel: DISCLOSURE_LABEL[f.disclosureScope] || '',
          // 영업비밀(ZKP 대체) 항목은 실측값을 아예 다루지 않는다(2026-08-20 강 지적:
          // "규정을 검수하는 데이터면 O, X만 보여줘야 하는 것 아닌지"). 서버도 이 필드에는
          // 값 대신 판정 토큰("충족"/"미충족")만 저장한다 - SpecFieldAutoFillService 참고.
          // 그래서 화면도 입력칸 대신 O/X 배지로 그린다.
          ...zkpVerdictOf(f),
          // 2026-08-18 강 요청: 미입력=빨간 테두리, 입력됨=초록 테두리.
          // 협력사가 채울 칸은 비어 있어도 제조사 잘못이 아니다 - 빨간 테두리로 재촉하지 않는다.
          inputBorderColor: value ? '#12A150'
            : (partnerLockLabel || !inIssueGate(f)) ? 'rgba(16,32,64,.14)' : '#E03B3B',
          locked,
          partnerLockLabel,
          // 협력사 잠금은 못 푼다 - '수정' 버튼 자체를 주지 않는다(AppView는 unlock이
          // 없으면 버튼을 그리지 않는다).
          unlock: partnerLockLabel ? null
            : () => setState(s => ({ unlockedFields: { ...(s.unlockedFields || {}), [f.fieldCode]: true } })),
          onChange: e => ctx.setFieldFormInputs(prev => ({ ...prev, [f.fieldCode]: e.target.value }))
        };
      })
    : fieldSets.map(([label, req, ph, value, hint]) => ({
        key: label, label, req, ph, value, hint, sourceLabel: '', sourceChip: null, onChange: undefined
      }));

  return {
    kpiTotal: dash ? String(completedDppRows.length) : kpi[0],
    // "이번 달 신규" - 2026-08-19 수정: 예전엔 실데이터 쪽에 대응하는 집계가 없어서
    // 항상 0을 보여줬다("등록 DPP 수" 옆 +N 배지가 실제 값을 반영 못하던 버그) - 이제
    // DashboardResponse.newThisMonthCount(BE, dpp.created_at 기준 집계)를 그대로 쓴다.
    // "서류 대기"는 여전히 대응하는 집계가 없어서 0으로 남겨둔다.
    kpiNew: dash ? dash.newThisMonthCount : kpi[1],
    // "등록 DPP 수"/"작성중인 DPP 수" 옆 배지(2026-08-19, 강 요청) - 예전엔 둥근 배경 pill로
    // 표시돼서 "너무 AI스럽다"는 피드백을 받았다. 배경을 없애고 텍스트에 살짝 입체감만
    // 주는 badgeText3d로 교체(색은 기존과 동일하게 유지: 초록/빨강).
    kpiNewBadgeStyle: ctx.badgeText3d('#0E7A3D'),
    kpiActionBadgeStyle: ctx.badgeText3d('#C22B2B'),
    kpiIncomplete: dash ? incompleteDppRows.length : kpi[2],
    // (dash.missingFields || []) - dpps와 같은 이유의 방어(2026-08-23). 이 한 줄 때문에
    // 앱 전체가 흰 화면이 되면 안 된다.
    kpiMissing: dash ? (dash.missingFields || []).length : kpi[3],
    kpiWaiting: dash ? 0 : kpi[4],
    // "등록 DPP 수"/"작성중인 DPP 수" 카드 클릭 -> 목록 팝업(2026-09-17 강 요청).
    openDppTotalList: () => setState({ dppListOpen: 'total' }),
    openDppIncompleteList: () => setState({ dppListOpen: 'incomplete' }),
    closeDppList: () => setState({ dppListOpen: null }),
    dppListOpen: !!state.dppListOpen,
    dppListTitle: state.dppListOpen === 'incomplete' ? '작성중인 DPP' : '등록 DPP (작성 완료)',
    dppListRows: (state.dppListOpen === 'incomplete' ? incompleteDppRows : completedDppRows).map(toDppListRow),
    dppListEmpty: (state.dppListOpen === 'incomplete' ? incompleteDppRows : completedDppRows).length === 0,
    // 2026-09-17 강 3차 피드백: 'DPP 현황' 대시보드 검색창이 장식용이었다 - 실제로
    // 제품명/DPP 식별자로 입력하면 일치하는 DPP를 네이버 검색창처럼 드롭다운으로
    // 보여주고, 클릭하면 제품 조회 탭으로 이동해 그 DPP 상세를 바로 연다.
    // completenessRows(위)를 그대로 검색 대상으로 쓴다 - 카드/팝업과 항상 같은 데이터.
    dashSearchQuery: state.dashSearchQuery || '',
    setDashSearchQuery: (v) => setState({ dashSearchQuery: v, dashSearchOpen: true }),
    closeDashSearch: () => setState({ dashSearchOpen: false }),
    dashSearchResults: (() => {
      const q = (state.dashSearchQuery || '').trim().toLowerCase();
      if (!q) return [];
      const starts = [];
      const contains = [];
      completenessRows.forEach((row) => {
        const [openId, displayId, name, done, , , issued] = row;
        const dn = String(displayId || '').toLowerCase();
        const nm = String(name || '').toLowerCase();
        if (dn.startsWith(q) || nm.startsWith(q)) starts.push(row);
        else if (dn.includes(q) || nm.includes(q)) contains.push(row);
      });
      return [...starts, ...contains].slice(0, 8).map(([openId, displayId, name, done, , , issued]) => ({
        key: openId,
        serial: displayId,
        productName: name || '(이름 없음)',
        statusLabel: issued ? '발급 완료' : done === 100 ? '발급 대기' : done === 0 ? '입력 대기' : (done + '% 작성 중'),
        // 검색 결과를 누르면 드롭다운을 닫고, 제품 조회 탭으로 이동한 뒤 그 DPP의
        // 상세(생애주기·미충족 필드) 모달을 바로 연다.
        select: () => setState({ dashSearchQuery: '', dashSearchOpen: false, tab: 'products', dppOpen: true, dppId: openId })
      }));
    })(),
    dashSearchOpen: !!state.dashSearchOpen && (state.dashSearchQuery || '').trim().length > 0,
    kpiAvg: dash ? Math.round(dash.averageCompleteness) : kpi[5],
    kpiAvgBar: ctx.bar(dash ? Math.round(dash.averageCompleteness) : kpi[5], '#0045A9'),
    // zkp_proof.status='REQUESTED'를 만드는 코드 경로가 아직 없어서 zkpPendingCount는
    // 실데이터에서도 항상 0 - 마찬가지로 가짜 숫자를 넣지 않는다. zkpRejectedCount는 진짜
    // 반려 건수(문서 업로드 -> ZKP 검증 실패 시 REJECTED로 저장된 실제 행).
    zkpPendingCount: dash ? dash.zkpPendingCount : 2,
    zkpRejectedCount: dash ? dash.zkpRejectedCount : 1,
    // "+ 새 DPP 발급" 버튼 - 진행 중이던 draft dppId를 안 지우면 이 버튼을 눌러도 이전
    // draft가 그대로 다시 열려서 두 번째 DPP를 새로 시작할 방법이 없었다(2026-08-15, 강
    // 리포트). fieldFormDppId를 null로 같이 넘기면 위 useAppLogic의 field-form fetch
    // effect가 dppId=undefined로 다시 불러서 진짜 빈 초안을 받아온다(FieldFormService.
    // getForm의 dppId==null 분기). 특정 기존 DPP를 "이어서 작성"하는 경로(완성도 목록의
    // open 핸들러, 아래 424번째 줄 근처)는 fieldFormDppId를 그 DPP id로 명시적으로 넘기니
    // 이 초기화와 충돌하지 않는다. millSheetResult/cbamResult/fieldFormInputs/
    // documentFormData도 같이 비워야 이전 DPP의 업로드 결과·입력값이 새 화면에 잠깐이라도
    // 남아 보이지 않는다.
    goInput: () => {
      ctx.setMillSheetResult(null);
      ctx.setCbamResult(null);
      ctx.setCareLabelResult(null);
      ctx.setOekotexResult(null);
      ctx.setBatteryCarbonResult(null);
      ctx.setRecyclingResult(null);
      ctx.setFieldFormInputs({});
      ctx.setDocumentFormData(null);
      setState({ tab: 'input', fieldFormDppId: null, dppNameInput: null, parsedFieldSources: {}, unlockedFields: {}, qrModal: null });
    },
    // 최근 작업 조회 DPP(2026-08-17 강 요청) - 예전 "대기작업 큐"(마감일 D-1/D-2 같은
    // 가짜 워크플로 문구)를 걷어내고, 실제 있는 DPP 중 최근 것 몇 건만 핵심 데이터
    // 3항목(일련번호/상품명/상태)으로 간단히 보여주는 목록으로 교체. 클릭하면 바로 그
    // DPP의 입력 화면으로 이동한다(대기작업 큐의 "처리" 버튼과 동일한 이동 동작 유지).
    recentDpps: completenessRows.slice(0, 5).map(([openId, displayId, name, done, , , issued]) => ({
      key: openId,
      serial: displayId,
      productName: name || '(이름 없음)',
      // 완성도 100%인데 아직 발급을 안 눌렀으면 "발급 대기"다 - 예전엔 이것도 "발급 완료"로 떴다.
      statusLabel: issued ? '발급 완료' : done === 100 ? '발급 대기' : done === 0 ? '입력 대기' : (done + '% 작성 중'),
      // 2026-08-19 강 요청: "제품명 오른쪽에 있는 ~% 작성 중의 UI가 너무 AI스럽다" - 배경
      // pill을 없애고 badgeText3d(입체감 있는 텍스트만)로 교체, 색은 기존 그대로.
      statusChip: {
        ...(issued ? ctx.badgeText3d('#0E7A3D') : done === 0 ? ctx.badgeText3d('#6B7A93') : ctx.badgeText3d('#96660A')),
        fontSize: '11.5px'
      },
      open: () => setState({ tab: 'input', fieldFormDppId: openId, dppNameInput: null, parsedFieldSources: {}, unlockedFields: {}, qrModal: null })
    })),
    recentDppsEmpty: completenessRows.length === 0,
    // 2026-08-17 강 정정: "완성도" 그래프/목록 카드는 원래대로 유지하고(제목만 "입력률"로),
    // ESPR 업데이트는 대신 KPI 카드 줄의 "평균 완성도" 자리에 넣는다(지난번엔 잘못 이해해서
    // 완성도 그래프 카드 쪽을 통째로 ESPR로 바꿔버렸었음).
    // 2026-09-17 강 요청: 완성도 100%인 DPP는 목록에 계속 나열할 필요가 없으니
    // 토글(기본 접힘)로 감추고, 나머지(미완료) DPP만 항상 쭉 보여준다. 강이 보낸 참고
    // 이미지(원통형 3D 퍼센트 그래프, 좌측에서 두 번째 - 하늘색 계열) 느낌으로 막대도
    // 다시 입체 스타일(segStyle3D/groove3d, 2026-08-19에 한 번 만들었다가 08-21에
    // 평면으로 되돌렸던 것)로 바꾸고, 색만 그 참고 이미지의 하늘색 톤으로 맞춘다.
    completeness: incompleteDppRows.map(([openId, displayId, name, done, prog, none]) => ({
      key: openId, id: displayId, name, pct: done,
      pctStyle: ctx.pctStyle(done),
      segs: [{ key: 'a', style: ctx.segStyle(done, pctFillColor(done)) }, { key: 'b', style: ctx.segStyle(prog, '#BEE8F8') }, { key: 'c', style: ctx.segStyle(none, '#EAF6FC') }],
      trackStyle: { background: '#EAF6FC' },
      open: () => setState({ dppOpen: true, dppId: openId })
    })),
    completenessEmpty: incompleteDppRows.length === 0 && completedDppRows.length === 0,
    // 완성도 100% DPP 목록 - 클릭하면 펼쳐지는 토글. 기본은 접힘.
    completenessDoneRows: completedDppRows.map(([openId, displayId, name, done, prog, none]) => ({
      key: openId, id: displayId, name, pct: done,
      pctStyle: ctx.pctStyle(done),
      segs: [{ key: 'a', style: ctx.segStyle(done, pctFillColor(done)) }, { key: 'b', style: ctx.segStyle(prog, '#BEE8F8') }, { key: 'c', style: ctx.segStyle(none, '#EAF6FC') }],
      trackStyle: { background: '#EAF6FC' },
      open: () => setState({ dppOpen: true, dppId: openId })
    })),
    completenessDoneCount: completedDppRows.length,
    completenessDoneOpen: !!state.completenessDoneOpen,
    toggleCompletenessDone: () => setState(s => ({ completenessDoneOpen: !s.completenessDoneOpen })),
    // KPI 카드 줄의 "평균 완성도" 자리에 들어갈 정적 규정 업데이트 안내 - 카드 폭이 좁아서
    // 문구를 짧게 줄임. 실제 EU 관보/집행위 발표 연동은 없는 정적 카드(다른 KPI 카드들처럼
    // 지금은 표시만, 나중에 실제 피드 API가 생기면 교체).
    esprUpdate: {
      title: 'EU ESPR 규정 업데이트',
      summary: '제품군별 DPP 의무화 일정이 위임법령으로 순차 확정 중',
      updatedAt: nowStamp().slice(0, 10) + ' 확인',
      openDetail: () => ctx.say('EU ESPR 규정 상세 안내 페이지는 준비 중입니다.')
    },
    inputTitle: inputMeta.title,
    formTitle: inputMeta.form,
    fieldCount: ff ? ff.fields.filter(f => f.required).length : inputMeta.count,
    isBatch,
    batchIssueEnabled,
    singleBtn: ctx.pill(!isBatch), batchBtn: ctx.pill(isBatch),
    setSingle: () => setState({ issueMode: 'single' }),
    setBatch: () => setState({ issueMode: 'batch' }),
    issueLabel: isBatch ? '배치 240건 발급' : 'DPP 발급',
    issueReady,
    issueDisabledHint,
    // "기본 정보 입력" 카드를 토글로 열고 닫을 수 있게(2026-08-16 사용자 피드백: "소재 기본
    // 정보를 토글로 열고 닫을 수 있게 하는게 더 보기 좋을 것 같음"). 기본값은 열림 -
    // state.fieldFormOpen이 아직 세팅 전(undefined)이어도 열려 보여야 하므로 `!== false`로
    // 판정한다.
    fieldFormOpen: state.fieldFormOpen !== false,
    toggleFieldForm: () => setState(s => ({ fieldFormOpen: !(s.fieldFormOpen !== false) })),
    // "입력 검증 결과" 패널(2026-08-17 강 요청) - 예전엔 오른쪽 사이드 컬럼에 항상 펼쳐진
    // 채로 자리를 차지했는데, 어차피 열고닫는 토글이니 단일발급/배치발급 버튼 옆으로 옮기고
    // 기본은 닫아둬서 필수 문서·기본 정보 카드가 더 넓게 보이게 한다.
    // "입력 검증 결과" 토글은 삭제했다(2026-08-20 강 요청) - 그 패널이 보여주던 "필수 필드
    // n/m 입력 완료"는 바로 아래 강재 기본 정보 카드 헤더의 "n/m 입력됨"과 완전히 같은
    // 숫자였다. 그 자리에는 DPP 이름 토글이 들어간다.
    dppTitleOpen: state.dppTitleOpen != null ? state.dppTitleOpen : !(ff && ff.dppId),
    toggleDppTitle: () => setState(s => ({
      dppTitleOpen: s.dppTitleOpen != null ? !s.dppTitleOpen : !!(ff && ff.dppId)
    })),
    // 이름이 아직 없으면 버튼에 점을 찍어 "여기서 이름을 붙일 수 있다"를 알린다.
    dppTitleUnset: !((state.dppNameInput != null ? state.dppNameInput : ((ff && ff.displayName) || '')).trim()),
    // ff(실 폼)가 있으면 실제로 저장한다 - 없으면(battery/textile, 아직 시딩 없음) 기존
    // 목데이터 토스트만 보여준다.
    lastSavedLabel: (state.draftSavedAt && state.draftSavedAt[r]) ? ('마지막 임시저장 ' + state.draftSavedAt[r]) : '아직 임시저장한 이력이 없습니다',
    // DPP 이름(2026-08-20 강 요청) - 사용자가 붙이는 내부 식별용 이름이다. 서버가 준 값이
    // 있으면 그걸 초기값으로 쓰고, 사용자가 타이핑을 시작하면 state 쪽이 우선한다.
    // 규제 항목이 아니라 requirement_field에 넣지 않았고, 공개 여권·EU 레지스트리에도
    // 나가지 않는다(V27 주석 참고).
    // 키 이름이 dppName이 아니라 dppTitle인 이유: dppVals가 상세 드로어 제목을 dppName으로
    // 이미 내보내고 있고, useAppLogic이 makerVals보다 dppVals를 나중에 펼쳐서 덮어써 버린다.
    dppTitle: state.dppNameInput != null ? state.dppNameInput : ((ff && ff.displayName) || ''),
    onDppTitle: (e) => setState({ dppNameInput: e.target.value }),
    dppTitlePlaceholder: '예) 3월 유럽향 열연코일 1차',
    // 제품 사진(2026-09-21 강 요청) - DPP 이름 칸 오른쪽 버튼. DPP가 아직 저장 전이면 사진을
    // 들고 있다가 첫 임시저장으로 dppId가 생길 때 useAppLogic effect가 올린다.
    productPhotoSrc: state.pendingPhotoPreview
      || (state.productPhotoDppId && state.productPhotoDppId === state.fieldFormDppId ? state.productPhotoUrl : '')
      || '',
    productPhotoInputId: 'dpp-product-photo-upload',
    onProductPhotoChange: async (e) => {
      const file = e.target.files && e.target.files[0];
      e.target.value = '';
      if (!file) return;
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { ctx.say('JPG, PNG, WEBP 사진만 등록할 수 있습니다.'); return; }
      if (file.size > 5 * 1024 * 1024) { ctx.say('사진은 5MB 이하만 등록할 수 있습니다.'); return; }
      if (!state.fieldFormDppId) {
        setState({ pendingPhoto: file, pendingPhotoPreview: URL.createObjectURL(file) });
        ctx.say('제품 사진을 선택했습니다. 임시저장하면 함께 등록됩니다.');
        return;
      }
      try {
        await ctx.uploadProductPhoto(state.fieldFormDppId, file);
        setState((s) => ({ photoVersion: (s.photoVersion || 0) + 1 }));
        ctx.say('제품 사진을 등록했습니다.');
      } catch (err) {
        ctx.say(err.message || '제품 사진 등록에 실패했습니다.');
      }
    },
    removeProductPhoto: async () => {
      if (!state.fieldFormDppId) { setState({ pendingPhoto: null, pendingPhotoPreview: null }); return; }
      try {
        await ctx.deleteProductPhoto(state.fieldFormDppId);
        setState((s) => ({ photoVersion: (s.photoVersion || 0) + 1, productPhotoUrl: null }));
        ctx.say('제품 사진을 삭제했습니다.');
      } catch (err) {
        ctx.say(err.message || '제품 사진 삭제에 실패했습니다.');
      }
    },
    // "작업 현황"(2026-09-21 강 요청) - 어느 DPP의 어느 문서가 검증 몇 %인지. 다른 화면에 가 있어도 볼 수 있게 챗봇 위 버튼으로 연다.
    workStatusOpen: !!state.workStatusOpen,
    toggleWorkStatus: () => setState((s) => ({ workStatusOpen: !s.workStatusOpen })),
    workStatusRunningCount: (ctx.ingestProgress || []).filter((e) => e.status === 'RUNNING').length,
    workStatusEmpty: (ctx.ingestProgress || []).length === 0,
    workStatusItems: (ctx.ingestProgress || []).map((e) => {
      const found = dash && dash.dpps.find((d) => d.dppId === e.dppId);
      const running = e.status === 'RUNNING';
      const failed = e.status === 'FAILED';
      return {
        key: e.dppId + ':' + e.docTypeCode,
        dppId: e.dppId,
        dppName: found ? (found.displayName || found.modelName || ('DPP #' + found.dppId)) : ('DPP #' + e.dppId),
        docLabel: DOC_TYPE_LABEL[e.docTypeCode] || e.docTypeCode,
        percent: e.percent,
        stage: failed ? ('실패 · ' + (e.message || '')) : e.stage,
        running, failed,
        barColor: failed ? '#E03B3B' : running ? '#E3A008' : '#12A150',
        stateLabel: failed ? '실패' : running ? '검증 중' : '완료',
        // 작업 현황 항목 클릭 -> 해당 DPP 제작 화면으로 이동(2026-09-22 강 요청).
        // "제품 조회" 표의 식별자 클릭(resume)·완성도 목록(open)과 같은 패턴 - steel만
        // 실제 입력 화면이 있어 그 외 도메인은 기존 상세 패널로 폴백한다. 이동 후 패널은 닫는다.
        open: r === 'steel'
          ? () => setState({ tab: 'input', fieldFormDppId: e.dppId, workStatusOpen: false })
          : () => setState({ dppOpen: true, dppId: e.dppId, workStatusOpen: false }),
      };
    }),
    saveDraft: async () => {
      if (!ff) { ctx.say('임시저장했습니다.'); return; }
      try {
        const isNewDpp = !ff.dppId;
        const result = await ctx.saveFieldFormDraft(ff.dppId, ffInputs, dppNameToSend());
        ctx.setFieldFormData(result);
        ctx.setFieldFormInputs(Object.fromEntries((result.fields || []).map(f => [f.fieldCode, f.value || ''])));
        setState(s => ({ fieldFormDppId: result.dppId, dppNameInput: null, draftSavedAt: { ...(s.draftSavedAt || {}), [r]: nowStamp() } }));
        // 새 DPP가 이번 임시저장으로 처음 생겼으면 dashboardData(제품 조회/최근 작업 DPP
        // 조회의 출처)도 같이 갱신한다 - issueDpp와 같은 이유(2026-08-18 강 리포트).
        if (isNewDpp) ctx.refreshDashboard();
        ctx.say('임시저장했습니다 · 완성도 ' + Math.round(result.completeness) + '%');
      } catch (e) {
        ctx.say(e.message || '임시저장에 실패했습니다.');
      }
    },
    issueDpp: async () => {
      if (!ff) { ctx.say(isBatch ? '배치 240건의 DPP 발급을 시작했습니다.' : 'DPP를 발급하고 블록체인에 앵커링했습니다.'); return; }
      if (isBatch) { ctx.say('배치 대량 발급은 아직 실데이터 연동 전입니다.'); return; }
      // 제조사 입장에서 반드시 채워야 하는 데이터를 다 입력했을 때만 발급 가능 - 그 전엔
      // 임시저장만(2026-08-17 강 요청). 버튼도 비활성화되지만, 혹시 모를 경합(다른 탭에서
      // 필드를 지운 직후 등)을 대비해 실제 발급 호출 전에도 한 번 더 막는다.
      if (!issueReady) { ctx.say(issueDisabledHint); return; }
      try {
        // 2026-08-18(2차) 강 요청: "임시저장 없이도 발급 누르면 텍스트 상자에 있는
        // 데이터들로 발급할 수 있도록" - 예전엔 dppId가 이미 있으면(한 번이라도 임시저장한
        // 적 있으면) 곧장 issueFieldFormDpp(dppId)를 불러서, 그 이후 텍스트 상자에 입력만
        // 하고 임시저장 버튼을 안 누른 값은 서버에 저장 안 된 채로 발급이 진행돼 버렸다
        // (발급은 서버에 이미 저장된 dpp_field_value만 보고 처리하기 때문). dppId 유무와
        // 상관없이 항상 먼저 현재 ffInputs로 저장한 뒤 그 결과로 발급한다.
        const saved = await ctx.saveFieldFormDraft(ff.dppId, ffInputs, dppNameToSend());
        const dppId = saved.dppId;
        setState({ fieldFormDppId: dppId });
        const issued = await ctx.issueFieldFormDpp(dppId);
        ctx.setFieldFormData(issued);
        ctx.setFieldFormInputs(Object.fromEntries((issued.fields || []).map(f => [f.fieldCode, f.value || ''])));
        // 2026-08-18 강 리포트: "DPP 생성해서 발급했는데 저장 안됨(제품 조회에서 전혀
        // 안보임)". 원인은 저장 실패가 아니라 dashboardData(제품 조회 목록의 실제 출처)를
        // 로그인 시 딱 한 번만 불러오고 이 세션 안에서는 다시 안 불러왔기 때문 - 새로 발급된
        // DPP가 진짜 새로고침(전체 리마운트) 전까지 목록에 안 보였다. 여기서 강제로
        // 다시 불러온다.
        ctx.refreshDashboard();
        // DPP 발급과 동시에 QR 발급(2026-08-17 강 요청). 2026-08-18 강 리포트: "QR코드가
        // 제 기능을 안함 - 구글에 냅다 DPP-11이라고 검색하고 있음". 원인은 QR에 순수
        // 텍스트(표시용 식별자)만 인코딩해서 스캐너가 URL로 인식 못 하고 검색어로 취급한
        // 것 - 이제 실제 공개 조회 URL(/p/{publicUuid} -> GET /public/dpp/{publicUuid},
        // PublicPassportController, 로그인 불필요)을 인코딩한다.
        const displayId = issued.internalSku || ('DPP-' + issued.dppId);
        const snapshot = (issued.fields || []).map(f => ({ label: f.labelKo, value: f.value || '', required: f.required }));
        try {
          const passportUrl = publicPassportUrl(issued.publicUuid) || displayId;
          const dataUrl = await QRCode.toDataURL(passportUrl, { margin: 1, width: 220, color: { dark: '#0B1B33', light: '#FFFFFF' } });
          setState(s => ({
            issuedPassportCache: { ...(s.issuedPassportCache || {}), [displayId]: { material: r, formLabel: inputMeta.form, fields: snapshot } },
            qrModal: { id: displayId, dataUrl, showProductsLink: true, url: passportUrl }
          }));
        } catch (qrErr) {
          // QR 이미지 생성만 실패해도 발급 자체(실데이터, 블록체인 앵커링)는 이미 끝났으니
          // 발급 실패로 되돌리지 않는다 - 토스트로만 알린다.
          ctx.say('DPP는 발급됐지만 QR 이미지 생성에 실패했습니다.');
        }
        ctx.say('DPP를 제출했습니다 · 완성도 ' + Math.round(issued.completeness) + '%');
      } catch (e) {
        ctx.say(e.message || 'DPP 발급에 실패했습니다.');
      }
    },
    // qrModal state는 역할 공용(2026-08-17부터 세관 화면도 같은 모달을 재사용) - "제품
    // 조회에서 보기" 버튼은 제조사에게만 의미가 있어서(제품 조회 탭이 없는 역할에서 누르면
    // 빈 화면으로 이동해버림) qrModalShowLink로 노출 여부를 구분한다.
    qrModalOpen: !!state.qrModal,
    qrModalId: state.qrModal ? state.qrModal.id : '',
    qrModalImg: state.qrModal ? state.qrModal.dataUrl : '',
    qrModalShowLink: !!(state.qrModal && state.qrModal.showProductsLink),
    qrModalBadge: (state.qrModal && state.qrModal.badge) || 'DPP 발급 완료',
    qrModalTitle: (state.qrModal && state.qrModal.title) || 'QR 코드가 함께 발급되었습니다',
    closeQrModal: () => setState({ qrModal: null }),
    goToProductsFromQr: () => setState({ tab: 'products', qrModal: null }),
    // ff가 있으면(철강 역할) requirement_field 실 라벨/필수여부 + dpp_field_value 실 저장값,
    // 없으면 기존 목데이터 폼("SPHC" 같은 예시값 포함, 미시딩 도메인 한정 - 위 주석 참고).
    fields: formFields,
    // 섹션 묶음(식별자 / 화학 성분 / 탄소·CBAM ...). 서버가 sections를 주면 그 순서를
    // 따르고, 안 주면 필드 등장 순서로 만든다. 21개 섹션이 전부 펼쳐지면 스크롤이
    // 수백 줄이라 첫 섹션만 열어둔다.
    // ── 2026-09-19 배터리 조건부 검증 ──────────────────────────────────────
    // 폼 맨 위 분류 선택 칸. 배터리가 아니면 catField 가 없어서 아예 안 그려진다.
    classifyShow: !!catField,
    classifyLabel: catField ? catField.labelKo : '',
    classifyValue: catValue,
    classifyOptions: catField ? optionsFor(catField, codeOptions) : [],
    classifyChange: (e) => setClassifyValue('BATTERY_CATEGORY', e.target.value),
    // 정격용량은 모든 배터리의 필수 사양이라 분류와 무관하게 늘 받는다. 산업용일 때만
    // 여권 대상 판정(2kWh 경계)에도 쓰인다.
    classifyCapShow: !!capField,
    classifyCapLabel: capField ? (capField.labelKo + (capField.unit ? ' (' + capField.unit + ')' : '')) : '',
    classifyCapValue: capValue,
    classifyCapChange: (e) => setClassifyValue('RATED_CAPACITY_KWH', e.target.value),
    // 이 카드는 폼의 다른 칸(빨강/초록 테두리)과 일부러 다르게 그린다 - 아래 항목 전체를
    // 결정하는 "스위치"라서 입력값 칸이 아니라 설정 칸으로 보여야 한다(2026-09-19 강 요청:
    // 파란 테두리·푸른 톤). 비어 있으면 연한 파랑, 채우면 진한 파랑.
    classifyBorder: catValue ? '#0045A9' : 'rgba(0,69,169,.40)',
    classifyCapBorder: capValue ? '#0045A9' : 'rgba(0,69,169,.40)',
    classifyDirty, classifyReady, classifyApplied,
    classifyApply: applyClassification,
    classifyApplyDisabled: !classifyReady || !classifyDirty || !!state.classifyBusy,
    classifyApplyLabel: state.classifyBusy ? '적용 중…' : (classifyApplied ? '적용됨' : '확인'),
    classifyStatusText: '',
    // 배터리 여권 대상/비대상 배지. 배터리가 아니면 서버가 null을 주므로 배지 자체가
    // 안 그려진다 - 철강/섬유 화면에 "여권 비대상" 같은 말이 뜨면 안 된다.
    trackLabel: ff && ff.complianceTrackLabel ? ff.complianceTrackLabel : '',
    trackStyle: ff && ff.complianceTrackLabel
      ? (ff.passportRequired === false
          ? ctx.chip('rgba(132,148,172,.16)', '#44546F')
          : ff.passportRequired === true
            ? ctx.chip('rgba(0,69,169,.10)', '#0045A9')
            : ctx.chip('rgba(227,160,8,.16)', '#96660A'))
      : null,
    // 여권 비대상이면 어떤 항목이 빠졌는지 한 줄로 알려준다 - 화면에서 칸이 사라진
    // 이유를 말해주지 않으면 "필드가 왜 없지"가 된다.
    trackNote: ff && ff.passportRequired === false
      ? 'EU 배터리규정 제77조 여권 의무 대상이 아니어서 여권 전용 항목(동적데이터·성능내구성·공급망실사 등)은 표시하지 않습니다.'
      : '',
    // 발급 이후 단계에 채우는 항목 안내.
    laterStageNote: '',
    // 문서값 ↔ 입력값 불일치. 정리하기 전까지 발급이 막힌다.
    crossCheckOpen: ffMismatches.length > 0,
    crossCheckTitle: `문서에서 읽은 값과 다른 입력값 ${ffMismatches.length}건`,
    crossCheckRows: ffMismatches.map(c => ({
      key: c.checkId,
      label: c.labelKo,
      entered: c.enteredValue || '—',
      parsed: c.parsedValue || '—',
      docName: c.documentName || '업로드 문서',
      keepEntered: () => resolveCrossCheckRow(c.checkId, 'KEEP_ENTERED'),
      useParsed: () => resolveCrossCheckRow(c.checkId, 'USE_PARSED')
    })),
    fieldSections: ff ? groupBySection(formFields, ff.sections, state.openFieldSections, setState) : [],
    // 모달 제목이 "필수 필드 충족 현황"인데 목록은 선택 항목까지 전부 보여주고 있었다.
    // 필수를 먼저, 선택을 뒤에 두고 각 줄에 필수/선택 배지를 붙여서 어느 쪽이 발급을
    // 막는 항목인지 한눈에 보이게 한다(2026-08-23).
    fieldCheck: ff
      ? [...ffRequired, ...ffOptional].map(f => {
          const value = ffInputs[f.fieldCode] || '';
          return {
            key: f.fieldCode, label: f.labelKo, filled: !!value,
            req: f.required ? '필수' : '선택',
            reqStyle: { flex: 'none', padding: '2px 7px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: f.required ? 'rgba(194,43,43,.10)' : 'rgba(132,148,172,.14)', color: f.required ? '#C22B2B' : '#6B7A93' },
            dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
            mark: value ? '✓' : '',
            valueText: value || '미입력',
            // 선택 항목의 미입력은 발급을 막지 않는다 - 빨간색으로 겁줄 이유가 없다.
            valueStyle: { fontSize: 12.5, color: value ? '#44546F' : (f.required ? '#C22B2B' : '#9AA8BE'), fontWeight: value ? 500 : 600 }
          };
        })
      : [...fieldSets].sort((a, b) => (b[1] === '필수' ? 1 : 0) - (a[1] === '필수' ? 1 : 0)).map(([label, req, ph, value]) => ({
          key: label, label, filled: !!value,
          req: req || '선택',
          reqStyle: { flex: 'none', padding: '2px 7px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: req === '필수' ? 'rgba(194,43,43,.10)' : 'rgba(132,148,172,.14)', color: req === '필수' ? '#C22B2B' : '#6B7A93' },
          dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
          mark: value ? '✓' : '',
          valueText: value || '미입력',
          valueStyle: { fontSize: 12.5, color: value ? '#44546F' : (req === '필수' ? '#C22B2B' : '#9AA8BE'), fontWeight: value ? 500 : 600 }
        })),
    // 발급 게이트와 같은 기준(필수 항목)으로 센다.
    fieldFilledCount: ff ? ffRequiredFilled : fieldSets.filter(f => f[1] === '필수' && !!f[3]).length,
    fieldTotalCount: ff ? ffRequired.length : fieldSets.filter(f => f[1] === '필수').length,
    // 선택 항목은 발급 조건이 아니라 별도 숫자로만 보여준다.
    fieldOptionalFilledCount: ff ? ffOptionalFilled : fieldSets.filter(f => f[1] !== '필수' && !!f[3]).length,
    fieldOptionalTotalCount: ff ? ffOptional.length : fieldSets.filter(f => f[1] !== '필수').length,
    fieldCheckOpen: !!state.fieldCheckOpen,
    // 필수 문서 10종(제강 성적서 포함, 다만 그건 업로드 시 별도 파서/ZKP 엔드포인트를 씀)
    // 실데이터 - df가 없으면(초안 저장 전이거나 철강 역할이 아니면) 빈 목록. 예전엔 이
    // 목록(왼쪽 "필수 문서" 카드)이랑 오른쪽 "입력 검증 결과" 패널 아래 두 카드(검증 필요
    // 데이터/형식만 확인)가 완전히 같은 문서를 두 번 보여주는 중복이었다(2026-08-15 사용자
    // 피드백: "굳이 아래에 넣어야 하나 싶어") - 오른쪽 두 카드는 걷어내고, 이 한 목록 안에
    // 카테고리 배지(category*)와 진행 단계(steps: 미제출→검증 중→제출 완료)를 같이 넣어서
    // 정보를 한 곳에서만 보여준다. "검증 중" 단계는 서버가 PENDING을 내려줄 때뿐 아니라,
    // 업로드 요청이 아직 응답을 안 받은 동안(uploadingDocTypes)도 표시한다 - 지금은 문서
    // 9종이 업로드 즉시 동기 응답(APPROVED)이라 PENDING 상태가 서버에 실제로 존재하지
    // 않고, Mill Sheet만 파서+ZKP로 수십 초가 걸려서 이 클라이언트 쪽 표시가 사실상
    // 유일한 "검증 중" 시각화다. 필수 문서를 먼저 보여달라는 요청(2026-08-16)으로
    // required 내림차순 정렬(true 먼저) - Array.sort는 안정 정렬이라 같은 필수여부 안에서는
    // 서버가 내려준 원래 순서를 그대로 유지한다.
    documentSlots: df
      // 2026-08-18 강 요청: 검증/파싱되는 문서가 상위로 오게 - 제강 성적서(Mill Sheet) >
      // CBAM > 기타 순. 같은 우선순위 안에서는 기존처럼 required(필수) 내림차순 유지.
      ? [...df.documents].sort((a, b) => {
          const DOC_PRIORITY = { MILL_SHEET: 0, CBAM_REPORT: 1 };
          const pa = DOC_PRIORITY[a.docTypeCode] ?? 2;
          const pb = DOC_PRIORITY[b.docTypeCode] ?? 2;
          if (pa !== pb) return pa - pb;
          return b.required - a.required;
        }).map(d => {
          const uploading = (state.uploadingDocTypes || []).includes(d.docTypeCode);
          const docProgress = (ctx.ingestProgress || []).find((e) => e.status === 'RUNNING' && e.dppId === state.fieldFormDppId && e.docTypeCode === d.docTypeCode);
          const failed = !uploading && (d.status === 'REJECTED' || d.status === 'EXPIRED');
          const stageIdx = uploading || d.status === 'PENDING' ? 1
            : (d.status === 'APPROVED' || d.status === 'REJECTED' || d.status === 'EXPIRED') ? 2
            : 0;
          // 마지막 단계("제출 완료")에 도달한 시점을 '진행 중(active, 노란색)'과 '완료(done,
          // 초록색)'로 나눠야 하는데, i < stageIdx만으로는 stageIdx 자체(=마지막 단계)가
          // 영원히 '진행 중'으로만 남아서 승인된 뒤에도 계속 노란불이었다(2026-08-15 사용자
          // 리포트: "제출 완료에 계속 노란색으로 떠있어"). stageIdx===2이고 실패가 아니면
          // 그 단계 자체를 done으로 표시해야 한다 - "검증 중"(stageIdx===1)일 때만 진짜
          // active(진행 중)로 남겨둔다.
          const success = stageIdx === 2 && !failed;
          // 마지막 단계 라벨 - 예전엔 반려/만료돼도 항상 "제출 완료"가 빨간색으로만 칠해져
          // 있어서 헷갈렸다(2026-08-16 사용자 피드백: "제출 완료에 빨간색만 있는게 아니라").
          // 실패 상태면 실제 사유("반려됨"/"만료됨")로 라벨 자체를 바꾼다.
          const finalLabel = failed ? (DOC_STATUS_LABEL[d.status] || '반려됨') : '제출 완료';
          // 발급 이후 단계에 제출하는 문서임을 타일에 표시한다(2026-09-19). 필수여도
          // 지금 없다고 발급이 막히지 않으니 "미제출"만 보여주면 오해를 준다.
          const laterStage = !inDocIssueGate(d);
          const laterLabel = laterStage ? (LIFECYCLE_STAGE_LABEL[d.lifecycleStage] || '발급 이후') + ' 단계 제출' : '';
          // ZKP 대상 문서(Mill Sheet/CBAM/케어라벨/OEKO-TEX)는 이 일반 업로드 버튼(→
          // ctx.uploadDocument)이 아니라 전용 파서+ZKP 엔드포인트로 올려야 한다 - 서버가
          // DocumentSlotService.upload()에서 zkp 대상 docTypeCode를 이미 거부한다. 예전엔
          // 이 4종만 화면 위쪽에 별도 대형 박스로 떼어 보여줬는데, 사용자가 "다 문서 업로드
          // 하는 애들은 뭉쳐놓는게 나을듯"이라고 피드백을 줘서(2026-08-16) 이 그리드 하나로
          // 통합했다 - 타일의 겉모습은 똑같고 onFileChange 내부에서만 docTypeCode를 보고
          // 올바른 엔드포인트로 분기한다.
          const zkpUploader = {
            MILL_SHEET: { call: ctx.uploadSteelMillSheet, setResult: ctx.setMillSheetResult, waitMsg: '업로드 중 · 화학성분/기계적성질 검증에는 수십 초가 걸릴 수 있습니다.', okMsg: r2 => r2.specPassed ? '제강 성적서 검증을 통과했습니다.' : '제강 성적서 검증에 실패했습니다 - 규격 미달 항목이 있습니다.' },
            CBAM_REPORT: { call: ctx.uploadCbamReport, setResult: ctx.setCbamResult, waitMsg: '업로드 중 · 수입량 검증에 시간이 걸릴 수 있습니다.', okMsg: r2 => r2.obligated ? 'CBAM 신고 의무가 있습니다 (수입량이 de minimis 기준을 초과).' : 'CBAM 신고 의무가 없습니다 (수입량이 de minimis 기준 이하).' },
            CARE_LABEL: { call: ctx.uploadCareLabel, setResult: ctx.setCareLabelResult, waitMsg: '업로드 중 · 섬유 혼용률 검증에는 수십 초가 걸릴 수 있습니다.', okMsg: r2 => r2.specPassed ? '섬유 케어라벨 검증을 통과했습니다.' : '섬유 케어라벨 검증에 실패했습니다 - 혼용률 합계가 기준을 벗어났습니다.' },
            OEKOTEX_LABEL: { call: ctx.uploadOekotexLabel, setResult: ctx.setOekotexResult, waitMsg: '업로드 중 · pH 검증에 시간이 걸릴 수 있습니다.', okMsg: r2 => r2.specPassed ? 'OEKO-TEX 라벨 검증을 통과했습니다.' : 'OEKO-TEX 라벨 검증에 실패했습니다 - pH가 기준 범위를 벗어났습니다.' },
            BATTERY_CARBON_REPORT: { call: ctx.uploadBatteryCarbonReport, setResult: ctx.setBatteryCarbonResult, waitMsg: '업로드 중 · 재생원료 함유율 검증에는 수십 초가 걸릴 수 있습니다.', okMsg: r2 => r2.specPassed ? '배터리 탄소발자국 선언 검증을 통과했습니다.' : '배터리 탄소발자국 선언 검증에 실패했습니다 - 재생원료 함유율이 기준에 미달합니다.' },
            RECYCLING_REPORT: { call: ctx.uploadRecyclingReport, setResult: ctx.setRecyclingResult, waitMsg: '업로드 중 · 물질회수율 검증에는 수십 초가 걸릴 수 있습니다.', okMsg: r2 => r2.specPassed ? '재활용 처리 결과 검증을 통과했습니다.' : '재활용 처리 결과 검증에 실패했습니다 - 물질회수율이 기준에 미달합니다.' }
          }[d.docTypeCode];
          // detailLabel - ZKP 검증 결과가 있으면 어떤 실측값을 근거로 판정했는지 한 줄로
          // 보여준다(예전 대형 박스 부제목을 이 한 줄이 대신한다).
          const detailLabel = (() => {
            if (d.docTypeCode === 'MILL_SHEET' && msr) return (msr.specPassed ? '검증 통과' : '검증 실패') + ' · 화학성분·기계적성질 ' + Object.keys(msr.verdicts || {}).length + '개 항목';
            if (d.docTypeCode === 'CBAM_REPORT' && cbr) return (cbr.obligated ? 'CBAM 신고 의무 있음' : 'CBAM 신고 의무 없음') + ' · 수입량 ' + cbr.importQuantityT + 't (기준 ' + cbr.deMinimisT + 't)';
            if (d.docTypeCode === 'CARE_LABEL' && clr) return (clr.specPassed ? '검증 통과' : '검증 실패') + ' · 섬유 혼용률 합계 ' + clr.totalPercent + '%';
            if (d.docTypeCode === 'OEKOTEX_LABEL' && oer) return (oer.specPassed ? '검증 통과' : '검증 실패') + ' · pH ' + oer.ph + ' (기준 4.0–7.5)';
            if (d.docTypeCode === 'BATTERY_CARBON_REPORT' && bcr) return (bcr.specPassed ? '검증 통과' : '검증 실패') + ' · 재생원료 Co ' + bcr.recycledCobaltPercent + '% · Li ' + bcr.recycledLithiumPercent + '% · Ni ' + bcr.recycledNickelPercent + '%';
            if (d.docTypeCode === 'RECYCLING_REPORT' && rcr) return (rcr.specPassed ? '검증 통과' : '검증 실패') + ' · 물질회수율 Cu ' + rcr.copperRecoveryPercent + '% · Li ' + rcr.lithiumRecoveryPercent + '% · Co ' + rcr.cobaltRecoveryPercent + '%';
            return '';
          })();
          // "ZKP 증명 시 어떤 수치를 어떤 기준으로 검증 중인지"(2026-08-17 강 요청) - 결과가
          // 아직 없어도(업로드 전) 고정 문구로 항상 보여준다. detailLabel은 실측 결과가 있을
          // 때만 채워지는 것과 달리, criterionItems는 애초에 뭘 보는지에 대한 설명.
          // 2026-08-18 강 요청: 긴 문장 한 줄 대신 토글로 열었을 때 항목별로 담백하게
          // 보여준다 - criterionItems([{item, criterion}]) + criterionOpen(토글 상태).
          // 2026-08-18 강 요청: 실패한 항목만 기준 텍스트를 빨간색으로 보여준다 - 서버가
          // 돌려주는 실제 결과(verdicts/specPassed)를 항목(vkey)별로 대조한다. CBAM은
          // pass/fail 개념이 없어서(의무 발생 여부만 판정) 항상 failed=false.
          const zkpResultByDoc = { MILL_SHEET: msr, CARE_LABEL: clr, OEKOTEX_LABEL: oer, BATTERY_CARBON_REPORT: bcr, RECYCLING_REPORT: rcr };
          const zkpResult = zkpResultByDoc[d.docTypeCode];
          const criterionItems = (d.zkpTarget ? (ZKP_CRITERIA[d.docTypeCode] || []) : []).map(c => {
            let itemFailed = false;
            if (zkpResult) {
              if (c.vkey && zkpResult.verdicts) itemFailed = zkpResult.verdicts[c.vkey] === false;
              else if (typeof zkpResult.specPassed === 'boolean') itemFailed = zkpResult.specPassed === false;
            }
            return { ...c, failed: itemFailed };
          });
          const criterionOpen = !!(state.criteriaOpen && state.criteriaOpen[d.docTypeCode]);
          // 2026-08-18 강 요청: 문서 타일 테두리 색 - 아직 업로드 안 됨(빨강), 검증/제출
          // 통과(초록), 검증 실패(노랑). 업로드/검토 중(stageIdx===1)일 때는 결과가 아직
          // 없으니 기존 중립 테두리를 유지한다.
          const tileBorderColor = stageIdx === 2 ? (success ? '#12A150' : '#E3A008')
            : stageIdx === 0 ? '#E03B3B'
            : 'rgba(16,32,64,.07)';
          // 2026-08-23(2차) 강 요청: "원래는 혼자서도 다 입력할 수 있는데, 협력사를 초대한
          // 이후로는 협력사만 업로드 가능한 구조로". 예전엔 responsible_role 값만 보고
          // 무조건 잠갔다 - 그래서 협력사를 부른 적도 없는 DPP에서 제조사가 스크랩
          // 매입증빙·시험성적서를 영영 올릴 수 없었다. 이제 잠금 판정은 서버가 한다
          // (partnerLockLabel: 그 역할의 협력사가 참여를 '수락'한 경우에만 채워짐).
          // 잠겼을 때도 항목 자체는 남긴다 - 제조사는 협력사 제출 진행 상황을 봐야 한다.
          const partnerLockLabel = d.partnerLockLabel || '';
          return {
            key: d.fieldCode, label: d.labelKo, labelEn: d.labelEn || '', req: d.required ? '필수' : '선택',
            // 발급 이후 단계에 제출하는 문서 - 필수여도 지금 없다고 발급이 막히지 않는다.
            laterStage,
            laterLabel,
            laterStyle: laterStage ? ctx.chip('rgba(0,69,169,.08)', '#0045A9') : null,
            // 미제출 타일의 빨간 테두리도 빼준다 - 아직 낼 수 없는 문서를 재촉하면 안 된다.
            partnerOwned: !!partnerLockLabel,
            partnerOwnerLabel: partnerLockLabel,
            fileName: d.fileName || '',
            // 검증 중이면 서버가 알려주는 진행률(GET /document/progress)을 % 로 함께 보여준다.
            statusLabel: uploading ? ('검증 중' + (docProgress ? ' ' + docProgress.percent + '%' : '')) : (DOC_STATUS_LABEL[d.status] || d.status),
            progressVisible: uploading,
            progressPct: docProgress ? docProgress.percent : 0,
            progressStage: docProgress ? docProgress.stage : '업로드 중',
            dot: ctx.pillDot(uploading ? '#E3A008' : (DOC_STATUS_COLOR[d.status] || '#9AA8BE')),
            categoryLabel: d.zkpTarget ? '데이터 검증' : '형식 확인',
            categoryChip: d.zkpTarget ? ctx.chip('rgba(0,69,169,.08)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#6B7A93'),
            criterionItems,
            criterionOpen,
            tileBorderColor: laterStage && stageIdx === 0 ? 'rgba(16,32,64,.07)' : tileBorderColor,
            toggleCriterion: () => setState((s) => ({ criteriaOpen: { ...(s.criteriaOpen || {}), [d.docTypeCode]: !(s.criteriaOpen && s.criteriaOpen[d.docTypeCode]) } })),
            detailLabel,
            // 스피너(active)는 "검증 중"(stageIdx===1) 단계에서만 돈다 - 예전엔
            // i===stageIdx 조건만 봐서 아직 업로드 전(stageIdx===0, "미제출")에도 그
            // 단계가 계속 돌아가는 것처럼 보이는 버그가 있었다(2026-08-16 사용자 피드백:
            // "미제출, 제출 완료일 때는 그냥 가만히 있어도 되고 검증 중일 때만 돌아가게").
            // "미제출"은 그냥 아직 도달 안 한 단계와 똑같이 정적으로(upcoming) 보여준다.
            steps: ['미제출', '검증 중', finalLabel].map((label, i) => ({
              key: i,
              label,
              status: (i < stageIdx || (i === stageIdx && success)) ? 'done'
                : (i === stageIdx && failed) ? 'failed'
                : (i === stageIdx && stageIdx === 1) ? 'active'
                : 'upcoming'
            })),
            inputId: 'doc-upload-' + d.fieldCode,
            onFileChange: async (e) => {
              const file = e.target.files && e.target.files[0];
              e.target.value = '';
              if (!file) return;
              if (zkpUploader) {
                // 2026-08-19 수정: 이 6종(Mill Sheet/CBAM/케어라벨/OEKO-TEX/배터리탄소/재활용)
                // 업로드는 이제 dppId가 필수다(meApi.js 주석 참고) - 예전엔 dppId 없이 보내서
                // 백엔드가 항상 "이 조직의 첫 번째 DPP"에 붙였고, 그래서 "새 DPP 생성"으로
                // 새 초안을 만들어도 업로드는 계속 옛날 DPP로 가 버렸다(같은 파일을 사실상
                // 다른 DPP에 올리려던 것인데 첫 DPP 기준 content_hash 중복으로 막힌 것).
                // 일반 9종 문서 업로드(아래 else 분기, 605번째 줄)와 동일하게 먼저 임시저장으로
                // dppId를 만들어야 올릴 수 있다.
                if (!state.fieldFormDppId) { ctx.say('먼저 임시저장으로 DPP를 만든 뒤 문서를 올려 주세요.'); return; }
                ctx.say(zkpUploader.waitMsg);
                setState({ uploadingDocTypes: [...(state.uploadingDocTypes || []), d.docTypeCode] });
                try {
                  const result = await zkpUploader.call(state.fieldFormDppId, file);
                  zkpUploader.setResult({ ...result, fileName: file.name });
                  // 2026-08-18 강 요청: "증명에 실패했으면 데이터 파싱 안되게" - specPassed가
                  // 명시적으로 false면(=ZKP 검증 실패) 방금 올린 문서에서 새로 채워진 필드를
                  // "파싱됨"으로 인정하지 않는다. CBAM은 specPassed 자체가 없는 응답(적합/
                  // 부적합이 아니라 의무 발생 여부만 판정)이라 이 게이트 대상이 아니다.
                  const zkpFailed = Object.prototype.hasOwnProperty.call(result, 'specPassed') && result.specPassed === false;
                  if (result.dppId) {
                    setState({ fieldFormDppId: result.dppId });
                    if (!zkpFailed) {
                      // 업로드 직전 입력값(prevInputs)과 새로 불러온 폼을 비교해서, 이 문서
                      // 업로드로 "방금 채워진" 필드만 파싱됨으로 표시한다(파싱되는 데이터가
                      // 어디서 왔는지 표시, 2026-08-17 강 요청).
                      const prevInputs = ffInputs;
                      const refreshed = await ctx.refreshFieldForm(result.dppId);
                      if (refreshed && refreshed.fields) {
                        const newlyFilled = refreshed.fields
                          .filter(nf => !prevInputs[nf.fieldCode] && (nf.value || ''))
                          .map(nf => nf.fieldCode);
                        if (newlyFilled.length) {
                          setState(s => {
                            const next = { ...(s.parsedFieldSources || {}) };
                            newlyFilled.forEach(code => { next[code] = d.labelKo; });
                            return { parsedFieldSources: next };
                          });
                        }
                      }
                    }
                    ctx.refreshDocumentForm(result.dppId);
                  }
                  ctx.say(zkpUploader.okMsg(result));
                } catch (err) {
                  ctx.say(err.message || '문서 업로드에 실패했습니다.');
                } finally {
                  setState({ uploadingDocTypes: (state.uploadingDocTypes || []).filter(c => c !== d.docTypeCode) });
                }
                return;
              }
              if (!state.fieldFormDppId) { ctx.say('먼저 임시저장으로 DPP를 만든 뒤 문서를 올려 주세요.'); return; }
              setState({ uploadingDocTypes: [...(state.uploadingDocTypes || []), d.docTypeCode] });
              try {
                const result = await ctx.uploadDocument(state.fieldFormDppId, d.docTypeCode, file);
                ctx.setDocumentFormData(result);
                // 2026-08-18(2차) 강 요청 대응 - 이 9종 문서 경로(COO/EU_DOC/PCF_REPORT/
                // LCA_EPD/GRS_CERTIFICATE 등)도 서버가 업로드 즉시 requirement_field를
                // 자동 채운다(DocumentSlotService.autoFillFieldsFromParsedDocument). 그런데
                // 여기는 zkpUploader 분기와 달리 지금까지 fieldForm을 다시 안 불러와서,
                // 새로 채워진 값(원산지/UOI/재생 섬유 함유율 등)이 새로고침 전까지 화면에
                // 안 보였다 - zkpUploader와 동일하게 refreshFieldForm + parsedFieldSources
                // 추적을 붙인다.
                const prevInputs = ffInputs;
                const refreshed = await ctx.refreshFieldForm(state.fieldFormDppId);
                if (refreshed && refreshed.fields) {
                  const newlyFilled = refreshed.fields
                    .filter(nf => !prevInputs[nf.fieldCode] && (nf.value || ''))
                    .map(nf => nf.fieldCode);
                  if (newlyFilled.length) {
                    setState(s => {
                      const next = { ...(s.parsedFieldSources || {}) };
                      newlyFilled.forEach(code => { next[code] = d.labelKo; });
                      return { parsedFieldSources: next };
                    });
                  }
                }
                ctx.say(d.labelKo + ' 업로드했습니다.');
              } catch (err) {
                ctx.say(err.message || '문서 업로드에 실패했습니다.');
              } finally {
                setState({ uploadingDocTypes: (state.uploadingDocTypes || []).filter(c => c !== d.docTypeCode) });
              }
            }
          };
        })
      : [],
    documentSlotsEmpty: df ? df.documents.length === 0 : true,
    openFieldCheck: () => setState({ fieldCheckOpen: true }),
    closeFieldCheck: () => setState({ fieldCheckOpen: false }),
    // "협력사 초대"는 이제 회사 대 회사 일반 연결이 아니라 특정 DPP에 대한 초대 - 화면에
    // 먼저 이 조직의 DPP 목록을 보여주고, 하나를 고르면 그 DPP에 여러 협력사를 한 번에
    // 초대할 수 있다(DppParticipant가 그 DPP의 "누가 뭘 채우는지" 실제 연결이 됨).
    // 2026-08-18 강 요청: DPP가 많아지면 관리하기 힘드니, 협력사(제조사 외 역할)가 채워야
    // 할 필드가 아직 비어있는 DPP만 여기 보여준다 - responsibleRoleName이 '제조사'가 아닌
    // missingFields 항목이 하나라도 있으면 "초대 필요"로 간주(RAW_SUPPLIER/TEST_LAB/RECYCLER
    // 담당 필드가 비어있다는 뜻, 이미 초대를 보내 값이 채워졌으면 missingFields에서 빠짐).
    // 정렬은 생성일이 가장 오래된 DPP가 먼저 보이게 - 실 스키마에 DPP별 생성일시가 별도
    // 필드로 안 내려오므로(DppSummaryDto 참고), auto-increment PK인 dppId 오름차순을
    // 생성순서 대리 지표로 사용한다.
    // 2026-08-18 강 요청(2차): missingFields 기준 필터링이 대기작업 큐용 상위 10건 캡
    // 때문에 실제로 협력사 초대가 필요한 DPP가 있어도 화면에 안 보이는 버그가 있었다 -
    // 이제 백엔드가 캡 없이 정확히 계산해 내려주는 d.needsPartnerInput(GET /me/dashboard,
    // DppSummaryDto)을 그대로 쓴다.
    // 2026-09-17 강 요청: "모든 협력사를 초대한 DPP"와 "더 초대할 수 있는 DPP"를
    // 분리해서 보여준다. needsPartnerInput=true면 아직 협력사 담당 필드가 비어있는
    // (더 초대할 수 있는) DPP, false면 협력사 담당 필드가 더 없는 DPP다 - 다만 애초에
    // 협력사 필드가 하나도 없는 DPP(초대 자체가 무의미)까지 "모든 협력사를 초대함"으로
    // 보여주면 오해를 주므로, invitesData에 실제로 이 DPP로 보낸 초대 이력이 있는
    // DPP만 "모든 협력사를 초대한 DPP" 쪽에 넣는다.
    // 2026-09-17 강 3차 피드백: 위 두 박스('더 초대할 수 있는 DPP'/'모든 협력사를
    // 초대한 DPP')를 필터 토글이 있는 하나의 박스로 합치고, 가로 스크롤 카드 대신
    // 세로 목록으로 바꾼다. 실제로 두 그룹으로 나누는 기준(needsPartnerInput +
    // invitesData 이력)은 그대로 두고, state.partnerListFilter로 어느 쪽을 보여줄지만
    // 고른다(기본값 '미초대').
    ...(() => {
      const buildRow = (d) => {
        const selected = state.partnersDppId === d.dppId;
        return {
          key: d.dppId, id: d.internalSku || ('DPP-' + d.dppId), name: d.displayName || d.modelName || ('DPP #' + d.dppId),
          pct: Math.round(d.completeness), selected,
          rowStyle: {
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%',
            padding: '13px 16px', border: selected ? '1px solid #0045A9' : '1px solid rgba(16,32,64,.10)', borderRadius: 13,
            background: selected ? '#0045A9' : '#fff', color: selected ? '#fff' : '#0B1B33',
            cursor: 'pointer', textAlign: 'left'
          },
          select: () => setState({ partnersDppId: d.dppId, inviteRows: [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }] })
        };
      };
      const allDpps = dash ? dash.dpps : [];
      const hasInvite = (d) => (ctx.invitesData || []).some(i => i.dppId === d.dppId);
      const needMore = allDpps.filter(d => d.needsPartnerInput).sort((a, b) => a.dppId - b.dppId);
      const allInvited = allDpps.filter(d => !d.needsPartnerInput && hasInvite(d)).sort((a, b) => a.dppId - b.dppId);
      const filter = state.partnerListFilter === 'allInvited' ? 'allInvited' : 'needMore';
      const activeStyle = { background: '#0045A9', color: '#fff' };
      const inactiveStyle = { background: '#F2F6FC', color: '#6B7A93' };
      const pillBase = { height: 34, padding: '0 16px', border: '0', borderRadius: 10, fontSize: '12.5px', fontWeight: '600', cursor: 'pointer' };
      return {
        partnerListFilter: filter,
        showPartnerNeedMore: () => setState({ partnerListFilter: 'needMore' }),
        showPartnerAllInvited: () => setState({ partnerListFilter: 'allInvited' }),
        partnerFilterNeedMoreStyle: { ...pillBase, ...(filter === 'needMore' ? activeStyle : inactiveStyle) },
        partnerFilterAllInvitedStyle: { ...pillBase, ...(filter === 'allInvited' ? activeStyle : inactiveStyle) },
        partnerListNeedMoreCount: needMore.length,
        partnerListAllInvitedCount: allInvited.length,
        partnerListRows: (filter === 'allInvited' ? allInvited : needMore).map(buildRow),
        partnerListEmpty: (filter === 'allInvited' ? allInvited : needMore).length === 0,
        partnerListEmptyLabel: filter === 'allInvited'
          ? '아직 협력사 초대를 모두 마친 DPP가 없습니다.'
          : '협력사 초대가 필요한(담당 필드가 비어있는) DPP가 없습니다.',
      };
    })(),
    partnersHasSelection: !!state.partnersDppId,
    partnersSelectedDppName: (() => {
      const found = dash && dash.dpps.find(d => d.dppId === state.partnersDppId);
      return found ? (found.displayName || found.modelName || ('DPP #' + found.dppId)) : '';
    })(),
    // GET /me/invitations?dppId= 실데이터 - 예전엔 6건이 통째로 하드코딩되어 있었다. status는
    // BE가 SENT/ACCEPTED/EXPIRED/REVOKED/REJECTED 원문으로 내려주고, 여기서 한글 라벨/색을
    // 입힌다(scan_history 상태 매핑과 같은 패턴). invitesData는 전체를 한 번에 불러오고
    // 여기서 선택된 DPP로만 걸러서 보여준다.
    invites: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId).map((i) => {
      const label = { SENT: '대기', ACCEPTED: '수락', REJECTED: '거절', EXPIRED: '만료', REVOKED: '취소' }[i.status] || i.status;
      const color = i.status === 'ACCEPTED' ? '#12A150' : i.status === 'SENT' ? '#E3A008' : '#E03B3B';
      const roleLabel = { RAW_SUPPLIER: '원자재·화학 공급사', TEST_LAB: '시험·인증기관', RECYCLER: '재활용 처리업체' }[i.roleCode] || i.roleCode;
      return {
        key: i.invitationId, name: i.orgName, email: i.email, at: i.sentAt, status: label, roleLabel,
        statusDot: ctx.pillDot(color),
        canResend: i.canResend,
        resendStyle: !i.canResend
          ? { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.08)', borderRadius: 9, background: '#F7F9FD', fontSize: 12, fontWeight: 600, color: '#C3CBD9', cursor: 'not-allowed' }
          : { width: '100%', height: 32, border: '1px solid rgba(16,32,64,.12)', borderRadius: 9, background: '#fff', fontSize: 12, fontWeight: 600, color: '#44546F', cursor: 'pointer' },
        resend: async () => {
          if (!i.canResend) return;
          try {
            const updated = await ctx.resendInvitation(i.invitationId);
            ctx.setInvitesData(prev => prev.map(x => x.invitationId === updated.invitationId ? updated : x));
            ctx.say(updated && updated.mailSent === false
              ? (i.orgName + ' 재발송 실패: ' + (updated.mailError || '원인 미상'))
              : (i.orgName + '에 초대 메일을 재발송했습니다.'));
          } catch (e) {
            ctx.say(e.message || '재발송에 실패했습니다.');
          }
        }
      };
    }),
    invitesEmpty: !!state.partnersDppId && (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId).length === 0,
    inviteTotal: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId).length,
    invitePending: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId && i.status === 'SENT').length,
    inviteRejected: (ctx.invitesData || []).filter(i => i.dppId === state.partnersDppId && i.status === 'REJECTED').length,
    // 다중 발송 폼 - 협력사명/이메일 행을 여러 개 만들어 한 번에 보낼 수 있게. 백엔드
    // API 자체는 여전히 1건씩만 받아서(SendInviteRequest 참고), sendInvite가 행 수만큼
    // 반복 호출한다.
    // 역할 선택지 - 초대 대상 협력사가 실제로 뭘 제출하게 되는지 미리 보여준다(2026-08-15,
    // requirement_field.responsible_role이 RAW_SUPPLIER/TEST_LAB 둘로 나뉘면서 추가).
    // RECYCLER는 role 테이블엔 처음부터 있었지만 담당 필드가 없어 빠져 있다가, 배터리
    // 도메인의 재활용 처리 결과 보고서(Q4_15)가 처음 실사용하면서 추가됐다(2026-08-16,
    // BE InvitationService.ALLOWED_ROLE_CODES도 같이 확장).
    inviteRoleOptions: [
      { value: 'RAW_SUPPLIER', label: '원자재·화학 공급사 (스크랩 매입증빙, SDS 등)' },
      { value: 'TEST_LAB', label: '시험·인증기관 (시험성적서, LCA/EPD, 탄소보고서)' },
      // 2026-08-22 강 요청: "재활용 처리 결과 보고서"라고 안내해 놓고 정작 받는 화면에는
      // 데이터 입력밖에 없다. 그 보고서(RECYCLING_REPORT)는 배터리 도메인 전용 문서라
      // (V17__seed_requirement_battery.sql), 철강·섬유 DPP로 초대하면 문서 슬롯 자체가
      // 안 생기고 COMMON 재활용 데이터 필드(V21)만 남는다. 실제로 대부분 받는 것이
      // 데이터이므로 문구를 그쪽으로 맞춘다.
      { value: 'RECYCLER', label: '재활용 처리업체 (회수율·해체 절차 데이터 입력)' }
    ],
    inviteRows: (state.inviteRows && state.inviteRows.length ? state.inviteRows : [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((row, idx, arr) => ({
      key: idx, orgName: row.orgName, email: row.email, roleCode: row.roleCode || 'RAW_SUPPLIER', canRemove: arr.length > 1,
      onOrgName: e => setState(s => ({ inviteRows: (s.inviteRows || [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((r, i) => i === idx ? { ...r, orgName: e.target.value } : r) })),
      onEmail: e => setState(s => ({ inviteRows: (s.inviteRows || [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((r, i) => i === idx ? { ...r, email: e.target.value } : r) })),
      onRoleCode: e => setState(s => ({ inviteRows: (s.inviteRows || [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).map((r, i) => i === idx ? { ...r, roleCode: e.target.value } : r) })),
      remove: () => setState(s => ({ inviteRows: (s.inviteRows || []).filter((_, i) => i !== idx) }))
    })),
    addInviteRow: () => setState(s => ({ inviteRows: (s.inviteRows && s.inviteRows.length ? s.inviteRows : [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]).concat([{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]) })),
    inviteSendLabel: (state.inviteRows || []).length > 1 ? `초대 발송 (${state.inviteRows.length}건)` : '초대 발송',
    sendInvite: async () => {
      const dppId = state.partnersDppId;
      if (!dppId) { ctx.say('먼저 DPP를 선택해 주세요.'); return; }
      const rows = (state.inviteRows && state.inviteRows.length ? state.inviteRows : [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }])
        .map(r => ({ orgName: (r.orgName || '').trim(), email: (r.email || '').trim(), roleCode: r.roleCode || 'RAW_SUPPLIER' }))
        .filter(r => r.orgName && r.email);
      if (rows.length === 0) { ctx.say('협력사명과 이메일을 입력해 주세요.'); return; }
      let successCount = 0;
      const created = [];
      for (const row of rows) {
        try {
          created.push(await ctx.sendInvitation(row.orgName, row.email, dppId, row.roleCode));
          successCount++;
        } catch (e) {
          ctx.say((row.orgName) + ' 초대 실패: ' + (e.message || '알 수 없는 오류'));
        }
      }
      if (created.length) {
        ctx.setInvitesData(prev => [...created, ...prev]);
        setState({ inviteRows: [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }] });
      }
      if (successCount > 0) {
        // 서버가 메일 발송 결과를 같이 내려준다(mailSent/mailError). 예전엔 결과와
        // 상관없이 "발송했습니다"만 띄워서, SMTP가 거절해도 알 방법이 없었다
        // (2026-08-21 강 리포트 "메일이 발송되는지 확인이 안 된다").
        const failed = created.filter(c => c && c.mailSent === false);
        if (failed.length === 0) {
          ctx.say(successCount + '건의 초대 메일을 발송했습니다. (유효기간 7일)');
        } else {
          ctx.say('초대 ' + successCount + '건 등록 · 메일 ' + failed.length + '건 발송 실패: '
            + (failed[0].mailError || '원인 미상'));
        }
      }
    },
    // dash(GET /me/dashboard)가 있으면 실 DPP 목록(dash.dpps)에서, 없으면 기존 목데이터에서
    // 구성한다. 실데이터에는 Heat/중량 같은 dpp_field_value 기반 값이 아직 없어서(강재 기본
    // 정보 입력 API 미구축) spec/lot은 domain·serial_number 등 지금 실제로 존재하는 값만
    // 쓰고, 없으면 '—'로 정직하게 표시한다 - 목데이터의 가짜 Heat 번호/날짜를 흉내내지 않는다.
    products: (dash ? dash.dpps : ctx.compData().map(([id, name, done, , , spec]) => ({
      dppId: id, internalSku: id, modelName: name, domain: spec, completeness: done,
      serialNumber: spec.split(' · ')[0], issuedAtDate: null
    }))).filter(d => !state.removedProducts.includes(d.dppId)).map((d) => {
      const id = d.dppId;
      const name = d.displayName || d.modelName || ('DPP #' + id);
      const done = Math.round(d.completeness);
      const spec = d.domain || '';
      const issued = isIssuedDpp(d);
      const status = issued ? '발급 완료' : done === 100 ? '발급 대기' : done === 0 ? '입력 대기' : '작성 중';
      return {
        key: id, id: d.internalSku || ('DPP-' + id), name, spec, pct: done,
        lot: d.serialNumber || '—',
        at: d.issuedAtDate || '—',
        pctStyle: ctx.pctStyle(done),
        statusDot: ctx.pillDot(issued ? '#12A150' : done === 0 ? '#E03B3B' : '#E3A008'),
        status,
        // 발급된 DPP만 삭제를 막는다. 완성도 100%여도 아직 발급 전이면 지울 수 있어야 한다.
        canDelete: !issued,
        isIssued: issued,
        open: () => setState({ dppOpen: true, dppId: id }),
        // DPP 식별자를 누르면 "상세"(생애주기/미충족 필드 읽기전용 패널)가 아니라 작성하던
        // 입력 화면으로 되돌아간다 - 예전엔 둘 다 같은 open()이라 이어서 작성할 방법이
        // 없었다(2026-08-15 사용자 피드백: "식별자 ID 누르면 다시 작성하던 로그로 돌아갈
        // 수 있어야"). fieldFormDppId를 이 DPP로 바꾸면 입력 화면 진입 useEffect가
        // GET /me/field-form?dppId=로 기존 값을 그대로 불러온다(FieldFormService.getForm).
        // steel 역할만 실제 입력 화면이 있어서(다른 도메인은 아직 시딩 전) 그 외엔 기존
        // 상세 패널로 폴백한다.
        resume: r === 'steel'
          ? () => setState({ tab: 'input', fieldFormDppId: id })
          : () => setState({ dppOpen: true, dppId: id }),
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
    }).filter(p => pStatusFilter === 'all' ? true : pStatusFilter === 'done' ? p.isIssued : !p.isIssued),
    productStatusFilter: pStatusFilter,
    setProductStatusFilter: (k) => setState({ productStatusFilter: k }),
    productFilterTabs: [['all', '전체'], ['inProgress', '작성중'], ['done', '발급 완료']].map(([k, label]) => ({
      key: k, label,
      style: {
        height: 40, padding: '0 14px', border: '1px solid ' + (pStatusFilter === k ? '#0045A9' : 'rgba(16,32,64,.12)'),
        borderRadius: 12, background: pStatusFilter === k ? 'rgba(0,69,169,.08)' : '#fff',
        color: pStatusFilter === k ? '#0045A9' : '#44546F', fontSize: 13, fontWeight: 600, cursor: 'pointer'
      },
      go: () => setState({ productStatusFilter: k })
    })),
    myBiz: { steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '',
    myUrl: { steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || '',
    // ctx.orgData(GET /me/organization)가 로드됐으면 실제 tier_level, 아니면 기존 역할별 자리표시자.
    myTier: ctx.orgData ? ('Tier ' + ctx.orgData.tierLevel) : (r === 'steel' ? 'Tier 3' : 'Tier 2'),
    myTierName: r === 'steel' ? '엔터프라이즈 / Full DPP' : '표준 / 검증 등록',
    myTierDesc: r === 'steel' ? '공급망 하위 업체를 초대해 전체 추적망을 연동할 수 있습니다.' : '제3자 인증서 기반 검증 등록이 가능합니다. Tier 3 신청 시 하위 협력사 연동이 열립니다.',
    tierRequestPending: !!(state.tierRequestPending && state.tierRequestPending[r]),
    requestTier: () => {
      if (state.tierRequestPending && state.tierRequestPending[r]) { ctx.say('이미 상위 Tier 신청이 접수되어 심사 중입니다.'); return; }
      setState(s => ({ tierRequestPending: { ...(s.tierRequestPending || {}), [r]: true } }));
      ctx.say('상위 Tier 신청서를 제출했습니다. 자동심사 진행 중입니다.');
    },
    permRequestPending: !!(state.permRequestPending && state.permRequestPending[r]),
    requestPerm: () => {
      if (state.permRequestPending && state.permRequestPending[r]) { ctx.say('이미 권한 추가 신청이 접수되어 검토 중입니다.'); return; }
      setState(s => ({ permRequestPending: { ...(s.permRequestPending || {}), [r]: true } }));
      ctx.say('권한 추가 신청이 관리자에게 전달되었습니다.');
    },
    saveProfile: () => ctx.say('기업 정보를 수정했습니다.'),
    myPerms: [['DPP 발급·수정', 1], ['협력사 초대', 1], ['ZKP 증명 제출', r === 'steel' ? 1 : 0], ['감사 로그 열람', 0], ['배치 대량 발급', r === 'steel' ? 1 : 0]].map(([label, on]) => ({
      key: label, label, style: on ? ctx.chip('rgba(0,69,169,.10)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#9AA8BE')
    })),
    // ctx.orgData(GET /me/organization 실 데이터)가 있으면 그걸 우선 쓰고, 없으면(org_id
    // 없는 계정 등) 기존 역할별 목데이터로 폴백한다. state.profile은 로그아웃 전까지 남는
    // 로컬 수정 이력(orgData 없을 때만 의미 있음) - orgData가 생긴 뒤로는 안 쓴다.
    // ── 도메인 확장(2026-08-22 강 요청) ──────────────────────────────
    // 허용 도메인 = 가입 시 확정된 주력 도메인 + 관리자가 승인한 확장(GET /me/domains).
    // role과 도메인이 1:1이라(steel/battery/textile), 도메인 전환은 곧 role 전환이다 -
    // 그래서 필드 폼·문서 슬롯·대시보드가 전부 그대로 따라온다.
    ...domainGrantVals(ctx, state, setState),

    profileName: ctx.orgData ? ctx.orgData.orgName : (state.profile ? state.profile.name : p.ws),
    profileBiz: ctx.orgData ? ctx.orgData.bizRegNo : (state.profile ? state.profile.biz : ({ steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '')),
    profilePhone: ctx.orgData ? (ctx.orgData.contactPhone || '미입력') : (state.profile ? state.profile.phone : '02-3480-1200'),
    profileUrl: ctx.orgData ? (ctx.orgData.websiteUrl || '') : (state.profile ? state.profile.url : ({ steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || '')),
    openProfileEdit: () => setState({
      profileEdit: ctx.orgData
        ? {
            name: ctx.orgData.orgName,
            biz: ctx.orgData.bizRegNo || '',
            phone: ctx.orgData.contactPhone || '',
            url: ctx.orgData.websiteUrl || ''
          }
        : (state.profile || {
            name: p.ws,
            biz: { steel: '218-81-04471', battery: '124-86-77203', textile: '312-81-55910' }[r] || '',
            phone: '02-3480-1200',
            url: { steel: 'https://daesungsteel.co.kr', battery: 'https://lumencell.co.kr', textile: 'https://aratex.co.kr' }[r] || ''
          })
    }),
    profileEditOpen: !!state.profileEdit,
    // 사업자등록번호는 편집 UI에는 보이되(참고용) 입력 자체를 막는다 - 백엔드도 이 값을
    // PUT /me/organization으로 안 받는다(가입 시 확정, 국세청 연동 재심사 필요 - 화면에
    // 이미 있는 안내문구와 일치).
    editBizReadOnly: !!ctx.orgData,
    editName: state.profileEdit && state.profileEdit.name,
    editBiz: state.profileEdit && state.profileEdit.biz,
    editPhone: state.profileEdit && state.profileEdit.phone,
    editUrl: state.profileEdit && state.profileEdit.url,
    onEditName: e => setState(s => ({ profileEdit: { ...s.profileEdit, name: e.target.value } })),
    onEditBiz: e => setState(s => ({ profileEdit: { ...s.profileEdit, biz: e.target.value } })),
    onEditPhone: e => setState(s => ({ profileEdit: { ...s.profileEdit, phone: e.target.value } })),
    onEditUrl: e => setState(s => ({ profileEdit: { ...s.profileEdit, url: e.target.value } })),
    cancelProfileEdit: () => setState({ profileEdit: null }),
    commitProfileEdit: async () => {
      const edit = state.profileEdit;
      if (!ctx.orgData) {
        // 소속 조직이 없는 계정(org_id NULL) - 저장할 백엔드 리소스가 없어 로컬에만 남긴다.
        setState({ profile: edit, profileEdit: null });
        ctx.say('기업 기본정보를 저장했습니다.');
        return;
      }
      try {
        const updated = await updateOrganization({
          orgName: edit.name,
          contactPhone: edit.phone,
          websiteUrl: edit.url
        });
        ctx.setOrgData(updated);
        setState({ profileEdit: null });
        ctx.say('기업 기본정보를 저장했습니다.');
      } catch (e) {
        ctx.say(e.message || '기업 정보를 저장하지 못했습니다.');
      }
    }
  };
}

/** 도메인 코드 <-> 화면 role. 제조사는 role이 곧 도메인이다. */
const DOMAIN_TO_ROLE = { STEEL: 'steel', BATTERY: 'battery', TEXTILE: 'textile' };
const ROLE_TO_DOMAIN = { steel: 'STEEL', battery: 'BATTERY', textile: 'TEXTILE' };
const DOMAIN_LABEL = { STEEL: '철강', BATTERY: '배터리', TEXTILE: '섬유·패션' };

/**
 * 도메인 확장 - 마이페이지의 신청 카드와 DPP 생성 탭의 도메인 선택기.
 *
 * 신청은 증빙서류가 필수라 파일을 고르지 않으면 버튼이 막힌다(서버도 같은 조건으로 막지만,
 * 눌러 본 뒤 토스트로 알려주는 것보다 애초에 못 누르게 하는 편이 낫다).
 */
function domainGrantVals(ctx, state, setState) {
  const data = ctx.myDomainsData;
  const allowed = (data && data.allowedDomains) || [];
  const grants = (data && data.grants) || [];
  const curDomain = ROLE_TO_DOMAIN[state.role] || (data && data.baseDomain) || 'STEEL';
  // 아직 안 가진 도메인만 신청 대상이다.
  const allowedCodes = allowed.map(d => d.code);
  const candidates = ['STEEL', 'BATTERY', 'TEXTILE'].filter(c => !allowedCodes.includes(c));
  const pick = state.dgDomain && candidates.includes(state.dgDomain) ? state.dgDomain : (candidates[0] || '');

  const switchDomain = (code) => {
    const role = DOMAIN_TO_ROLE[code];
    if (!role || role === state.role) return;
    // 도메인을 바꾸면 작성 중이던 DPP 초안도 그 도메인 것으로 갈아타야 한다 -
    // fieldFormDppId는 role+계정별로 따로 저장돼 있어서(useAppLogic) 그냥 비우면
    // 새 role의 저장분이 자동으로 복원된다.
    setState({ role, tab: 'input', fieldFormDppId: null, parsedFieldSources: {}, unlockedFields: {} });
    ctx.say(DOMAIN_LABEL[code] + ' 도메인으로 전환했습니다.');
  };

  return {
    // DPP 생성 탭 - 선택지가 2개 이상일 때만 보여준다(1개면 고를 게 없다).
    domainPickerShown: allowed.length > 1,
    domainPickerOptions: allowed.map(d => ({
      key: d.code, code: d.code, label: d.label,
      active: d.code === curDomain,
      style: {
        height: 38, padding: '0 16px', border: 0, borderRadius: 12, cursor: 'pointer',
        fontSize: 13, fontWeight: 600,
        background: d.code === curDomain ? '#0045A9' : '#fff',
        color: d.code === curDomain ? '#fff' : '#44546F',
        boxShadow: d.code === curDomain ? '0 6px 14px rgba(0,69,169,.22)' : '0 1px 2px rgba(16,32,64,.06)'
      },
      go: () => switchDomain(d.code)
    })),

    // 마이페이지 - 보유 도메인 + 신청 이력
    myDomainsShown: !!data,
    myDomainChips: allowed.map(d => ({
      key: d.code, label: d.label,
      style: ctx.chip('rgba(0,69,169,.10)', '#0045A9')
    })),
    domainGrantRows: grants
      .filter(g => g.status !== 'APPROVED' || g.requestReason !== '가입 시 확정된 주력 도메인')
      .map(g => ({
        key: g.grantId,
        label: g.domainLabel,
        status: g.statusLabel,
        reason: g.rejectReason || g.requestReason || '',
        at: ctx.fmtDateTime(g.requestedAt),
        chip: ctx.chip(
          g.status === 'APPROVED' ? 'rgba(18,161,80,.12)' : g.status === 'PENDING' ? 'rgba(227,160,8,.16)' : 'rgba(224,59,59,.10)',
          g.status === 'APPROVED' ? '#0E7A3D' : g.status === 'PENDING' ? '#96660A' : '#C22B2B'
        )
      })),
    domainGrantEmpty: grants.filter(g => g.requestReason !== '가입 시 확정된 주력 도메인').length === 0,

    // 신청 폼
    dgFormOpen: !!state.dgFormOpen,
    dgCanRequest: candidates.length > 0,
    openDomainRequest: () => setState({ dgFormOpen: true, dgDomain: candidates[0] || '', dgReason: '', dgFileName: '', dgFile: null }),
    closeDomainRequest: () => setState({ dgFormOpen: false, dgFile: null, dgFileName: '' }),
    dgOptions: candidates.map(c => ({
      key: c, code: c, label: DOMAIN_LABEL[c], active: c === pick,
      style: {
        flex: 1, height: 44, border: c === pick ? '1.5px solid #0045A9' : '1px solid rgba(16,32,64,.14)',
        borderRadius: 12, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
        background: c === pick ? 'rgba(0,69,169,.06)' : '#fff',
        color: c === pick ? '#0045A9' : '#44546F'
      },
      go: () => setState({ dgDomain: c })
    })),
    dgReason: state.dgReason || '',
    onDgReason: (e) => setState({ dgReason: e.target.value }),
    dgFileName: state.dgFileName || '',
    onDgFile: (e) => {
      const f = e.target.files && e.target.files[0];
      setState({ dgFile: f || null, dgFileName: f ? f.name : '' });
    },
    dgSubmitDisabled: !pick || !state.dgFile,
    submitDomainRequest: () => {
      if (!pick) { ctx.say('확장할 도메인을 선택해 주세요.'); return; }
      if (!state.dgFile) { ctx.say('증빙서류를 첨부해 주세요.'); return; }
      ctx.requestDomainGrant(pick, state.dgReason || '', state.dgFile)
        .then(() => {
          setState({ dgFormOpen: false, dgFile: null, dgFileName: '', dgReason: '' });
          ctx.refetchMyDomains();
          ctx.say(DOMAIN_LABEL[pick] + ' 도메인 확장을 신청했습니다. 관리자 심사 후 알림으로 알려드립니다.');
        })
        .catch((err) => ctx.say(err.message || '신청에 실패했습니다.'));
    }
  };
}
