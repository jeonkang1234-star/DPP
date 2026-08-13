import { card, color, radius } from '../theme.js';

export function Skeleton({ width = '100%', height = 14, radius: r = 7, style }) {
  return (
    <span
      style={{
        display: 'block',
        width,
        height,
        borderRadius: r,
        background: 'linear-gradient(90deg,#EDF1F8 25%,#F6F9FD 50%,#EDF1F8 75%)',
        backgroundSize: '640px 100%',
        animation: 'dpp-shimmer 1.2s linear infinite',
        ...style
      }}
    />
  );
}

export function ScanCardSkeleton() {
  return (
    <div style={{ ...card, padding: 16, display: 'flex', flexDirection: 'column', gap: 13 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        <Skeleton width={48} height={48} radius={13} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <Skeleton width="70%" height={15} />
          <Skeleton width="45%" height={11} />
        </div>
      </div>
      <Skeleton height={48} radius={11} />
      <Skeleton height={42} radius={12} />
    </div>
  );
}

export function PassportSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '14px 20px' }}>
      <Skeleton height={186} radius={radius.xl} style={{ background: color.fill, animation: 'none' }} />
      <Skeleton height={52} radius={15} />
      <Skeleton width="80%" height={26} />
      <Skeleton width="45%" height={16} />
      <Skeleton height={200} radius={radius.md} />
    </div>
  );
}
