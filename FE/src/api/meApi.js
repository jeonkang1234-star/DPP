/**
 * 로그인한 사용자 전용(인증 필요) API. /me, /me/scans, /me/organization, /notifications*.
 *
 * mockApi.js(BASE_URL=/api, 화면용 mock 데이터)나 authApi.js(/auth/*, 토큰 없이 호출)와
 * 분리한 이유: 여긴 매 요청에 session.js에 저장된 accessToken을 Authorization 헤더로
 * 붙여야 하기 때문. vite.config.js(dev) / nginx.conf(운영) 둘 다 /me, /notifications를
 * 백엔드로 프록시하도록 이미 맞춰져 있어서, 여기서도 그냥 상대경로로 호출한다.
 */

import { loadSession } from './session.js';

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

/** 알림 카테고리 목록: [{key, label}] */
export function fetchNotificationCategories() {
  return authedFetch('/notifications/categories');
}

/** 알림 목록: [{key, label, title, body, createdAt, actionLabel, colorHex}] */
export function fetchNotifications() {
  return authedFetch('/notifications');
}
