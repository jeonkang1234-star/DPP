/**
 * 세션 저장소.
 *
 * 로그인 상태를 브라우저에 남기는 곳이 이 파일 하나로 모여 있습니다.
 * 실제 인증을 붙일 때는 저장 키와 토큰 형태만 여기서 바꾸면 됩니다.
 */

const PREFIX = 'ieum.';

export const SESSION_KEY = PREFIX + 'session';

/** 로그인 정보 저장 */
export function saveSession(session) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* 사파리 프라이빗 모드 등에서 저장이 막힌 경우 무시 */
  }
}

/** 저장된 로그인 정보 읽기 (없으면 null) */
export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 로그아웃 — 이 앱이 만든 저장값을 모두 지웁니다.
 * 'ieum.' 으로 시작하는 키만 지우므로 같은 도메인의 다른 데이터는 건드리지 않습니다.
 */
export function clearSession() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => localStorage.removeItem(k));
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  } catch {
    /* 저장소 접근 불가 시 무시 */
  }
}
