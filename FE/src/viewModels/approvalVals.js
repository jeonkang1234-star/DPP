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
  const tabs = [
    ['all', '전체', rows.length],
    ['pending', '대기중', rows.filter(isPending).length],
    ['done', '처리완료', rows.filter(isDone).length],
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
      const at = ctx.fmtDate(r.createdAt);
      const isAuto = r.autoApproved;
      const isManual = isPending(r);
      const isRejected = r.approvalStatus === 'REJECTED';
      const route = isAuto ? '국세청 체크섬 자동검증'
        : isManual ? '관리자 수동 심사 필요'
        : isRejected ? '반려됨' + (r.rejectReason ? (': ' + r.rejectReason) : '')
        : '관리자 승인';
      return {
        key: r.orgId, name, country, cc, biz, at, route, doc: domainLabel(r.domain) + ' 도메인',
        isAuto, isManual, isRejected,
        routeStyle: { fontSize: 12.5, fontWeight: 600, color: isManual ? '#C22B2B' : isRejected ? '#8494AC' : '#0E7A3D' },
        ccStyle: { display: 'inline-grid', placeItems: 'center', width: 30, height: 22, borderRadius: 6, background: 'rgba(16,32,64,.07)', color: '#44546F', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, fontWeight: 700 },
        approve: () => runAction(approveOrg(r.orgId), name + ' 가입을 승인했습니다.'),
        reject: () => {
          const reason = window.prompt(name + ' 반려 사유를 입력해 주세요(빈 값이면 기본 사유로 처리됩니다):', '');
          if (reason === null) return; // 취소
          runAction(rejectOrg(r.orgId, reason), name + ' 가입을 반려하고 사유를 발송했습니다.');
        },
        detail: () => setState({ docPreview: { name: name + ' · ' + domainLabel(r.domain), meta: country + ' · ' + biz, status: isManual ? '심사 대기' : isRejected ? '반려됨' : '승인됨' } })
      };
    })
  };
}
