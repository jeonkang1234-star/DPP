import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession, loadSession, saveSession } from '../api/session.js';
import { refreshSession } from '../api/authApi.js';

/** JWT의 만료 시각(ms). 서명 검증은 서버 몫이고 여기선 표시용으로 payload만 읽는다. */
function tokenExpiryMs(token) {
  try {
    const part = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = JSON.parse(atob(part + '='.repeat((4 - (part.length % 4)) % 4)));
    return typeof json.exp === 'number' ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

function fmtRemain(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(total / 60);
  const sec = total % 60;
  return m + '분 ' + String(sec).padStart(2, '0') + '초';
}

/**
 * 세션 남은 시간 + 연장 버튼(2026-10-08 강 요청 - 좌측 상단 로고·역할 옆).
 *
 * 남은 시간은 액세스 토큰의 exp 기준이다(서버 jwt.access-token-expiration-ms = 30분).
 * '연장'은 refresh 토큰으로 새 토큰을 받아 세션에 덮어쓴다(POST /auth/refresh). 시간이
 * 다 되면 어차피 다음 API 호출이 401로 튕기므로, 기다리지 않고 바로 로그인 화면으로 보낸다.
 *
 * 개발보고서대로 "무활동 30분 후 자동 로그아웃"(2026-10-08 강 요청): 사용자가 화면을
 * 쓰고 있는 동안(최근 1분 안에 클릭·키 입력·스크롤)에는 남은 시간이 AUTO_EXTEND_BELOW_MS
 * 아래로 내려가면 조용히 자동 연장한다. 손을 놓으면 연장이 멈춰서 마지막 활동 후
 * 약 30분이 지나면 로그아웃된다.
 */
const ACTIVE_WINDOW_MS = 60 * 1000;
const AUTO_EXTEND_BELOW_MS = 28 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'wheel', 'touchstart'];
function SessionTimer({ onExpired }) {
  const [expiry, setExpiry] = useState(() => tokenExpiryMs(loadSession()?.accessToken || ''));
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lastActivity = useRef(Date.now());
  const busyRef = useRef(false);

  useEffect(() => {
    const mark = () => { lastActivity.current = Date.now(); };
    ACTIVITY_EVENTS.forEach((ev) => window.addEventListener(ev, mark, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach((ev) => window.removeEventListener(ev, mark));
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setNow(Date.now());
      // 다른 곳(재로그인 등)에서 세션이 바뀌었을 수도 있으니 매 초 다시 읽는다.
      const exp = tokenExpiryMs(loadSession()?.accessToken || '');
      setExpiry((prev) => (exp !== prev ? exp : prev));
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const remain = expiry ? expiry - now : null;
  useEffect(() => {
    if (remain != null && remain <= 0) onExpired?.();
  }, [remain != null && remain <= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // 활동 중이면 자동 연장 - 매 초 확인하지만 실제 호출은 남은 시간이 28분 아래일 때만이라
  // 계속 쓰는 중에도 2분에 한 번 이하로만 나간다.
  useEffect(() => {
    if (remain == null || remain <= 0) return;
    if (remain < AUTO_EXTEND_BELOW_MS && Date.now() - lastActivity.current < ACTIVE_WINDOW_MS) {
      extend(true);
    }
  }, [now]); // eslint-disable-line react-hooks/exhaustive-deps

  if (remain == null) return null;
  const canExtend = !!loadSession()?.refreshToken;
  const warn = remain < 5 * 60 * 1000;

  async function extend(silent) {
    const session = loadSession();
    if (!session?.refreshToken || busyRef.current) return;
    busyRef.current = true;
    if (!silent) setBusy(true);
    setError('');
    try {
      const res = await refreshSession(session.refreshToken);
      saveSession({ ...session, accessToken: res.accessToken, refreshToken: res.refreshToken });
      setExpiry(tokenExpiryMs(res.accessToken));
    } catch (e) {
      setError(e.message || '연장하지 못했습니다.');
      if (e.status === 401) onExpired?.();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <span title={error || '세션 만료까지 남은 시간 · 사용 중에는 자동 연장되고, 30분 동안 활동이 없으면 로그아웃됩니다'} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', height: '30px', padding: '0 4px 0 11px', border: '1px solid ' + (warn ? 'rgba(224,59,59,.30)' : 'rgba(16,32,64,.10)'), borderRadius: '10px', background: warn ? 'rgba(224,59,59,.06)' : '#fff' }}>
      <svg viewBox="0 0 20 20" width="13" height="13" aria-hidden="true"><path fill={warn ? '#C22B2B' : '#8494AC'} d="M10 2.5a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Zm0 1.7a5.8 5.8 0 1 1 0 11.6 5.8 5.8 0 0 1 0-11.6Zm-.85 1.9v4.25l3.4 2.05.85-1.4-2.55-1.55V6.1h-1.7Z" /></svg>
      <span style={{ fontSize: '12px', fontWeight: '600', color: warn ? '#C22B2B' : '#44546F', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{fmtRemain(remain)}</span>
      {canExtend ? (
        <button onClick={() => extend(false)} disabled={busy} style={{ height: '22px', padding: '0 9px', border: '0', borderRadius: '7px', background: '#0045A9', color: '#fff', fontSize: '11px', fontWeight: '700', cursor: busy ? 'wait' : 'pointer', whiteSpace: 'nowrap' }}>{busy ? '연장 중…' : '연장'}</button>
      ) : <span style={{ width: '4px' }} />}
    </span>
  );
}

/**
 * 앱 공통 헤더 — 로고 · 워크스페이스 · 상단 탭 · 알림센터 · 사용자 · 로그아웃.
 *
 * 로그아웃 버튼은 우측 상단에 있고, 누르면
 *   1) 브라우저에 저장된 세션(localStorage / sessionStorage 의 ieum.* 키)을 지우고
 *   2) 앱 내부 상태를 초기값으로 되돌린 뒤
 *   3) /login 으로 이동합니다.
 */
export default function AppHeader({
  workspace, domainChip, domainLabel,
  showTabs, tabs,
  openNotif,
  // 2026-08-22 강 요청: 빨간 점은 안 읽은 알림이 실제로 있을 때만. 예전엔 span이 조건 없이
  // 항상 그려져 있어서 "새 알림이 왔다"는 신호로 전혀 쓸 수가 없었다. 알림센터를 열면
  // useAppLogic.openNotif가 /notifications/read-all을 부르고 목록을 다시 받아 0이 된다.
  notifUnreadCount,
  userInitial, userName, userRole,
  resetSession,
}) {
  const navigate = useNavigate();

  function handleLogout() {
    clearSession();       // 저장된 세션 삭제
    resetSession?.();     // 앱 상태 초기화 (역할 · 탭 · 오버레이)
    navigate('/login', { replace: true });
  }

  return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '13px' }}>
          <img src="/logo-ieum.png" alt="IEUM" style={{ height: '19px', display: 'block' }} />
          <span style={{ width: '1px', height: '20px', background: 'rgba(16,32,64,.14)' }}></span>
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#44546F' }}>{workspace}</span>
          <span style={domainChip}>{domainLabel}</span>
          <SessionTimer onExpired={handleLogout} />
        </div>
        {showTabs ? (<>
        <div style={{ display: 'flex', gap: '4px', padding: '6px', background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: '16px', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
          {(tabs || []).map((t, $index) => (<React.Fragment key={$index}><button onClick={t.go} style={t.style}>{t.label}</button></React.Fragment>))}
        </div>
        </>) : null}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={openNotif} style={{ position: 'relative', height: '46px', padding: '0 16px', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,32,64,.05)', display: 'inline-flex', alignItems: 'center', gap: '8px' }} className="hv7"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M10 2.2a1.1 1.1 0 0 1 1.1 1.1v.5a4.9 4.9 0 0 1 3.8 4.8v2.6l1.3 2.2a.8.8 0 0 1-.7 1.2H4.5a.8.8 0 0 1-.7-1.2l1.3-2.2V8.6a4.9 4.9 0 0 1 3.8-4.8v-.5A1.1 1.1 0 0 1 10 2.2Zm0 15.6a2.1 2.1 0 0 1-2-1.5h4a2.1 2.1 0 0 1-2 1.5Z" /></svg>알림센터{notifUnreadCount > 0 ? (<span title={`읽지 않은 알림 ${notifUnreadCount}건`} style={{ position: 'absolute', top: '9px', right: '9px', width: '8px', height: '8px', borderRadius: '5px', background: '#E03B3B', boxShadow: '0 0 0 2px #fff' }}></span>) : null}</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '11px', height: '46px', padding: '0 14px 0 8px', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px', background: '#fff', boxShadow: '0 1px 2px rgba(16,32,64,.05)' }}>
            <span style={{ width: '32px', height: '32px', borderRadius: '999px', background: '#0045A9', color: '#fff', display: 'grid', placeItems: 'center', fontSize: '12.5px', fontWeight: '700' }}>{userInitial}</span>
            <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.25' }}><span style={{ fontSize: '12.5px', fontWeight: '600' }}>{userName}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{userRole}</span></span>
          </div>
          <button onClick={handleLogout} title="로그아웃" style={{ height: '46px', padding: '0 16px', border: '1px solid rgba(16,32,64,.08)', borderRadius: '14px', background: '#fff', fontSize: '13px', fontWeight: '600', color: '#44546F', cursor: 'pointer', boxShadow: '0 1px 2px rgba(16,32,64,.05)', display: 'inline-flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }} className="hvLogout"><svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><path fill="currentColor" d="M8.6 2.8H5.2A1.7 1.7 0 0 0 3.5 4.5v11A1.7 1.7 0 0 0 5.2 17.2h3.4v-1.7H5.2v-11h3.4V2.8Zm4.1 3.1L11.5 7.1l1.7 1.7H7.3v1.7h5.9l-1.7 1.7 1.2 1.2 3.8-3.8-3.8-3.8Z" /></svg>로그아웃</button>
        </div>
      </div>
  );
}
