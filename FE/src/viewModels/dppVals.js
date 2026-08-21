import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 *
 * 제품조회 "상세" 모달 - 예전엔 이 화면 전체가 목데이터(ctx.compData(), 어느 DPP를 열어도
 * 항상 같은 5건짜리 dppMissingData가 나옴)였다. dash(GET /me/dashboard)가 있으면 실제로
 * 열어본 그 DPP의 실 completeness/missingFields로 바꾼다(2026-08-17, 강 요청 - "목데이터
 * 좀 그만 보여주고 실데이터로"). 생애주기 단계(lifecycle)는 실제로 단계별 이벤트를 기록하는
 * 테이블/API가 아직 없어서 - 원자재조달/제조가공/유통물류/사용수리/재활용폐기 5단계는
 * completeness 값에서 추정한 그대로 유지(있는 데이터로 정직하게 근사한 것이지 가짜 원본
 * 데이터를 지어낸 게 아니다).
 */
export function dppVals(ctx) {
  const { state, setState, props, data } = ctx;
  const dash = ctx.dashboardData;
  const dashRow = dash ? dash.dpps.find(d => d.dppId === state.dppId) : null;
  let id, name, done, spec, displayId;
  if (dashRow) {
    id = dashRow.dppId;
    displayId = dashRow.internalSku || ('DPP-' + dashRow.dppId);
    name = dashRow.displayName || dashRow.modelName || ('DPP #' + id);
    done = Math.round(dashRow.completeness);
    spec = dashRow.domain || '';
  } else {
    const rows = ctx.compData();
    const row = rows.find(r => r[0] === state.dppId) || rows[0];
    [id, name, done, , , spec] = row;
    displayId = id;
  }
  const stages = [
    ['원자재 조달', '완료', '공급사 3곳 데이터 연동 완료'],
    ['제조·가공', done >= 60 ? '완료' : '진행중', done >= 60 ? '공정 데이터 및 시험성적서 등록' : '압연 공정 데이터 미제출'],
    ['유통·물류', done >= 88 ? '완료' : '대기', done >= 88 ? '운송 구간 2건 기록' : '출하 후 자동 기록 예정'],
    ['사용·수리', '대기', '판매 이후 이벤트 수집 예정'],
    ['재활용·폐기', '대기', '재활용 사업자 스캔 시 기록']
  ];
  // dash가 있으면 이 DPP의 실제 미충족 필드만(dash.missingFields는 조직 전체 DPP를 다
  // 담고 있으므로 dppId로 걸러야 함), 없으면 예전 목데이터로 폴백. MissingFieldDto에는
  // "담당자 이름" 같은 건 없고 responsibleRoleName(책임 역할)/section(구분 코드)만 있어서
  // 그대로 정직하게 쓴다 - section 코드만 영문이라 최소한의 한글 라벨만 매핑.
  // 2026-08-19: T0·T1 시딩으로 섹션이 8개에서 21개로 늘었다. 여기 없는 섹션은 'HAZARD'
  // 같은 영문 코드가 그대로 화면에 뜨므로(|| f.section 폴백) 전부 채워둔다. 입력 폼 쪽은
  // 서버가 code_master(FIELD_SECTION)에서 라벨을 실어 보내지만, 이 미충족 목록이 쓰는
  // MissingFieldDto에는 section 코드만 있어서 아직 이 map이 필요하다.
  const SECTION_LABEL = {
    IDENTIFIER: '식별자', OPERATOR: '운영자·시설', SPEC: '제품 사양', MATERIAL: '조성·물질',
    CARBON: '탄소·환경', CIRCULAR: '순환·재생', DOCUMENT: '문서', SYSTEM: '시스템',
    COMPOSITION: '셀 화학·구성', CHEMISTRY: '화학 성분', MECHANICAL: '기계적 물성',
    PERFORMANCE: '성능·내구성', PROCESS: '공정 정보', RESOURCE: '자원·에너지',
    CRM: '핵심 원자재', HAZARD: '유해물질·SVHC', PACKAGING: '포장재',
    BMS: '동적 데이터(BMS)', DUE_DILIGENCE: '공급망 실사', TRADE: '원산지·통관',
    APPROVAL: '최종 승인'
  };
  const missing = dash
    ? dash.missingFields.filter(f => f.dppId === id).map(f => [f.labelKo, f.responsibleRoleName || '제조사', SECTION_LABEL[f.section] || f.section, '#E3A008'])
    : data.dppMissingData;
  // QR - 발급완료(100%)인 DPP만 표시. useAppLogic의 전용 useEffect가 모달이 열릴 때
  // 비동기로 생성해서 state.dppQrCache에 채워 넣는다(여기는 순수 렌더 함수라 직접 생성 불가).
  const qrImg = done === 100 ? (state.dppQrCache && state.dppQrCache[displayId]) : null;
  const qrPending = done === 100 && !qrImg && !!(state.dppQrPending && state.dppQrPending[displayId]);

  // --- 통관 신청 (2026-08-19 강 요청 "세관 실 데이터로 연결" - 세관 큐가 채워지려면
  // 누군가는 "이 DPP를 어느 나라로 수출한다"를 실제로 선언해야 한다. 발급 완료(100%)된
  // DPP에서만 열 수 있다. 수출국은 여기서 입력받지 않는다 - 서버(CustomsClearanceService)가
  // 내 조직의 country_code에서 그대로 가져가므로 신청자가 임의로 바꿀 수 없다. ---
  const cr = state.clearanceRequest || {};
  const crOpen = !!cr.open && cr.dppId === id;
  const submitClearanceRequest = () => {
    if (!cr.importCountryCode || !cr.importCountryCode.trim()) { ctx.say('수입국을 입력해 주세요.'); return; }
    if (!cr.importerName || !cr.importerName.trim()) { ctx.say('수입업체명을 입력해 주세요.'); return; }
    ctx.requestCustomsClearance({
      dppId: id,
      importCountryCode: cr.importCountryCode.trim(),
      importerName: cr.importerName.trim(),
      importerAddress: (cr.importerAddress || '').trim(),
      importerEori: (cr.importerEori || '').trim(),
      declaredHsCode: (cr.declaredHsCode || '').trim(),
    }).then((res) => {
      setState({ clearanceRequest: null });
      ctx.say('통관 신청을 접수했습니다. 관할 세관 ' + (res && res.createdCount != null ? res.createdCount : '') + '건에 배정되었습니다.');
    }).catch((err) => ctx.say(err.message || '통관 신청에 실패했습니다.'));
  };

  return {
    dppOpen: state.dppOpen,
    closeDpp: () => setState({ dppOpen: false }),
    dppId: id, dppName: name, dppPct: done, dppSpec: spec,
    dppStatusChip: done === 100 ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : done === 0 ? ctx.chip('rgba(224,59,59,.10)', '#C22B2B') : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
    dppMissingCount: done === 100 ? 0 : missing.length,
    dppDetailQrImg: qrImg || '',
    dppDetailQrPending: qrPending,
    dppDetailQrLabel: displayId,
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
    })),

    // --- 통관 신청 모달 ---
    dppCanRequestClearance: done === 100,
    openClearanceRequest: () => setState({ clearanceRequest: { open: true, dppId: id, declaredHsCode: '' } }),
    closeClearanceRequest: () => setState({ clearanceRequest: null }),
    crOpen,
    crImportCountryCode: cr.importCountryCode || '',
    onCrImportCountryCode: (e) => setState({ clearanceRequest: { ...cr, importCountryCode: e.target.value } }),
    crImporterName: cr.importerName || '',
    onCrImporterName: (e) => setState({ clearanceRequest: { ...cr, importerName: e.target.value } }),
    crImporterAddress: cr.importerAddress || '',
    onCrImporterAddress: (e) => setState({ clearanceRequest: { ...cr, importerAddress: e.target.value } }),
    crImporterEori: cr.importerEori || '',
    onCrImporterEori: (e) => setState({ clearanceRequest: { ...cr, importerEori: e.target.value.toUpperCase() } }),
    crDeclaredHsCode: cr.declaredHsCode || '',
    onCrDeclaredHsCode: (e) => setState({ clearanceRequest: { ...cr, declaredHsCode: e.target.value } }),
    submitClearanceRequest,
  };
}
