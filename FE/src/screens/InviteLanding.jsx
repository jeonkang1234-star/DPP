import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchInvitePreview } from '../api/publicApi.js';
import { login } from '../api/authApi.js';
import { loadSession, saveSession, clearSession, saveInviteTarget } from '../api/session.js';
import { pathFor } from '../routes.js';

/**
 * 협력사 초대 메일 링크(/invite/{token}) 진입 화면 (2026-10-04 강 요청).
 *
 * 메일의 "자료 제출하러 가기" 버튼 → 이 화면 → (초대받은 계정으로 로그인) → 그 DPP의
 * 자료 제출 화면(협력사 '참여 DPP')으로 바로 이동한다.
 *
 * 데모 때 한 브라우저에 제조사·세관 등 여러 계정을 탭별로 띄워 두는 상황을 고려했다:
 *  - 로그인 세션은 탭마다 따로다(session.js - sessionStorage). 여기서 로그인해도 다른 탭의
 *    계정은 바뀌지 않는다.
 *  - 이 탭이 이미 초대받은 계정으로 로그인돼 있으면 바로 넘어간다.
 *  - 이 탭이 다른 계정으로 로그인돼 있으면 자동으로 바꾸지 않고, 사용자가 "이 탭에서
 *    초대 계정으로 전환"을 눌렀을 때만 이 탭의 세션을 비운다.
 *
 * useAppLogic/AppView(로그인 세션 전제)를 거치지 않는 독립 화면 - PublicPassport.jsx와 같은 방식.
 */

const FIRST_TAB = { partner: 'assigned', customs: 'clearance', eu: 'registry', personal: 'scans' };

function roleFromOrg(orgType, domain) {
  if (!orgType) return null;
  if (orgType === 'CUSTOMS') return 'customs';
  if (orgType === 'EU_AUTHORITY') return 'eu';
  if (orgType === 'MANUFACTURER') return domain === 'BATTERY' ? 'battery' : domain === 'TEXTILE' ? 'textile' : 'steel';
  if (['RAW_SUPPLIER', 'TEST_LAB', 'RECYCLER', 'LOGISTICS', 'DISTRIBUTOR'].includes(orgType)) return 'partner';
  return null;
}

function landingPath(role) {
  return pathFor('app', role, FIRST_TAB[role] || 'dash') || '/';
}

const same = (a, b) => String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

export default function InviteLanding() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [session, setSession] = useState(() => loadSession());
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    let alive = true;
    fetchInvitePreview(token)
      .then((p) => { if (alive) setPreview(p); })
      .catch((e) => { if (alive) setError(e.message || '초대 정보를 불러오지 못했습니다.'); });
    return () => { alive = false; };
  }, [token]);

  const loggedIn = !!(session && session.accessToken);
  const isInvitee = loggedIn && preview && same(session.email, preview.inviteeEmail);

  const enter = (role) => {
    if (preview && preview.dppId != null) saveInviteTarget(preview.dppId);
    navigate(landingPath(role || 'partner'), { replace: true });
  };

  // 이 탭이 이미 초대받은 계정이면 화면을 거치지 않고 바로 이동
  useEffect(() => {
    if (isInvitee) enter(session.role);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInvitee]);

  const doLogin = async () => {
    if (!preview) return;
    if (!password) { setLoginError('비밀번호를 입력해 주세요.'); return; }
    setBusy(true);
    setLoginError('');
    try {
      const res = await login(preview.inviteeEmail, password);
      const role = res.appRole || roleFromOrg(res.orgType, res.domain) || 'partner';
      saveSession({ role, at: Date.now(), accessToken: res.accessToken, refreshToken: res.refreshToken, email: res.email, accountType: res.accountType });
      enter(role);
    } catch (e) {
      setLoginError(e.message || '로그인에 실패했습니다.');
      setBusy(false);
    }
  };

  const switchAccount = () => {
    clearSession(); // 이 탭(sessionStorage)만 비운다 - 다른 탭의 로그인은 그대로
    setSession(null);
    setPassword('');
  };

  const card = { width: '100%', maxWidth: 520, background: '#fff', border: '1px solid rgba(16,32,64,.08)', borderRadius: 22, boxShadow: '0 18px 50px rgba(11,27,51,.10)', padding: '30px 30px 26px', display: 'flex', flexDirection: 'column', gap: 18 };
  const row = (k, v) => (
    <div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 12, padding: '11px 0', borderBottom: '1px solid rgba(16,32,64,.06)' }}>
      <span style={{ fontSize: 12.5, color: '#8494AC' }}>{k}</span>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: '#0B1B33', overflowWrap: 'anywhere' }}>{v}</span>
    </div>
  );
  const btn = { height: 50, border: 0, borderRadius: 14, background: '#0045A9', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', boxShadow: '0 8px 18px rgba(0,69,169,.22)' };

  return (
    <div style={{ minHeight: '100vh', background: '#F4F7FB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={card}>
        <span style={{ fontSize: 12.5, fontWeight: 700, color: '#0045A9', letterSpacing: '.02em' }}>IEUM · Digital Product Passport</span>

        {error ? (<>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700 }}>초대 링크를 열 수 없습니다</h1>
          <p style={{ margin: 0, fontSize: 14, color: '#6B7A93', lineHeight: 1.65 }}>{error}</p>
          <button onClick={() => navigate('/login')} style={{ ...btn, background: '#fff', color: '#0045A9', border: '1px solid rgba(0,69,169,.24)', boxShadow: 'none' }}>로그인 화면으로</button>
        </>) : !preview ? (
          <span style={{ padding: '30px 0', textAlign: 'center', fontSize: 13.5, color: '#8494AC' }}>초대 정보를 불러오는 중…</span>
        ) : isInvitee ? (
          <span style={{ padding: '30px 0', textAlign: 'center', fontSize: 13.5, color: '#8494AC' }}>자료 제출 화면으로 이동하는 중…</span>
        ) : (<>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <h1 style={{ margin: 0, fontSize: 23, fontWeight: 700, letterSpacing: '-.02em' }}>협력사 자료 제출 요청</h1>
            <p style={{ margin: 0, fontSize: 14, color: '#44546F', lineHeight: 1.6 }}>
              <b>{preview.inviterOrgName}</b>에서 {preview.inviteeOrgName ? <b>{preview.inviteeOrgName}</b> : '귀사'}에 자료 제출을 요청했습니다.
            </p>
          </div>
          <div>
            {row('대상 DPP', preview.dppLabel)}
            {row('요청 자료', preview.roleLabel)}
            {row('초대 계정', preview.inviteeEmail)}
            {row('유효 기간', preview.expiresAt ? preview.expiresAt + (preview.expired ? ' (만료됨)' : ' 까지') : '—')}
          </div>
          {preview.expired ? (
            <div style={{ fontSize: 12.5, color: '#96660A', background: 'rgba(227,160,8,.10)', borderRadius: 12, padding: '10px 12px', lineHeight: 1.55 }}>
              초대 유효기간은 지났지만 참여 요청은 그대로 남아 있어 로그인하면 해당 DPP로 이동합니다.
            </div>
          ) : null}

          {loggedIn ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '14px 16px', borderRadius: 14, background: '#F5F8FC', border: '1px solid rgba(16,32,64,.07)' }}>
              <span style={{ fontSize: 13, color: '#2A3A55', lineHeight: 1.6 }}>
                이 탭은 지금 <b>{session.email || '다른 계정'}</b>(으)로 로그인되어 있습니다.
                초대받은 계정은 <b>{preview.inviteeEmail}</b> 입니다.
              </span>
              <span style={{ fontSize: 12, color: '#6B7A93', lineHeight: 1.55 }}>
                전환해도 <b>이 탭</b>의 로그인만 바뀌고, 다른 탭에 열어 둔 계정은 그대로 유지됩니다.
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={switchAccount} style={{ ...btn, flex: 1, height: 44, fontSize: 13.5 }}>이 탭에서 초대 계정으로 전환</button>
                <button onClick={() => navigate(landingPath(session.role), { replace: true })} style={{ ...btn, flex: 'none', height: 44, padding: '0 16px', fontSize: 13.5, background: '#fff', color: '#44546F', border: '1px solid rgba(16,32,64,.12)', boxShadow: 'none' }}>현재 계정 유지</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#44546F' }}>이메일</span>
                <input value={preview.inviteeEmail} readOnly style={{ height: 48, padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: 12, fontSize: 14, background: '#F5F8FC', color: '#44546F' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: '#44546F' }}>비밀번호</span>
                <input type="password" value={password} autoFocus onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') doLogin(); }}
                  style={{ height: 48, padding: '0 14px', border: '1px solid rgba(16,32,64,.16)', borderRadius: 12, fontSize: 14 }} />
              </label>
              {loginError ? <span style={{ fontSize: 12.5, color: '#C22B2B' }}>{loginError}</span> : null}
              <button onClick={doLogin} disabled={busy} style={{ ...btn, marginTop: 4, opacity: busy ? 0.7 : 1 }}>{busy ? '로그인 중…' : '로그인하고 자료 제출하기'}</button>
            </div>
          )}
        </>)}
      </div>
    </div>
  );
}
