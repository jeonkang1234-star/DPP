import React from 'react';
import { useNavigate } from 'react-router-dom';
import { clearSession } from '../api/session.js';

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
