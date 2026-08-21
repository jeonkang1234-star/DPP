import React from 'react';
import { approveOrg, rejectOrg } from '../api/meApi.js';

/**
 * 가입승인 화면(관리자) - 예전엔 mock data.json의 signupApprovals 고정 배열을 그대로
 * 보여주기만 했다(승인/반려 버튼도 토스트만 띄우고 아무 것도 저장 안 함). 이제
 * com.dpp.mypage.controller.AdminOrganizationController(GET/POST /admin/organizations)
 * 실데이터로 붙인다(2026-08-16, 강 요청).
 *
 * 탭 3개: 전체 / 대기중(관리자 심사 필요) / 처리완료(승인·반려 모두 - 자동승인 포함).
 * "자동 승인"은 OrganizationService.findOrCreateForSignup의 사업자등록번호 체크섬
 * 자동심사를 통과한 경우(approvedBy가 없는 ACTIVE) - 실제 국세청/EU VIES 실시간 API
 * 연동은 아직 없다(KoreanBizRegNoValidator 주석 참고).
 */
export function approvalVals(ctx) {
  const { state, setState, orgApprovalsData, refetchOrgApprovals } = ctx;
  const rows = orgApprovalsData || [];
  const cur = state.apFilter || 'all';
  const isPending = (r) => r.approvalStatus === 'PENDING';
  const isDone = (r) => r.approvalStatus !== 'PENDING';
  const shown = rows.filter((r) => cur === 'all' || (cur === 'pending' ? isPending(r) : isDone(r)));
  // 2026-08-17 강 요청: "가입완료 계정, 가입대기 계정으로 필터링 가능하게" - 탭 자체는
  // 이미 있었고(전체/대기중/처리완료) 라벨만 요청한 문구에 맞게 정리한다. 다만 "처리완료"는
  // 승인/반려를 모두 포함하는 상태이고 "가입완료"는 실제로는 승인된 계정만을 뜻하는 것이
  // 더 정확하지만, 반려 건도 더 이상 "대기중"이 아니므로 지금은 기존과 동일하게 승인+반려를
  // 한 탭에 묶어 "가입완료"로 부른다 - 반려만 따로 보고 싶다면 각 행의 "반려됨" 표시로
  // 구분할 수 있다.
  const tabs = [
    ['all', '전체', rows.length],
    ['pending', '가입대기', rows.filter(isPending).length],
    ['done', '가입완료', rows.filter(isDone).length],
  ];

  const domainLabel = (d) => (d === 'STEEL' ? '철강' : d === 'BATTERY' ? '배터리' : d === 'TEXTILE' ? '섬유' : '—');

  const runAction = (promise, successMsg) => {
    promise.then(() => { ctx.say(successMsg); refetchOrgApprovals(); })
      .catch((err) => ctx.say(err.message || '처리하지 못했습니다.'));
  };

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
    apManualOnly: cur === 'pending',
    apEmpty: rows.length === 0,
    approvals: shown.map((r) => {
      const name = r.orgName;
      const country = r.countryCode || '—';
      const cc = r.countryCode || '—';
      const biz = r.bizRegNo || '—';
      // 2026-08-17 강 요청: "신청일시" 라벨인데 시간 없이 날짜만 나오던 것을 시:분까지
      // 나오는 진짜 타임스탬프로 수정(createdAt 자체는 원래도 전체 ISO 타임스탬프였음).
      const at = ctx.fmtDateTime(r.createdAt);
      const isAuto = r.autoApproved;
      const isManual = isPending(r);
      const isRejected = r.approvalStatus === 'REJECTED';
      // 자동승인 경로 이름. 실제로 도는 건 국세청 진위확인 API가 아니라 제출한
      // 사업자등록증의 형식·항목을 OCR로 읽어 확인하는 것뿐이라, 화면 문구도
      // 거기에 맞춘다(2026-08-20 강 요청).
      const route = isAuto ? 'OCR 자동검증'
        : isManual ? '관리자 수동 심사 필요'
        : isRejected ? '반려됨' + (r.rejectReason ? (': ' + r.rejectReason) : '')
        : '관리자 승인';
      return {
        key: r.orgId, name, country, cc, biz, at, route, doc: domainLabel(r.domain) + ' 도메인',
        isAuto, isManual, isRejected,
        routeStyle: { fontSize: 12.5, fontWeight: 600, color: isManual ? '#C22B2B' : isRejected ? '#8494AC' : '#0E7A3D' },
        ccStyle: { display: 'inline-grid', placeItems: 'center', width: 30, height: 22, borderRadius: 6, background: 'rgba(16,32,64,.07)', color: '#44546F', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700 },
        approve: () => runAction(approveOrg(r.orgId), name + ' 가입을 승인했습니다.'),
        // 2026-08-17 강 요청: "반려 버튼을 누르면 지금의 <문서 반려 관리> 페이지가
        // 팝업으로 바뀌게" - window.prompt 대신, 문서 반려 관리 화면(그 자체는 별도
        // 페이지로서는 삭제됨)과 같은 톤의 팝업을 띄워서 사유를 입력받는다.
        reject: () => setState({ rejectModal: { orgId: r.orgId, name }, rejectReasonInput: '' }),
        detail: () => setState({ docPreview: { name: name + ' · ' + domainLabel(r.domain), meta: country + ' · ' + biz, status: isManual ? '심사 대기' : isRejected ? '반려됨' : '승인됨' } })
      };
    }),
    rejectModalOpen: !!state.rejectModal,
    rejectModalName: state.rejectModal ? state.rejectModal.name : '',
    rejectReasonInput: state.rejectReasonInput || '',
    setRejectReasonInput: (e) => setState({ rejectReasonInput: e.target.value }),
    closeRejectModal: () => setState({ rejectModal: null, rejectReasonInput: '' }),
    // 예전 "문서 반려 관리" 페이지에 있던 자주 쓰는 반려 사유 3개를 빠른 선택 칩으로 재사용.
    rejectReasonPresets: ['필수 입력 데이터 누락', '데이터 적합성 오류', '인증서 유효기간 만료'].map((label) => ({
      key: label, label,
      apply: () => setState((s) => ({ rejectReasonInput: s.rejectReasonInput ? (s.rejectReasonInput + ' / ' + label) : label }))
    })),
    confirmReject: () => {
      if (!state.rejectModal) return;
      const { orgId, name } = state.rejectModal;
      const reason = (state.rejectReasonInput || '').trim();
      runAction(rejectOrg(orgId, reason), name + ' 가입을 반려하고 사유를 발송했습니다.');
      setState({ rejectModal: null, rejectReasonInput: '' });
    }
  };
}
