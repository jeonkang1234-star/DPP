import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  pill, roleCard, pillDot, domainCard, tabStyle,
  chip, domainChipFor, avatarStyle, bar, pctStyle, segStyle, dot,
} from './uiStyles.js';
import { fetchAppData } from './api/mockApi.js';
import { loadSession, saveSession } from './api/session.js';
import {
  login, requestBusinessSignupCode, verifyBusinessSignupCode, completeBusinessSignup,
  goToSnsLogin, consumeSnsCallback,
} from './api/authApi.js';
import { pathFor, stateFromPath } from './routes.js';
import { makerVals } from './viewModels/makerVals.js';
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

  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState(null);

  const [state, setStateRaw] = useState(() => {
    // 최초 진입 URL 이 곧 첫 화면입니다 (딥링크·새로고침 대응).
    const fromUrl = stateFromPath(pathname) || {};

    // SNS 로그인 콜백(BE가 /?sns_access=...로 리다이렉트시킨 것)이 있으면 최우선 처리.
    const snsResult = consumeSnsCallback();
    if (snsResult) saveSession({ ...snsResult, role: 'personal', at: Date.now() });
    const saved = snsResult ? { role: 'personal' } : loadSession();

    return {
      view: fromUrl.view || (saved ? 'app' : props.startView || 'login'),
      role: fromUrl.role || saved?.role || props.startRole || 'steel',
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
      toast: ''
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

  /* URL → 상태 */
  useEffect(() => {
    const next = stateFromPath(pathname);
    if (!next) return;
    setStateRaw((prev) => {
      const changed = Object.keys(next).some((k) => next[k] !== prev[k]);
      return changed ? { ...prev, ...next, notifOpen: false, dppOpen: false } : prev;
    });
  }, [pathname]);

  /* 상태 → URL (최초 렌더는 이미 URL 과 맞으므로 건너뜁니다) */
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
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

  function firstTab(r) { return r === 'eu' ? 'registry' : r === 'personal' ? 'scans' : r === 'customs' ? 'clearance' : 'dash'; }

  function say(msg) {
    setState({ toast: msg });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setState({ toast: '' }), 2600);
  }

  /** 로그아웃 시 앱 내부 상태를 초기값으로 되돌립니다 (URL 이동은 MyPage 가 담당). */
  function resetSession() {
    setState({
      view: 'login', role: props.startRole || 'steel', tab: 'dash',
      loginTab: 'company', suTab: 'company', suRole: 'maker',
      loginEmail: '', loginPassword: '',
      suEmail: '', suPassword: '', suPasswordConfirm: '', suCompanyName: '', suBizRegNo: '',
      suCodeSent: false, suVerified: false, suVerifyCode: '',
      obOpen: false, obStep: 1, obSaved: null,
      notifOpen: false, dppOpen: false, dppId: null, pubId: null,
      customsSearched: false, customsQuery: '',
      removedScans: [], removedProducts: [],
      registered: {}, confirm: null, toast: ''
    });
  }

  /** extra: 로그인/가입 응답으로 받은 토큰 등을 세션에 같이 저장하고 싶을 때. */
  function go(role, extra) {
    saveSession({ role, at: Date.now(), ...extra });
    setState({ view: 'app', role, tab: firstTab(role), notifOpen: false, dppOpen: false, customsSearched: false, customsQuery: '' });
  }

  function profile() {
    const m = {
      admin: { ws: 'IEUM 운영 콘솔', dl: '관리자', un: '김도현', ur: '플랫폼 운영자', ini: '김' },
      steel: { ws: '대성제강', dl: '철강', un: '박지우', ur: 'DPP 담당자 · Tier 3', ini: '박' },
      battery: { ws: '루멘셀', dl: '배터리', un: '이서준', ur: 'DPP 담당자 · Tier 2', ini: '이' },
      textile: { ws: '아라텍스', dl: '섬유·패션', un: '최유진', ur: 'DPP 담당자 · Tier 2', ini: '최' },
      eu: { ws: '국가기술표준원 · 제품안전조사과', dl: '시장감독기관', un: '윤가람', ur: 'DPP 감독관', ini: '윤' },
      customs: { ws: '인천세관 · 수입통관과', dl: '세관', un: '한지원', ur: '통관 심사관', ini: '한' },
      personal: { ws: '개인 회원', dl: '개인', un: '정민수', ur: '개인 계정', ini: '정' }
    };
    return m[state.role];
  }

  function tabList() {
    const r = state.role;
    if (r === 'admin') return [['dash', '대시보드'], ['approve', '가입 승인 관리'], ['tier', 'Tier 심사 예외'], ['docs', '문서 반려 관리']];
    if (r === 'eu') return [['registry', 'DPP 레지스트리'], ['audit', '감사 로그']];
    if (r === 'personal') return [['scans', '제품 조회 기록'], ['my', '마이페이지']];
    if (r === 'customs') return [['clearance', '통관 검증']];
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
      showTabs: tabList().length > 1,
      tabs: tabList().map(([k, label]) => ({ key: k, label, style: tabStyle(s.tab === k), go: () => setState(k === 'clearance' ? { tab: k, customsSearched: false, customsQuery: '' } : { tab: k }) })),
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
      scScans: s.role === 'personal' && s.tab === 'scans',
      scPersonalMy: s.role === 'personal' && s.tab === 'my',
      scPassport: s.role === 'personal' && s.tab === 'passport',
      scans: [
        ['DPP-KR-ST-2607-0142', '열연코일 HR-SPHC 3.2t', '대성제강', '2026-07-28 14:02', '검증됨', '2026-07-24'],
        ['DPP-KR-BT-2607-0311', 'EV 배터리 모듈 M3-72', '루멘셀', '2026-07-21 09:35', '검증됨', '2026-07-22'],
        ['DPP-KR-TX-2607-0521', '오가닉 코튼 저지 180g', '아라텍스', '2026-07-14 18:47', '정보 갱신됨', '2026-07-31'],
        ['DPP-FR-TX-2607-0204', 'Recycled poly woven', 'Fibrelune SAS', '2026-07-02 11:20', '검증됨', '2026-06-30'],
        ['DPP-KR-TX-2506-0388', '리사이클 나일론 셔츠', '아라텍스', '2026-06-11 20:14', '검증 실패', '2026-05-28']
      ].filter(r => !state.removedScans.includes(r[0])).map(([id, name, company, at, status, updated], i) => ({
        key: id, id, name, company, at, status, updated,
        remove: () => setState({
          confirm: {
            title: '조회 기록을 삭제할까요?',
            body: name + ' 의 열람 기록이 내 계정에서 삭제됩니다. 제품의 여권 자체는 삭제되지 않습니다.',
            label: '기록 삭제',
            run: () => {
              setState(s => ({ removedScans: s.removedScans.concat(id), confirm: null }));
              say('조회 기록을 삭제했습니다.');
            }
          }
        }),
        ok: status === '검증됨',
        renewed: status === '정보 갱신됨',
        failed: status === '검증 실패',
        statusIconStyle: { display: 'grid', placeItems: 'center', flex: 'none', color: status === '검증됨' ? '#12A150' : status === '정보 갱신됨' ? '#0045A9' : '#C22B2B' },
        rowStyle: { display: 'grid', gridTemplateColumns: '1.7fr 1.1fr 1.1fr 1fr 116px', gap: 12, padding: '13px 14px', alignItems: 'center', borderBottom: '1px solid rgba(16,32,64,.06)' },
        open: () => setState({ tab: 'passport', pubId: id })
      })),
      scanQr: () => say('QR 스캐너를 실행했습니다.'),
      scansEmpty: false,
      ...passportVals(ctx),
      scClearance: s.role === 'customs' && s.tab === 'clearance',
      scClearLog: s.role === 'customs' && s.tab === 'clearlog',
      ...customsVals(ctx),
      scRegistry: s.role === 'eu' && s.tab === 'registry',
      scAudit: s.role === 'eu' && s.tab === 'audit',
      goApprove: () => setState({ tab: 'approve' }),
      goTier: () => setState({ tab: 'tier' }),
      goDocs: () => setState({ tab: 'docs' }),
      bulkApprove: () => say('선택한 기업의 가입을 승인했습니다.'),
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
      suRoleEu: roleCard(s.suRole === 'eu'),
      suRoleCustoms: roleCard(s.suRole === 'customs'),
      pickAdmin: () => setState({ suRole: 'admin' }),
      pickMaker: () => setState({ suRole: 'maker' }),
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

      goSignup: () => setState({ view: 'signup' }),
      goLogin: () => setState({ view: 'login' }),
      loginEmail: s.loginEmail === undefined ? 'dh.kim@daesungsteel.co.kr' : s.loginEmail,
      onLoginEmail: e => setState({ loginEmail: e.target.value }),
      loginPassword: s.loginPassword || '',
      onLoginPassword: e => setState({ loginPassword: e.target.value }),
      loginRoleShow: !!state.loginRoleLabel,
      loginRoleLabel: state.loginRoleLabel || '',
      doLogin: async () => {
        const email = (s.loginEmail === undefined ? 'dh.kim@daesungsteel.co.kr' : s.loginEmail).trim();
        const password = s.loginPassword || '';
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
      sendOtp: () => say('인증번호를 발송했습니다. (유효시간 3분)'),
      refreshCaptcha: () => say('새로운 이미지를 불러왔습니다.'),
      submitSignup: async () => {
        const email = (s.suEmail || '').toLowerCase().trim();
        if (domainHint(email) === 'personal') { say('개인 메일 도메인으로는 기업 회원가입을 할 수 없습니다.'); return; }
        if (!s.suVerified) { say('이메일 인증을 먼저 완료해 주세요.'); return; }
        if (!s.suCompanyName || !s.suBizRegNo) { say('회사명과 사업자등록번호를 입력해 주세요.'); return; }
        if (!s.suPassword || s.suPassword.length < 8) { say('비밀번호는 8자 이상이어야 합니다.'); return; }
        if (s.suPassword !== s.suPasswordConfirm) { say('비밀번호가 일치하지 않습니다.'); return; }
        const domain = s.suRole === 'maker' ? 'steel' : s.suRole;
        try {
          const res = await completeBusinessSignup({
            email, password: s.suPassword, companyName: s.suCompanyName,
            businessRegNo: s.suBizRegNo, country: s.suCountry || '대한민국', domain
          });
          const sessionExtra = { accessToken: res.accessToken, refreshToken: res.refreshToken, email: res.email, accountType: res.accountType };
          if (s.suRole === 'maker') { saveSession({ role: 'steel', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'steel', tab: 'dash', obKind: 'maker', obOpen: true, obStep: 1, obSaved: 1 }); }
          else if (s.suRole === 'customs') { saveSession({ role: 'customs', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'customs', tab: 'clearance', obKind: 'customs', obOpen: true, obStep: 1, obSaved: 1 }); }
          else if (s.suRole === 'eu') { saveSession({ role: 'eu', at: Date.now(), ...sessionExtra }); setState({ view: 'app', role: 'eu', tab: 'registry', obKind: 'eu', obOpen: true, obStep: 1, obSaved: 1 }); }
          else go('admin', sessionExtra);
        } catch (err) {
          say(err.message || '회원가입에 실패했습니다.');
        }
      },

      ...makerVals(ctx),
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

  const ctx = {
    state, setState, props,
    data,
    accounts, domainHint, roleFromEmail, firstTab, say, go, profile, tabList, compData, resetSession,
    pill, roleCard, pillDot, domainCard, tabStyle,
    chip, domainChipFor, avatarStyle, bar, pctStyle, segStyle, dot,
    makerVals, passportVals, tierVals, approvalVals, customsVals, euVals, notifVals, dppVals, obVals,
  };

  if (loadError) return { loading: false, loadError };
  if (!data) return { loading: true };

  return { loading: false, resetSession, ...renderVals() };
}
