import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 *
 * 제품조회 "상세" 모달 - 예전엔 이 화면 전체가 목데이터(ctx.compData(), 어느 DPP를 열어도
 * 항상 같은 5건짜리 dppMissingData가 나옴)였다. dash(GET /me/dashboard)가 있으면 실제로
 * 열어본 그 DPP의 실 completeness/missingFields로 바꾼다(2026-08-17, 강 요청 - "목데이터
 * 좀 그만 보여주고 실데이터로").
 *
 * 2026-09-17 강 5차 피드백: 5단계(원자재조달/제조가공/유통물류/사용수리/재활용폐기)가
 * completeness 문턱값(60/88%)으로 대충 추정한 것이었고, "원자재 조달 완료 - 공급사
 * 3곳 데이터 연동 완료"는 아예 하드코딩된 가짜 문구였다(우리 플랫폼이 실제로 공급사
 * 몇 곳과 연동됐는지와 무관하게 항상 3곳이라고 표시됨). 백엔드에 dpp.lifecycle_stage
 * 컬럼이 있긴 하지만 어디서도 실제로 갱신하지 않는 죽은 필드라 그대로는 못 쓴다.
 * 대신 이미 FE가 갖고 있는 실데이터만으로 단계별 상태를 다시 계산한다 - 새 백엔드
 * API 없이도 아래 3가지가 이미 진짜 신호다:
 *   1) dash.missingFields의 responsibleRoleName(RAW_SUPPLIER='원자재·화학 공급사',
 *      제조사, RECYCLER='재활용 처리업체') - 그 역할이 담당인 미충족 필드가 이 DPP에
 *      하나도 없으면 그 역할 몫은 다 채워진 것.
 *   2) ctx.invitesData - 그 역할로 실제 초대를 보낸 적이 있는지(진행중/대기 구분용).
 *   3) issued(발급 여부, 서버의 issuedAtDate/status 기준) - 유통·물류 진입 신호로 씀.
 * "유통·물류"의 진짜 트리거(출하 이벤트)와 "사용·수리"의 진짜 트리거(소비자가 QR을
 * 스캔한 scan_history 기록)는 지금 FE 대시보드 응답에 안 내려오므로 여전히 근사치다 -
 * 유통·물류는 발급 여부로, 사용·수리는 아직 연동 전이라고 정직하게 "대기"로 둔다.
 * 원자재조달 -> 제조가공 -> 유통물류 -> 사용수리는 강이 말한 순서대로 이전 단계가
 * "완료"여야 다음 단계도 완료/진행중으로 보여준다(순서상 앞 단계가 안 끝났는데 뒷
 * 단계만 먼저 완료로 뜨는 걸 막음). 재활용·폐기(RECYCLER)는 배터리 등 도메인에서
 * 발급 전에도 미리 초대해두는 경우가 실제로 있어서 이 순서 게이트에서 뺐다 - 초대/제출
 * 여부로 독립적으로 판정.
 */
export function dppVals(ctx) {
  const { state, setState, props, data } = ctx;
  const dash = ctx.dashboardData;
  const dashRow = dash ? dash.dpps.find(d => d.dppId === state.dppId) : null;
  let id, name, done, spec, displayId;
  // 발급 여부는 완성도가 아니라 서버가 준 발급일시/상태로 판정한다(2026-08-23 강 리포트 -
  // 발급을 취소해도 화면이 계속 "발급 완료"로 보이던 문제). makerVals.isIssuedDpp와 같은 규칙.
  const issued = !!(dashRow && (dashRow.issuedAtDate || dashRow.status === 'ACTIVE'));
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
  // dash가 없으면(목데이터 폴백) 예전처럼 완성도 문턱값 근사를 그대로 쓰고, 있으면
  // 아래에서 역할별 실데이터로 다시 계산한다.
  const dppMissingRaw = dash ? dash.missingFields.filter(f => f.dppId === id) : [];
  const roleOfMissing = (f) => f.responsibleRoleName || '제조사';
  const missingRawSupplier = dppMissingRaw.filter(f => roleOfMissing(f) === '원자재·화학 공급사');
  const missingManufacturer = dppMissingRaw.filter(f => roleOfMissing(f) === '제조사');
  const missingRecycler = dppMissingRaw.filter(f => roleOfMissing(f) === '재활용 처리업체');
  const hasRoleInvite = (roleCode) => (ctx.invitesData || []).some(i => i.dppId === id && i.roleCode === roleCode);

  const rawDone = dash ? missingRawSupplier.length === 0 : true;
  const rawStatus = !dash ? '완료' : rawDone ? '완료' : hasRoleInvite('RAW_SUPPLIER') ? '진행중' : '대기';
  const rawDetail = !dash
    ? '공급사 데이터 연동 완료'
    : rawDone ? '원자재 공급사 담당 데이터 입력 완료'
    : hasRoleInvite('RAW_SUPPLIER') ? '초대한 원자재 공급사의 데이터 입력 대기 중'
    : '원자재 공급사 초대 전';

  const mfgDone = dash ? missingManufacturer.length === 0 : done >= 60;
  const mfgStatus = !rawDone ? '대기' : mfgDone ? '완료' : '진행중';
  const mfgDetail = !rawDone
    ? '원자재 조달 완료 후 진행 예정'
    : mfgDone ? '제조사 담당 데이터 입력 완료'
    : '제조사 담당 데이터 입력 중';

  const distDone = mfgDone && issued;
  const distStatus = !mfgDone ? '대기' : distDone ? '완료' : '대기';
  const distDetail = !mfgDone
    ? '제조·가공 완료 후 진행 예정'
    : distDone ? '발급 완료 - 유통 단계 진입'
    : '발급 후 자동으로 시작됩니다';

  // 소비자가 QR로 여권을 조회한 scan_history 기록이 "사용" 단계의 실제 신호에 가장
  // 가깝지만, 그 집계가 아직 이 대시보드 응답에 안 내려온다 - 지어내지 않고 정직하게
  // "대기"로 둔다(다음에 백엔드가 DPP별 scan 수를 내려주면 여기를 실데이터로 바꿀 것).
  const useStatus = '대기';
  const useDetail = !distDone ? '유통 단계 진입 후 진행 예정' : '판매 이후 이벤트 수집 예정(연동 예정)';

  const recycDone = dash ? (missingRecycler.length === 0 && hasRoleInvite('RECYCLER')) : false;
  const recycStatus = recycDone ? '완료' : hasRoleInvite('RECYCLER') ? '진행중' : '대기';
  const recycDetail = recycDone
    ? '재활용 처리업체 담당 데이터 입력 완료'
    : hasRoleInvite('RECYCLER') ? '초대한 재활용 처리업체의 데이터 입력 대기 중'
    : '재활용 처리업체 초대 전';

  // 2026-09-19: 서버가 단계별 실제 진행률을 내려주면(V36 v_dpp_lifecycle_status,
  // DppSummaryDto.lifecycle) 위의 역할 기반 추정 대신 그 숫자를 쓴다. 역할 추정은
  // "원자재 공급사 담당 필드가 하나도 없으면 원자재 단계 완료"처럼 사실이 아닌 결론을
  // 냈다 - 그 역할에 배정된 항목이 애초에 없는 경우와 다 채운 경우를 구분하지 못한다.
  //
  // 서버는 12단계로 내려주고 이 화면은 5단계로 보여주므로 묶어서 합산한다. 이 화면의
  // 단계 수를 바꾸면 디자인이 통째로 흔들려서, 표시 단위는 그대로 두고 안쪽 숫자만
  // 실데이터로 바꿨다.
  const STAGE_GROUPS = [
    ['원자재 조달', [1, 2]],
    ['제조·가공', [3, 4, 5]],
    ['유통·물류', [6, 7, 8]],
    ['사용·수리', [9, 10]],
    ['재활용·폐기', [11, 12]]
  ];
  const lcRows = dashRow && Array.isArray(dashRow.lifecycle) ? dashRow.lifecycle : null;
  const stagesFromServer = lcRows && lcRows.length
    ? STAGE_GROUPS.map(([label, nos]) => {
        const rows = lcRows.filter(l => nos.indexOf(l.stageNo) >= 0);
        const req = rows.reduce((a, l) => a + (l.requiredCount || 0), 0);
        const fil = rows.reduce((a, l) => a + (l.filledCount || 0), 0);
        // 필수 항목이 아예 없는 단계를 100%로 올리면 아무 일도 안 일어났는데 완료로 보인다.
        if (req === 0) {
          return [label, '해당 없음', '이 제품에서 추적하는 항목이 없습니다'];
        }
        if (fil >= req) {
          return [label, '완료', `필수 항목 ${req}건 모두 입력 완료`];
        }
        if (fil > 0) {
          return [label, '진행중', `필수 항목 ${fil}/${req}건 입력됨`];
        }
        return [label, '대기', `필수 항목 ${req}건 입력 대기`];
      })
    : null;

  const stages = stagesFromServer || [
    ['원자재 조달', rawStatus, rawDetail],
    ['제조·가공', mfgStatus, mfgDetail],
    ['유통·물류', distStatus, distDetail],
    ['사용·수리', useStatus, useDetail],
    ['재활용·폐기', recycStatus, recycDetail]
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
  // 2026-09-17 강 요청: "독촉 알림 전송" 버튼은 실제로 협력사 초대 화면으로 보내는
  // 동작인데, 이 DPP에 아직 초대한 협력사가 하나도 없으면 "독촉"할 대상 자체가 없다.
  // ctx.invitesData는 useAppLogic이 로그인 직후 전체 조직 단위로 미리 불러와 두는
  // 목록(20초 폴링)이라 여기서 이 DPP의 초대 존재 여부를 바로 물어볼 수 있다.
  const hasInvitedPartner = (ctx.invitesData || []).some(i => i.dppId === id);
  // QR - 발급완료(100%)인 DPP만 표시. useAppLogic의 전용 useEffect가 모달이 열릴 때
  // 비동기로 생성해서 state.dppQrCache에 채워 넣는다(여기는 순수 렌더 함수라 직접 생성 불가).
  // QR은 발급된 DPP만. 공개 여권(GET /public/dpp)이 issued_at NULL이면 "아직 발급되지
  // 않은 DPP"를 돌려주므로, 발급 전에 QR을 그리면 스캔했을 때 빈 화면으로 간다.
  const qrImg = issued ? (state.dppQrCache && state.dppQrCache[displayId]) : null;
  const qrPending = issued && !qrImg && !!(state.dppQrPending && state.dppQrPending[displayId]);

  // 통관 신청 UI는 삭제했다(2026-08-23 강 요청 "어차피 안 쓰니까"). 세관 심사 큐는
  // 이 화면에서 손으로 신청하지 않아도 채워진다 - 발급 시점에 서버가 자동으로 접수한다
  // (CustomsClearanceService.autoCreateOnIssue, V24 마이그레이션 주석 참고). 그래서
  // 제조사가 수입국·수입업체를 다시 입력하는 이 폼은 하는 일이 겹쳤다.
  // /me/clearance-requests 엔드포인트와 meApi.requestCustomsClearance는 남겨둔다 -
  // 수입국을 실제로 골라야 하는 흐름이 생기면 화면만 다시 붙이면 된다.

  return {
    dppOpen: state.dppOpen,
    closeDpp: () => setState({ dppOpen: false }),
    dppId: id, dppName: name, dppPct: done, dppSpec: spec,
    dppStatusChip: issued ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : done === 0 ? ctx.chip('rgba(224,59,59,.10)', '#C22B2B') : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
    dppMissingCount: done === 100 ? 0 : missing.length,
    dppIssued: issued,
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
      // 2026-08-21 강 요청: 토스트만 띄우지 말고 그 DPP의 협력사 관리 화면으로 보낸다.
      // 거기서 실제로 초대/재발송을 할 수 있다(예전 문구는 메일이 나간 것처럼 말했지만
      // 실제로는 아무 일도 하지 않았다).
      // 협력사를 초대하기 전에는 비활성화 - 버튼을 눌러도 아무 협력사도 초대된 적
      // 없는 상태에서 "독촉 알림"을 보낸다는 건 말이 안 된다(2026-09-17 강 요청).
      nudgeDisabled: !hasInvitedPartner,
      nudge: !hasInvitedPartner ? undefined : () => {
        setState({
          dppOpen: false,
          tab: 'partners',
          partnersDppId: id,
          inviteRows: [{ orgName: '', email: '', roleCode: 'RAW_SUPPLIER' }]
        });
        ctx.say(owner + ' 담당 항목이 비어 있습니다 · 협력사 관리에서 초대를 보내세요.');
      }
    })),

  };
}
