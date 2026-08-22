import React from 'react';
import { approveOrg, rejectOrg, fetchOrgApprovalDetail, fetchOrgBizCertBlob } from '../api/meApi.js';

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

  // ── 「상세 정보」 모달 ────────────────────────────────────────────────
  // 2026-08-22 강 요청: 예전엔 mock docPreview 모달에 회사명/국가만 찍어서 사실상 빈
  // 화면이었다. 이제 GET /admin/organizations/{id}로 가입 때 받은 값 전부를 가져오고,
  // 제출한 사업자등록증은 blob으로 받아 PDF/이미지는 모달 안에서 바로 렌더한다
  // (그 외 형식이거나 브라우저가 못 그리면 내려받기 버튼으로 폴백).
  const fmtBytes = (n) => (!n && n !== 0 ? '—' : n < 1024 ? n + ' B' : n < 1024 * 1024 ? (n / 1024).toFixed(0) + ' KB' : (n / 1024 / 1024).toFixed(1) + ' MB');

  const revokeCert = () => {
    // blob URL은 명시적으로 해제하지 않으면 탭이 닫힐 때까지 메모리에 남는다.
    if (state.orgDetailCertUrl) URL.revokeObjectURL(state.orgDetailCertUrl);
  };

  const openDetail = (orgId) => {
    revokeCert();
    setState({ orgDetail: null, orgDetailLoading: true, orgDetailError: '', orgDetailCertUrl: '', orgDetailCertKind: '', orgDetailCertError: '' });
    fetchOrgApprovalDetail(orgId)
      .then((d) => {
        setState({ orgDetail: d, orgDetailLoading: false });
        if (!d.hasBizRegCert) return;
        return fetchOrgBizCertBlob(orgId)
          .then((blob) => {
            const mime = blob.type || d.bizRegCertMime || '';
            const kind = mime.includes('pdf') ? 'pdf' : mime.startsWith('image/') ? 'image' : 'other';
            setState({ orgDetailCertUrl: URL.createObjectURL(blob), orgDetailCertKind: kind });
          })
          .catch((err) => setState({ orgDetailCertError: err.message || '증빙서류를 불러오지 못했습니다.' }));
      })
      .catch((err) => setState({ orgDetailLoading: false, orgDetailError: err.message || '상세 정보를 불러오지 못했습니다.' }));
  };

  // 도메인 확장 증빙서류 뷰어 - 가입 심사 서류와 같은 방식.
  const openGrantDoc = (g) => {
    if (state.grantDocUrl) URL.revokeObjectURL(state.grantDocUrl);
    setState({
      grantDoc: { grantId: g.grantId, title: g.orgName + ' · ' + g.domainLabel, name: g.evidenceName },
      grantDocUrl: '', grantDocKind: '', grantDocError: ''
    });
    if (!g.hasEvidence) {
      setState({ grantDocError: '제출된 증빙서류가 없습니다.' });
      return;
    }
    ctx.fetchDomainGrantEvidenceBlob(g.grantId)
      .then((blob) => {
        const mime = blob.type || g.evidenceMime || '';
        const kind = mime.includes('pdf') ? 'pdf' : mime.startsWith('image/') ? 'image' : 'other';
        setState({ grantDocUrl: URL.createObjectURL(blob), grantDocKind: kind });
      })
      .catch((err) => setState({ grantDocError: err.message || '증빙서류를 불러오지 못했습니다.' }));
  };

  const d = state.orgDetail;
  const dash = (v) => (v === null || v === undefined || v === '' ? '—' : v);
  const statusLabel = (st) => (st === 'ACTIVE' ? '승인됨' : st === 'PENDING' ? '심사 대기' : st === 'REJECTED' ? '반려됨' : st === 'SUSPENDED' ? '정지됨' : dash(st));

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
        detail: () => openDetail(r.orgId)
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
    // ── 상세 정보 모달 바인딩 ──
    orgDetailOpen: !!(state.orgDetail || state.orgDetailLoading || state.orgDetailError),
    orgDetailLoading: !!state.orgDetailLoading,
    orgDetailError: state.orgDetailError || '',
    orgDetailTitle: d ? d.orgName : '상세 정보',
    orgDetailSubtitle: d ? (d.orgTypeLabel + ' · ' + statusLabel(d.approvalStatus)) : '',
    orgDetailStatusChip: d ? ctx.chip(
      d.approvalStatus === 'ACTIVE' ? 'rgba(18,161,80,.12)' : d.approvalStatus === 'PENDING' ? 'rgba(227,160,8,.16)' : 'rgba(224,59,59,.10)',
      d.approvalStatus === 'ACTIVE' ? '#0E7A3D' : d.approvalStatus === 'PENDING' ? '#96660A' : '#C22B2B'
    ) : null,
    orgDetailStatusLabel: d ? statusLabel(d.approvalStatus) : '',
    // 가입 화면에서 받은 값 그대로. mono=true면 등폭 글꼴로(번호·코드류).
    orgDetailRows: d ? [
      ['회사·기관명', d.orgName, false],
      ['계정 유형', d.orgTypeLabel, false],
      ['도메인', domainLabel(d.domain), false],
      ['국가', dash(d.countryCode), true],
      ['사업자등록번호', dash(d.bizRegNo), true],
      ['주소', dash(d.addressLine), false],
      ['홈페이지', dash(d.websiteUrl), false],
      ['담당자', dash(d.contactName), false],
      ['담당자 연락처', dash(d.contactPhone), true],
      ['담당자 이메일', dash(d.contactEmail), false],
      ['신청일시', ctx.fmtDateTime(d.createdAt), false],
      ['심사일시', d.approvedAt ? ctx.fmtDateTime(d.approvedAt) : '—', false],
    ].map(([label, value, mono]) => ({ key: label, label, value, valueStyle: mono ? { fontFamily: "'JetBrains Mono',monospace", fontSize: 13, fontWeight: 600 } : { fontSize: 13.5, fontWeight: 600 } })) : [],
    orgDetailMembers: d ? (d.members || []).map((m) => ({
      key: m.userId,
      email: m.email,
      name: dash(m.displayName),
      phone: dash(m.phone),
      verified: (m.emailVerified ? '이메일 ✓' : '이메일 ✗') + ' · ' + (m.phoneVerified ? '전화 ✓' : '전화 ✗'),
      joinedAt: ctx.fmtDateTime(m.createdAt),
      chip: ctx.chip(m.emailVerified && m.phoneVerified ? 'rgba(18,161,80,.12)' : 'rgba(227,160,8,.16)',
        m.emailVerified && m.phoneVerified ? '#0E7A3D' : '#96660A')
    })) : [],
    orgDetailMembersEmpty: !!d && (!d.members || d.members.length === 0),
    // 자동검증 판정. 공적 기관은 아예 안 돌리므로 null이고, 그때는 박스를 감춘다.
    orgDetailVerifyShown: !!(d && d.verifyCheckedAt),
    orgDetailVerifyPassed: !!(d && d.verifyAutoApprovable),
    orgDetailVerifyLabel: d && d.verifyAutoApprovable ? 'OCR 자동검증 통과' : 'OCR 자동검증 미통과 · 수동 심사 필요',
    orgDetailVerifyStyle: d ? {
      padding: '13px 15px', borderRadius: 13, fontSize: 12.5, lineHeight: 1.6,
      background: d.verifyAutoApprovable ? 'rgba(18,161,80,.07)' : 'rgba(227,160,8,.08)',
      border: '1px solid ' + (d.verifyAutoApprovable ? 'rgba(18,161,80,.24)' : 'rgba(227,160,8,.28)'),
      color: '#44546F'
    } : null,
    orgDetailVerifyReasons: d && d.verifyReasons
      ? d.verifyReasons.split('\n').filter(Boolean).map((line, i) => ({ key: i, line }))
      : [],
    // 제출 서류
    orgDetailHasCert: !!(d && d.hasBizRegCert),
    orgDetailCertName: d ? dash(d.bizRegCertName) : '',
    orgDetailCertMeta: d && d.hasBizRegCert
      ? [dash(d.bizRegCertMime), fmtBytes(d.bizRegCertSize), d.bizRegCertUploadedAt ? ctx.fmtDateTime(d.bizRegCertUploadedAt) : null].filter(Boolean).join(' · ')
      : '',
    orgDetailCertUrl: state.orgDetailCertUrl || '',
    orgDetailCertIsPdf: state.orgDetailCertKind === 'pdf',
    orgDetailCertIsImage: state.orgDetailCertKind === 'image',
    // PDF/이미지가 아니거나 아직 못 받았으면 내려받기만 제공한다.
    orgDetailCertDownloadOnly: !!state.orgDetailCertUrl && state.orgDetailCertKind === 'other',
    orgDetailCertError: state.orgDetailCertError || '',
    orgDetailCertLoading: !!(d && d.hasBizRegCert && !state.orgDetailCertUrl && !state.orgDetailCertError),
    orgDetailCertDownloadName: d ? (d.bizRegCertName || 'biz-reg-cert') : 'biz-reg-cert',
    closeOrgDetail: () => {
      revokeCert();
      setState({ orgDetail: null, orgDetailLoading: false, orgDetailError: '', orgDetailCertUrl: '', orgDetailCertKind: '', orgDetailCertError: '' });
    },
    // 모달 안에서 바로 승인/반려까지 끝낼 수 있게. 심사 대기 상태일 때만 보인다.
    orgDetailActionsShown: !!(d && d.approvalStatus === 'PENDING'),
    orgDetailApprove: () => {
      if (!d) return;
      const name = d.orgName;
      const orgId = d.orgId;
      revokeCert();
      setState({ orgDetail: null, orgDetailCertUrl: '', orgDetailCertKind: '' });
      runAction(approveOrg(orgId), name + ' 가입을 승인했습니다.');
    },
    orgDetailReject: () => {
      if (!d) return;
      const name = d.orgName;
      const orgId = d.orgId;
      revokeCert();
      setState({ orgDetail: null, orgDetailCertUrl: '', orgDetailCertKind: '', rejectModal: { orgId, name }, rejectReasonInput: '' });
    },

    // ── 도메인 확장 심사(2026-08-22 강 요청) ─────────────────────────
    // 회원 관리 탭 안에 「가입 심사 / 도메인 확장」 두 갈래를 둔다. 제출 서류를 여는 방식은
    // 가입 심사와 같다(blob -> object URL -> iframe/img).
    apSection: state.apSection === 'domain' ? 'domain' : 'signup',
    apSectionTabs: [['signup', '가입 심사'], ['domain', '도메인 확장']].map(([k, label]) => ({
      key: k, label,
      count: k === 'signup' ? rows.length : (ctx.domainGrantsData || []).length,
      style: {
        display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 16px', border: 0,
        borderRadius: 999, cursor: 'pointer', fontSize: 13.5, fontWeight: 600,
        background: (state.apSection === k || (k === 'signup' && state.apSection !== 'domain')) ? '#0B1B33' : '#fff',
        color: (state.apSection === k || (k === 'signup' && state.apSection !== 'domain')) ? '#fff' : '#44546F'
      },
      go: () => setState({ apSection: k })
    })),
    domainGrantsEmpty: (ctx.domainGrantsData || []).length === 0,
    domainGrants: (ctx.domainGrantsData || []).map((g) => ({
      key: g.grantId,
      orgName: g.orgName,
      domain: g.domainLabel,
      status: g.statusLabel,
      isPending: g.status === 'PENDING',
      reason: g.rejectReason || g.requestReason || '—',
      at: ctx.fmtDateTime(g.requestedAt),
      chip: ctx.chip(
        g.status === 'APPROVED' ? 'rgba(18,161,80,.12)' : g.status === 'PENDING' ? 'rgba(227,160,8,.16)' : 'rgba(224,59,59,.10)',
        g.status === 'APPROVED' ? '#0E7A3D' : g.status === 'PENDING' ? '#96660A' : '#C22B2B'
      ),
      openDoc: () => openGrantDoc(g),
      approve: () => ctx.approveDomainGrant(g.grantId)
        .then(() => { ctx.say(g.orgName + ' 의 ' + g.domainLabel + ' 도메인 확장을 승인했습니다.'); ctx.refetchDomainGrants(); })
        .catch((err) => ctx.say(err.message || '처리하지 못했습니다.')),
      reject: () => setState({ dgRejectModal: { grantId: g.grantId, name: g.orgName + ' · ' + g.domainLabel }, rejectReasonInput: '' })
    })),
    grantDocOpen: !!state.grantDoc,
    grantDocTitle: state.grantDoc ? state.grantDoc.title : '',
    grantDocName: state.grantDoc ? (state.grantDoc.name || '—') : '',
    grantDocUrl: state.grantDocUrl || '',
    grantDocIsPdf: state.grantDocKind === 'pdf',
    grantDocIsImage: state.grantDocKind === 'image',
    grantDocDownloadOnly: !!state.grantDocUrl && state.grantDocKind === 'other',
    grantDocError: state.grantDocError || '',
    grantDocLoading: !!(state.grantDoc && !state.grantDocUrl && !state.grantDocError),
    closeGrantDoc: () => {
      if (state.grantDocUrl) URL.revokeObjectURL(state.grantDocUrl);
      setState({ grantDoc: null, grantDocUrl: '', grantDocKind: '', grantDocError: '' });
    },
    dgRejectModalOpen: !!state.dgRejectModal,
    dgRejectModalName: state.dgRejectModal ? state.dgRejectModal.name : '',
    closeDgRejectModal: () => setState({ dgRejectModal: null, rejectReasonInput: '' }),
    confirmDgReject: () => {
      if (!state.dgRejectModal) return;
      const { grantId, name } = state.dgRejectModal;
      const reason = (state.rejectReasonInput || '').trim();
      setState({ dgRejectModal: null, rejectReasonInput: '' });
      ctx.rejectDomainGrant(grantId, reason)
        .then(() => { ctx.say(name + ' 신청을 반려했습니다.'); ctx.refetchDomainGrants(); })
        .catch((err) => ctx.say(err.message || '처리하지 못했습니다.'));
    },

    confirmReject: () => {
      if (!state.rejectModal) return;
      const { orgId, name } = state.rejectModal;
      const reason = (state.rejectReasonInput || '').trim();
      runAction(rejectOrg(orgId, reason), name + ' 가입을 반려하고 사유를 발송했습니다.');
      setState({ rejectModal: null, rejectReasonInput: '' });
    }
  };
}
