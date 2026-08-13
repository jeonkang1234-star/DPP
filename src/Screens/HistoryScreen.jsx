import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants.js';
import { useScans, useDeleteScan } from '../hooks/useDpp.js';
import { useDebounced } from '../hooks/useAsync.js';
import { useUi } from '../context/UiContext.jsx';
import StatusChip from '../components/StatusChip.jsx';
import { ScanCardSkeleton } from '../components/Skeleton.jsx';
import { EmptyState, ErrorState, Thumbnail } from '../components/StateViews.jsx';
import { SearchIcon, TrashIcon } from '../components/icons.jsx';
import { formatDateTime, formatDate } from '../utils/format.js';
import { card, color, radius } from '../theme.js';

export default function HistoryScreen() {
  const navigate = useNavigate();
  const { showToast, confirmAction } = useUi();
  const [keyword, setKeyword] = useState('');
  const debounced = useDebounced(keyword, 300);
  const { scans, total, loading, error, refetch, setData } = useScans(debounced);

  const { mutate: removeScan } = useDeleteScan();

  async function handleRemove(scan) {
    const ok = await confirmAction({
      title: '조회 기록을 삭제할까요?',
      body: `${scan.name} 의 열람 기록이 내 계정에서 삭제됩니다. 제품의 여권 자체는 삭제되지 않습니다.`,
      confirmLabel: '기록 삭제'
    });
    if (!ok) return;

    const snapshot = scans;
    setData((prev) => ({ ...prev, items: prev.items.filter((s) => s.id !== scan.id), total: prev.total - 1 })); // 낙관적 업데이트
    try {
      await removeScan(scan.id);
      showToast('조회 기록을 삭제했습니다.');
    } catch (err) {
      setData((prev) => ({ ...prev, items: snapshot, total: snapshot.length })); // 롤백
      showToast(err.message || '삭제하지 못했습니다.');
    }
  }

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 110 }}>
      <header style={{ padding: 'calc(16px + env(safe-area-inset-top)) 20px 14px', display: 'flex', flexDirection: 'column', gap: 13 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 9 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>제품 조회 기록</h1>
          <span style={{ fontSize: 13, fontWeight: 600, color: color.soft }}>{total}</span>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, height: 46, padding: '0 15px', ...card, borderRadius: radius.md }}>
          <span style={{ color: color.faint, display: 'flex' }}>
            <SearchIcon />
          </span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="제품명 · 브랜드 검색"
            style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', fontSize: 14, outline: 'none' }}
          />
        </label>
      </header>

      <div style={{ padding: '4px 20px 0', display: 'flex', flexDirection: 'column', gap: 11 }}>
        {loading && scans.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => <ScanCardSkeleton key={i} />)
        ) : error ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : scans.length === 0 ? (
          <EmptyState
            title={debounced ? '검색 결과가 없습니다' : '조회 기록이 없습니다'}
            description={debounced ? '다른 제품명이나 브랜드로 검색해 보세요.' : '제품의 QR 코드를 스캔하면 열람 이력이 여기에 쌓입니다.'}
            actionLabel={debounced ? undefined : 'QR 스캔하기'}
            onAction={() => navigate(ROUTES.scan)}
          />
        ) : (
          scans.map((scan) => (
            <article key={scan.id} style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'start' }}>
                <div style={{ display: 'flex', gap: 12, minWidth: 0 }}>
                  <Thumbnail src={scan.thumbnailUrl} alt={scan.name} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
                    <span style={{ fontSize: 14.5, fontWeight: 600, lineHeight: 1.35, textWrap: 'pretty' }}>{scan.name}</span>
                    <span style={{ fontSize: 10.5, color: color.soft }}>{scan.passportId}</span>
                    <span style={{ fontSize: 12, color: color.body }}>{scan.brand}</span>
                  </span>
                </div>
                <StatusChip status={scan.status} />
              </div>

              <div style={{ display: 'flex', gap: 1, background: 'rgba(16,32,64,.08)', borderRadius: 11, overflow: 'hidden' }}>
                {[
                  { id: 'scannedAt', label: '열람 일시', value: formatDateTime(scan.scannedAt) },
                  { id: 'updatedAt', label: '최근 갱신', value: formatDate(scan.passportUpdatedAt) }
                ].map((meta) => (
                  <span key={meta.id} style={{ flex: 1, background: color.surfaceAlt, padding: '9px 11px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 10.5, color: color.soft }}>{meta.label}</span>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: color.body }}>{meta.value}</span>
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.passport(scan.passportId), { state: { from: ROUTES.history } })}
                  style={{ flex: 1, height: 42, border: 0, borderRadius: 12, background: color.brand, color: '#fff', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}
                >
                  여권 열람
                </button>
                <button
                  type="button"
                  onClick={() => handleRemove(scan)}
                  title="조회 기록 삭제"
                  style={{
                    width: 46,
                    height: 42,
                    flex: 'none',
                    display: 'grid',
                    placeItems: 'center',
                    border: `1px solid ${color.lineStrong}`,
                    borderRadius: 12,
                    background: color.surface,
                    color: color.soft,
                    cursor: 'pointer'
                  }}
                >
                  <TrashIcon />
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
