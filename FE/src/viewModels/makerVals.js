import React from 'react';
import QRCode from 'qrcode';
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

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function makerVals(ctx) {
  const { state, setState, props, data } = ctx;
  const r = state.role;
  const p = ctx.profile();
  const kpi = data.makerKpi[r] || ['0', 0, 0, 0, 0, 0];
  // ctx.dashboardData(GET /me/dashboard)가 로드됐으면 실데이터, 아니면 기존 목데이터로 폴백.
  // org_id 없는 계정이나 DPP를 아직 하나도 등록 안 한 조직은 dash가 와도 전부 0/빈 배열 -
  // 그 경우도 실데이터 분기를 그대로 타서 "0건/빈 목록"으로 정직하게 보여준다(가짜 숫자로
  // 안 채움). 목데이터로 폴백하는 건 dashboardData 자체가 아직 도착 전(null)이거나
  // 요청이 실패했을 때뿐.
  const dash = ctx.dashboardData;
  const completenessRows = dash
    ? dash.dpps.map(d => {
        const done = Math.round(d.completeness);
        return [d.dppId, d.internalSku || ('DPP-' + d.dppId), d.modelName || '(이름 없음)', done, 0, 100 - done];
      })
    : ctx.compData().map(([id, name, done, prog, none]) => [id, id, name, done, prog, none]);
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
  const ffFilledCount = ff ? ff.fields.filter(f => !!ffInputs[f.fieldCode]).length : 0;
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
  const DOC_STATUS_LABEL = { NOT_UPLOADED: '미제출', PENDING: '검토 중', APPROVED: '제출 완료', REJECTED: '반려됨', EXPIRED: '만료됨' };
  const DOC_STATUS_COLOR = { NOT_UPLOADED: '#9AA8BE', PENDING: '#E3A008', APPROVED: '#12A150', REJECTED: '#E03B3B', EXPIRED: '#C22B2B' };
  // DPP 발급 조건(강 요청, 2026-08-17): 제조사가 반드시 채워야 하는 필수 데이터를 전부
  // 입력해야만 발급 가능, 그 전엔 임시저장만 가능. ff(실 폼)가 없는 레거시 경로(아직 시딩
  // 안 된 도메인)는 이 조건이 적용될 데이터 자체가 없으므로 기존 동작(항상 발급 가능)을
  // 그대로 둔다 - 정확한 검증 근거 없이 막으면 오히려 더 헷갈린다.
  // 제품조회 작성중/작성완료 필터(2026-08-17 강 요청) - 완성도 100%(=isIssued)를
  // "작성완료", 그 미만을 "작성중" 기준으로 나눈다. 기존에도 버튼 자리(상태 전체/기간
  // 90일)는 있었지만 onClick이 없어 눌러도 아무 동작이 없었다.
  const pStatusFilter = state.productStatusFilter || 'all';
  const requiredFieldsOk = ff ? ff.fields.filter(f => f.required).every(f => !!ffInputs[f.fieldCode]) : true;
  const requiredDocsOk = df ? df.documents.filter(d => d.required).every(d => d.status === 'APPROVED') : true;
  const issueReady = ff ? (requiredFieldsOk && requiredDocsOk) : true;
  const issueDisabledHint = issueReady ? '' : !requiredFieldsOk
    ? `필수 필드를 모두 입력해야 발급할 수 있습니다. (${ffFilledCount}/${ff ? ff.fields.length : 0})`
    : '필수 문서를 모두 제출·검증 완료해야 발급할 수 있습니다.';
  return {
    kpiTotal: dash ? String(dash.totalCount) : kpi[0],
    // "이번 달 신규" - 2026-08-19 수정: 예전엔 실데이터 쪽에 대응하는 집계가 없어서
    // 항상 0을 보여줬다("등록 DPP 수" 옆 +N 배지가 실제 값을 반영 못하던 버그) - 이제
    // DashboardResponse.newThisMonthCount(BE, dpp.created_at 기준 집계)를 그대로 쓴다.
    // "서류 대기"는 여전히 대응하는 집계가 없어서 0으로 남겨둔다.
    kpiNew: dash ? dash.newThisMonthCount : kpi[1],
    kpiIncomplete: dash ? dash.incompleteCount : kpi[2],
    kpiMissing: dash ? dash.missingFields.length : kpi[3],
    kpiWaiting: dash ? 0 : kpi[4],
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
      setState({ tab: 'input', fieldFormDppId: null, parsedFieldSources: {}, unlockedFields: {}, qrModal: null });
    },
    // 최근 작업 조회 DPP(2026-08-17 강 요청) - 예전 "대기작업 큐"(마감일 D-1/D-2 같은
    // 가짜 워크플로 문구)를 걷어내고, 실제 있는 DPP 중 최근 것 몇 건만 핵심 데이터
    // 3항목(일련번호/상품명/상태)으로 간단히 보여주는 목록으로 교체. 클릭하면 바로 그
    // DPP의 입력 화면으로 이동한다(대기작업 큐의 "처리" 버튼과 동일한 이동 동작 유지).
    recentDpps: completenessRows.slice(0, 5).map(([openId, displayId, name, done]) => ({
      key: openId,
      serial: displayId,
      productName: name || '(이름 없음)',
      statusLabel: done === 100 ? '발급 완료' : done === 0 ? '입력 대기' : (done + '% 작성 중'),
      statusChip: done === 100
        ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D')
        : done === 0
          ? ctx.chip('rgba(132,148,172,.16)', '#6B7A93')
          : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
      open: () => setState({ tab: 'input', fieldFormDppId: openId, parsedFieldSources: {}, unlockedFields: {}, qrModal: null })
    })),
    recentDppsEmpty: completenessRows.length === 0,
    // 2026-08-17 강 정정: "완성도" 그래프/목록 카드는 원래대로 유지하고(제목만 "입력률"로),
    // ESPR 업데이트는 대신 KPI 카드 줄의 "평균 완성도" 자리에 넣는다(지난번엔 잘못 이해해서
    // 완성도 그래프 카드 쪽을 통째로 ESPR로 바꿔버렸었음).
    completeness: completenessRows.map(([openId, displayId, name, done, prog, none]) => ({
      key: openId, id: displayId, name, pct: done,
      pctStyle: ctx.pctStyle(done),
      segs: [{ key: 'a', style: ctx.segStyle(done, '#12A150') }, { key: 'b', style: ctx.segStyle(prog, '#E3A008') }, { key: 'c', style: ctx.segStyle(none, '#E03B3B') }],
      open: () => setState({ dppOpen: true, dppId: openId })
    })),
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
    validationOpen: !!state.validationOpen,
    toggleValidation: () => setState(s => ({ validationOpen: !s.validationOpen })),
    validationWarnCount: ff ? (ffFilledCount === ff.fields.length ? 0 : 1) : (fieldSets.every(f => !!f[3]) ? 0 : 1),
    // ff(실 폼)가 있으면 실제로 저장한다 - 없으면(battery/textile, 아직 시딩 없음) 기존
    // 목데이터 토스트만 보여준다.
    lastSavedLabel: (state.draftSavedAt && state.draftSavedAt[r]) ? ('마지막 임시저장 ' + state.draftSavedAt[r]) : '아직 임시저장한 이력이 없습니다',
    saveDraft: async () => {
      if (!ff) { ctx.say('임시저장했습니다.'); return; }
      try {
        const isNewDpp = !ff.dppId;
        const result = await ctx.saveFieldFormDraft(ff.dppId, ffInputs);
        ctx.setFieldFormData(result);
        ctx.setFieldFormInputs(Object.fromEntries((result.fields || []).map(f => [f.fieldCode, f.value || ''])));
        setState(s => ({ fieldFormDppId: result.dppId, draftSavedAt: { ...(s.draftSavedAt || {}), [r]: nowStamp() } }));
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
        const saved = await ctx.saveFieldFormDraft(ff.dppId, ffInputs);
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
          const passportUrl = issued.publicUuid ? (window.location.origin + '/p/' + issued.publicUuid) : displayId;
          const dataUrl = await QRCode.toDataURL(passportUrl, { margin: 1, width: 220, color: { dark: '#0B1B33', light: '#FFFFFF' } });
          setState(s => ({
            issuedPassportCache: { ...(s.issuedPassportCache || {}), [displayId]: { material: r, formLabel: inputMeta.form, fields: snapshot } },
            qrModal: { id: displayId, dataUrl, showProductsLink: true }
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
    qrModalHint: (state.qrModal && state.qrModal.hint) || '이 QR을 스캔하면 현재까지 입력·검증된 데이터를 조회할 수 있습니다.',
    closeQrModal: () => setState({ qrModal: null }),
    goToProductsFromQr: () => setState({ tab: 'products', qrModal: null }),
    // ff가 있으면(철강 역할) requirement_field 실 라벨/필수여부 + dpp_field_value 실 저장값,
    // 없으면 기존 목데이터 폼("SPHC" 같은 예시값 포함, 미시딩 도메인 한정 - 위 주석 참고).
    fields: ff
      // 파싱되는(자동 채움) 필드를 위쪽에, 수기 입력 필드를 아래쪽에 배치(2026-08-18 강
      // 요청) - AUTO_FILL_FIELD_CODES 화이트리스트 기준 안정 정렬(같은 그룹 안에서는
      // 서버가 내려준 원래 순서 유지), documentSlots의 required 정렬과 동일한 패턴.
      ? [...ff.fields].sort((a, b) => (AUTO_FILL_FIELD_CODES.has(b.fieldCode) ? 1 : 0) - (AUTO_FILL_FIELD_CODES.has(a.fieldCode) ? 1 : 0)).map(f => {
          const value = ffInputs[f.fieldCode] || '';
          const parsedFrom = parsedSources[f.fieldCode];
          const isAutoFillable = AUTO_FILL_FIELD_CODES.has(f.fieldCode);
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
          // 2026-08-18 강 요청: "파싱된 이후로는 안지워지게 막기 - 수정하려면 수정 버튼
          // 누르고 수정". 파싱된 상태(이번 세션에 감지됐거나, 화이트리스트 필드에 값이
          // 이미 있는 경우)인 필드는 기본적으로 읽기 전용으로 잠그고, "수정" 버튼을 눌러
          // 이 세션에서 한 번 잠금 해제해야 편집 가능해진다. 수기 입력 필드는 애초에
          // 잠글 대상이 아니라 항상 편집 가능.
          const isParsed = !!parsedFrom || (isAutoFillable && !!value);
          const unlocked = !!(state.unlockedFields && state.unlockedFields[f.fieldCode]);
          const locked = isParsed && !unlocked;
          return {
            key: f.fieldCode, label: f.labelKo + (f.unit ? ' (' + f.unit + ')' : ''),
            req: f.required ? '필수' : '선택', ph: f.helpText || '', value,
            hint: f.helpText || '', sourceLabel, sourceChip,
            autoFillable: isAutoFillable,
            // 2026-08-18 강 요청: 미입력=빨간 테두리, 입력됨=초록 테두리.
            inputBorderColor: value ? '#12A150' : '#E03B3B',
            locked,
            unlock: () => setState(s => ({ unlockedFields: { ...(s.unlockedFields || {}), [f.fieldCode]: true } })),
            onChange: e => ctx.setFieldFormInputs(prev => ({ ...prev, [f.fieldCode]: e.target.value }))
          };
        })
      : fieldSets.map(([label, req, ph, value, hint]) => ({
          key: label, label, req, ph, value, hint, sourceLabel: '', sourceChip: null, onChange: undefined
        })),
    fieldCheck: ff
      ? ff.fields.map(f => {
          const value = ffInputs[f.fieldCode] || '';
          return {
            key: f.fieldCode, label: f.labelKo, filled: !!value,
            dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
            mark: value ? '✓' : '',
            valueText: value || '미입력',
            valueStyle: { fontSize: 12.5, color: value ? '#44546F' : '#C22B2B', fontWeight: value ? 500 : 600 }
          };
        })
      : fieldSets.map(([label, req, ph, value]) => ({
          key: label, label, filled: !!value,
          dot: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: value ? '#12A150' : '#EEF2F8', color: value ? '#fff' : '#9AA8BE', fontSize: 12, fontWeight: 700 },
          mark: value ? '✓' : '',
          valueText: value || '미입력',
          valueStyle: { fontSize: 12.5, color: value ? '#44546F' : '#C22B2B', fontWeight: value ? 500 : 600 }
        })),
    fieldFilledCount: ff ? ffFilledCount : fieldSets.filter(f => !!f[3]).length,
    fieldTotalCount: ff ? ff.fields.length : fieldSets.length,
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
          return {
            key: d.fieldCode, label: d.labelKo, req: d.required ? '필수' : '선택',
            fileName: d.fileName || '',
            statusLabel: uploading ? '검증 중' : (DOC_STATUS_LABEL[d.status] || d.status),
            dot: ctx.pillDot(uploading ? '#E3A008' : (DOC_STATUS_COLOR[d.status] || '#9AA8BE')),
            categoryLabel: d.zkpTarget ? '데이터 검증' : '형식 확인',
            categoryChip: d.zkpTarget ? ctx.chip('rgba(0,69,169,.08)', '#0045A9') : ctx.chip('rgba(16,32,64,.06)', '#6B7A93'),
            criterionItems,
            criterionOpen,
            tileBorderColor,
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
    validations: [
      ['필수 필드 충족', (ff ? ffFilledCount : fieldSets.filter(f => !!f[3]).length) + ' / ' + (ff ? ff.fields.length : fieldSets.length) + '개 입력 완료', (ff ? ffFilledCount === ff.fields.length : fieldSets.every(f => !!f[3])) ? '#12A150' : '#E3A008', true]
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
    partnerDpps: (() => {
      const eligible = (dash ? dash.dpps : []).filter(d => d.needsPartnerInput);
      return [...eligible].sort((a, b) => a.dppId - b.dppId).map(d => {
        const selected = state.partnersDppId === d.dppId;
        return {
          key: d.dppId, id: d.internalSku || ('DPP-' + d.dppId), name: d.modelName || ('DPP #' + d.dppId),
          pct: Math.round(d.completeness), selected,
          cardStyle: {
            display: 'flex', flexDirection: 'column', gap: 4, minWidth: 168, padding: '12px 14px',
            border: selected ? '1px solid #0045A9' : '1px solid rgba(16,32,64,.10)', borderRadius: 13,
            background: selected ? '#0045A9' : '#fff', color: selected ? '#fff' : '#0B1B33',
            cursor: 'pointer', textAlign: 'left', flex: 'none'
          },
          select: () => setState({ partnersDppId: d.dppId, inviteRows: [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }] })
        };
      });
    })(),
    partnerDppsEmpty: !dash || !dash.dpps.some(d => d.needsPartnerInput),
    partnersHasSelection: !!state.partnersDppId,
    partnersSelectedDppName: (() => {
      const found = dash && dash.dpps.find(d => d.dppId === state.partnersDppId);
      return found ? (found.modelName || ('DPP #' + found.dppId)) : '';
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
            ctx.say(i.orgName + '에 초대를 재발송했습니다.');
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
      { value: 'RECYCLER', label: '재활용 처리업체 (재활용 처리 결과 보고서)' }
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
        ctx.say(successCount + '건의 초대 메일을 발송했습니다. (유효기간 7일)');
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
      const name = d.modelName || ('DPP #' + id);
      const done = Math.round(d.completeness);
      const spec = d.domain || '';
      const status = done === 100 ? '발급 완료' : done === 0 ? '입력 대기' : '작성 중';
      return {
        key: id, id: d.internalSku || ('DPP-' + id), name, spec, pct: done,
        lot: d.serialNumber || '—',
        at: d.issuedAtDate || '—',
        pctStyle: ctx.pctStyle(done),
        statusDot: ctx.pillDot(done === 100 ? '#12A150' : done === 0 ? '#E03B3B' : '#E3A008'),
        status,
        canDelete: done < 100,
        isIssued: done === 100,
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
    productFilterTabs: [['all', '전체'], ['inProgress', '작성중'], ['done', '작성완료']].map(([k, label]) => ({
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
    // ctx.orgData(GET /me/organization 실 데이터)가 있으면 그걸 우선 쓰고, 없으면(org_id
    // 없는 계정 등) 기존 역할별 목데이터로 폴백한다. state.profile은 로그아웃 전까지 남는
    // 로컬 수정 이력(orgData 없을 때만 의미 있음) - orgData가 생긴 뒤로는 안 쓴다.
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
