/**
 * 세션 저장소.
 *
 * 로그인 상태를 브라우저에 남기는 곳이 이 파일 하나로 모여 있습니다.
 * 실제 인증을 붙일 때는 저장 키와 토큰 형태만 여기서 바꾸면 됩니다.
 *
 * **2026-08-15: localStorage -> sessionStorage로 변경.** localStorage는 같은 브라우저의
 * 모든 탭이 공유하는 저장소라, 탭A에서 제조사로 로그인해놓고 탭B에서 협력사로 로그인하면
 * 탭B의 로그인이 탭A의 세션까지 덮어써버렸다 - 탭A를 새로고침하면 방금 로그인한 협력사
 * 계정으로 바뀌어 있는 것처럼 보였다("철강 데이터 입력" 화면이 갑자기 협력사 스코프로
 * 좁아진 것처럼 보인 원인 중 하나 - dpp_participant 데이터 자체는 멀쩡했다). sessionStorage는
 * 탭마다 독립된 저장소라 이 문제가 원천적으로 없다. 트레이드오프: 같은 탭 안에서
 * 새로고침해도 로그인은 유지되지만(sessionStorage도 새로고침엔 살아남음), 탭을 완전히
 * 닫았다가 새로 열면 다시 로그인해야 한다 - 이 프로젝트는 아직 QA/테스트 단계라 이 정도
 * 트레이드오프가 "다른 계정으로 로그인했더니 내 세션이 사라짐" 버그보다 훨씬 낫다고 판단.
 */

const PREFIX = 'ieum.';

export const SESSION_KEY = PREFIX + 'session';

/** 로그인 정보 저장 */
export function saveSession(session) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* 사파리 프라이빗 모드 등에서 저장이 막힌 경우 무시 */
  }
}

/** 저장된 로그인 정보 읽기 (없으면 null) */
export function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * 작성 중인 DPP(dppId) 기억 - 역할(도메인)별로 하나씩. "철강 데이터 입력" 화면은 이 값을
 * 잃어버리면 새로고침할 때마다 빈 폼부터 다시 시작하는 게 문제였다(2026-08-15, "이거
 * 진짜 해야됨" 사용자 피드백). 로그인 세션은 이미 localStorage에 남기고 있었는데
 * (SESSION_KEY) fieldFormDppId는 React state에만 있어서 새로고침하면 날아갔다 - 같은
 * 'ieum.' 프리픽스로 저장해서 clearSession()(로그아웃)이 자동으로 같이 지워지게 한다.
 *
 * **2026-08-15 수정**: 처음엔 role만으로 키를 만들었는데(draftDppId.steel), 이러면
 * 로그아웃 없이(토큰 만료로 그냥 탭을 닫았다가, 또는 테스트 중 다른 계정으로 바로
 * 재로그인) 같은 브라우저에서 role='steel'인 계정을 두 번째로 로그인하면 첫 번째
 * 계정이 작업하던 dppId를 그대로 물려받는 버그였다 - "강재 기본 정보"가 갑자기
 * 원자재공급사 담당 4개 필드만 보이는 것처럼 보였던 원인(사실은 남의 조직 DPP에
 * 참여자로 잡힌 dppId를 불러온 것). email까지 키에 포함시켜 계정별로 분리한다.
 */
function draftDppKey(role, email) {
  const account = (email || 'default').trim().toLowerCase();
  return PREFIX + 'draftDppId.' + (role || 'default') + '.' + account;
}

export function saveDraftDppId(role, email, dppId) {
  try {
    sessionStorage.setItem(draftDppKey(role, email), JSON.stringify(dppId ?? null));
  } catch {
    /* 사파리 프라이빗 모드 등에서 저장이 막힌 경우 무시 */
  }
}

export function loadDraftDppId(role, email) {
  try {
    const raw = sessionStorage.getItem(draftDppKey(role, email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * "강재 기본 정보" 입력 폼에 지금 타이핑 중인 값(dpp_field_value로 아직 저장 안 된 것)을
 * 새로고침해도 잃지 않기 위한 캐시(2026-08-18, "화면 새로고침해도 입력하던 데이터들은
 * 그대로 있도록 - 임시저장 안하더라도" 사용자 요청). draftDppKey와 같은 이유로 role+email+
 * dppId까지 키에 넣는다 - dppId가 아직 없는 새 초안은 'new'로 취급한다. 서버에 실제로
 * 저장된 값(dpp_field_value)과는 별개의 로컬 전용 캐시라, 이 값을 신뢰하는 곳은 새로고침
 * 직후 폼을 다시 그릴 때 서버값 위에 덮어씌우는 한 곳뿐이다(useAppLogic.js 참고).
 */
function draftInputsKey(role, email, dppId) {
  const account = (email || 'default').trim().toLowerCase();
  return PREFIX + 'draftInputs.' + (role || 'default') + '.' + account + '.' + (dppId ?? 'new');
}

export function saveDraftInputs(role, email, dppId, inputs) {
  try {
    sessionStorage.setItem(draftInputsKey(role, email, dppId), JSON.stringify(inputs || {}));
  } catch {
    /* 사파리 프라이빗 모드 등에서 저장이 막힌 경우 무시 */
  }
}

export function loadDraftInputs(role, email, dppId) {
  try {
    const raw = sessionStorage.getItem(draftInputsKey(role, email, dppId));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraftInputs(role, email, dppId) {
  try {
    sessionStorage.removeItem(draftInputsKey(role, email, dppId));
  } catch {
    /* 무시 */
  }
}

/**
 * 로그아웃 — 이 앱이 만든 저장값을 모두 지웁니다.
 * 'ieum.' 으로 시작하는 키만 지우므로 같은 도메인의 다른 데이터는 건드리지 않습니다.
 * session/draftDppId는 이제 sessionStorage에만 쓰지만, localStorage 쪽도 예전 버전이
 * 남겨둔 찌꺼기가 있을 수 있어 계속 같이 지운다(마이그레이션 안전망).
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
