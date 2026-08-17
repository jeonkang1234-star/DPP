import React from 'react';

/**
 * 마이페이지 화면.
 *
 * - 기업 회원(제조사 · 세관 · 시장감독기관): 기업 기본정보 · 증빙서류 · 온보딩 · Tier · 권한
 * - 개인 회원: 기본 정보 · 연결된 계정 · 알림 설정
 *
 * 화면에 쓰이는 값은 useAppLogic() 이 만들어 AppView 를 거쳐 props 로 내려옵니다.
 * 로그아웃 버튼은 헤더(components/AppHeader.jsx)에 있습니다.
 */
export default function MyPage(props) {
  if (props.scMy) return <CompanyMyPage {...props} />;
  if (props.scPersonalMy) return <PersonalMyPage {...props} />;
  return null;
}

/* ================================================================
 * 기업 회원 마이페이지
 * ================================================================ */

function CompanyMyPage({
  profileName, profileBiz, profilePhone, profileUrl, openProfileEdit,
  myDocs,
}) {
  // 2026-08-17 강 요청: "마이페이지는 보유권한까지 싹 다 삭제해서 왼쪽에 있던 기업
  // 기본정보랑 증빙서류만 냅둬" - 온보딩 진행상황/완료 요약 카드와 보유 권한 카드(+
  // 권한 추가 신청 버튼)를 전부 제거하고 단일 컬럼으로 단순화.
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>마이페이지</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '760px' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '15px', fontWeight: '600' }}>기업 기본정보</span><button onClick={openProfileEdit} style={{ height: '36px', padding: '0 14px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '11px', background: '#fff', fontSize: '12.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv24">수정</button></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>회사명</span><span style={{ fontSize: '14.5px', fontWeight: '600' }}>{profileName}</span></div>
              <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>사업자등록번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '14.5px', fontWeight: '600' }}>{profileBiz}</span></div>
              <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>대표번호</span><span style={{ fontFamily: '\'JetBrains Mono\',monospace', fontSize: '14.5px', fontWeight: '600' }}>{profilePhone}</span></div>
              <div style={{ background: '#fff', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '6px' }}><span style={{ fontSize: '11.5px', color: '#8494AC' }}>홈페이지 URL</span><span style={{ fontSize: '14.5px', fontWeight: '600' }}>{profileUrl}</span></div>
            </div>
            <span style={{ fontSize: '11.5px', color: '#8494AC' }}>사업자등록번호는 국세청 정보와 연동되어 있어 변경 시 재심사가 진행됩니다.</span>
          </div>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>증빙서류</span>
            {(myDocs || []).map((d, $index) => (<React.Fragment key={$index}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '12px', alignItems: 'center', padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '13px', background: '#FBFCFE' }}>
              <span style={{ display: 'flex', flexDirection: 'column', lineHeight: '1.35' }}><span style={{ fontSize: '13px', fontWeight: '600' }}>{d.name}</span><span style={{ fontSize: '11px', color: '#8494AC' }}>{d.meta}</span></span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={d.dot}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>{d.status}</span></span>
              <button onClick={d.view} style={{ height: '32px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '10px', background: '#fff', fontSize: '12px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv25">확인</button>
            </div>
            </React.Fragment>))}
          </div>
        </div>
      </div>
  );
}

/* ================================================================
 * 개인 회원 마이페이지
 * ================================================================ */

/** SNS 제공자별 배지 아이콘/배경색. 카카오만 브랜드 SVG가 있고, 나머지는 이니셜 원으로 대체. */
const PROVIDER_META = {
  KAKAO: { label: '카카오', bg: '#FEE500' },
  NAVER: { label: '네이버', bg: '#03C75A' },
  GOOGLE: { label: '구글', bg: '#FFFFFF' },
};

function ProviderIcon({ provider }) {
  const meta = PROVIDER_META[provider] || { label: provider, bg: '#8494AC' };
  if (provider === 'KAKAO') {
    return (
      <span style={{ width: '32px', height: '32px', flex: 'none', borderRadius: '999px', background: meta.bg, display: 'grid', placeItems: 'center' }}>
        <svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="#1B1B1B" d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z" /></svg>
      </span>
    );
  }
  return (
    <span style={{ width: '32px', height: '32px', flex: 'none', borderRadius: '999px', background: meta.bg, border: provider === 'GOOGLE' ? '1px solid rgba(16,32,64,.12)' : 'none', display: 'grid', placeItems: 'center' }}>
      <span style={{ fontSize: '13px', fontWeight: '700', color: provider === 'GOOGLE' ? '#44546F' : '#fff' }}>{meta.label.charAt(0)}</span>
    </span>
  );
}

function PersonalMyPage({ meName, meEmail, meConnectedAccounts }) {
  const accounts = meConnectedAccounts || [];
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '900px', margin: '0 auto', alignItems: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', textAlign: 'center' }}>마이페이지</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '560px' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>기본 정보</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12.5px', color: '#8494AC' }}>이름</span><span style={{ fontSize: '14px', fontWeight: '600' }}>{meName || '—'}</span></div>
              <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12.5px', color: '#8494AC' }}>이메일</span><span style={{ fontSize: '14px', fontWeight: '600' }}>{meEmail || '—'}</span></div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>연결된 계정</span>
            {accounts.length === 0 ? (
              <span style={{ fontSize: '12.5px', color: '#8494AC' }}>연결된 SNS 계정이 없습니다.</span>
            ) : accounts.map((a) => (
              <div key={a.provider} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 17px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <ProviderIcon provider={a.provider} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ fontSize: '13.5px', fontWeight: '600' }}>{(PROVIDER_META[a.provider] || {}).label || a.provider}</span>
                    <span style={{ fontSize: '11.5px', color: '#8494AC' }}>{a.email || a.nickname || ''}</span>
                  </span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>연결됨</span></span>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>알림 설정</span>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#2A3A55', cursor: 'pointer' }}>알림 받기 <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#0045A9' }} /></label>
            <span style={{ fontSize: '11px', color: '#8494AC' }}>* 카테고리별 세부 설정은 준비 중입니다.</span>
          </div>

        </div>
      </div>
  );
}
