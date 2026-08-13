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

  const res = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
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
 * "강재 기본 정보" 입력 폼 - requirement_field 기준정보 + 저장된 값(dpp_field_value).
 * dppId를 안 주면 아직 저장 전인 새 폼(fields[].value가 전부 null)이 온다.
 */
export function fetchFieldForm(dppId) {
  return authedFetch(dppId ? `/me/field-form?dppId=${dppId}` : '/me/field-form');
}

/** 임시저장 - dppId가 없으면(첫 저장) 서버가 새 product_model/dpp를 만들고 dppId를 내려준다. */
export function saveFieldFormDraft(dppId, values) {
  return authedFetch('/me/field-form/draft', {
    method: 'POST',
    body: JSON.stringify({ dppId: dppId || null, domain: 'STEEL', values }),
  });
}

/** DPP 발급 제출 - status를 PENDING으로 바꾸고 issued_at을 찍는다(블록체인 앵커링은 별도 문서 업로드 플로우의 몫). */
export function issueFieldFormDpp(dppId) {
  return authedFetch(`/me/field-form/${dppId}/issue`, { method: 'POST' });
}

/** 협력사 초대 이력. status는 SENT/ACCEPTED/EXPIRED/REVOKED/REJECTED 원문 그대로 온다. */
export function fetchInvitations() {
  return authedFetch('/me/invitations');
}

/** 협력사 초대 발송 - dppId 필수(V11__invitation_dpp_link.sql 이후 초대는 항상 특정 DPP에 대한 것). */
export function sendInvitation(orgName, email, dppId) {
  return authedFetch('/me/invitations', { method: 'POST', body: JSON.stringify({ orgName, email, dppId }) });
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
