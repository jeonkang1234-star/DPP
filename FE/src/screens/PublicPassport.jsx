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
          <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', padding: '28px', textAlign: 'center', color: '#C22B2B', fontSize: '14px' }}>
            {state.error}
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
              <div style={{ display: 'flex', gap: '16px', fontSize: '12.5px', color: '#6B7A93', paddingTop: '4px', borderTop: '1px solid rgba(16,32,64,.06)', marginTop: '6px' }}>
                <span>도메인 {state.data.domain}</span>
                <span>발급일 {state.data.issuedAtDate}</span>
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid rgba(16,32,64,.07)', borderRadius: '18px', boxShadow: '0 1px 2px rgba(16,32,64,.05)', padding: '22px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#44546F', marginBottom: '10px' }}>공개된 제품 정보</span>
              {(state.data.fields || []).length === 0 ? (
                <span style={{ fontSize: '12.5px', color: '#8494AC' }}>공개된 항목이 없습니다.</span>
              ) : (state.data.fields || []).map((f, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: i === state.data.fields.length - 1 ? 'none' : '1px solid rgba(16,32,64,.06)' }}>
                  <span style={{ fontSize: '12.5px', color: '#8494AC', flex: 'none' }}>{f.labelKo}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: '#0B1B33', textAlign: 'right' }}>{f.value}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <span style={{ fontSize: '11px', color: '#B7C0D1', textAlign: 'center' }}>이 페이지는 로그인 없이 QR/링크로 조회한 공개 정보입니다.</span>
      </div>
    </div>
  );
}
