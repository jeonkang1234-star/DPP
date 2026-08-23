import { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { publicPassportUrl, qrUrlWarning } from './publicUrl.js';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  pill, roleCard, pillDot, domainCard, tabStyle,
  chip, domainChipFor, avatarStyle, bar, pctStyle, segStyle, dot,
  badgeText3d, segStyle3D, groove3d,
} from './uiStyles.js';
import { fetchAppData } from './api/mockApi.js';
import { loadSession, saveSession, loadDraftDppId, saveDraftDppId, loadDraftInputs, saveDraftInputs, clearDraftInputs } from './api/session.js';
import {
  login, requestBusinessSignupCode, verifyBusinessSignupCode,
  requestBusinessSignupPhoneCode, verifyBusinessSignupPhoneCode, completeBusinessSignup,
  goToSnsLogin, consumeSnsCallback,
} from './api/authApi.js';
import { fetchMe, fetchScans, deleteScan, searchProducts, recordScan, fetchNotificationCategories, fetchNotifications,
  markNotificationsRead, fetchOrganization, fetchDashboard, fetchFieldForm, saveFieldFormDraft, issueFieldFormDpp, fetchInvitations, sendInvitation, resendInvitation, fetchParticipations, fetchDocumentForm, uploadDocument, uploadSteelMillSheet, uploadCbamReport, uploadCareLabel, uploadOekotexLabel, uploadBatteryCarbonReport, uploadRecyclingReport, fetchOrgApprovals, approveOrg, rejectOrg, searchDppRegistry, requestCustomsClearance, fetchCustomsQueue, fetchCustomsCase, decideCustomsCase, fetchAdminDashboard, fetchAdminMembers, fetchAuditLog,
  // 도메인 확장(2026-08-22) - 마이페이지 신청 / 관리자 심사 / DPP 생성 도메인 선택기.
  fetchMyDomains, requestDomainGrant, fetchDomainGrants, approveDomainGrant, rejectDomainGrant,
  fetchDomainGrantEvidenceBlob } from './api/meApi.js';

/** "기본 정보 입력" 화면의 role -> requirement_field.domain 매핑. 시딩된 도메인만 실데이터로
 * 불러온다(STEEL/TEXTILE/BATTERY). */
function domainForRole(role) {
  if (role === 'steel') return 'STEEL';
  if (role === 'textile') return 'TEXTILE';
  if (role === 'battery') return 'BATTERY';
  return null;
}
import { pathFor, stateFromPath } from './routes.js';
import { makerVals } from './viewModels/makerVals.js';
import { partnerVals } from './viewModels/partnerVals.js';
import { passportVals } from './viewModels/passportVals.js';
import { approvalVals } from './viewModels/approvalVals.js';
import { customsVals } from './viewModels/customsVals.js';
import { euVals } from './viewModels/euVals.js';
import { notifVals } from './viewModels/notifVals.js';
import { dppVals } from './viewModels/dppVals.js';
import { obVals } from './viewModels/obVals.js';

export const DEFAULT_PROPS = {
  startView: 'login',  // 'login' | 'signup' | 'app'
  startRole: 'steel',  // 'admin' | 'steel' | 'battery' | 'textile' | 'eu' | 'customs' | 'personal'
};

const SCAN_STATUS_LABEL = { VERIFIED: '검증됨', UPDATED: '정보 갱신됨', FAILED: '검증 실패' };

/** BE가 내려주는 ISO(OffsetDateTime) 문자열을 화면용 'YYYY-MM-DD HH:mm'으로. */
function fmtDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fmtDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// 관리자 "회원 관리" 표 아바타 색 - 실 회원 목록(AdminMemberDto)엔 mock처럼 미리 정해둔
// hue가 없어서, 회사명을 시드로 고정 팔레트에서 결정적으로 골라 쓴다(같은 회사는 항상
// 같은 색, 새로고침해도 안 바뀜). 장식용 색일 뿐 실제 데이터가 아니므로 이 정도 유도는
// "가짜 데이터"에 해당하지 않는다.
const ADMIN_AVATAR_PALETTE = ['#0045A9', '#12A150', '#96660A', '#7C3AED', '#DB2777', '#0EA5E9', '#DC2626', '#059669'];
function avatarColorFor(seed) {
  const s = String(seed || '');
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return ADMIN_AVATAR_PALETTE[hash % ADMIN_AVATAR_PALETTE.length];
}

/** 알림 created_at(ISO) -> "방금 전"/"N분 전"/"N시간 전"/"N일 전". */
function fmtRelative(iso) {
  if (!iso) return '';
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return '방금 전';
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  return `${Math.floor(hour / 24)}일 전`;
}

/**
 * 앱 전체 상태 + 뷰모델 훅.
 *
 * - 데이터: 마운트 시 mockApi.fetchAppData() 로 비동기 로드 (실서버 연동 지점)
 * - 인증: 로그인/SNS/기업 회원가입은 api/authApi.js 를 통해 실제 백엔드(/auth/*)를 호출합니다.
 *   화면(제품/대시보드 등) 데이터는 여전히 mockApi.js(mock) - 인증만 먼저 실연동했습니다.
 * - 라우팅: URL(useLocation) ↔ 상태({ view, role, tab }) 양방향 동기화
 */
/**
 * 자동입력 방지 문자 생성. 서버 캡차가 없어서 클라이언트에서 만든다 - 사람이 아닌
 * 자동 가입을 막는 정식 수단은 아니고(브라우저 안에 답이 있다), "화면이 실제로 동작한다"를
 * 만족시키는 수준이다. 진짜로 막아야 할 때가 오면 서버 발급 캡차나 hCaptcha로 교체해야
 * 한다 - 그때 바꿀 자리를 한 곳에 모아 두려고 함수로 뺐다(2026-08-21).
 *
 * 혼동되는 글자(0/O, 1/l/I 등)는 뺀다.
 */
const CAPTCHA_CHARS = 'abdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCaptcha() {
  const n = 6;
  const glyphs = [];
  let text = '';
  for (let i = 0; i < n; i++) {
    const ch = CAPTCHA_CHARS[Math.floor(Math.random() * CAPTCHA_CHARS.length)];
    text += ch;
    const x = 16 + i * 28 + Math.round(Math.random() * 6 - 3);
    const y = 38 + Math.round(Math.random() * 6);
    const rot = Math.round(Math.random() * 34 - 17);
    const skew = Math.round(Math.random() * 24 - 12);
    glyphs.push({ ch, x, y, transform: `rotate(${rot} ${x} ${y}) skewX(${skew})` });
  }
  return { text, glyphs };
}

export function useAppLogic(userProps) {
  const props = { ...DEFAULT_PROPS, ...userProps };
  const timer = useRef(null);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // SNS 콜백이 실패(sns_error)로 왔을 때, say()가 정의되기 전인 초기 state 계산 시점엔
  // 토스트를 띄울 수 없어서 일단 여기 담아두고 마운트 후 useEffect에서 보여준다.
  const pendingSnsError = useRef(null);

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  /* 로그인한 사용자 전용(실 API) 데이터. mock인 data와 분리 - 얘내는 인증 필요, 로그인 후에만 채워짐. */
  const [meData, setMeData] = useState(null);
  const [orgData, setOrgData] = useState(null);
  const [dashboardData, setDashboardData] = useState(null);
  // 관리자 가입승인 화면 전용 - ADMIN 계정이 아니면 fetchOrgApprovals가 403을 던지고 null로 남는다.
  const [orgApprovalsData, setOrgApprovalsData] = useState(null);
  // EU 시장감시 레지스트리 조회 전용 - 규제기관 계정이 아니면 403으로 null 유지.
  const [euRegistryData, setEuRegistryData] = useState(null);
  // 관리자 대시보드 KPI(GET /admin/dashboard) - ADMIN 계정이 아니면 403으로 null 유지.
  // adminDashboardFetchedAt은 "최근 갱신" 표시용 - 하드코딩된 날짜("2026-07-30 09:41
  // KST") 대신 실제로 이 데이터를 받아온 시각을 보여준다.
  const [adminDashboardData, setAdminDashboardData] = useState(null);
  const [adminDashboardFetchedAt, setAdminDashboardFetchedAt] = useState(null);
  // /admin/dashboard 호출 실패를 더 이상 조용히 삼키지 않는다(2026-08-23). 예전엔
  // catch(()=>{})로 버려서, 서버가 500을 내면 화면엔 그냥 전부 '—'로 보이고 원인은
  // 아무 데도 안 남았다 - 같은 증상으로 두 번 헤맸다.
  const [adminDashboardError, setAdminDashboardError] = useState(null);
  // 관리자 "회원 관리" 표(GET /admin/members) - 마찬가지로 ADMIN 전용, 그 외엔 null 유지.
  const [adminMembersData, setAdminMembersData] = useState(null);
  // 세관 통관 큐(GET /customs/queue) - org_type=CUSTOMS 계정이 아니면 403으로 null 유지.
  // 심사 대기(PENDING) 목록만 담는다 - "세관마다 확인해야 할 DPP가 달라야 함"(2026-08-19
  // 강 요청)이 실제로 동작하는지 눈에 보이는 자리.
  const [customsQueueData, setCustomsQueueData] = useState(null);
  // 큐에서 케이스 하나를 선택하면(state.customsId) 아래 useEffect가 상세(체크리스트 포함)를
  // 불러와 여기 채운다. 선택 전이거나 아직 로딩 중이면 null.
  const [customsCaseDetail, setCustomsCaseDetail] = useState(null);
  // EU 시장감시 감사 로그(GET /audit-log) - ADMIN이거나 org_type=EU_AUTHORITY 계정이
  // 아니면 403으로 null 유지(euVals.js scAudit 화면 전용).
  const [auditLogData, setAuditLogData] = useState(null);
  // "강재 기본 정보" 입력 폼(GET/POST /me/field-form*). requirement_field 시딩이 STEEL
  // 도메인만 있어서(V4__seed_requirement_steel.sql - battery/textile 시딩 없음) 철강
  // 역할에서만 실데이터로 불러온다 - 그 외 역할은 기존 목데이터 폼 그대로 유지.
  const [fieldFormData, setFieldFormData] = useState(null);
  const [fieldFormInputs, setFieldFormInputs] = useState({});
  // "필수 문서" 업로드 화면(GET/POST /me/documents*) - fieldFormData와 같은 dppId를 공유하고,
  // dppId가 아직 없으면(새 DPP 초안 저장 전) 불러올 게 없어서 null로 남는다.
  const [documentFormData, setDocumentFormData] = useState(null);
  // 제강 성적서(Mill Sheet) 업로드 결과 - 예전엔 이 자리가 통째로 목데이터였다(버튼을 눌러도
  // 실제 파일 선택창조차 안 뜨고 "업로드했다"는 토스트만 나오는 가짜였음, 2026-08-14 사용자가
  // 지적해서 실제 /document/upload/steel-mill 연동으로 교체).
  const [millSheetResult, setMillSheetResult] = useState(null);
  // CBAM(Q2_06) 업로드 결과 - Mill Sheet와 같은 패턴. obligated는 "적합/부적합"이 아니라
  // "de minimis 수입량 초과로 신고 의무가 발생했는가"라서 true/false 둘 다 정상 결과다.
  const [cbamResult, setCbamResult] = useState(null);
  // 섬유 케어라벨(Q1_04)/OEKO-TEX(Q3_10) 업로드 결과 - Mill Sheet/CBAM과 같은 패턴
  // (2026-08-16, 섬유 도메인 실연동).
  const [careLabelResult, setCareLabelResult] = useState(null);
  const [oekotexResult, setOekotexResult] = useState(null);
  // 배터리 탄소발자국 선언(Q2_07)/재활용 처리 결과 보고서(Q4_15) 업로드 결과 - Mill Sheet/
  // CBAM/섬유와 같은 패턴(2026-08-16, 배터리 도메인 실연동).
  const [batteryCarbonResult, setBatteryCarbonResult] = useState(null);
  const [recyclingResult, setRecyclingResult] = useState(null);
  const [scansData, setScansData] = useState([]);
  // 개인 회원 제품 검색(2026-08-23 강 요청) - 제품명·브랜드로 찾아서 공개 여권(QR과 같은
  // 화면)으로 바로 넘어가고, 그 열람이 아래 scansData(최근 5건)에 쌓인다.
  // searched는 "아직 검색 안 함"과 "검색했는데 0건"을 구분하기 위한 플래그 - 이게 없으면
  // 화면 처음 진입부터 "검색 결과가 없습니다"가 떠 있다.
  const [productQuery, setProductQuery] = useState('');
  const [productResults, setProductResults] = useState([]);
  const [productSearching, setProductSearching] = useState(false);
  const [productSearched, setProductSearched] = useState(false);
  const [invitesData, setInvitesData] = useState([]);
  const [participationsData, setParticipationsData] = useState([]);
  const [notifCatsData, setNotifCatsData] = useState([]);
  const [notifsData, setNotifsData] = useState([]);
  // 도메인 확장(2026-08-22) - myDomainsData는 DPP 생성 탭의 도메인 선택기와 마이페이지가,
  // domainGrantsData는 관리자 회원 관리 탭의 심사 목록이 쓴다.
  const [myDomainsData, setMyDomainsData] = useState(null);
  const [domainGrantsData, setDomainGrantsData] = useState([]);

  const [state, setStateRaw] = useState(() => {
    // 최초 진입 URL 이 곧 첫 화면입니다 (딥링크·새로고침 대응).
    const fromUrl = stateFromPath(pathname) || {};

    // SNS 로그인 콜백(BE가 /?sns_access=... 또는 /?sns_error=...로 리다이렉트시킨 것)이 있으면 최우선 처리.
    const snsResult = consumeSnsCallback();
    const snsLoggedIn = !!(snsResult && snsResult.accessToken);
    if (snsLoggedIn) saveSession({ ...snsResult, role: 'personal', at: Date.now() });
    if (snsResult && snsResult.error) pendingSnsError.current = snsResult.error;
    const saved = snsLoggedIn ? { role: 'personal' } : loadSession();
    // 저장된 세션의 역할이 주소창보다 우선한다 - 아래 view 결정과 같은 이유이고,
    // 같은 탭에서 예전 역할의 URL(뒤로가기 히스토리, 북마크)로 들어와도 계정이 바뀐 것처럼
    // 보이지 않게 한다(2026-08-22 강 리포트 "뒤로가기 하니까 관세청 계정이 제조사 계정으로
    // 넘어갔음"). 세션이 없을 때만 URL의 역할을 쓴다(공개 링크·데모 진입 경로).
    const initialRole = saved?.role || fromUrl.role || props.startRole || 'steel';

    return {
      // 저장된 세션이 있으면 주소가 /login·/signup이어도 앱으로 들어간다.
      // 예전엔 fromUrl.view가 먼저라, 주소창이 /login에 머무는 역할(협력사 - 전용
      // 라우트가 없었다)은 F5마다 로그아웃된 것처럼 보였다(2026-08-21 강 리포트).
      // 로그인/가입 화면을 일부러 다시 열려면 로그아웃(세션 삭제)을 거치게 된다.
      view: (saved && (!fromUrl.view || fromUrl.view === 'login' || fromUrl.view === 'signup'))
        ? 'app'
        : (fromUrl.view || (saved ? 'app' : props.startView || 'login')),
      role: initialRole,
      // 'dash'로 고정하면 dash 탭이 없는 역할(협력사=assigned, 세관=clearance,
      // EU=registry, 개인=scans)이 빈 화면으로 뜬다. 역할별 첫 탭으로 폴백한다.
      // 주소창의 탭은 그 탭이 이 역할의 것일 때만 쓴다 - /steel/products 로 들어온
      // 세관 계정에게 'products' 탭을 물려주면 빈 화면이 된다.
      tab: (fromUrl.role && fromUrl.role !== initialRole ? null : fromUrl.tab) || firstTab(initialRole),
    loginTab: 'company',
      suTab: 'company',
      // 자동입력 방지 문자. 가입 화면을 처음 그릴 때 한 번 뽑고, 새로고침 버튼으로 바꾼다.
      captcha: makeCaptcha(),
      suCaptcha: '',
      suRole: 'maker',
      suCountry: '대한민국',
      obOpen: false, obStep: 1, obDomain: 'steel',
      notifOpen: false, notifCat: 'all',
      dppOpen: false, dppId: null, pubId: null,
      issueMode: 'single',
      removedScans: [],
      removedProducts: [],
      confirm: null,
      toast: '',
      // "기본 정보 입력" 폼에서 문서 업로드(Mill Sheet 등) 직후 새로 채워진 필드를
      // "파싱됨"으로 표시하기 위한 세션 한정 캐시. { [fieldCode]: 문서라벨 }.
      parsedFieldSources: {},
      // 파싱된 필드는 기본적으로 잠겨서(읽기 전용) 실수로 지워지지 않고, "수정" 버튼을
      // 눌러야 편집 가능해진다(2026-08-18 강 요청) - 이 세션에서 잠금 해제한 fieldCode만
      // 담는다. { [fieldCode]: true }.
      unlockedFields: {},
      // DPP 발급과 동시에 발급한 QR 표시용 모달 상태. { id, dataUrl } | null.
      qrModal: null,
      // 이번 세션에 발급한 DPP의 필드 스냅샷 - QR 스캔(제품 조회)이 곧바로 조회할 수 있게.
      // { [displayId]: { material, formLabel, fields } }.
      issuedPassportCache: {},
      tierRequestPending: {},
      permRequestPending: {},
      // 회원 관리(구 가입승인관리) "반려" 버튼 클릭 시 뜨는 반려 사유 입력 팝업.
      // { orgId, name } | null. 2026-08-17: window.prompt 대신 팝업으로 교체.
      rejectModal: null,
      rejectReasonInput: '',
      // 회원 관리 "상세" 모달에 표시할 조직(AdminMemberDto) | null.
      memberModal: null,
      // 제품조회 "상세" 모달에서 발급완료 DPP의 QR을 그 자리에서 바로 볼 수 있게(2026-08-17).
      // 세션 캐시가 아니라 표시할 때마다 필요한 식별자로 새로 생성해서 dppId에 매핑해 둔다.
      dppQrCache: {},
      dppQrPending: {},
      productStatusFilter: 'all',
      // 문서별 "검증 기준" 토글 열림 상태 - docTypeCode를 키로 하는 맵(2026-08-18).
      criteriaOpen: {},
      // 새로고침해도 "철강 데이터 입력" 화면이 작성 중이던 DPP를 계속 이어서 보여주도록
      // localStorage에서 복원한다 - 로그인 안 된 상태(saved 없음)에서는 애초에 이 화면에
      // 못 들어가니 복원할 필요가 없다.
      fieldFormDppId: saved ? loadDraftDppId(initialRole, saved.email) : null
    };
  });

  const setState = useCallback((patch) => {
    setStateRaw((prev) => ({ ...prev, ...(typeof patch === 'function' ? patch(prev) : patch) }));
  }, []);

  /* 데이터 로드 — 실제 API 로 바꿀 때는 mockApi.js 안만 수정하면 됩니다. */
  useEffect(() => {
    let alive = true;
    fetchAppData()
      .then((res) => { if (alive) setData(res); })
      .catch((err) => { if (alive) setLoadError(err); });
    return () => { alive = false; };
  }, []);

  /**
   * 로그인한 사용자 전용(실 API) 데이터: /me, /me/scans, /notifications*.
   * 위 mock 데이터와 별개로, 로그인된 상태(view==='app' + 저장된 accessToken)일 때만 불러온다.
   * 하나가 실패해도 나머지 화면은 mock으로 계속 정상 동작해야 하므로 각자 따로 catch한다.
   */
  useEffect(() => {
    if (state.view !== 'app') return;
    const session = loadSession();
    if (!session?.accessToken) return;
    let alive = true;
    fetchMe().then((res) => { if (alive) setMeData(res); }).catch(() => {});
    // org_id 없는 계정(개인/미가입)은 400이 정상 - orgData는 그냥 null로 남고 profile()이
    // 기존 역할별 자리표시자로 폴백한다.
    // 400(조직 없는 계정)은 "조직이 없다"는 뜻이므로 반드시 null로 덮어써야 한다.
    // 예전엔 조용히 넘겨서 이전 계정의 조직이 그대로 남았다(2026-08-23).
    fetchOrganization().then((res) => { if (alive) setOrgData(res); }).catch(() => { if (alive) setOrgData(null); });
    fetchDashboard().then((res) => { if (alive) setDashboardData(res); }).catch(() => {});
    fetchScans().then((res) => { if (alive) setScansData(res || []); }).catch(() => {});
    fetchInvitations().then((res) => { if (alive) setInvitesData(res || []); }).catch(() => {});
    fetchParticipations().then((res) => { if (alive) setParticipationsData(res || []); }).catch(() => {});
    fetchNotificationCategories().then((res) => { if (alive) setNotifCatsData(res || []); }).catch(() => {});
    fetchNotifications().then((res) => { if (alive) setNotifsData(res || []); }).catch(() => {});
    // 조직 없는 계정(개인)은 400 - 조용히 무시하고 도메인 선택기를 감춘다.
    fetchMyDomains().then((res) => { if (alive) setMyDomainsData(res); }).catch(() => { if (alive) setMyDomainsData(null); });
    // ADMIN 계정이 아니면 403 - 도메인 확장 심사 목록도 마찬가지.
    fetchDomainGrants().then((res) => { if (alive) setDomainGrantsData(res || []); }).catch(() => {});
    // ADMIN 계정이 아니면 403 - 그 외 화면엔 영향 없이 조용히 무시(다른 fetch들과 동일한 패턴).
    fetchOrgApprovals().then((res) => { if (alive) setOrgApprovalsData(res || []); }).catch(() => {});
    // EU_AUTHORITY/CUSTOMS org_type이거나 ADMIN이 아니면 403 - 마찬가지로 조용히 무시.
    searchDppRegistry('').then((res) => { if (alive) setEuRegistryData(res || []); }).catch(() => {});
    // ADMIN 계정이 아니면 403 - 관리자 대시보드 KPI/회원 목록도 마찬가지로 조용히 무시.
    /*
     * 관리자 KPI는 실패해도 재시도한다(2026-08-23).
     *
     * 이 화면이 통째로 '-'가 되는 사고가 두 번 있었고, 두 번째 원인은 커넥션 풀 고갈
     * 이었다(문서 업로드가 파서/ZKP/Fabric을 트랜잭션 안에서 기다리는 동안 커넥션을
     * 점유 -> 그때 들어온 이 요청이 타임아웃). 이런 일시적 실패는 몇 초 뒤 대개 회복
     * 되는데, 예전엔 한 번 실패하면 사용자가 새로고침하기 전까지 영구히 빈 화면이었다.
     * 403(ADMIN 아님)은 재시도해도 소용없으므로 즉시 포기한다.
     */
    const loadAdminDashboard = (attempt = 1) => {
      fetchAdminDashboard()
        .then((res) => {
          if (!alive) return;
          setAdminDashboardData(res);
          setAdminDashboardFetchedAt(new Date());
          setAdminDashboardError(null);
        })
        .catch((err) => {
          if (!alive || err?.status === 403) return;
          if (attempt < 3) {
            setTimeout(() => { if (alive) loadAdminDashboard(attempt + 1); }, attempt * 2500);
            return;
          }
          console.error('[admin] /admin/dashboard 실패', err);
          setAdminDashboardError(err?.message || '운영 지표를 불러오지 못했습니다.');
        });
    };
    loadAdminDashboard();
    // 회원 목록도 같은 이유로 한 번 더 시도한다 - 대시보드만 살아나고 목록이 비어 있으면
    // 원인을 오해하기 쉽다.
    const loadAdminMembers = (attempt = 1) => {
      fetchAdminMembers()
        .then((res) => { if (alive) setAdminMembersData(res || []); })
        .catch((err) => {
          if (!alive || err?.status === 403) return;
          if (attempt < 3) setTimeout(() => { if (alive) loadAdminMembers(attempt + 1); }, attempt * 2500);
        });
    };
    loadAdminMembers();
    // 세관(org_type=CUSTOMS) 계정이 아니면 403 - 마찬가지로 조용히 무시.
    fetchCustomsQueue(false).then((res) => { if (alive) setCustomsQueueData(res || []); }).catch(() => {});
    // ADMIN이거나 EU_AUTHORITY 계정이 아니면 403 - 마찬가지로 조용히 무시.
    fetchAuditLog().then((res) => { if (alive) setAuditLogData(res || []); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  /**
   * 저장된 세션의 role이 실제 조직 유형과 어긋나 있으면 바로잡는다.
   *
   * 2026-08-22 강 리포트 "세관계정으로 가입했는데 로그인하니까 철강제조사가 되어있다" -
   * 근본 원인은 doLogin이 서버 값 없이 'steel'로 기본 착지시킨 것이고 그건 LoginResponse.
   * appRole로 고쳤지만, 그 전에 저장된 세션(localStorage의 ieum.session.role='steel')은
   * 여전히 남아 있다. 그런 브라우저는 다시 로그인하기 전까지 계속 제조사 화면을 보게
   * 되므로, GET /me/organization이 오면 여기서 한 번 되돌린다.
   *
   * org_type이 비어 있는 조직(2026-08-21 이전 가입)은 건드리지 않는다 - 무엇으로 바꿔야
   * 할지 모르는 상태에서 화면을 흔드는 게 더 나쁘다.
   */
  useEffect(() => {
    if (state.view !== 'app' || !orgData || !orgData.orgType) return;
    const correct = roleFromOrg(orgData.orgType, orgData.domain);
    if (!correct || correct === state.role) return;
    // 제조사는 승인받은 다른 도메인으로 화면을 바꿀 수 있다(도메인 확장, 2026-08-22).
    // 그 경우 role은 steel <-> battery <-> textile 사이를 오가므로, 여기서 주력 도메인으로
    // 되돌리면 선택 자체가 불가능해진다. 허용 목록 안에 있으면 그대로 둔다.
    //
    // 단 이 예외는 org_type이 MANUFACTURER일 때만이다(2026-08-23 강 리포트 "협력사 계정으로
    // 로그인했는데 제조사처럼 리다이렉트된다"). V29__org_domain_grant.sql이 모든 조직의
    // domain을 APPROVED로 백필했기 때문에, 협력사 조직도 domain='STEEL' 승인을 갖고 있다.
    // 그래서 협력사가 어떤 이유로든 role='steel'로 착지하면 allowedRoles에 'steel'이 있어
    // 교정이 통째로 스킵됐고, 제조사 화면에 그대로 갇혔다. 도메인 확장은 제조사만의
    // 개념이므로 조건을 그렇게 좁힌다.
    if (orgData.orgType === 'MANUFACTURER') {
      const allowedRoles = (myDomainsData?.allowedDomains || [])
        .map((d) => (d.code === 'BATTERY' ? 'battery' : d.code === 'TEXTILE' ? 'textile' : 'steel'));
      if (allowedRoles.includes(state.role)) return;
    }
    saveSession({ ...(loadSession() || {}), role: correct, at: Date.now() });
    setState({ role: correct, tab: firstTab(correct), notifOpen: false, dppOpen: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orgData, myDomainsData, state.view]);

  /** 세관 큐 새로고침 - 승인/보류/반려 처리 직후 목록에서 방금 그 케이스를 빼기 위해 씀. */
  const refetchCustomsQueue = useCallback(() => {
    fetchCustomsQueue(false).then((res) => setCustomsQueueData(res || [])).catch(() => {});
  }, []);

  /** 큐에서 케이스를 선택하면(state.customsId) 체크리스트 포함 상세를 불러온다. */
  useEffect(() => {
    if (state.view !== 'app' || !state.customsId) { setCustomsCaseDetail(null); return; }
    let alive = true;
    fetchCustomsCase(state.customsId)
      .then((res) => { if (alive) setCustomsCaseDetail(res); })
      .catch(() => { if (alive) setCustomsCaseDetail(null); });
    return () => { alive = false; };
  }, [state.view, state.customsId]);

  const refetchCustomsCase = useCallback((clearanceId) => {
    if (!clearanceId) return;
    fetchCustomsCase(clearanceId).then((res) => setCustomsCaseDetail(res)).catch(() => {});
  }, []);

  /**
   * 협력사 초대 알림이 실시간이 아니라 "새로고침해야 온다"는 리포트(2026-08-18) - 원인은
   * 위 데이터 fetch가 로그인 시 딱 한 번만 도는 것과 같다. 초대 발송 자체(메일/알림 행
   * 생성)는 이미 서버가 즉시 처리하지만(InvitationService.send), 받는 쪽 브라우저가 그걸
   * 아는 방법이 폴링/웹소켓 없이는 없다 - 그래서 알림/참여 DPP/초대 내역을 짧은 주기로
   * 다시 불러와서 화면을 열어둔 채로도 "바로바로" 반영되게 한다. 완전한 실시간(웹소켓)은
   * 아니지만 새로고침 없이 20초 안에는 뜬다. 서버 부담이 큰 dashboard/scans 등은 여기서
   * 안 돌린다 - 알림/초대 관련 3개만 가볍게.
   */
  useEffect(() => {
    if (state.view !== 'app') return;
    const session = loadSession();
    if (!session?.accessToken) return;
    let alive = true;
    const POLL_MS = 20000;
    const tick = () => {
      fetchNotifications().then((res) => { if (alive) setNotifsData(res || []); }).catch(() => {});
      fetchInvitations().then((res) => { if (alive) setInvitesData(res || []); }).catch(() => {});
      fetchParticipations().then((res) => { if (alive) setParticipationsData(res || []); }).catch(() => {});
    };
    const timer = setInterval(tick, POLL_MS);
    return () => { alive = false; clearInterval(timer); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

  /** 도메인 확장 - 신청/승인/반려 직후 목록을 다시 읽는다. */
  const refetchMyDomains = useCallback(() => {
    fetchMyDomains().then((res) => setMyDomainsData(res)).catch(() => {});
  }, []);
  const refetchDomainGrants = useCallback(() => {
    fetchDomainGrants().then((res) => setDomainGrantsData(res || [])).catch(() => {});
  }, []);

  /** 가입승인 화면(approvalVals.js)의 승인/반려 버튼이 처리 후 목록을 새로 불러올 때 씀. */
  const refetchOrgApprovals = useCallback(() => {
    fetchOrgApprovals().then((res) => setOrgApprovalsData(res || [])).catch(() => {});
  }, []);

  /**
   * "강재 기본 정보" 입력 폼 - 두 가지 진입점이 같은 폼을 공유한다: (1) 철강 소유 조직이
   * "철강 데이터 입력" 탭에 들어갈 때(dppId는 state.fieldFormDppId에 남아서 이후 임시저장은
   * 계속 같은 DPP를 갱신), (2) 참여 협력사가 "참여 DPP" 탭에서 특정 DPP를 선택했을 때
   * (dppId는 state.partnerAssignedDppId). 백엔드(FieldFormService)가 소유 조직인지 참여
   * 협력사인지에 따라 알아서 필드 범위를 다르게 내려주므로 FE는 어느 dppId로 불렀는지만
   * 분기하면 된다.
   */
  useEffect(() => {
    if (state.view !== 'app') return;
    const domain = domainForRole(state.role);
    const isDomainInput = !!domain && state.tab === 'input';
    const isPartnerAssigned = state.role === 'partner' && state.tab === 'assigned' && !!state.partnerAssignedDppId;
    if (!isDomainInput && !isPartnerAssigned) return;
    const session = loadSession();
    if (!session?.accessToken) return;
    const dppId = isDomainInput ? state.fieldFormDppId : state.partnerAssignedDppId;
    // 이 DPP로 새로 폼을 불러오는 시점이니, 직전 DPP에서 쌓인 "이 문서 업로드로 방금
    // 채워짐" 표시(parsedFieldSources)는 여기서 지운다 - 안 지우면 다른 DPP로 이동했는데도
    // 이전 DPP에서 파싱됐던 필드가 계속 "파싱됨"으로 잘못 표시된다.
    setState({ parsedFieldSources: {}, unlockedFields: {} });
    let alive = true;
    fetchFieldForm(dppId || undefined, domain || undefined)
      .then((res) => {
        if (!alive) return;
        setFieldFormData(res);
        const serverValues = Object.fromEntries((res.fields || []).map(f => [f.fieldCode, f.value || '']));
        // 2026-08-18 강 요청: 새로고침해도 임시저장 안 한 입력값이 그대로 있어야 한다 -
        // 서버값(dpp_field_value에 실제로 저장된 것) 위에, 아직 저장 안 하고 이 브라우저
        // 탭에 남겨뒀던 로컬 캐시를 덮어씌운다(loadDraftInputs, session.js). 서버값이 더
        // 최신인 필드(다른 협력사가 방금 채운 등)까지 로컬 캐시가 덮어쓰면 안 되니, 캐시는
        // "서버에 아직 없는 값"에만 적용한다.
        const cached = loadDraftInputs(state.role, session.email, dppId) || {};
        const merged = { ...serverValues };
        Object.keys(cached).forEach((code) => {
          if (!serverValues[code] && cached[code]) merged[code] = cached[code];
        });
        setFieldFormInputs(merged);
        if (isDomainInput && res.dppId && res.dppId !== state.fieldFormDppId) {
          // 방금 첫 임시저장으로 새 dppId가 생긴 경우 - 'new' 캐시는 이 DPP로 옮겨간
          // 셈이니 지워서, 다음번 "새 DPP 시작"이 이 낡은 값을 물려받지 않게 한다.
          clearDraftInputs(state.role, session.email, null);
          setState({ fieldFormDppId: res.dppId });
        }
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.role, state.tab, state.partnerAssignedDppId]);

  /**
   * 위 useEffect가 서버값+로컬캐시를 합쳐 fieldFormInputs를 채우면, 이 effect는 그 이후
   * 타이핑할 때마다(setFieldFormInputs 호출마다) 최신 상태를 계속 같은 로컬 캐시에
   * 다시 써 둔다 - 임시저장 버튼을 안 눌러도 새로고침 시 살아남는 이유가 이것.
   * 저장 성공 후(makerVals.js saveDraft/issueDpp) 서버가 돌려준 값으로 setFieldFormInputs를
   * 다시 부르면, 그 값 그대로 캐시에 덮어써져서 자동으로 최신 상태를 유지한다 - 별도
   * "저장됐으니 캐시 지우기" 로직이 필요 없다.
   */
  useEffect(() => {
    if (state.view !== 'app') return;
    const domain = domainForRole(state.role);
    const isDomainInput = !!domain && state.tab === 'input';
    const isPartnerAssigned = state.role === 'partner' && state.tab === 'assigned' && !!state.partnerAssignedDppId;
    if (!isDomainInput && !isPartnerAssigned) return;
    const session = loadSession();
    if (!session?.accessToken) return;
    const dppId = isDomainInput ? state.fieldFormDppId : state.partnerAssignedDppId;
    saveDraftInputs(state.role, session.email, dppId, fieldFormInputs);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fieldFormInputs]);

  /**
   * Mill Sheet 업로드처럼 fieldFormData 바깥(별도 엔드포인트)에서 완성도가 바뀌는 경우,
   * 위 useEffect를 다시 트리거하지 않고도 fieldFormData/fieldFormInputs를 최신값으로
   * 맞추기 위한 수동 새로고침. makerVals.js의 Mill Sheet 업로드 핸들러가 사용한다.
   */
  const refreshFieldForm = useCallback((dppId) => {
    if (!dppId) return Promise.resolve(null);
    // 반환값(res)을 문서 업로드 호출부(makerVals.js)가 이용한다 - 업로드 직전 입력값과
    // 비교해 "이 업로드로 새로 채워진 필드"를 표시하기 위함(parsedFieldSources). 기존
    // 호출부는 반환값을 안 쓰고 그냥 fire-and-forget으로 불러도 동작은 그대로다.
    return fetchFieldForm(dppId)
      .then((res) => {
        setFieldFormData(res);
        setFieldFormInputs(Object.fromEntries((res.fields || []).map(f => [f.fieldCode, f.value || ''])));
        return res;
      })
      .catch(() => null);
  }, []);

  /**
   * refreshFieldForm과 같은 이유로 필요 - Mill Sheet/CBAM은 documentFormData(아래 "필수 문서"
   * 체크리스트, GET /me/documents)가 아니라 전용 엔드포인트(/document/upload/steel-mill,
   * /document/upload/cbam)로 올라가서 응답 모양이 아예 다르다(SteelMillUploadResponse 등) -
   * 그 응답을 documentFormData에 그대로 못 넣는다. 일반 9종 업로드(onFileChange)는 서버가
   * 업데이트된 문서함 전체를 그대로 돌려줘서 setDocumentFormData(result)로 바로 반영되는데,
   * Mill Sheet/CBAM 핸들러는 refreshFieldForm만 부르고 이걸 안 불러서 성적서를 올려도
   * 체크리스트 쪽 상태(미제출→검증중→제출완료)가 안 바뀌는 버그였다(2026-08-15, 강 리포트 -
   * "제강성적서를 올려도 끝난건지 안끝난건지 아래에 반영이 안됨"). makerVals.js의
   * onMillSheetFileChange/onCbamFileChange가 업로드 성공 직후 이걸 같이 호출해야 한다.
   */
  const refreshDocumentForm = useCallback((dppId) => {
    if (!dppId) return;
    fetchDocumentForm(dppId).then((res) => setDocumentFormData(res)).catch(() => {});
  }, []);

  /**
   * dashboardData(GET /me/dashboard)는 로그인 직후 딱 한 번만 불러온다(위 useEffect,
   * deps=[state.view] - view는 로그인 후 계속 'app'이라 다시 안 돈다). 그래서 DPP를 새로
   * 만들거나 발급해도 이 화면 세션 안에서는 dashboardData.dpps/products가 갱신되지 않고,
   * 진짜 새로고침(전체 리마운트)을 해야만 보였다(2026-08-18 강 리포트 - "DPP 생성해서
   * 발급했는데 저장 안됨(제품 조회에서 전혀 안보임)" - 실제로는 저장은 됐지만 화면이 그
   * 최신 상태를 안 불러온 것). issueDpp/saveFieldFormDraft(새 DPP 생성)처럼 dashboardData가
   * 가리키는 DPP 목록 자체가 바뀌는 지점에서 이 함수를 불러 강제로 다시 가져온다.
   */
  const refreshDashboard = useCallback(() => {
    return fetchDashboard().then((res) => { setDashboardData(res); return res; }).catch(() => null);
  }, []);

  /**
   * "필수 문서" 업로드 화면 - 위 필드 폼과 같은 dppId 진입점을 공유한다. 예전엔 dppId가
   * 실제로 있어야만(=최소 한 번 임시저장된 DPP) 목록 자체를 안 불러왔는데, 그러면 첫
   * 임시저장 전에는 "뭘 제출해야 하는지" 체크리스트가 화면에 아예 안 보였다(2026-08-15,
   * "임시저장 하기 전부터 보여줘야지" 사용자 피드백). fetchFieldForm과 같은 패턴으로
   * dppId 없이도 호출하면 백엔드가 도메인 공통 체크리스트(전부 NOT_UPLOADED)를 내려준다 -
   * 실제 업로드 자체는 여전히 dppId가 있어야 가능(document.owner_id가 dpp_id를 가리켜야
   * 함)하고, makerVals.js의 onFileChange가 그 시점에 안내 토스트로 막는다. 협력사 쪽은
   * 선택된 dppId가 없으면 어느 DPP에 붙일지 알 수 없어 목록 자체가 성립하지 않으므로
   * 그 경우만 계속 스킵한다.
   */
  useEffect(() => {
    if (state.view !== 'app') return;
    const domain = domainForRole(state.role);
    const isDomainInput = !!domain && state.tab === 'input';
    const isPartnerAssigned = state.role === 'partner' && state.tab === 'assigned' && !!state.partnerAssignedDppId;
    if (!isDomainInput && !isPartnerAssigned) { setDocumentFormData(null); return; }
    const dppId = isDomainInput ? state.fieldFormDppId : state.partnerAssignedDppId;
    if (isPartnerAssigned && !dppId) { setDocumentFormData(null); return; }
    const session = loadSession();
    if (!session?.accessToken) return;
    let alive = true;
    fetchDocumentForm(dppId || undefined, domain || undefined).then((res) => { if (alive) setDocumentFormData(res); }).catch(() => {});
    return () => { alive = false; };
  }, [state.view, state.role, state.tab, state.fieldFormDppId, state.partnerAssignedDppId]);

  /**
   * fieldFormDppId를 role+계정(email)별로 localStorage에 계속 동기화 - 첫 임시저장으로
   * 새로 생기든, "제품 조회"에서 식별자를 눌러 이어서 작성하든, 어느 경로로 바뀌든 다음
   * 새로고침에서 그대로 복원되게 한다(위 useState 초기값 참고). role만으로 키를 잡으면
   * 로그아웃 없이 같은 브라우저에서 다른 계정으로 재로그인했을 때 이전 계정의 dppId를
   * 물려받는 버그가 있었다(2026-08-15) - email을 키에 포함시켜서 계정이 바뀌면 완전히
   * 다른 자리에 저장/복원되게 한다. 로그아웃(clearSession)은 여전히 'ieum.' 전체를
   * 지우니 그 경로는 그대로 안전하다.
   */
  useEffect(() => {
    saveDraftDppId(state.role, loadSession()?.email, state.fieldFormDppId ?? null);
  }, [state.role, state.fieldFormDppId]);

  /**
   * 제품조회 "상세" 모달(dppOpen)에서 발급완료(완성도 100%) DPP를 열면 QR을 그 자리에서
   * 바로 보여준다(2026-08-17 강 요청: "QR 만드는 기능 완성했으면 제품조회에서 id 상세
   * 누르면 QR도 찍히게"). issuedPassportCache는 이번 세션에 "방금 발급한" DPP만 들고
   * 있어서 새로고침 후나 예전에 발급된 DPP는 못 찾는다 - 대신 실제 대시보드 데이터
   * (dashboardData.dpps)에서 그 DPP의 완성도를 확인해서, 100%면 표시용 식별자로 QR을
   * 매번 새로 만든다(서버에 QR 이미지를 저장/조회하는 기능은 없음 - 클라이언트에서 같은
   * 내용으로 재생성하는 것도 매번 동일한 QR이라 동등하다).
   */
  useEffect(() => {
    if (!state.dppOpen || state.dppId == null || !dashboardData) return;
    const row = dashboardData.dpps.find((d) => d.dppId === state.dppId);
    if (!row || Math.round(row.completeness) !== 100) return;
    const displayId = row.internalSku || ('DPP-' + row.dppId);
    if (state.dppQrCache && state.dppQrCache[displayId]) return;
    if (state.dppQrPending && state.dppQrPending[displayId]) return;
    setState((s) => ({ dppQrPending: { ...(s.dppQrPending || {}), [displayId]: true } }));
    let alive = true;
    // 2026-08-18 강 리포트: QR이 텍스트만 인코딩해서 스캐너가 구글 검색으로 처리하던
    // 버그 - 공개 조회 URL(/p/{publicUuid})을 인코딩한다(makerVals.js issueDpp와 동일).
    const passportUrl = publicPassportUrl(row.publicUuid) || displayId;
    QRCode.toDataURL(passportUrl, { margin: 1, width: 220, color: { dark: '#0B1B33', light: '#FFFFFF' } })
      .then((dataUrl) => {
        if (!alive) return;
        setState((s) => ({
          dppQrCache: { ...(s.dppQrCache || {}), [displayId]: dataUrl },
          dppQrPending: { ...(s.dppQrPending || {}), [displayId]: false }
        }));
      })
      .catch(() => {
        if (alive) setState((s) => ({ dppQrPending: { ...(s.dppQrPending || {}), [displayId]: false } }));
      });
    return () => { alive = false; };
  }, [state.dppOpen, state.dppId, dashboardData]);

  /* URL → 상태
   *
   * 주소창의 role은 "지금 이 계정이 무엇인가"를 절대 바꾸지 못한다. 예전엔 경로에서 읽은
   * { view, role, tab }을 그대로 덮어써서, 세관 계정으로 로그인한 탭에서 뒤로가기를 누르면
   * 히스토리에 남아 있던 /steel/... 로 돌아가며 계정이 제조사로 바뀐 것처럼 보였다
   * (2026-08-22 강 리포트). 로그인/로그아웃이 아닌 방법으로 역할이 바뀌면 안 된다.
   *
   * 그래서 세션이 있는 동안에는 tab만 URL을 따르고, 역할이 다른 경로면 지금 역할의
   * 정규 경로로 되돌린다(아래 상태 → URL 이펙트가 주소창을 다시 맞춰 준다).
   */
  useEffect(() => {
    const next = stateFromPath(pathname);
    if (!next) return;
    const loggedIn = !!loadSession()?.accessToken;
    if (loggedIn && next.view === 'app' && next.role && next.role !== state.role) {
      const back = pathFor('app', state.role, state.tab) || pathFor('app', state.role, firstTab(state.role));
      if (back && back !== pathname) navigate(back, { replace: true });
      return;
    }
    setStateRaw((prev) => {
      const changed = Object.keys(next).some((k) => next[k] !== prev[k]);
      return changed ? { ...prev, ...next, notifOpen: false, dppOpen: false } : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* SNS 콜백이 실패로 돌아왔으면 마운트 직후 한 번 토스트로 알려준다. */
  useEffect(() => {
    if (pendingSnsError.current) {
      say(pendingSnsError.current);
      pendingSnsError.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /*
   * 상태 → URL. 최초 렌더도 건너뛰지 않는다 — "/"(SNS 콜백이 돌아오는 경로)처럼
   * 어떤 { view, role, tab } 조합의 경로와도 일치하지 않는 곳에서 시작한 경우,
   * 첫 렌더를 건너뛰면 실제 화면(state.view='app')과 주소창('/')이 영영 안 맞게 된다.
   * next !== pathname 체크가 이미 있어서 정상적인 딥링크(예: /steel/dashboard로 바로
   * 진입)에서는 어차피 같은 경로라 재이동이 안 일어나므로, 최초 렌더를 건너뛸 이유가 없다.
   */
  useEffect(() => {
    const next = pathFor(state.view, state.role, state.tab);
    if (next && next !== pathname) navigate(next);
  }, [state.view, state.role, state.tab]); // eslint-disable-line react-hooks/exhaustive-deps

  const compData = () => (data ? data.products[state.role] || data.products.steel : []);

  /** 계정 목록: 서버에서 받은 계정 + 이번 세션에 가입한 계정. */
  function accounts() {
    return { ...(data ? data.accounts : {}), ...(state.registered || {}) };
  }

  function domainHint(v) {
    const at = (v || '').indexOf('@');
    const domain = at >= 0 ? v.slice(at + 1).toLowerCase().trim() : '';
    if (!domain) return null;
    if (/^(gmail|naver|daum|hanmail|kakao|outlook|hotmail|yahoo|nate|icloud)\./.test(domain + '.')) return 'personal';
    if (/(^|\.)customs\.go\.kr$|(^|\.)kcs\.go\.kr$/.test(domain)) return 'customs';
    if (/(^|\.)korea\.kr$|(^|\.)kats\.go\.kr$|(^|\.)motie\.go\.kr$/.test(domain)) return 'eu';
    return 'unknown';
  }

  /** 로그인 성공 직후 어느 대시보드로 보낼지 정할 때 쓰는 보조 힌트일 뿐, 실제 인증에는 안 씀. */
  function roleFromEmail(v) {
    const key = (v || '').toLowerCase().trim();
    if (domainHint(key) === 'personal') return 'personal';
    return accounts()[key] || null;
  }

  function firstTab(r) { return r === 'eu' ? 'registry' : r === 'personal' ? 'scans' : r === 'customs' ? 'clearance' : r === 'partner' ? 'assigned' : 'dash'; }

  /**
   * organization.org_type(+domain) -> 화면 역할. 서버의 LoginResponse.appRoleOf와 같은 표다.
   *
   * 이 함수를 따로 둔 이유(2026-08-23 강 리포트 "협력사 계정으로 로그인했는데 제조사처럼
   * 리다이렉트된다"): 로그인 착지와 세션 교정이 각자 자기 매핑을 갖고 있었고, 로그인 쪽은
   * appRole이 null이면 곧바로 'steel'로 떨어뜨렸다. 서버가 org_type을 분류하지 못한
   * 계정은 그 순간 무조건 제조사 화면으로 갔다는 뜻이다. 이제 두 곳이 같은 함수를 쓰고,
   * 로그인 응답에 함께 오는 orgType/domain으로 클라이언트에서 한 번 더 시도한다.
   */
  function roleFromOrg(orgType, domain) {
    if (!orgType) return null;
    if (orgType === 'CUSTOMS') return 'customs';
    if (orgType === 'EU_AUTHORITY') return 'eu';
    if (orgType === 'MANUFACTURER') {
      return domain === 'BATTERY' ? 'battery' : domain === 'TEXTILE' ? 'textile' : 'steel';
    }
    if (['RAW_SUPPLIER', 'TEST_LAB', 'RECYCLER', 'LOGISTICS', 'DISTRIBUTOR'].includes(orgType)) return 'partner';
    return null;
  }

  /**
   * 이전 계정의 서버 데이터를 전부 비운다.
   *
   * 2026-08-23 강 리포트("모든 계정이 이음제강으로 리다이렉트된다"). 로그아웃(resetSession)이
   * 폼 상태만 지우고 meData/orgData/dashboardData 같은 응답 캐시는 메모리에 그대로 뒀다.
   * 같은 탭에서 계정을 갈아타면 이전 조직 정보가 살아남아 헤더에 옛 회사명이 뜨고, 역할
   * 교정 이펙트가 그 낡은 org_type으로 새 계정을 엉뚱한 화면에 밀어넣었다.
   *
   * 특히 조직이 없는 계정(관리자·개인)은 GET /me/organization이 400이라
   * `.catch(() => {})`가 아무것도 안 하고 지나가서, 옛 조직 정보가 영원히 남았다.
   * 그래서 로그아웃뿐 아니라 로그인 직후에도 한 번 비운다 - 새 응답이 오기 전까지는
   * "모르는 상태(null)"가 옳지, 남의 계정 데이터가 아니다.
   */
  function clearAccountData() {
    setMeData(null);
    setOrgData(null);
    setDashboardData(null);
    setOrgApprovalsData(null);
    setEuRegistryData(null);
    setAdminDashboardData(null);
    setAdminDashboardFetchedAt(null);
    setAdminDashboardError(null);
    setAdminMembersData(null);
    setCustomsQueueData(null);
    setAuditLogData(null);
    setFieldFormData(null);
    setFieldFormInputs({});
    setDocumentFormData(null);
    setScansData([]);
    setProductResults([]);
    setProductQuery('');
    setProductSearched(false);
    setInvitesData([]);
    setParticipationsData([]);
    setNotifCatsData([]);
    setNotifsData([]);
    setMyDomainsData(null);
    setDomainGrantsData([]);
  }

  function say(msg) {
    setState({ toast: msg });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState({ toast: '' }), 2600);
  }

  /**
   * 개인 회원 제품 검색(2026-08-23 강 요청) - 제품명·브랜드로만 찾는다.
   * BE가 2자 미만이면 빈 배열을 주지만, 여기서 먼저 막아서 "왜 아무것도 안 나오지"를 없앤다.
   *
   * 이 함수와 openPublicPassport는 반드시 컴포넌트 본문에 두고 아래 ctx에도 넣어야 한다 -
   * renderVals() 안쪽에만 두면 viewModels에서 ctx.xxx로 못 부른다(2026-08-21 goToLink 사고).
   */
  async function runProductSearch() {
    const q = (productQuery || '').trim();
    if (q.length < 2) {
      say('제품명 또는 브랜드를 2자 이상 입력해 주세요.');
      return;
    }
    setProductSearching(true);
    try {
      const rows = await searchProducts(q);
      setProductResults(rows || []);
      setProductSearched(true);
    } catch (err) {
      say(err.message || '검색에 실패했습니다.');
    } finally {
      setProductSearching(false);
    }
  }

  /**
   * 공개 여권 열람 - QR을 휴대폰으로 찍었을 때와 완전히 같은 화면(/p/{publicUuid})으로 보낸다.
   * 개인 회원에게 별도의 상세 화면을 주지 않는 이유: 공개 여권이 이미 "로그인 없이 보여줄 수
   * 있는 범위"로 잘려 있어서, 개인 회원 열람 범위로 그대로 쓸 수 있다.
   *
   * 이동 전에 조회 기록을 남기지만, 기록 저장이 실패해도 열람은 막지 않는다.
   */
  async function openPublicPassport(publicUuid) {
    const uuid = String(publicUuid || '').trim();
    if (!uuid) return;
    try {
      const saved = await recordScan(uuid);
      if (saved) {
        setScansData((prev) => [saved, ...(prev || []).filter((x) => x.passportCode !== saved.passportCode)].slice(0, 5));
      }
    } catch {
      // 기록 실패는 조용히 넘긴다 - 사용자가 원한 건 제품을 보는 것이다.
    }
    navigate('/p/' + uuid);
  }

  /** 로그아웃 시 앱 내부 상태를 초기값으로 되돌립니다 (URL 이동은 MyPage 가 담당). */
  function resetSession() {
    clearAccountData();
    setState({
      view: 'login', role: props.startRole || 'steel', tab: 'dash',
      loginTab: 'company', suTab: 'company', suRole: 'maker',
      loginEmail: '', loginPassword: '',
      suEmail: '', suPassword: '', suPasswordConfirm: '', suCompanyName: '', suBizRegNo: '',
      suCodeSent: false, suVerified: false, suVerifyCode: '',
      suPhone: '', suPhoneCodeSent: false, suPhoneVerified: false, suPhoneVerifyCode: '',
      obOpen: false, obStep: 1, obSaved: null,
      notifOpen: false, dppOpen: false, dppId: null, pubId: null,
      customsSearched: false, customsQuery: '',
      removedScans: [], removedProducts: [],
      registered: {}, confirm: null, toast: '', fieldFormDppId: null,
      parsedFieldSources: {}, unlockedFields: {}, qrModal: null, issuedPassportCache: {},
      tierRequestPending: {}, permRequestPending: {},
      rejectModal: null, rejectReasonInput: '', dppQrCache: {}, dppQrPending: {}, productStatusFilter: 'all',
      orgDetail: null, orgDetailLoading: false, orgDetailError: '', orgDetailCertUrl: '', orgDetailCertKind: '', orgDetailCertError: '',
      apSection: 'signup', dgFormOpen: false, dgDomain: '', dgReason: '', dgFile: null, dgFileName: '',
      grantDoc: null, grantDocUrl: '', grantDocKind: '', grantDocError: '', dgRejectModal: null,
      criteriaOpen: {}
    });
  }

  /**
   * 알림의 "바로가기". linkUrl에 ?filter=... 같은 쿼리를 붙일 수 있게 해서, 화면만 여는 게
   * 아니라 그 알림이 가리키는 상태까지 맞춰 준다 - 가입 심사 알림은
   * /admin/approvals?filter=pending 으로 와서 「가입대기」 탭이 눌린 채로 열린다.
   *
   * 이 함수는 반드시 ctx에도 실려 있어야 한다. notifVals.js가 ctx.goToLink로 부르는데,
   * 예전엔 renderVals()가 돌려주는 객체 안에만 정의돼 있어서 ctx.goToLink가 undefined였고,
   * 「바로가기」를 눌러도 TypeError만 나고 아무 일도 일어나지 않았다(2026-08-22 강 리포트).
   */
  function goToLink(linkUrl) {
    if (!linkUrl) { say('이동할 화면이 지정되지 않은 알림입니다.'); return; }
    const [path, query] = String(linkUrl).split('?');
    const target = stateFromPath(path);
    if (!target || target.view !== 'app') { say('이동할 수 없는 주소입니다: ' + linkUrl); return; }
    const next = { notifOpen: false, view: 'app', role: target.role, tab: target.tab };
    const filter = new URLSearchParams(query || '').get('filter');
    if (target.role === 'admin' && target.tab === 'approve') {
      // 필터를 안 준 가입 심사 알림도 '가입대기'로 열어 주는 게 맞다 - 알림을 눌러
      // 도착한 사람이 하려는 일은 대기 중인 건을 처리하는 것이다.
      next.apFilter = filter || 'pending';
      // 도메인 확장 알림은 그쪽 갈래를 펼친 채로 연다(?tab=domain).
      next.apSection = new URLSearchParams(query || '').get('tab') === 'domain' ? 'domain' : 'signup';
    }
    setState(next);
  }

  /** extra: 로그인/가입 응답으로 받은 토큰 등을 세션에 같이 저장하고 싶을 때. */
  function go(role, extra) {
    // 같은 탭에서 계정을 갈아탈 때 이전 계정의 응답 캐시가 새 계정 화면에 섞이지 않게
    // 먼저 비운다(clearAccountData 주석 참고).
    clearAccountData();
    saveSession({ role, at: Date.now(), ...extra });
    setState({ view: 'app', role, tab: firstTab(role), notifOpen: false, dppOpen: false, customsSearched: false, customsQuery: '' });
  }

  /**
   * dl(도메인 라벨)/ur(역할 타이틀)은 여전히 역할별 자리표시자다. un(이름)/ini(이니셜)는
   * GET /me(meData), ws(소속명)는 GET /me/organization(orgData)가 로드되면 실제 값으로
   * 바뀐다 - org_id 없는 계정(개인 등)은 orgData가 null로 남아서 자리표시자를 그대로 쓴다.
   */
  function profile() {
    const m = {
      admin: { ws: 'IEUM 운영 콘솔', dl: '관리자', un: '김도현', ur: '플랫폼 운영자', ini: '김' },
      steel: { ws: '대성제강', dl: '철강', un: '박지우', ur: 'DPP 담당자', ini: '박' },
      battery: { ws: '루멘셀', dl: '배터리', un: '이서준', ur: 'DPP 담당자', ini: '이' },
      textile: { ws: '아라텍스', dl: '섬유·패션', un: '최유진', ur: 'DPP 담당자', ini: '최' },
      eu: { ws: '국가기술표준원 · 제품안전조사과', dl: '시장감독기관', un: '윤가람', ur: 'DPP 감독관', ini: '윤' },
      customs: { ws: '인천세관 · 수입통관과', dl: '세관', un: '한지원', ur: '통관 심사관', ini: '한' },
      personal: { ws: '개인 회원', dl: '개인', un: '정민수', ur: '개인 계정', ini: '정' },
      partner: { ws: '협력사', dl: '협력사', un: '담당자', ur: '원자재공급 · 참여 협력사', ini: '협' }
    };
    const base = m[state.role];
    const withOrg = orgData?.orgName ? { ...base, ws: orgData.orgName } : base;
    if (!meData || !meData.displayName) return withOrg;
    return { ...withOrg, un: meData.displayName, ini: meData.displayName.charAt(0) || base.ini };
  }

  function tabList() {
    const r = state.role;
    if (r === 'admin') return [['dash', '대시보드'], ['approve', '회원 관리']];
    if (r === 'eu') return [['registry', 'DPP 레지스트리'], ['audit', '감사 로그']];
    if (r === 'personal') return [['scans', '제품 조회 기록'], ['my', '마이페이지']];
    if (r === 'customs') return [['clearance', '통관 검증']];
    if (r === 'partner') return [['assigned', '참여 DPP'], ['my', '마이페이지']];
    return [['dash', '대시보드'], ['input', 'DPP 생성'], ['partners', '협력사 관리'], ['products', '제품 조회'], ['my', '마이페이지']];
  }

  function renderVals() {
    const s = state;
    const p = profile();
    const isMaker = s.role === 'steel' || s.role === 'battery' || s.role === 'textile';
    // 관리자 KPI/스파크라인 - 예전엔 data.anchors(mock 배열)였다. ADMIN 로그인 후 위
    // useEffect가 /admin/dashboard를 불러와 adminDashboardData를 채우기 전까지는(또는
    // ADMIN이 아니면 계속) 빈 배열로 둔다 - mock으로 되돌아가지 않는다("real data over
    // fake" 원칙, 2026-08-19 강 요청).
    const admin = adminDashboardData;
    const anchorSeq = (admin && admin.anchorSparkline14d) || [];
    // "유형별 문의"도 mock(data.json inquiries: 계정·인증 140건 / Tier 심사 78건 ...)을
    // 버리고 /admin/dashboard의 실집계(notification category='INQUIRY', 최근 30일,
    // sub_type별)로 바꿨다(2026-08-20 강 요청). 문의 접수 기능이 아직 없어서 지금은
    // 항상 빈 배열이고, 화면은 그대로 "접수된 문의가 없습니다"를 보여준다 - 없는 숫자를
    // 지어내지 않는 게 이 코드베이스 원칙이다. Tier 심사 유형은 BE 쿼리에서 제외된다.
    const inqData = (admin && admin.inquiriesByType) || [];
    const adminMembersList = adminMembersData || [];
    // 지표 하나가 실패하면 BE가 그 값만 null로 내려준다(AdminDashboardService.safe) -
    // 여기서 null을 '—'로 바꿔서, 나머지 지표는 정상 표시되게 한다.
    const num = (v) => (v == null ? '—' : Number(v).toLocaleString());
    const adminAnchorOk = !!(admin && admin.lastAnchoredMinutesAgo != null && admin.lastAnchoredMinutesAgo < 60 * 24);
    const adminLastAnchoredLabel = !admin || admin.lastAnchoredMinutesAgo == null
      ? '기록 없음'
      : admin.lastAnchoredMinutesAgo < 1 ? '방금 전'
      : admin.lastAnchoredMinutesAgo < 60 ? `${admin.lastAnchoredMinutesAgo}분 전`
      : admin.lastAnchoredMinutesAgo < 60 * 24 ? `${Math.floor(admin.lastAnchoredMinutesAgo / 60)}시간 전`
      : `${Math.floor(admin.lastAnchoredMinutesAgo / (60 * 24))}일 전`;
    return {
      workspace: p.ws,
      domainLabel: p.dl,
      domainChip: domainChipFor(p.dl),
      userName: p.un, userRole: p.ur, userInitial: p.ini,
      meName: p.un,
      meEmail: meData?.email || '',
      meConnectedAccounts: (meData?.connectedAccounts || []).map(a => ({ provider: a.provider, email: a.email, nickname: a.nickname })),
      showTabs: tabList().length > 1,
      tabs: tabList().map(([k, label]) => ({
        key: k, label, style: tabStyle(s.tab === k),
        go: () => {
          if (k === 'clearance') { setState({ tab: k, customsSearched: false, customsQuery: '' }); return; }
          if (k === 'input') {
            // 사이드바에서 "OO 데이터 입력" 탭을 직접 클릭했을 때는 이전에 열어봤던 특정
            // DPP의 초안이 그대로 남아 보이면 안 된다 - 그 초안은 "제품조회 > DPP 식별자
            // 클릭"으로 이어서 작성할 때만 나와야 한다(2026-08-16, 강 리포트: "배터리
            // 데이터 입력에 들어가면 작성하던게 그대로 들어있는데 이거 작성하던 내용은
            // 제품조회 > DPP식별자 ID 클릭했을 때 나와야하고 그냥은 비워둬야지"). 새로고침
            // 복원용 localStorage(fieldFormDppId)가 role+계정별로 남아있어서, 사이드바
            // 탭 클릭처럼 "이어서 작성" 의도가 아닌 진입에서도 계속 예전 DPP를 물고
            // 있었던 게 원인 - goInput()(makerVals.js, "+ 새 DPP 발급" 버튼)과 동일하게
            // fieldFormDppId를 비워서 진짜 빈 초안을 새로 받아오게 한다. "이어서 작성"
            // 진입점(제품조회/완성도 목록의 open 핸들러)은 fieldFormDppId를 그 DPP id로
            // 명시적으로 같이 넘기므로 이 리셋과 겹치지 않는다.
            setMillSheetResult(null);
            setCbamResult(null);
            setCareLabelResult(null);
            setOekotexResult(null);
            setBatteryCarbonResult(null);
            setRecyclingResult(null);
            setFieldFormInputs({});
            setDocumentFormData(null);
            setState({ tab: 'input', fieldFormDppId: null });
            return;
          }
          setState({ tab: k });
        }
      })),
      // 알림센터를 열 때 바로 한 번 더 받아온다(2026-08-21 강 요청 "초대 보내면 바로
      // 알림센터에 뜨게"). 20초 폴링이 이미 돌지만, 방금 초대를 받은 사람이 알림함을
      // 열었을 때 최대 20초를 기다리는 건 "동기화가 안 된다"로 보인다.
      /**
       * 알림의 "바로가기". 서버가 준 경로(notification.link_url)를 routes.js로 해석해
       * 실제 화면 상태로 바꾼다. 모르는 경로면 그 사실을 알린다 - 조용히 아무 일도
       * 안 일어나는 게 제일 나쁘다(2026-08-21 강 리포트).
       */
      goToLink,
      // 알림센터를 열면 안 읽은 알림을 서버에서 읽음 처리하고 목록을 다시 받는다 -
      // 헤더의 "새 알림" 빨간 점이 실제로 꺼지게 하기 위함(2026-08-22 강 요청).
      // 읽음 처리가 실패해도(네트워크 등) 목록은 그대로 보여준다 - 점만 남을 뿐이다.
      openNotif: () => {
        setState({ notifOpen: true });
        const reload = () => {
          fetchNotifications().then((res) => setNotifsData(res || [])).catch(() => {});
          fetchNotificationCategories().then((res) => setNotifCatsData(res || [])).catch(() => {});
        };
        markNotificationsRead().then(reload).catch(reload);
      },
      isMaker,
      scAdminDash: s.role === 'admin' && s.tab === 'dash',
      scApprove: s.role === 'admin' && s.tab === 'approve',
      scMakerDash: isMaker && s.tab === 'dash',
      scInput: isMaker && s.tab === 'input',
      scPartners: isMaker && s.tab === 'partners',
      scProducts: isMaker && s.tab === 'products',
      scMy: isMaker && s.tab === 'my',
      scPartnerAssigned: s.role === 'partner' && s.tab === 'assigned',
      scPartnerMy: s.role === 'partner' && s.tab === 'my',
      scScans: s.role === 'personal' && s.tab === 'scans',
      scPersonalMy: s.role === 'personal' && s.tab === 'my',
      scPassport: s.role === 'personal' && s.tab === 'passport',
      scans: (scansData || []).map((sc) => {
        const label = SCAN_STATUS_LABEL[sc.status] || sc.status;
        return {
          key: sc.scanId, id: sc.passportCode, name: sc.productName, company: sc.brandName || '',
          at: fmtDateTime(sc.scannedAt), status: label, updated: sc.passportUpdatedAt ? fmtDate(sc.passportUpdatedAt) : '—',
          remove: () => setState({
            confirm: {
              title: '조회 기록을 삭제할까요?',
              body: sc.productName + ' 의 열람 기록이 내 계정에서 삭제됩니다. 제품의 여권 자체는 삭제되지 않습니다.',
              label: '기록 삭제',
              run: async () => {
                try {
                  await deleteScan(sc.scanId);
                  setScansData(prev => prev.filter(x => x.scanId !== sc.scanId));
                  say('조회 기록을 삭제했습니다.');
                } catch (err) {
                  say(err.message || '삭제에 실패했습니다.');
                }
                setState({ confirm: null });
              }
            }
          }),
          ok: sc.status === 'VERIFIED',
          renewed: sc.status === 'UPDATED',
          failed: sc.status === 'FAILED',
          statusIconStyle: { display: 'grid', placeItems: 'center', flex: 'none', color: sc.status === 'VERIFIED' ? '#12A150' : sc.status === 'UPDATED' ? '#0045A9' : '#C22B2B' },
          rowStyle: { display: 'grid', gridTemplateColumns: '1.7fr 1.1fr 1.1fr 1fr 116px', gap: 12, padding: '13px 14px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' },
          // 예전엔 목데이터 화면(tab:'passport')으로 보냈다. 이제 실제 공개 여권으로 보낸다 -
          // 기록에 남은 passportCode가 곧 public_uuid다(2026-08-23).
          open: () => openPublicPassport(sc.passportCode)
        };
      }),
      scansEmpty: (scansData || []).length === 0,
      // --- 개인 회원 제품 검색(제품명·브랜드) ---
      scanSearchQ: productQuery,
      setScanSearchQ: (v) => setProductQuery(v),
      runScanSearch: runProductSearch,
      scanSearchBusy: productSearching,
      scanSearchDone: productSearched,
      scanSearchClear: () => { setProductQuery(''); setProductResults([]); setProductSearched(false); },
      scanResultsEmpty: productSearched && (productResults || []).length === 0,
      scanResults: (productResults || []).map((r, i) => ({
        key: r.publicUuid || i,
        name: r.productName || '(제품명 없음)',
        brand: r.brandName || '—',
        maker: r.makerName || '—',
        issued: r.issuedAtDate || '—',
        rowStyle: { display: 'grid', gridTemplateColumns: '1.7fr 1.1fr 1.1fr 1fr 116px', gap: 12, padding: '13px 14px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' },
        open: () => openPublicPassport(r.publicUuid)
      })),
      ...passportVals(ctx),
      scClearance: s.role === 'customs' && s.tab === 'clearance',
      scClearLog: s.role === 'customs' && s.tab === 'clearlog',
      ...customsVals(ctx),
      scRegistry: s.role === 'eu' && s.tab === 'registry',
      scAudit: s.role === 'eu' && s.tab === 'audit',
      goApprove: () => setState({ tab: 'approve' }),
      ...approvalVals(ctx),
      // tier1/2/3Chip은 Tier 심사 페이지(삭제됨, 2026-08-17)와 무관하게 알림센터 뱃지·
      // 가입 온보딩의 Tier 선택 카드(obTier1/obTier2)에서도 계속 쓰이는 공용 칩 스타일이라
      // 그대로 유지한다.
      tier1Chip: chip('rgba(16,32,64,.07)', '#44546F'),
      tier2Chip: chip('rgba(0,69,169,.10)', '#0045A9'),
      tier3Chip: chip('rgba(18,161,80,.12)', '#0E7A3D'),
      // 최근 14일 앵커링 건수 스파크라인(실데이터) - 최댓값 기준으로 막대 높이를
      // 정규화한다(BE가 건수를 그대로 내려주므로 px로 바로 쓰면 하루 몰림에 따라
      // 막대가 너무 작거나 커질 수 있어서).
      anchorBars: (() => {
        const seq = anchorSeq || [];
        const max = Math.max(1, ...seq);
        return seq.map((h, i) => ({ key: i, style: { display: 'block', width: 6, height: Math.max(2, Math.round((h / max) * 48)), borderRadius: 3, background: i > 12 ? 'rgba(134,239,172,.9)' : 'rgba(255,255,255,.24)' } }));
      })(),
      adminAnchorStatusLabel: admin ? (adminAnchorOk ? '정상' : '데이터 없음') : '—',
      adminAnchorStatusOk: adminAnchorOk,
      adminLastAnchoredLabel,
      adminLastAnchorBlockLabel: admin && admin.lastAnchorBlockNo != null ? `#${admin.lastAnchorBlockNo.toLocaleString()}` : '—',
      adminAnchorSuccessLabel: admin && admin.anchorSuccessRate30d != null ? `${admin.anchorSuccessRate30d}%` : '집계 없음',
      adminTotalUsersLabel: admin ? num(admin.totalUsers) : '—',
      adminUserBreakdownLabel: admin ? `기업 ${num(admin.businessUsers)} · 개인 ${num(admin.personalUsers)}` : '',
      adminTotalDppsLabel: admin ? num(admin.totalDpps) : '—',
      adminDppBreakdownLabel: admin ? `철강 ${num(admin.steelDpps)} · 배터리 ${num(admin.batteryDpps)} · 섬유 ${num(admin.textileDpps)}` : '',
      adminPendingCountLabel: admin ? `처리 대기 ${num(admin.pendingApprovalCount)}건` : '처리 대기 —',
      adminPendingBadge: admin ? num(admin.pendingApprovalCount) : '—',
      adminRefreshedAtLabel: adminDashboardFetchedAt ? `최근 갱신 ${fmtDateTime(adminDashboardFetchedAt.toISOString())}` : '',
      // 막대 길이는 최다 유형을 100%로 놓고 상대 비교한다. 예전 mock 시절엔 pct*2.6이라는
      // 고정 배율이었는데(최대값이 34%인 걸 전제로 눈대중으로 맞춘 수), 실데이터에서
      // 한 유형이 100%면 폭이 260%가 되어 막대가 트랙 밖으로 잘려 나간다.
      inquiries: (() => {
        const max = inqData.reduce((m, q) => Math.max(m, q.count), 0);
        return inqData.map((q) => ({ key: q.key, label: q.label, count: q.count, pct: q.pct,
          style: bar(max > 0 ? Math.round(q.count * 100 / max) : 0, '#0045A9') }));
      })(),
      inquiriesEmpty: inqData.length === 0,
      inquiryTotalLabel: admin ? `최근 30일 · ${num(admin.inquiryTotal30d)}건` : '최근 30일 · —',
      adminLoadErrorLabel: adminDashboardError || '',
      members: adminMembersList.map((m) => ({
        key: m.orgId, name: m.orgName, biz: m.bizRegNo, joined: m.joinedDate, country: m.countryCode,
        domain: m.domainLabel, held: m.heldDppCount, issued: m.issuedDppCount, initial: (m.orgName || '?').charAt(0),
        avatar: avatarStyle(avatarColorFor(m.orgName)), domainChip: domainChipFor(m.domainLabel),
        domainDot: { width: 8, height: 8, flex: 'none', borderRadius: 999, background: m.domainLabel === '철강' ? '#0045A9' : m.domainLabel === '배터리' ? '#12A150' : '#E3A008' },
        // 예전엔 토스트 한 줄만 띄우고 끝이었다("...회원 상세 정보를 조회했습니다").
        // 2026-08-20 강 요청으로 실제 상세 모달을 띄운다.
        view: () => setState({ memberModal: m })
      })),
      membersEmpty: adminMembersList.length === 0,
      memberModalOpen: !!s.memberModal,
      memberModalName: s.memberModal ? s.memberModal.orgName : '',
      memberModalRows: s.memberModal ? [
        { key: 'biz', label: '사업자등록번호', value: s.memberModal.bizRegNo || '—', mono: true },
        { key: 'country', label: '국가', value: s.memberModal.countryCode || '—', mono: true },
        { key: 'phone', label: '전화번호', value: s.memberModal.contactPhone || '—', mono: true },
        { key: 'contact', label: '담당자', value: s.memberModal.contactName || '—', mono: false },
        { key: 'email', label: '이메일', value: s.memberModal.contactEmail || '—', mono: false },
        { key: 'domain', label: '도메인', value: s.memberModal.domainLabel || '—', mono: false },
        { key: 'joined', label: '가입일', value: s.memberModal.joinedDate || '—', mono: true },
        { key: 'dpp', label: '보유 / 발행 DPP',
          value: (s.memberModal.heldDppCount ?? 0) + '건 / ' + (s.memberModal.issuedDppCount ?? 0) + '건', mono: true }
      ] : [],
      closeMemberModal: () => setState({ memberModal: null }),
      isLogin: s.view === 'login',
      isSignup: s.view === 'signup',
      isApp: s.view === 'app',
      toast: s.toast,

      loginIsPersonal: s.loginTab === 'personal',
      loginIsCompany: s.loginTab === 'company',
      loginPersonalTab: pill(s.loginTab === 'personal'),
      loginCompanyTab: pill(s.loginTab === 'company'),
      setPersonal: () => setState({ loginTab: 'personal' }),
      setCompany: () => setState({ loginTab: 'company' }),

      suIsPersonal: s.suTab === 'personal',
      suIsCompany: s.suTab === 'company',
      suPersonalTab: pill(s.suTab === 'personal'),
      suCompanyTab: pill(s.suTab === 'company'),
      setSuPersonal: () => setState({ suTab: 'personal' }),
      setSuCompany: () => setState({ suTab: 'company' }),
      suRoleMaker: roleCard(s.suRole === 'maker'),
      suRolePartner: roleCard(s.suRole === 'partner'),
      suRoleEu: roleCard(s.suRole === 'eu'),
      suRoleCustoms: roleCard(s.suRole === 'customs'),
      pickMaker: () => setState({ suRole: 'maker' }),
      pickPartner: () => setState({ suRole: 'partner' }),
      pickEu: () => setState({ suRole: 'eu' }),
      pickCustoms: () => setState({ suRole: 'customs' }),
      // 세관/시장감독기관(공적 기관) 계정 - 사업자등록증 자동승인 없이 항상 관리자
      // 수동심사로 감(2026-08-19 강 요청 3번). 첨부 파일 UI 문구 분기에 사용.
      suRoleIsPublicAuthority: s.suRole === 'customs' || s.suRole === 'eu',
      suEmail: s.suEmail || '',
      onSuEmail: e => {
        const v = e.target.value;
        const at = v.indexOf('@');
        const domain = at >= 0 ? v.slice(at + 1).toLowerCase().trim() : '';
        const hint = domainHint(v);
        const map = { customs: 'customs', eu: 'eu' };
        const role = map[hint] || null;
        // 이메일을 바꾸면 이전 인증 상태는 무효화 (다른 이메일로 인증코드 재요청 필요).
        setState({ suEmail: v, suDetected: domain ? (hint === 'unknown' ? 'unknown' : hint) : null, suRole: role || s.suRole, suCodeSent: false, suVerified: false, suVerifyCode: '' });
      },
      suDetectedShow: !!s.suDetected && s.suDetected !== 'personal' && s.suDetected !== 'unknown',
      suDetectedPersonal: s.suDetected === 'personal',
      suDetectedUnknown: s.suDetected === 'unknown',
      suDetectedLabel: { maker: '제조사', customs: '세관', eu: '시장감독기관' }[s.suDetected] || '',
      suDetectedNote: {
        customs: '등록된 세관 도메인 · 세관 계정으로 제안되었습니다',
        eu: '등록된 기관 도메인 · 시장감독기관 계정으로 제안되었습니다'
      }[s.suDetected] || '',

      // --- 기업 정보 (BusinessSignupRequest 에 필요한 필드) ---
      suCompanyName: s.suCompanyName || '',
      onSuCompanyName: e => setState({ suCompanyName: e.target.value }),
      suBizRegNo: s.suBizRegNo || '',
      onSuBizRegNo: e => setState({ suBizRegNo: e.target.value }),
      suCountry: s.suCountry === undefined ? '대한민국' : s.suCountry,
      onSuCountry: e => setState({ suCountry: e.target.value }),
      suPassword: s.suPassword || '',
      onSuPassword: e => setState({ suPassword: e.target.value }),
      suPasswordConfirm: s.suPasswordConfirm || '',
      onSuPasswordConfirm: e => setState({ suPasswordConfirm: e.target.value }),
      // --- 사업자등록증 첨부 (자동승인 심사용, 2026-08-19 강 요청) ---
      // 제조사/협력사는 필수(submitSignup에서 검증). 세관/시장감독기관은 자동승인을 타지
      // 않아 항상 관리자 수동심사로 가므로 선택 첨부.
      suBizRegCertName: s.suBizRegCert ? s.suBizRegCert.name : '',
      onSuBizRegCert: e => setState({ suBizRegCert: (e.target.files && e.target.files[0]) || null }),

      // --- 이메일 인증 2단계 (요청 → 검증) ---
      suCodeSent: !!s.suCodeSent,
      suVerified: !!s.suVerified,
      suVerifyCode: s.suVerifyCode || '',
      onSuVerifyCode: e => setState({ suVerifyCode: e.target.value }),
      suRequestCode: async () => {
        const email = (s.suEmail || '').trim();
        if (!email) { say('이메일을 입력해 주세요.'); return; }
        if (domainHint(email) === 'personal') { say('개인 메일 도메인으로는 기업 회원가입을 할 수 없습니다.'); return; }
        try {
          const res = await requestBusinessSignupCode(email);
          // SMTP가 꺼진 환경(app.mail.enabled=false)에서는 서버가 발급된 코드를 같이
          // 내려준다 - 전화번호 인증과 같은 규약. 메일이 실제로 나가지 않는데 "발송했습니다"
          // 토스트만 뜨는 게 가장 헷갈렸다(2026-08-22 강 리포트: "public ip로 이메일 전송을
          // 누르면 이메일이 도착하지 않고 토스트 메시지만 올라옴"). 코드를 입력칸에 채우고
          // 미설정 상태임을 분명히 말한다.
          const devCode = res && res.devCode;
          setState({ suCodeSent: true, suVerified: false, suVerifyCode: devCode || '' });
          say(devCode
            ? '메일 미설정 환경이라 실제 발송 없이 코드(' + devCode + ')를 자동으로 채웠습니다.'
            : '인증 메일을 발송했습니다. 메일함을 확인해 주세요.');
        } catch (err) {
          say(err.message || '인증코드 발송에 실패했습니다.');
        }
      },
      suConfirmCode: async () => {
        const email = (s.suEmail || '').trim();
        const code = (s.suVerifyCode || '').trim();
        if (!code) { say('인증코드를 입력해 주세요.'); return; }
        try {
          await verifyBusinessSignupCode(email, code);
          setState({ suVerified: true });
          say('이메일 인증이 완료되었습니다.');
        } catch (err) {
          say(err.message || '인증코드가 올바르지 않습니다.');
        }
      },

      // --- 전화번호 인증 2단계 (요청 → 검증). 이메일 인증과 완전히 같은 패턴. ---
      suPhone: s.suPhone || '',
      onSuPhone: e => setState({ suPhone: e.target.value, suPhoneCodeSent: false, suPhoneVerified: false, suPhoneVerifyCode: '' }),
      suPhoneCodeSent: !!s.suPhoneCodeSent,
      suPhoneVerified: !!s.suPhoneVerified,
      suPhoneVerifyCode: s.suPhoneVerifyCode || '',
      onSuPhoneVerifyCode: e => setState({ suPhoneVerifyCode: e.target.value }),
      suRequestPhoneCode: async () => {
        const phone = (s.suPhone || '').trim();
        if (!phone) { say('휴대전화번호를 입력해 주세요.'); return; }
        // 형식 검사는 여기서 먼저 한다(2026-08-22 강 요청 - 정확한 문구를 띄우기 위함).
        // 서버(PhoneCodeRequest)도 같은 조건을 검사하지만, Bean Validation 실패는
        // MethodArgumentNotValidException으로 나가서 응답 본문에 message 필드가 없고,
        // FE는 결국 '인증번호 발송에 실패했습니다'라는 엉뚱한 문구만 보여줬다.
        // 0으로 시작하는 국번(2~3자리) + 3~4자리 + 4자리, 하이픈은 있어도 없어도 된다.
        if (!/^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(phone)) {
          say('전화번호 형식이 맞지 않습니다.');
          return;
        }
        try {
          const res = await requestBusinessSignupPhoneCode(phone);
          // SMS가 꺼진 환경(app.sms.enabled=false)에서는 서버가 발급된 코드를 같이
          // 내려준다 - 컨테이너 로그를 뒤지지 않고 화면에서 바로 인증을 끝낼 수 있게
          // 입력칸에 채워 준다(2026-08-21). SMS를 켜면 devCode가 없어 빈칸으로 남는다.
          const devCode = res && res.devCode;
          setState({ suPhoneCodeSent: true, suPhoneVerified: false, suPhoneVerifyCode: devCode || '' });
          say(devCode
            ? '인증번호를 발송했습니다. SMS 미설정 환경이라 코드(' + devCode + ')를 자동으로 채웠습니다.'
            : '인증번호를 발송했습니다. 문자를 확인해 주세요.');
        } catch (err) {
          say(err.message || '인증번호 발송에 실패했습니다.');
        }
      },
      suConfirmPhoneCode: async () => {
        const phone = (s.suPhone || '').trim();
        const code = (s.suPhoneVerifyCode || '').trim();
        if (!code) { say('인증번호를 입력해 주세요.'); return; }
        try {
          await verifyBusinessSignupPhoneCode(phone, code);
          setState({ suPhoneVerified: true });
          say('전화번호 인증이 완료되었습니다.');
        } catch (err) {
          say(err.message || '인증번호가 올바르지 않습니다.');
        }
      },

      goSignup: () => setState({ view: 'signup' }),
      goLogin: () => setState({ view: 'login' }),
      // 로그인 폼 이메일 기본값 - 예전엔 철강 테스트 계정(dh.kim@daesungsteel.co.kr)이
      // 하드코딩되어 있었다(2026-08-16, 강 리포트: "로그인 할 때 ID가 적혀져있는데 이거
      // 없애"). 빈 문자열로 시작해서 사용자가 직접 입력하게 한다.
      loginEmail: s.loginEmail || '',
      onLoginEmail: e => setState({ loginEmail: e.target.value }),
      loginPassword: s.loginPassword || '',
      onLoginPassword: e => setState({ loginPassword: e.target.value }),
      loginRoleShow: !!state.loginRoleLabel,
      loginRoleLabel: state.loginRoleLabel || '',
      doLogin: async () => {
        const email = (s.loginEmail || '').trim();
        const password = s.loginPassword || '';
        if (!email) { say('이메일을 입력해 주세요.'); return; }
        if (!password) { say('비밀번호를 입력해 주세요.'); return; }
        try {
          const res = await login(email, password);
          // 서버가 organization.org_type/domain을 화면 역할로 번역해 appRole로 내려준다
          // (LoginResponse.appRoleOf). 예전엔 이게 없어서 mock 계정 매핑표에 없는 이메일이면
          // 무조건 'steel'로 착지시켰고, 세관/시장감독기관으로 가입해도 로그인하면 철강
          // 제조사 화면이 떴다(2026-08-22 강 리포트). appRole이 없을 때만(조직 유형 미지정
          // 계정) 기존 휴리스틱으로 폴백한다.
          const heuristic = roleFromEmail(email);
          // appRole -> 응답의 orgType/domain으로 직접 계산 -> mock 매핑표 -> 마지막에야 steel.
          // 예전엔 appRole이 없으면 곧장 'steel'이라, 협력사·세관처럼 서버가 역할을 못 준
          // 계정이 전부 제조사 화면으로 착지했다(2026-08-23 강 리포트).
          const fromOrg = roleFromOrg(res.orgType, res.domain);
          if (!res.appRole) {
            console.warn('[login] 서버가 appRole을 주지 않았다', { orgType: res.orgType, domain: res.domain, fallback: fromOrg });
          }
          const role = res.appRole
            || fromOrg
            || (res.accountType === 'ADMIN' ? 'admin' : (heuristic && heuristic !== 'personal' ? heuristic : 'steel'));
          go(role, { accessToken: res.accessToken, refreshToken: res.refreshToken, email: res.email, accountType: res.accountType });
        } catch (err) {
          say(err.message || '로그인에 실패했습니다.');
        }
      },
      /** 카카오/네이버/구글 공통 - provider 인자를 받아 실제 SNS 인증 페이지로 이동시킵니다. */
      snsLogin: (provider) => goToSnsLogin(provider || 'kakao'),
      captchaGlyphs: (s.captcha || { glyphs: [] }).glyphs,
      suCaptcha: s.suCaptcha || '',
      onSuCaptcha: (e) => setState({ suCaptcha: e.target.value }),
      // 입력이 있는데 아직 안 맞으면 빨간 테두리로 즉시 알려준다.
      captchaBorderColor: (s.suCaptcha || '').trim() === ''
        ? 'rgba(16,32,64,.14)'
        : ((s.suCaptcha || '').trim().toLowerCase() === ((s.captcha && s.captcha.text) || '').toLowerCase()
            ? '#12A150' : '#E03B3B'),
      refreshCaptcha: () => { setState({ captcha: makeCaptcha(), suCaptcha: '' }); },
      submitSignup: async () => {
        const email = (s.suEmail || '').toLowerCase().trim();
        if (domainHint(email) === 'personal') { say('개인 메일 도메인으로는 기업 회원가입을 할 수 없습니다.'); return; }
        if (!s.suVerified) { say('이메일 인증을 먼저 완료해 주세요.'); return; }
        if (!s.suPhoneVerified) { say('전화번호 인증을 먼저 완료해 주세요.'); return; }
        const isPublicAuthorityRole = s.suRole === 'customs' || s.suRole === 'eu';
        // 세관·시장감독기관은 사업자등록번호 입력란 자체가 없다(2026-08-21 강 요청 6번) -
        // 그 자리에서 국가를 받으므로 여기서도 국가만 필수로 본다.
        if (!s.suCompanyName) { say(isPublicAuthorityRole ? '기관명을 입력해 주세요.' : '회사명을 입력해 주세요.'); return; }
        if (isPublicAuthorityRole) {
          if (!s.suCountry) { say('국가를 입력해 주세요.'); return; }
        } else if (!s.suBizRegNo) { say('사업자등록번호를 입력해 주세요.'); return; }
        if (!s.suPassword || s.suPassword.length < 8) { say('비밀번호는 8자 이상이어야 합니다.'); return; }
        if (s.suPassword !== s.suPasswordConfirm) { say('비밀번호가 일치하지 않습니다.'); return; }
        // 자동입력 방지 문자 확인(2026-08-21). 예전엔 화면에만 있고 검사를 아예 안 했다.
        const captchaAnswer = (s.suCaptcha || '').trim().toLowerCase();
        const captchaText = ((s.captcha && s.captcha.text) || '').toLowerCase();
        if (!captchaAnswer) { say('자동입력 방지 문자를 입력해 주세요.'); return; }
        if (captchaAnswer !== captchaText) {
          setState({ captcha: makeCaptcha(), suCaptcha: '' });
          say('자동입력 방지 문자가 일치하지 않습니다. 새 문자를 입력해 주세요.');
          return;
        }
        const isPublicAuthority = isPublicAuthorityRole;
        // 첨부는 네 유형 모두 필수다. 제조사/협력사는 사업자등록증으로 자동승인을 판정하고
        // (2026-08-19 강 요청 4번), 세관/시장감독기관은 온보딩에서 다시 받지 않기로 하면서
        // 이 첨부가 유일한 심사 근거가 됐다(2026-08-22 강 요청).
        if (!s.suBizRegCert) {
          say(isPublicAuthority ? '증빙서류 파일을 첨부해 주세요.' : '사업자등록증 파일을 첨부해 주세요.');
          return;
        }
        // partner(협력사)도 domain='steel'로 가입시킨다 - requirement_field가 아직 STEEL만
        // 시딩돼 있어서(V4__seed_requirement_steel.sql) RAW_SUPPLIER 등 협력사 역할이 실제로
        // 뭘 제출할 수 있는 케이스가 철강뿐이다. 배터리/섬유 협력사가 필요해지면 그때
        // 시딩부터 늘리고 이 분기도 확장할 것.
        // 세관/시장감독기관은 산업 도메인 개념이 없으므로 domain을 보내지 않고 orgTypeHint로
        // 보낸다 - 예전엔 여기서 'customs'/'eu' 문자열을 그대로 domain에 넣어 보내던 버그가
        // 있었다(BE normalizeDomain이 STEEL/TEXTILE/BATTERY만 받아 400이 났을 것).
        const domain = (s.suRole === 'maker' || s.suRole === 'partner') ? 'steel' : null;
        // org_type은 네 유형 모두 가입 시점에 확정한다. 예전엔 제조사/협력사가 null을 보내서
        // organization.org_type이 비어 있었고, 그 탓에 NotificationCategory.visibleTo가
        // default(전부 보여주기) 분기로 빠져 갓 가입한 제조사 알림센터에 통관·Tier까지 8개
        // 탭이 전부 떴다(2026-08-21 강 요청 5번). 협력사는 RAW_SUPPLIER로 보낸다 - 가입
        // 화면에서 협력사 세부 역할(원자재공급/시험소/재활용)을 아직 고르지 않기 때문이고,
        // 알림 가시성(PARTNER_VISIBLE)은 세 역할이 동일하다. 세부 역할은 마이페이지에서
        // 바꿀 수 있다(OrganizationService.updateMyOrganization).
        const orgTypeHint = s.suRole === 'customs' ? 'CUSTOMS'
          : s.suRole === 'eu' ? 'EU_AUTHORITY'
          : s.suRole === 'partner' ? 'RAW_SUPPLIER' : 'MANUFACTURER';
        try {
          const res = await completeBusinessSignup({
            email, password: s.suPassword, companyName: s.suCompanyName,
            businessRegNo: isPublicAuthority ? null : s.suBizRegNo,
            country: s.suCountry || '대한민국', domain, orgTypeHint,
            phone: (s.suPhone || '').trim(), bizRegCert: s.suBizRegCert
          });
          const sessionExtra = { accessToken: res.accessToken, refreshToken: res.refreshToken, email: res.email, accountType: res.accountType };
          if (s.suRole === 'maker') { saveSession({ role: 'steel', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'steel', tab: 'dash', obKind: 'maker', obOpen: true, obStep: 1, obSaved: 1 }); }
          else if (s.suRole === 'customs') { saveSession({ role: 'customs', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'customs', tab: 'clearance', obKind: 'customs', obOpen: true, obStep: 1, obSaved: 1 }); }
          else if (s.suRole === 'eu') { saveSession({ role: 'eu', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'eu', tab: 'registry', obKind: 'eu', obOpen: true, obStep: 1, obSaved: 1 }); }
          // partner는 온보딩 마법사가 아직 없어서(obVals.js에 partner용 단계가 없음) 바로
          // 대시보드로 보낸다 - 협력사 초대를 받아서 가입한 경우라 대개 자기가 담당한
          // DPP가 이미 연결돼 있을 것(BusinessSignupService.linkPendingCollaborations).
          else if (s.suRole === 'partner') { go('partner', sessionExtra); }
        } catch (err) {
          say(err.message || '회원가입에 실패했습니다.');
        }
      },

      ...makerVals(ctx),
      ...partnerVals(ctx),
      ...euVals(ctx),
      ...notifVals(ctx),
      ...dppVals(ctx),
      ...obVals(ctx),
      // QR 모달에 인코딩된 실제 주소를 보여준다. 예전엔 QR 이미지만 있어서, 그 안에
      // http://localhost/p/... 가 들어간 걸 사용자가 알 방법이 없었다 - 휴대폰으로
      // 찍으면 아무것도 안 뜨는데 원인이 안 보였다(2026-08-20 강 리포트).
      qrModalUrl: (s.qrModal && s.qrModal.url) || '',
      // 경고 문구(없으면 빈 문자열) - loopback이라 안 열리는 경우와, 열리긴 하는데
      // 지금 보고 있는 서버가 아닌 곳을 가리키는 경우를 구분해서 알려준다.
      qrModalUrlWarning: (s.qrModal && qrUrlWarning(s.qrModal.url)) || '',
      confirmOpen: !!s.confirm,
      confirmTitle: s.confirm && s.confirm.title,
      confirmBody: s.confirm && s.confirm.body,
      confirmLabel: s.confirm && s.confirm.label,
      confirmStyle: s.confirm && s.confirm.danger
        ? { height: 46, padding: '0 22px', border: 0, borderRadius: 13, background: '#E03B3B', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 18px rgba(224,59,59,.24)' }
        : { height: 46, padding: '0 22px', border: 0, borderRadius: 13, background: '#0045A9', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.22)' },
      confirmRun: () => s.confirm && s.confirm.run(),
      confirmCancel: () => setState({ confirm: null })
    };
  }

  // saveFieldFormDraft(dppId, domain, values) 대신 (dppId, values)로 부르는 기존 호출부
  // (makerVals.js)를 그대로 두기 위한 래퍼 - 현재 화면의 role에서 도메인을 자동으로
  // 채워 넣는다(2026-08-16, 섬유 도메인 추가하며 domain 파라미터가 새로 생김).
  const saveFieldFormDraftForRole = useCallback((dppId, values, displayName) => {
    return saveFieldFormDraft(dppId, domainForRole(state.role), values, displayName);
  }, [state.role]);

  const ctx = {
    state, setState, props,
    data,
    meData, orgData, setOrgData, dashboardData, scansData, notifCatsData, notifsData, fmtRelative,
    orgApprovalsData, refetchOrgApprovals,
    euRegistryData, setEuRegistryData,
    customsQueueData, customsCaseDetail, refetchCustomsQueue, refetchCustomsCase, decideCustomsCase,
    requestCustomsClearance,
    auditLogData,
    myDomainsData, refetchMyDomains, requestDomainGrant,
    domainGrantsData, refetchDomainGrants, approveDomainGrant, rejectDomainGrant, fetchDomainGrantEvidenceBlob,
    fieldFormData, setFieldFormData, fieldFormInputs, setFieldFormInputs,
    saveFieldFormDraft: saveFieldFormDraftForRole, issueFieldFormDpp,
    documentFormData, setDocumentFormData, uploadDocument,
    millSheetResult, setMillSheetResult, uploadSteelMillSheet, refreshFieldForm, refreshDocumentForm, refreshDashboard,
    cbamResult, setCbamResult, uploadCbamReport,
    careLabelResult, setCareLabelResult, uploadCareLabel,
    oekotexResult, setOekotexResult, uploadOekotexLabel,
    batteryCarbonResult, setBatteryCarbonResult, uploadBatteryCarbonReport,
    recyclingResult, setRecyclingResult, uploadRecyclingReport,
    invitesData, setInvitesData, sendInvitation, resendInvitation, fmtDate, fmtDateTime,
    participationsData,
    accounts, domainHint, roleFromEmail, firstTab, say, go, goToLink, profile, tabList, compData, resetSession,
    pill, roleCard, pillDot, domainCard, tabStyle,
    chip, domainChipFor, avatarStyle, bar, pctStyle, segStyle, dot,
    badgeText3d, segStyle3D, groove3d,
    makerVals, partnerVals, passportVals, approvalVals, customsVals, euVals, notifVals, dppVals, obVals,
  };

  if (loadError) return { loading: false, loadError };
  if (!data) return { loading: true };

  return { loading: false, resetSession, ...renderVals() };
}
