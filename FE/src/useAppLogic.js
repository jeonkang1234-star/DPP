import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  pill, roleCard, pillDot, domainCard, tabStyle,
  chip, domainChipFor, avatarStyle, bar, pctStyle, segStyle, dot,
} from './uiStyles.js';
import { fetchAppData } from './api/mockApi.js';
import { loadSession, saveSession, loadDraftDppId, saveDraftDppId } from './api/session.js';
import {
  login, requestBusinessSignupCode, verifyBusinessSignupCode,
  requestBusinessSignupPhoneCode, verifyBusinessSignupPhoneCode, completeBusinessSignup,
  goToSnsLogin, consumeSnsCallback,
} from './api/authApi.js';
import { fetchMe, fetchScans, deleteScan, fetchNotificationCategories, fetchNotifications, fetchOrganization, fetchDashboard, fetchFieldForm, saveFieldFormDraft, issueFieldFormDpp, fetchInvitations, sendInvitation, resendInvitation, fetchParticipations, fetchDocumentForm, uploadDocument, uploadSteelMillSheet, uploadCbamReport, uploadCareLabel, uploadOekotexLabel, uploadBatteryCarbonReport, uploadRecyclingReport, fetchOrgApprovals, approveOrg, rejectOrg } from './api/meApi.js';

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
import { tierVals } from './viewModels/tierVals.js';
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
  const [invitesData, setInvitesData] = useState([]);
  const [participationsData, setParticipationsData] = useState([]);
  const [notifCatsData, setNotifCatsData] = useState([]);
  const [notifsData, setNotifsData] = useState([]);

  const [state, setStateRaw] = useState(() => {
    // 최초 진입 URL 이 곧 첫 화면입니다 (딥링크·새로고침 대응).
    const fromUrl = stateFromPath(pathname) || {};

    // SNS 로그인 콜백(BE가 /?sns_access=... 또는 /?sns_error=...로 리다이렉트시킨 것)이 있으면 최우선 처리.
    const snsResult = consumeSnsCallback();
    const snsLoggedIn = !!(snsResult && snsResult.accessToken);
    if (snsLoggedIn) saveSession({ ...snsResult, role: 'personal', at: Date.now() });
    if (snsResult && snsResult.error) pendingSnsError.current = snsResult.error;
    const saved = snsLoggedIn ? { role: 'personal' } : loadSession();
    const initialRole = fromUrl.role || saved?.role || props.startRole || 'steel';

    return {
      view: fromUrl.view || (saved ? 'app' : props.startView || 'login'),
      role: initialRole,
      tab: fromUrl.tab || 'dash',
    loginTab: 'company',
      suTab: 'company',
      suRole: 'maker',
      suCountry: '대한민국',
      obOpen: false, obStep: 1, obDomain: 'steel', obTier: 3,
      notifOpen: false, notifCat: 'all',
      dppOpen: false, dppId: null, pubId: null,
      issueMode: 'single',
      removedScans: [],
      removedProducts: [],
      confirm: null,
      toast: '',
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
    fetchOrganization().then((res) => { if (alive) setOrgData(res); }).catch(() => {});
    fetchDashboard().then((res) => { if (alive) setDashboardData(res); }).catch(() => {});
    fetchScans().then((res) => { if (alive) setScansData(res || []); }).catch(() => {});
    fetchInvitations().then((res) => { if (alive) setInvitesData(res || []); }).catch(() => {});
    fetchParticipations().then((res) => { if (alive) setParticipationsData(res || []); }).catch(() => {});
    fetchNotificationCategories().then((res) => { if (alive) setNotifCatsData(res || []); }).catch(() => {});
    fetchNotifications().then((res) => { if (alive) setNotifsData(res || []); }).catch(() => {});
    // ADMIN 계정이 아니면 403 - 그 외 화면엔 영향 없이 조용히 무시(다른 fetch들과 동일한 패턴).
    fetchOrgApprovals().then((res) => { if (alive) setOrgApprovalsData(res || []); }).catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view]);

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
    let alive = true;
    fetchFieldForm(dppId || undefined, domain || undefined)
      .then((res) => {
        if (!alive) return;
        setFieldFormData(res);
        setFieldFormInputs(Object.fromEntries((res.fields || []).map(f => [f.fieldCode, f.value || ''])));
        if (isDomainInput && res.dppId && res.dppId !== state.fieldFormDppId) setState({ fieldFormDppId: res.dppId });
      })
      .catch(() => {});
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.view, state.role, state.tab, state.partnerAssignedDppId]);

  /**
   * Mill Sheet 업로드처럼 fieldFormData 바깥(별도 엔드포인트)에서 완성도가 바뀌는 경우,
   * 위 useEffect를 다시 트리거하지 않고도 fieldFormData/fieldFormInputs를 최신값으로
   * 맞추기 위한 수동 새로고침. makerVals.js의 Mill Sheet 업로드 핸들러가 사용한다.
   */
  const refreshFieldForm = useCallback((dppId) => {
    if (!dppId) return;
    fetchFieldForm(dppId)
      .then((res) => {
        setFieldFormData(res);
        setFieldFormInputs(Object.fromEntries((res.fields || []).map(f => [f.fieldCode, f.value || ''])));
      })
      .catch(() => {});
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

  /* URL → 상태 */
  useEffect(() => {
    const next = stateFromPath(pathname);
    if (!next) return;
    setStateRaw((prev) => {
      const changed = Object.keys(next).some((k) => next[k] !== prev[k]);
      return changed ? { ...prev, ...next, notifOpen: false, dppOpen: false } : prev;
    });
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
    if (/(^|\.)ieum\.io$/.test(domain)) return 'admin';
    return 'unknown';
  }

  /** 로그인 성공 직후 어느 대시보드로 보낼지 정할 때 쓰는 보조 힌트일 뿐, 실제 인증에는 안 씀. */
  function roleFromEmail(v) {
    const key = (v || '').toLowerCase().trim();
    if (domainHint(key) === 'personal') return 'personal';
    return accounts()[key] || null;
  }

  function firstTab(r) { return r === 'eu' ? 'registry' : r === 'personal' ? 'scans' : r === 'customs' ? 'clearance' : r === 'partner' ? 'assigned' : 'dash'; }

  function say(msg) {
    setState({ toast: msg });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState({ toast: '' }), 2600);
  }

  /** 로그아웃 시 앱 내부 상태를 초기값으로 되돌립니다 (URL 이동은 MyPage 가 담당). */
  function resetSession() {
    setFieldFormData(null);
    setFieldFormInputs({});
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
      registered: {}, confirm: null, toast: '', fieldFormDppId: null
    });
  }

  /** extra: 로그인/가입 응답으로 받은 토큰 등을 세션에 같이 저장하고 싶을 때. */
  function go(role, extra) {
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
      steel: { ws: '대성제강', dl: '철강', un: '박지우', ur: 'DPP 담당자 · Tier 3', ini: '박' },
      battery: { ws: '루멘셀', dl: '배터리', un: '이서준', ur: 'DPP 담당자 · Tier 2', ini: '이' },
      textile: { ws: '아라텍스', dl: '섬유·패션', un: '최유진', ur: 'DPP 담당자 · Tier 2', ini: '최' },
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
    if (r === 'admin') return [['dash', '대시보드'], ['approve', '가입 승인 관리'], ['tier', 'Tier 심사 예외'], ['docs', '문서 반려 관리']];
    if (r === 'eu') return [['registry', 'DPP 레지스트리'], ['audit', '감사 로그']];
    if (r === 'personal') return [['scans', '제품 조회 기록'], ['my', '마이페이지']];
    if (r === 'customs') return [['clearance', '통관 검증']];
    if (r === 'partner') return [['assigned', '참여 DPP'], ['my', '마이페이지']];
    const inputLabel = r === 'steel' ? '철강 데이터 입력' : r === 'battery' ? '배터리 데이터 입력' : '섬유 데이터 입력';
    return [['dash', '대시보드'], ['input', inputLabel], ['partners', '협력사 초대'], ['products', '제품 조회'], ['my', '마이페이지']];
  }

  function renderVals() {
    const s = state;
    const p = profile();
    const isMaker = s.role === 'steel' || s.role === 'battery' || s.role === 'textile';
    const anchorSeq = data.anchors;
    const inqData = data.inquiries;
    const memberData = data.members;
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
      openNotif: () => setState({ notifOpen: true }),
      isMaker,
      scAdminDash: s.role === 'admin' && s.tab === 'dash',
      scApprove: s.role === 'admin' && s.tab === 'approve',
      scTier: s.role === 'admin' && s.tab === 'tier',
      scDocs: s.role === 'admin' && s.tab === 'docs',
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
          open: () => setState({ tab: 'passport', pubId: sc.passportCode })
        };
      }),
      scanQr: () => say('QR 스캐너를 실행했습니다.'),
      scansEmpty: (scansData || []).length === 0,
      ...passportVals(ctx),
      scClearance: s.role === 'customs' && s.tab === 'clearance',
      scClearLog: s.role === 'customs' && s.tab === 'clearlog',
      ...customsVals(ctx),
      scRegistry: s.role === 'eu' && s.tab === 'registry',
      scAudit: s.role === 'eu' && s.tab === 'audit',
      goApprove: () => setState({ tab: 'approve' }),
      goTier: () => setState({ tab: 'tier' }),
      goDocs: () => setState({ tab: 'docs' }),
      ...approvalVals(ctx),
      tier1Chip: chip('rgba(16,32,64,.07)', '#44546F'),
      tier2Chip: chip('rgba(0,69,169,.10)', '#0045A9'),
      tier3Chip: chip('rgba(18,161,80,.12)', '#0E7A3D'),
      ...tierVals(ctx),
      rejects: [
        ['대성제강', 'DOC-2607-1180', '필수 입력 데이터 누락', 'Heat 번호 · 제철소 코드 미입력', '2026-07-30 08:55'],
        ['루멘셀', 'DOC-2607-1174', '데이터 적합성 오류', '정격용량 단위 불일치 (Ah ↔ Wh)', '2026-07-30 07:20'],
        ['아라텍스', 'DOC-2607-1166', '필수 입력 데이터 누락', '소재 혼용률 합계 92% (100% 필요)', '2026-07-29 19:02'],
        ['우진메탈', 'DOC-2607-1151', '데이터 적합성 오류', 'CO₂ 배출계수 범위 초과', '2026-07-29 14:38']
      ].map(([name, id, kind, detail, at]) => ({
        key: id, name, id, kind, detail, at,
        kindChip: kind === '데이터 적합성 오류' ? chip('rgba(224,59,59,.12)', '#C22B2B') : chip('rgba(227,160,8,.16)', '#96660A')
      })),
      sendRejects: () => say('4건의 반려사유를 자동 발송했습니다.'),
      anchorBars: anchorSeq.map((h, i) => ({ key: i, style: { display: 'block', width: 6, height: h, borderRadius: 3, background: i > 12 ? 'rgba(134,239,172,.9)' : 'rgba(255,255,255,.24)' } })),
      inquiries: inqData.map(([label, count, pct]) => ({ key: label, label, count, pct, style: bar(pct * 2.6, '#0045A9') })),
      members: memberData.map(([name, biz, joined, country, domain, held, issued, hue, initial]) => ({
        key: name, name, biz, joined, country, domain, held, issued, initial,
        avatar: avatarStyle(hue), domainChip: domainChipFor(domain),
        domainDot: { width: 8, height: 8, flex: 'none', borderRadius: 999, background: domain === '철강' ? '#0045A9' : domain === '배터리' ? '#12A150' : '#E3A008' },
        view: () => say(name + ' 회원 상세 정보를 조회했습니다.')
      })),
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
      suRoleAdmin: roleCard(s.suRole === 'admin'),
      suRoleMaker: roleCard(s.suRole === 'maker'),
      suRolePartner: roleCard(s.suRole === 'partner'),
      suRoleEu: roleCard(s.suRole === 'eu'),
      suRoleCustoms: roleCard(s.suRole === 'customs'),
      pickAdmin: () => setState({ suRole: 'admin' }),
      pickMaker: () => setState({ suRole: 'maker' }),
      pickPartner: () => setState({ suRole: 'partner' }),
      pickEu: () => setState({ suRole: 'eu' }),
      pickCustoms: () => setState({ suRole: 'customs' }),
      suEmail: s.suEmail || '',
      onSuEmail: e => {
        const v = e.target.value;
        const at = v.indexOf('@');
        const domain = at >= 0 ? v.slice(at + 1).toLowerCase().trim() : '';
        const hint = domainHint(v);
        const map = { customs: 'customs', eu: 'eu', admin: 'admin' };
        const role = map[hint] || null;
        // 이메일을 바꾸면 이전 인증 상태는 무효화 (다른 이메일로 인증코드 재요청 필요).
        setState({ suEmail: v, suDetected: domain ? (hint === 'unknown' ? 'unknown' : hint) : null, suRole: role || s.suRole, suCodeSent: false, suVerified: false, suVerifyCode: '' });
      },
      suDetectedShow: !!s.suDetected && s.suDetected !== 'personal' && s.suDetected !== 'unknown',
      suDetectedPersonal: s.suDetected === 'personal',
      suDetectedUnknown: s.suDetected === 'unknown',
      suDetectedLabel: { admin: '관리자', maker: '제조사', customs: '세관', eu: '시장감독기관' }[s.suDetected] || '',
      suDetectedNote: {
        admin: '등록된 운영 도메인 · 관리자 계정으로 제안되었습니다',
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
          await requestBusinessSignupCode(email);
          setState({ suCodeSent: true, suVerified: false, suVerifyCode: '' });
          say('인증코드를 발송했습니다. (SMTP 미설정 상태라 서버 콘솔 로그에서 확인)');
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
        try {
          await requestBusinessSignupPhoneCode(phone);
          setState({ suPhoneCodeSent: true, suPhoneVerified: false, suPhoneVerifyCode: '' });
          say('인증번호를 발송했습니다. (SMS 미설정 상태라 서버 콘솔 로그에서 확인)');
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
          // BE는 아직 steel/battery/textile 같은 세부 도메인을 안 내려준다(org 테이블 미구현, TODO).
          // 기존 mock 계정 매핑으로 최대한 맞추고, 못 찾으면 관리자는 admin, 그 외는 steel으로 기본 착지.
          const heuristic = roleFromEmail(email);
          const role = res.accountType === 'ADMIN' ? 'admin' : (heuristic && heuristic !== 'personal' ? heuristic : 'steel');
          go(role, { accessToken: res.accessToken, refreshToken: res.refreshToken, email: res.email, accountType: res.accountType });
        } catch (err) {
          say(err.message || '로그인에 실패했습니다.');
        }
      },
      /** 카카오/네이버/구글 공통 - provider 인자를 받아 실제 SNS 인증 페이지로 이동시킵니다. */
      snsLogin: (provider) => goToSnsLogin(provider || 'kakao'),
      refreshCaptcha: () => say('새로운 이미지를 불러왔습니다.'),
      submitSignup: async () => {
        const email = (s.suEmail || '').toLowerCase().trim();
        if (domainHint(email) === 'personal') { say('개인 메일 도메인으로는 기업 회원가입을 할 수 없습니다.'); return; }
        if (!s.suVerified) { say('이메일 인증을 먼저 완료해 주세요.'); return; }
        if (!s.suPhoneVerified) { say('전화번호 인증을 먼저 완료해 주세요.'); return; }
        if (!s.suCompanyName || !s.suBizRegNo) { say('회사명과 사업자등록번호를 입력해 주세요.'); return; }
        if (!s.suPassword || s.suPassword.length < 8) { say('비밀번호는 8자 이상이어야 합니다.'); return; }
        if (s.suPassword !== s.suPasswordConfirm) { say('비밀번호가 일치하지 않습니다.'); return; }
        // partner(협력사)도 domain='steel'로 가입시킨다 - requirement_field가 아직 STEEL만
        // 시딩돼 있어서(V4__seed_requirement_steel.sql) RAW_SUPPLIER 등 협력사 역할이 실제로
        // 뭘 제출할 수 있는 케이스가 철강뿐이다. 배터리/섬유 협력사가 필요해지면 그때
        // 시딩부터 늘리고 이 분기도 확장할 것.
        const domain = (s.suRole === 'maker' || s.suRole === 'partner') ? 'steel' : s.suRole;
        try {
          const res = await completeBusinessSignup({
            email, password: s.suPassword, companyName: s.suCompanyName,
            businessRegNo: s.suBizRegNo, country: s.suCountry || '대한민국', domain,
            phone: (s.suPhone || '').trim()
          });
          const sessionExtra = { accessToken: res.accessToken, refreshToken: res.refreshToken, email: res.email, accountType: res.accountType };
          if (s.suRole === 'maker') { saveSession({ role: 'steel', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'steel', tab: 'dash', obKind: 'maker', obOpen: true, obStep: 1, obSaved: 1 }); }
          else if (s.suRole === 'customs') { saveSession({ role: 'customs', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'customs', tab: 'clearance', obKind: 'customs', obOpen: true, obStep: 1, obSaved: 1 }); }
          else if (s.suRole === 'eu') { saveSession({ role: 'eu', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'eu', tab: 'registry', obKind: 'eu', obOpen: true, obStep: 1, obSaved: 1 }); }
          // partner는 온보딩 마법사가 아직 없어서(obVals.js에 partner용 단계가 없음) 바로
          // 대시보드로 보낸다 - 협력사 초대를 받아서 가입한 경우라 대개 자기가 담당한
          // DPP가 이미 연결돼 있을 것(BusinessSignupService.linkPendingCollaborations).
          else if (s.suRole === 'partner') { go('partner', sessionExtra); }
          else go('admin', sessionExtra);
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
  const saveFieldFormDraftForRole = useCallback((dppId, values) => {
    return saveFieldFormDraft(dppId, domainForRole(state.role), values);
  }, [state.role]);

  const ctx = {
    state, setState, props,
    data,
    meData, orgData, setOrgData, dashboardData, scansData, notifCatsData, notifsData, fmtRelative,
    orgApprovalsData, refetchOrgApprovals,
    fieldFormData, setFieldFormData, fieldFormInputs, setFieldFormInputs,
    saveFieldFormDraft: saveFieldFormDraftForRole, issueFieldFormDpp,
    documentFormData, setDocumentFormData, uploadDocument,
    millSheetResult, setMillSheetResult, uploadSteelMillSheet, refreshFieldForm, refreshDocumentForm,
    cbamResult, setCbamResult, uploadCbamReport,
    careLabelResult, setCareLabelResult, uploadCareLabel,
    oekotexResult, setOekotexResult, uploadOekotexLabel,
    batteryCarbonResult, setBatteryCarbonResult, uploadBatteryCarbonReport,
    recyclingResult, setRecyclingResult, uploadRecyclingReport,
    invitesData, setInvitesData, sendInvitation, resendInvitation, fmtDate,
    participationsData,
    accounts, domainHint, roleFromEmail, firstTab, say, go, profile, tabList, compData, resetSession,
    pill, roleCard, pillDot, domainCard, tabStyle,
    chip, domainChipFor, avatarStyle, bar, pctStyle, segStyle, dot,
    makerVals, partnerVals, passportVals, tierVals, approvalVals, customsVals, euVals, notifVals, dppVals, obVals,
  };

  if (loadError) return { loading: false, loadError };
  if (!data) return { loading: true };

  return { loading: false, resetSession, ...renderVals() };
}
