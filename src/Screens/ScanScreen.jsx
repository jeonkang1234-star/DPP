import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { useScans, useSubmitScanCode } from '../hooks/useDpp.js';
import StatusChip from '../components/StatusChip.jsx';
import { Thumbnail } from '../components/StateViews.jsx';
import { Skeleton } from '../components/Skeleton.jsx';
import { formatDateTime, initials } from '../utils/format.js';
import { card, color, radius } from '../theme.js';

const RECENT_LIMIT = 2;

export default function ScanScreen() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useUi();
  const { scans, loading, refetch } = useScans();
  const { mutate: submitCode, loading: scanning } = useSubmitScanCode();
  const [scannerOn, setScannerOn] = useState(false);

  const recent = scans.slice(0, RECENT_LIMIT);

  // 실제 구현에서는 카메라 스트림(BarcodeDetector / zxing)이 읽은 문자열을 넘긴다.
  async function handleScan(code = 'IEUM://dpp/DPP-KR-BT-2607-0311') {
    if (scanning) return;
    setScannerOn(true);
    try {
      const scan = await submitCode(code);
      await refetch();
      showToast('블록체인 검증을 통과한 여권을 불러왔습니다.');
      navigate(ROUTES.passport(scan.passportId), { state: { from: ROUTES.scan } });
    } catch (error) {
      showToast(error.message || 'QR 코드를 인식하지 못했습니다.');
    } finally {
      setScannerOn(false);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 96 }}>
      <header
        style={{
          padding: 'calc(16px + env(safe-area-inset-top)) 20px 14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 12, color: color.soft }}>개인 계정</span>
          <span style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em' }}>
            {user ? `${user.name}님, 안녕하세요` : <Skeleton width={170} height={20} />}
          </span>
        </div>
        <button
          type="button"
          onClick={() => navigate(ROUTES.my)}
          aria-label="마이페이지"
          style={{
            width: 40,
            height: 40,
            flex: 'none',
            border: 0,
            borderRadius: 999,
            background: color.brand,
            color: '#fff',
            fontSize: 13,
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          {initials(user?.name)}
        </button>
      </header>

      <div style={{ padding: '6px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <section style={{ background: color.ink, borderRadius: radius.xl, padding: 22, display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.62)' }}>제품에 부착된 QR 코드를 비추세요</span>

          <div style={{ position: 'relative', width: 236, height: 236, borderRadius: 20, background: 'rgba(255,255,255,.05)', overflow: 'hidden' }}>
            {[
              { top: 14, left: 14, borderTop: true, borderLeft: true, br: '10px 0 0 0' },
              { top: 14, right: 14, borderTop: true, borderRight: true, br: '0 10px 0 0' },
              { bottom: 14, left: 14, borderBottom: true, borderLeft: true, br: '0 0 0 10px' },
              { bottom: 14, right: 14, borderBottom: true, borderRight: true, br: '0 0 10px 0' }
            ].map((corner, i) => (
              <span
                key={i}
                style={{
                  position: 'absolute',
                  top: corner.top,
                  left: corner.left,
                  right: corner.right,
                  bottom: corner.bottom,
                  width: 34,
                  height: 34,
                  borderRadius: corner.br,
                  borderTop: corner.borderTop ? '2.5px solid #fff' : undefined,
                  borderBottom: corner.borderBottom ? '2.5px solid #fff' : undefined,
                  borderLeft: corner.borderLeft ? '2.5px solid #fff' : undefined,
                  borderRight: corner.borderRight ? '2.5px solid #fff' : undefined
                }}
              />
            ))}
            {scannerOn ? (
              <span
                style={{
                  position: 'absolute',
                  left: 20,
                  right: 20,
                  top: 20,
                  height: 2,
                  background: 'linear-gradient(90deg,rgba(134,239,172,0),#86EFAC,rgba(134,239,172,0))',
                  animation: 'dpp-scanline 1.3s ease-in-out infinite'
                }}
              />
            ) : null}
            <span style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', fontSize: 10.5, color: 'rgba(255,255,255,.34)', letterSpacing: '.08em' }}>
              {scannerOn ? 'READING QR…' : 'CAMERA PREVIEW'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => handleScan()}
            disabled={scanning}
            style={{ width: '100%', height: 52, border: 0, borderRadius: 15, background: '#fff', color: color.ink, fontSize: 15, fontWeight: 700, cursor: scanning ? 'progress' : 'pointer' }}
          >
            {scanning ? '인식 중…' : 'QR 스캔 시작'}
          </button>
          <button
            type="button"
            onClick={() => showToast('식별자 코드 직접 입력 화면으로 이동합니다.')}
            style={{ border: 0, background: 'transparent', color: 'rgba(255,255,255,.66)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', padding: 0 }}
          >
            식별자 코드 직접 입력
          </button>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, fontWeight: 700 }}>최근 열람</span>
            <button
              type="button"
              onClick={() => navigate(ROUTES.history)}
              style={{ border: 0, background: 'transparent', color: color.brand, fontSize: 12.5, fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              전체 보기
            </button>
          </div>

          {loading && recent.length === 0
            ? Array.from({ length: RECENT_LIMIT }).map((_, i) => (
                <div key={i} style={{ ...card, padding: 14, display: 'flex', gap: 13, alignItems: 'center' }}>
                  <Skeleton width={44} height={44} radius={12} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <Skeleton width="65%" height={13} />
                    <Skeleton width="40%" height={11} />
                  </div>
                </div>
              ))
            : recent.map((scan) => (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => navigate(ROUTES.passport(scan.passportId), { state: { from: ROUTES.scan } })}
                  style={{
                    ...card,
                    display: 'grid',
                    gridTemplateColumns: '44px 1fr auto',
                    gap: 13,
                    alignItems: 'center',
                    textAlign: 'left',
                    padding: 14,
                    borderRadius: 16,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  <Thumbnail src={scan.thumbnailUrl} alt={scan.name} size={44} radius={12} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {scan.name}
                    </span>
                    <span style={{ fontSize: 11.5, color: color.soft }}>
                      {scan.brand} · {formatDateTime(scan.scannedAt)}
                    </span>
                  </span>
                  <StatusChip status={scan.status} />
                </button>
              ))}
        </section>
      </div>
    </div>
  );
}
