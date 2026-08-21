import React from 'react';

/**
 * 마이페이지 화면.
 *
 * - 기업 회원(제조사 · 세관 · 시장감독기관): 기업 기본정보
 * - 개인 회원: 기본 정보 · 연결된 계정 · 알림 설정
 *
 * 화면에 쓰이는 값은 useAppLogic() 이 만들어 AppView 를 거쳐 props 로 내려옵니다.
 * 로그아웃 버튼은 헤더(components/AppHeader.jsx)에 있습니다.
 */
export default function MyPage(props) {
  // 협력사도 기업 회원이라 같은 화면을 쓴다. 예전엔 scMy(제조사 3종)만 봐서
  // 협력사 마이페이지가 통째로 빈 화면이었다(2026-08-21 강 리포트).
  if (props.scMy || props.scPartnerMy) return <CompanyMyPage {...props} />;
  if (props.scPersonalMy) return <PersonalMyPage {...props} />;
  return null;
}

/* ================================================================
 * 기업 회원 마이페이지
 * ================================================================ */

function CompanyMyPage({
  profileName, profileBiz, profilePhone, profileUrl, openProfileEdit,
}) {
  // 2026-08-17 강 요청: "마이페이지는 보유권한까지 싹 다 삭제해서 왼쪽에 있던 기업
  // 기본정보랑 증빙서류만 냅둬" - 온보딩 진행상황/완료 요약 카드와 보유 권한 카드(+
  // 권한 추가 신청 버튼)를 전부 제거하고 단일 컬럼으로 단순화.
  // 2026-08-20 강 요청: 증빙서류 박스도 삭제 - 가입 심사 때 한 번 내는 서류라
  // 마이페이지에 상시로 둘 이유가 없다. 이제 기업 기본정보 카드 하나만 남는다.
  // 2026-08-18 강 요청: "마이페이지 UI가 왼쪽으로 쏠려있는데 가운데에 맞춰" - PersonalMyPage와
  // 동일한 패턴(margin: '0 auto' + alignItems: 'center')으로 중앙 정렬.
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '900px', margin: '0 auto', alignItems: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em', textAlign: 'center' }}>마이페이지</h1>
        {/* 2026-08-20 강 요청: 제목과 기본정보 박스를 화면 가운데로. 바깥 컨테이너가
            maxWidth 900이라 760짜리 박스가 왼쪽에 붙어 있었다 - margin auto로 가운데 정렬. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '760px', margin: '0 auto' }}>
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
