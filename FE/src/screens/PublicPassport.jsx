import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { fetchPublicPassport } from '../api/publicApi.js';

/**
 * QR/링크로 로그인 없이 들어오는 공개 DPP 조회 페이지 (2026-08-18, "QR코드가 제 기능을
 * 안함" 대응). App.jsx에서 이 컴포넌트만 별도 라우트(/p/:publicUuid)로 붙인다 - 나머지
 * 화면 전체를 감싸는 useAppLogic()/AppView(로그인 세션 전제)를 거치지 않는 완전히
 * 독립적인 화면이다.
 */
export default function PublicPassport() {
  const { publicUuid } = useParams();
  const [state, setState] = useState({ loading: true, error: null, data: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, error: null, data: null });
    fetchPublicPassport(publicUuid)
      .then((res) => { if (alive) setState({ loading: false, error: null, data: res }); })
      .catch((err) => { if (alive) setState({ loading: false, error: err.message || '조회에 실패했습니다.', data: null }); });
    return () => { alive = false; };
  }, [publicUuid]);

  return (
    <div style={{ minHeight: '100vh', background: '#F7F9FD', display: 'flex', justifyContent: 'center', padding: '40px 16px', fontFamily: "'Pretendard', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div style={{ width: '100%', maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#0045A9', display: 'grid', placeItems: 'center', color: '#fff', fontSize: '13px', fontWeight: '700' }}>D</span>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#0B1B33' }}>Digital Product Passport</span>
        </div>

        {state.loading ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#8494AC', fontSize: '14px' }}>불러오는 중…</div>
        ) : state.error ? (
          /*
           * "해당 DPP를 찾을 수 없습니다."만 덩그러니 띄우면 원인을 알 수가 없다
           * (2026-08-20 강 리포트). 실제로 가장 흔한 원인은 QR이 가리키는 서버와
           * 그 DPP가 저장된 서버가 다른 것이다 - PC에서 http://localhost로 열어 발급하면
           * QR에는 폴백 주소(EC2)가 박히고, EC2 DB에는 그 DPP가 없다. 그래서 지금 조회를
           * 시도한 서버 주소와 식별자를 같이 보여준다.
           */
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <span style={{ textAlign: 'center', color: '#C22B2B', fontSize: '14px', fontWeight: '600' }}>{state.error}</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '14px', borderRadius: '12px', background: '#F7F9FD' }}>
              <span style={{ fontSize: '11.5px', color: '#6B7A93' }}>조회한 서버</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '12.5px', color: '#0B1B33', wordBreak: 'break-all' }}>{window.location.origin}</span>
              <span style={{ fontSize: '11.5px', color: '#6B7A93', marginTop: '6px' }}>DPP 식별자</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '12.5px', color: '#0B1B33', wordBreak: 'break-all' }}>{publicUuid}</span>
            </div>
            <span style={{ fontSize: '11.5px', color: '#8494AC', lineHeight: '1.7' }}>
              이 서버에 해당 DPP가 없습니다. DPP를 발급한 화면의 주소와 위 주소가 다르다면,
              발급한 그 서버에서 만든 QR을 사용해야 합니다.
            </span>
          </div>
        ) : !state.data || !state.data.issued ? (
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '28px', textAlign: 'center', color: '#6B7A93', fontSize: '14px' }}>
            아직 발급되지 않은 DPP입니다. 발급이 완료되면 이 QR로 다시 조회할 수 있습니다.
          </div>
        ) : (
          <>
            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#0E7A3D', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '999px', background: '#12A150' }} />
                발급 완료
              </span>
              <span style={{ fontSize: '22px', fontWeight: '700', color: '#0B1B33' }}>{state.data.modelName || '(제품명 미입력)'}</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '13px', color: '#8494AC' }}>{state.data.internalSku}</span>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: '#6B7A93', paddingTop: '4px', borderTop: '1px solid rgba(16,32,64,.06)', marginTop: '6px', flexWrap: 'wrap' }}>
                <span>도메인 {state.data.domain}</span>
                <span>발급일 {state.data.issuedAtDate}</span>
                {/* 같은 QR이라도 로그인한 자격에 따라 보이는 항목이 다르다(2026-08-21).
                    지금 무슨 자격으로 보고 있는지 밝혀야 "왜 항목 수가 다르지?"가 안 생긴다. */}
                {state.data.viewerLabel ? (<span>열람 자격 {state.data.viewerLabel}</span>) : null}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#44546F', marginBottom: '10px' }}>공개된 제품 정보</span>
              {(state.data.fields || []).length === 0 ? (
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>공개된 항목이 없습니다.</span>
              ) : (state.data.fields || []).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: i === state.data.fields.length - 1 ? 'none' : '1px solid rgba(16,32,64,.06)' }}>
                  {/* 2026-08-22 강 요청: 「법정필수」 배지 삭제. T0/T1 구분은 데이터를
                      채우는 제조사에게 필요한 정보이고, QR로 제품을 보는 소비자·세관에겐
                      항목 이름과 값만 있으면 된다. */}
                  <span style={{ fontSize: '12.5px', color: '#8494AC', flex: 'none' }}>{f.labelKo}</span>
                  {/* 영업비밀 항목은 값 대신 "한계값 충족" 증명 결과만 온다(proofLabel).
                      값이 비어 있는데 라벨만 뜨는 게 아니라, 무엇이 검증됐는지가 보여야 한다. */}
                  {f.value != null && f.value !== ''
                    ? (<span style={{ fontSize: '13px', fontWeight: '600', color: '#0B1B33', textAlign: 'right' }}>{f.value}</span>)
                    : (<span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12px', fontWeight: '600', color: '#0E7A3D', textAlign: 'right' }}>
                         <span style={{ width: '6px', height: '6px', borderRadius: '999px', background: '#12A150' }} />
                         {f.proofLabel}
                       </span>)}
                </div>
              ))}
            </div>

            {/* 공개범위 안내 - 항목이 몇 개 안 보이는 이유를 밝힌다. 값을 안 주는 것과
                항목의 존재를 숨기는 것은 다르고, 후자는 규정이 요구하는 바가 아니다. */}
            {(state.data.restrictedCount > 0 || state.data.tradeSecretCount > 0) ? (
              <div style={{ background: 'rgba(0,69,169,.04)', border: '1px solid rgba(0,69,169,.14)', borderRadius: '14px', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: '600', color: '#0045A9' }}>공개 범위 안내</span>
                {state.data.restrictedCount > 0 ? (
                  <span style={{ fontSize: '12px', color: '#44546F' }}>
                    {state.data.restrictedCount}개 항목은 정당한 이익 보유자·인증기관·시장감시당국만 조회할 수 있어 이 페이지에 표시되지 않습니다.
                  </span>
                ) : null}
                {state.data.tradeSecretCount > 0 ? (
                  <span style={{ fontSize: '12px', color: '#44546F' }}>
                    {state.data.tradeSecretCount}개 항목은 영업비밀에 해당해 값 대신 한계값 충족 여부만 영지식증명으로 공개됩니다.
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        )}

        <span style={{ fontSize: '11px', color: '#B7C0D1', textAlign: 'center' }}>이 페이지는 로그인 없이 QR/링크로 조회한 공개 정보입니다.</span>
      </div>
    </div>
  );
}
