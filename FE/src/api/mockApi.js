import mock from '../mocks/data.json';

/**
 * Mock API layer.
 *
 * 화면 컴포넌트는 이 파일의 함수만 호출합니다. 실제 서버가 준비되면
 * 각 함수 본문을 fetch/axios 호출로 바꾸기만 하면 화면 코드는 그대로 둡니다.
 *
 *   export async function fetchMembers() {
 *     const res = await fetch(`${BASE_URL}/members`);
 *     if (!res.ok) throw new Error('회원 목록을 불러오지 못했습니다');
 *     return res.json();
 *   }
 *
 * 데이터 자체는 src/mocks/data.json 에만 들어 있습니다.
 */

/** 실제 서버 주소. .env 의 VITE_API_BASE_URL 로 덮어쓸 수 있습니다. */
export const BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? '/api';

/** 네트워크 지연 흉내 (ms). 0으로 두면 즉시 반환합니다. */
const LATENCY = 180;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// data.json에 없는 키를 읽으면 JSON.stringify(undefined)가 문자열이 아닌 undefined를
// 돌려주고, JSON.parse(undefined)가 SyntaxError로 터진다 - 그 예외가 fetchAppData의
// Promise.all을 타고 올라가 App.jsx의 loadError가 되어 화면 전체가 "데이터를 불러오지
// 못했습니다."로 바뀐다(2026-08-20, data.json에서 inquiries를 지우고 여기 호출을 안
// 지워서 실제로 로그인 화면이 통째로 죽었다). mock이 없는 키는 그냥 null로 넘긴다.
const clone = (v) => (v === undefined ? null : JSON.parse(JSON.stringify(v)));

async function read(key) {
  await wait(LATENCY);
  return clone(mock[key]);
}

/* --- 계정 / 인증 ------------------------------------------------ */

/** 이메일 → 역할 매핑. 실제로는 로그인 응답의 role 필드로 대체됩니다. */
export const fetchAccounts = () => read('accounts');

/* --- 관리자 ----------------------------------------------------- */

/** 회원 기업 목록 */
export const fetchMembers = () => read('members');
// 문의 유형별 집계는 mock을 버리고 /admin/dashboard의 실집계로 옮겼다(2026-08-20).
// fetchInquiries/data.json inquiries 모두 삭제 - useAppLogic이 admin.inquiriesByType을 쓴다.
/** 일별 앵커링 건수 (대시보드 스파크라인) */
export const fetchAnchors = () => read('anchors');
/** 가입 승인 대기·완료 목록 */
export const fetchSignupApprovals = () => read('signupApprovals');
/** Tier 심사 예외 목록 */
export const fetchTierReviews = () => read('tierReviews');

/* --- 제조사 ----------------------------------------------------- */

/** 도메인별 KPI, 대기 작업 큐, 입력 화면 메타, 필드 정의 */
export const fetchMakerKpi = () => read('makerKpi');
export const fetchMakerQueues = () => read('makerQueues');
export const fetchMakerInputMeta = () => read('makerInputMeta');
export const fetchMakerFieldSets = () => read('makerFieldSets');

/** 특정 도메인(steel·battery·textile)의 등록 제품 목록 */
export async function fetchProducts(role) {
  const all = await read('products');
  return all[role] ?? all.steel;
}

/* --- 공개 여권 / 세관 ------------------------------------------- */

/** 개인 회원이 조회하는 제품 여권 상세 */
export const fetchPassports = () => read('passports');
/** 세관 통관 검증 대상 */
export const fetchCustomsItems = () => read('customsItems');
/** DPP 상세 드로어의 미제출 항목 */
export const fetchDppMissingData = () => read('dppMissingData');

/* --- 알림 ------------------------------------------------------- */

export const fetchNotificationCats = () => read('notificationCats');
export const fetchNotifications = () => read('notifications');
export const fetchNotificationColors = () => read('notificationColors');

/**
 * 앱 진입 시 필요한 데이터를 한 번에 불러옵니다.
 * 실제 연동에서는 화면별로 쪼개어 필요한 시점에 호출하는 편이 좋습니다.
 */
export async function fetchAppData() {
  const [
    accounts, products, members, anchors,
    signupApprovals, tierReviews,
    makerKpi, makerQueues, makerInputMeta, makerFieldSets,
    passports, customsItems, dppMissingData,
    notificationCats, notifications, notificationColors,
  ] = await Promise.all([
    fetchAccounts(), read('products'), fetchMembers(), fetchAnchors(),
    fetchSignupApprovals(), fetchTierReviews(),
    fetchMakerKpi(), fetchMakerQueues(), fetchMakerInputMeta(), fetchMakerFieldSets(),
    fetchPassports(), fetchCustomsItems(), fetchDppMissingData(),
    fetchNotificationCats(), fetchNotifications(), fetchNotificationColors(),
  ]);

  return {
    accounts, products, members, anchors,
    signupApprovals, tierReviews,
    makerKpi, makerQueues, makerInputMeta, makerFieldSets,
    passports, customsItems, dppMissingData,
    notificationCats, notifications, notificationColors,
  };
}
