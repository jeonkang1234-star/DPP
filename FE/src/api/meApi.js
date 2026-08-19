/**
 * 로그인한 사용자 전용(인증 필요) API. /me, /me/scans, /me/organization, /notifications*.
 *
 * mockApi.js(BASE_URL=/api, 화면용 mock 데이터)나 authApi.js(/auth/*, 토큰 없이 호출)와
 * 분리한 이유: 여긴 매 요청에 session.js에 저장된 accessToken을 Authorization 헤더로
 * 붙여야 하기 때문. vite.config.js(dev) / nginx.conf(운영) 둘 다 /me, /notifications를
 * 백엔드로 프록시하도록 이미 맞춰져 있어서, 여기서도 그냥 상대경로로 호출한다.
 */

import { loadSession, clearSession } from './session.js';

// 여러 /me/* 요청이 한꺼번에 401을 맞아도(페이지 로드 시 병렬 fetch) 리다이렉트를 한
// 번만 하기 위한 플래그 - 안 하면 clearSession()이 여러 번 불려도 무해하지만
// window.location.href 대입이 반복돼서 콘솔에 불필요한 네비게이션 로그가 남는다.
let redirectingToLogin = false;

async function authedFetch(path, options = {}) {
  const session = loadSession();
  const token = session?.accessToken;

  // FormData(멀티파트 업로드, /me/documents/upload)일 땐 Content-Type을 직접 지정하면 안
  // 된다 - 브라우저가 파일 바이너리 경계(boundary)를 포함해서 자동으로 채워야 하는데,
  // 여기서 application/json으로 덮어쓰면 백엔드가 멀티파트를 못 읽어서 400/415가 난다.
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;

  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body && !isFormData ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  if (res.status === 401 && !redirectingToLogin) {
    // 토큰 만료/무효 - 아직 refresh token으로 재발급하는 로직이 없어서(TODO), 세션을
    // 지우고 로그인 화면으로 보낸다. 이전엔 이 401을 호출부에서 조용히 삼켜서(catch(()=>{}))
    // 화면이 마치 예전 목데이터로 "되돌아간 것"처럼 보이는 혼란을 줬다 - 이제 명확하게
    // 로그인 화면으로 쫓아낸다.
    redirectingToLogin = true;
    clearSession();
    window.location.href = '/';
  }

  if (!res.ok) {
    let message = '요청을 처리하지 못했습니다.';
    try {
      const data = await res.json();
      if (data && data.message) message = data.message;
    } catch {
      /* 본문 없는 에러 응답은 무시 */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** 로그인한 사용자 본인 정보: id/accountType/email/emailVerified/displayName/phone/phoneVerified/onboardingStep/connectedAccounts */
export function fetchMe() {
  return authedFetch('/me');
}

/** 스캔(조회) 이력 목록. */
export function fetchScans() {
  return authedFetch('/me/scans');
}

/** 스캔 이력 하나 삭제(소프트 삭제 - 제품 여권 자체는 안 지워짐). */
export function deleteScan(scanId) {
  return authedFetch(`/me/scans/${scanId}`, { method: 'DELETE' });
}

/**
 * 로그인한 사용자 소속 조직(회사) 프로필. 계정에 연결된 조직이 없으면(org_id NULL)
 * BE가 400을 던진다 - 호출부에서 그 경우를 감안해서 처리할 것.
 */
export function fetchOrganization() {
  return authedFetch('/me/organization');
}

/**
 * 조직 프로필 부분 수정(PUT이지만 PATCH 의미 - 요청에 없는 필드는 그대로 유지됨).
 * orgName/orgType/websiteUrl/leiCode/eoriCode/uoi/postalCode/addressLine1/addressLine2/
 * city/contactName/contactDept/contactPhone/contactEmail만 받는다.
 * countryCode/bizRegNo/domain은 가입 시 확정되고 여기서 못 바꾼다(백엔드가 아예 안 받음).
 */
export function updateOrganization(payload) {
  return authedFetch('/me/organization', { method: 'PUT', body: JSON.stringify(payload) });
}

/**
 * 로그인한 사용자 소속 조직의 DPP 현황 대시보드 실데이터. DPP가 하나도 없으면(제품 등록
 * 전) totalCount=0 등 전부 0/빈 배열로 온다 - 목데이터처럼 채워진 숫자가 아니다.
 * shape: { totalCount, incompleteCount, averageCompleteness, dpps:[...], missingFields:[...], zkpPendingCount, zkpRejectedCount }
 */
export function fetchDashboard() {
  return authedFetch('/me/dashboard');
}

/**
 * "기본 정보 입력" 폼 - requirement_field 기준정보 + 저장된 값(dpp_field_value).
 * dppId를 안 주면 아직 저장 전인 새 폼(fields[].value가 전부 null)이 온다 - 이때는 domain을
 * 꼭 같이 줘야 어느 도메인(STEEL/TEXTILE) 체크리스트인지 서버가 알 수 있다(안 주면 STEEL
 * 폴백). dppId가 있으면 서버가 dpp.domain을 그대로 신뢰하므로 domain은 무시된다.
 */
export function fetchFieldForm(dppId, domain) {
  if (dppId) return authedFetch(`/me/field-form?dppId=${dppId}`);
  return authedFetch(domain ? `/me/field-form?domain=${domain}` : '/me/field-form');
}

/** 임시저장 - dppId가 없으면(첫 저장) 서버가 새 product_model/dpp를 만들고 dppId를 내려준다. */
export function saveFieldFormDraft(dppId, domain, values) {
  return authedFetch('/me/field-form/draft', {
    method: 'POST',
    body: JSON.stringify({ dppId: dppId || null, domain: domain || 'STEEL', values }),
  });
}

/** DPP 발급 제출 - status를 PENDING으로 바꾸고 issued_at을 찍는다(블록체인 앵커링은 별도 문서 업로드 플로우의 몫). */
export function issueFieldFormDpp(dppId) {
  return authedFetch(`/me/field-form/${dppId}/issue`, { method: 'POST' });
}

/**
 * 필수 문서 업로드 화면(ZKP 전용 엔드포인트로 처리하는 유형 제외 - Mill Sheet/CBAM/섬유
 * 케어라벨/OEKO-TEX는 각각 별도 엔드포인트 사용). status: NOT_UPLOADED/PENDING/APPROVED/
 * REJECTED/EXPIRED. dppId가 없으면 fetchFieldForm과 동일하게 domain을 같이 줘야 한다.
 */
export function fetchDocumentForm(dppId, domain) {
  if (dppId) return authedFetch(`/me/documents?dppId=${dppId}`);
  return authedFetch(domain ? `/me/documents?domain=${domain}` : '/me/documents');
}

/** 문서 1건 업로드 - 업로드 즉시 승인 처리되고(관리자 검수 화면 아직 없음) 완성도가 재계산된다. */
export function uploadDocument(dppId, docTypeCode, file) {
  const formData = new FormData();
  formData.append('dppId', dppId);
  formData.append('docTypeCode', docTypeCode);
  formData.append('file', file);
  return authedFetch('/me/documents/upload', { method: 'POST', body: formData });
}

/**
 * 제강 성적서(Mill Sheet) 업로드 - 파서(화학성분/기계적성질 12개 값 추출) -> ZKP 증명 생성/검증
 * -> (blockchain.enabled=true인 환경만) 블록체인 앵커링까지 한 번에 처리한다.
 * 2026-08-19 수정: dppId를 필수로 받는다 - 예전엔 dppId 없이 백엔드가 "이 계정 조직의 첫
 * 번째 DPP"에 무조건 붙였는데(product/DPP 선택 화면이 아직 없어서의 임시 조치), 그 결과
 * "새 DPP 생성"으로 새 초안을 만들어도 Mill Sheet 업로드는 계속 옛날(첫) DPP로 가버려서,
 * 그 DPP에 이미 같은 내용의 파일이 있으면 실제로는 다른 DPP에 올리는 건데도
 * ux_document_dedup(owner_type, owner_id, doc_type_code, content_hash) 유니크 제약에 걸려
 * "이미 업로드된 파일입니다"(409)가 났다(com.dpp.document.service.DocumentIngestService 참고).
 * 이제 지금 작성 중인 DPP(fieldFormDppId)를 명시적으로 넘겨서 그 DPP에 붙인다.
 * /me/* 가 아니라 /document/upload/steel-mill이라 authedFetch를 경로만 다르게 재사용한다.
 */
export function uploadSteelMillSheet(dppId, file) {
  const formData = new FormData();
  formData.append('dppId', dppId);
  formData.append('file', file);
  return authedFetch('/document/upload/steel-mill', { method: 'POST', body: formData });
}

/**
 * CBAM(Q2_06) 탄소보고서 업로드 - 파서(수입 수량) -> cbam-check ZKP(de minimis 초과 여부) ->
 * (blockchain.enabled=true인 환경만) 블록체인 앵커링. Mill Sheet와 같은 이유(2026-08-19,
 * 위 uploadSteelMillSheet 주석 참고)로 dppId를 필수로 받는다(com.dpp.document.service.CbamIngestService).
 */
export function uploadCbamReport(dppId, file) {
  const formData = new FormData();
  formData.append('dppId', dppId);
  formData.append('file', file);
  return authedFetch('/document/upload/cbam', { method: 'POST', body: formData });
}

/**
 * 섬유 케어라벨(Q1_04) 업로드 - 파서(섬유 혼용률표) -> fiber-sum-check ZKP(합계 ≈100% 여부)
 * -> (blockchain.enabled=true인 환경만) 블록체인 앵커링. Mill Sheet와 같은 이유(2026-08-19)로
 * dppId를 필수로 받는다(com.dpp.document.service.CareLabelIngestService).
 */
export function uploadCareLabel(dppId, file) {
  const formData = new FormData();
  formData.append('dppId', dppId);
  formData.append('file', file);
  return authedFetch('/document/upload/textile-care-label', { method: 'POST', body: formData });
}

/**
 * OEKO-TEX 라벨(Q3_10) 업로드 - 파서(pH) -> oekotex-check ZKP(4.0~7.5 범위 여부) ->
 * (blockchain.enabled=true인 환경만) 블록체인 앵커링(com.dpp.document.service.OekotexIngestService).
 * Mill Sheet와 같은 이유(2026-08-19)로 dppId를 필수로 받는다.
 */
export function uploadOekotexLabel(dppId, file) {
  const formData = new FormData();
  formData.append('dppId', dppId);
  formData.append('file', file);
  return authedFetch('/document/upload/oekotex', { method: 'POST', body: formData });
}

/**
 * 배터리 탄소발자국 선언(Q2_07) 업로드 - 파서(재생원료 Co/Li/Ni/Pb + 정격용량) ->
 * battery-check ZKP(각 임계값 충족 여부) -> (blockchain.enabled=true인 환경만) 블록체인
 * 앵커링. Mill Sheet와 같은 이유(2026-08-19)로 dppId를 필수로 받는다
 * (com.dpp.document.service.BatteryCarbonIngestService).
 */
export function uploadBatteryCarbonReport(dppId, file) {
  const formData = new FormData();
  formData.append('dppId', dppId);
  formData.append('file', file);
  return authedFetch('/document/upload/battery-carbon', { method: 'POST', body: formData });
}

/**
 * 재활용 처리 결과 보고서(Q4_15) 업로드 - 파서(물질별 회수 실적표) -> recycling-check
 * ZKP(구리/리튬·코발트 물질회수율 기준 충족 여부) -> (blockchain.enabled=true인 환경만)
 * 블록체인 앵커링(com.dpp.document.service.RecyclingIngestService). Mill Sheet와 같은
 * 이유(2026-08-19)로 dppId를 필수로 받는다.
 */
export function uploadRecyclingReport(dppId, file) {
  const formData = new FormData();
  formData.append('dppId', dppId);
  formData.append('file', file);
  return authedFetch('/document/upload/recycling-report', { method: 'POST', body: formData });
}

/** 협력사 초대 이력. status는 SENT/ACCEPTED/EXPIRED/REVOKED/REJECTED 원문 그대로 온다. */
export function fetchInvitations() {
  return authedFetch('/me/invitations');
}

/**
 * 협력사 초대 발송 - dppId 필수(V11__invitation_dpp_link.sql 이후 초대는 항상 특정 DPP에
 * 대한 것). roleCode는 'RAW_SUPPLIER'(원자재/화학 공급사) 또는 'TEST_LAB'(제3자 시험·
 * 인증기관) - 안 주면 백엔드가 RAW_SUPPLIER로 기본 처리한다(com.dpp.collab.service.
 * InvitationService 참고, 2026-08-15부터 requirement_field.responsible_role이 이
 * 둘로 나뉘어서 초대 시점에 역할을 지정해야 협력사가 맞는 항목을 볼 수 있다).
 */
export function sendInvitation(orgName, email, dppId, roleCode) {
  return authedFetch('/me/invitations', { method: 'POST', body: JSON.stringify({ orgName, email, dppId, roleCode }) });
}

/** 초대 재발송 - 이미 수락(ACCEPTED)된 초대는 백엔드가 400으로 거부한다. */
export function resendInvitation(invitationId) {
  return authedFetch(`/me/invitations/${invitationId}/resend`, { method: 'POST' });
}

/** 파트너(협력사) 계정이 참여 요청받은 DPP 목록. */
export function fetchParticipations() {
  return authedFetch('/me/participations');
}

/** 알림 카테고리 목록: [{key, label}] */
export function fetchNotificationCategories() {
  return authedFetch('/notifications/categories');
}

/** 알림 목록: [{key, label, title, body, createdAt, actionLabel, colorHex}] */
export function fetchNotifications() {
  return authedFetch('/notifications');
}

/**
 * 관리자 가입승인 화면(com.dpp.mypage.controller.AdminOrganizationController) - ADMIN
 * 계정만 200을 받는다(그 외는 403). 목록은 필터 없이 전체를 내려주고 FE(approvalVals.js)가
 * 탭별로 나눠 보여준다.
 */
export function fetchOrgApprovals() {
  return authedFetch('/admin/organizations');
}

export function approveOrg(orgId) {
  return authedFetch(`/admin/organizations/${orgId}/approve`, { method: 'POST' });
}

export function rejectOrg(orgId, reason) {
  return authedFetch(`/admin/organizations/${orgId}/reject`, { method: 'POST', body: JSON.stringify({ reason }) });
}

/**
 * EU 시장감시(레지스트리)/관세청 통관 조회 공용 검색(com.dpp.verify.controller.
 * DppRegistryController) - ADMIN이거나 org_type이 EU_AUTHORITY/CUSTOMS인 계정만 200.
 * q를 안 주면 최신 발급분 50건을 돌려준다.
 */
export function searchDppRegistry(q) {
  const query = q ? `?q=${encodeURIComponent(q)}` : '';
  return authedFetch(`/verify/dpp/search${query}`);
}
