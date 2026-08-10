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
  if (props.scPersonalMy) return <PersonalMyPage />;
  return null;
}

/* ================================================================
 * 기업 회원 마이페이지
 * ================================================================ */

function CompanyMyPage({
  profileName, profileBiz, profilePhone, profileUrl, openProfileEdit,
  myDocs,
  obIncomplete, obSavedStep, obSavedTitle, obSavedBar, obSavedPct, obResume,
  obComplete, obReview, obDomainLabel, obTierLabel, obTierSub, obPermList,
  myTier, myTierName, myTierDesc, requestTier,
  myPerms, requestPerm,
}) {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', letterSpacing: '-.03em' }}>마이페이지</h1>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '16px', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {obIncomplete ? (<>
            <div style={{ background: '#fff', border: '1.5px solid rgba(0,69,169,.28)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '13px', boxShadow: '0 4px 14px rgba(0,69,169,.10)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#E3A008' }}></span>
                <span style={{ fontSize: '14px', fontWeight: '700' }}>온보딩 작성 중</span>
              </div>
              <p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.6', color: '#6B7A93' }}>{obSavedStep}단계 「{obSavedTitle}」에서 중단되었습니다. 완료해야 DPP 발급 권한이 활성화됩니다.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ height: '8px', borderRadius: '6px', background: '#EEF2F8', overflow: 'hidden' }}><span style={obSavedBar}></span></div>
                <span style={{ fontSize: '11.5px', color: '#8494AC' }}>{obSavedPct}% 완료 · 5단계 중 {obSavedStep}단계</span>
              </div>
              <button onClick={obResume} style={{ height: '44px', border: '0', borderRadius: '12px', background: '#0045A9', color: '#fff', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 6px 16px rgba(0,69,169,.22)' }}>이어서 작성하기</button>
            </div>
            </>) : null}

            {obComplete ? (<>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span>
                  <span style={{ fontSize: '14px', fontWeight: '700' }}>온보딩 완료</span>
                </div>
                <button onClick={obReview} style={{ height: '34px', padding: '0 13px', border: '1px solid rgba(16,32,64,.12)', borderRadius: '11px', background: '#fff', fontSize: '12.5px', fontWeight: '600', color: '#44546F', cursor: 'pointer' }} className="hv26">내용 보기</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>선택 도메인</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{obDomainLabel}</span></div>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>신청 Tier</span><span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>{obTierLabel}</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>{obTierSub}</span></span></div>
                <div style={{ background: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12px', color: '#8494AC' }}>제출 서류</span><span style={{ fontSize: '13.5px', fontWeight: '600' }}>3건</span></div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#8494AC' }}>신청 권한</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                  {(obPermList || []).map((p, $index) => (<React.Fragment key={$index}><span style={p.style}>{p.label}</span></React.Fragment>))}
                </div>
              </div>
            </div>
            </>) : null}
            <div style={{ background: '#0045A9', borderRadius: '18px', padding: '24px', color: '#fff', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <span style={{ fontSize: '12px', letterSpacing: '.12em', fontWeight: '700', color: 'rgba(255,255,255,.62)' }}>CURRENT TIER</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}><span style={{ fontSize: '34px', fontWeight: '700', letterSpacing: '-.02em' }}>{myTier}</span><span style={{ fontSize: '13px', color: 'rgba(255,255,255,.78)' }}>{myTierName}</span></div>
              <p style={{ margin: '0', fontSize: '12.5px', lineHeight: '1.65', color: 'rgba(255,255,255,.78)' }}>{myTierDesc}</p>
              <button onClick={requestTier} style={{ height: '42px', border: '0', borderRadius: '12px', background: '#fff', color: '#0045A9', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}>상위 Tier 신청</button>
            </div>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '13px' }}>
              <span style={{ fontSize: '14px', fontWeight: '600' }}>보유 권한</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {(myPerms || []).map((p, $index) => (<React.Fragment key={$index}><span style={p.style}>{p.label}</span></React.Fragment>))}
              </div>
              <button onClick={requestPerm} style={{ marginTop: '4px', height: '40px', border: '1px solid rgba(0,69,169,.22)', borderRadius: '11px', background: 'rgba(0,69,169,.05)', color: '#0045A9', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>권한 추가 신청</button>
            </div>
          </div>
        </div>
      </div>
  );
}

/* ================================================================
 * 개인 회원 마이페이지
 * ================================================================ */

function PersonalMyPage() {
  return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', width: '100%', maxWidth: '900px', margin: '0 auto', alignItems: 'center' }}>
        <h1 style={{ margin: '0', fontSize: '34px', fontWeight: '700', textAlign: 'center' }}>마이페이지</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%', maxWidth: '560px' }}>
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>기본 정보</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'rgba(16,32,64,.08)', borderRadius: '14px', overflow: 'hidden' }}>
              <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12.5px', color: '#8494AC' }}>이름</span><span style={{ fontSize: '14px', fontWeight: '600' }}>정민수</span></div>
              <div style={{ background: '#fff', padding: '15px 17px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: '12.5px', color: '#8494AC' }}>이메일</span><span style={{ fontSize: '14px', fontWeight: '600' }}>minsu***@kakao.com</span></div>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>연결된 계정</span>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 17px', border: '1px solid rgba(16,32,64,.09)', borderRadius: '14px', background: '#FBFCFE' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ width: '32px', height: '32px', flex: 'none', borderRadius: '999px', background: '#FEE500', display: 'grid', placeItems: 'center' }}><svg viewBox="0 0 24 24" width="19" height="19" aria-hidden="true"><path fill="#1B1B1B" d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z" /></svg></span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}><span style={{ fontSize: '13.5px', fontWeight: '600' }}>카카오</span><span style={{ fontSize: '11.5px', color: '#8494AC' }}>minsu***@kakao.com</span></span>
              </span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', height: '28px', padding: '0 12px 0 10px', borderRadius: '999px', background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}><span style={{ width: '8px', height: '8px', borderRadius: '999px', background: '#12A150' }}></span><span style={{ fontSize: '12px', fontWeight: '600', color: '#2A3A55' }}>연결됨</span></span>
            </div>
          </div>

          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: '600' }}>알림 설정</span>
            <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '14px', color: '#2A3A55', cursor: 'pointer' }}>알림 받기 <input type="checkbox" defaultChecked style={{ width: '18px', height: '18px', accentColor: '#0045A9' }} /></label>
          </div>

        </div>
      </div>
  );
}
