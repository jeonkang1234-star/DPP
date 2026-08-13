import { color, radius } from '../theme.js';

const boxStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 9,
  padding: '34px 20px',
  border: '1.5px dashed rgba(16,32,64,.14)',
  borderRadius: radius.lg,
  background: color.surface,
  textAlign: 'center'
};

const actionStyle = {
  marginTop: 6,
  height: 42,
  padding: '0 20px',
  border: 0,
  borderRadius: 12,
  background: color.brand,
  color: '#fff',
  fontSize: 13.5,
  fontWeight: 700,
  cursor: 'pointer'
};

export function EmptyState({ title, description, actionLabel, onAction }) {
  return (
    <div style={{ ...boxStyle, marginTop: 40 }}>
      <span style={{ fontSize: 14.5, fontWeight: 700 }}>{title}</span>
      {description ? (
        <span style={{ fontSize: 12.5, color: color.soft, lineHeight: 1.6, textWrap: 'pretty' }}>{description}</span>
      ) : null}
      {actionLabel ? (
        <button type="button" onClick={onAction} style={actionStyle}>
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div style={{ ...boxStyle, marginTop: 40, borderColor: 'rgba(224,59,59,.28)' }}>
      <span style={{ fontSize: 14.5, fontWeight: 700, color: color.dangerInk }}>불러오지 못했습니다</span>
      <span style={{ fontSize: 12.5, color: color.soft, lineHeight: 1.6, textWrap: 'pretty' }}>
        {error?.message || '잠시 후 다시 시도해 주세요.'}
      </span>
      {onRetry ? (
        <button type="button" onClick={onRetry} style={actionStyle}>
          다시 시도
        </button>
      ) : null}
    </div>
  );
}

export function Thumbnail({ src, alt, size = 48, radius: r = 13 }) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || ''}
        style={{ width: size, height: size, flex: 'none', borderRadius: r, objectFit: 'cover', background: color.fill }}
      />
    );
  }
  return (
    <span
      style={{
        width: size,
        height: size,
        flex: 'none',
        borderRadius: r,
        border: '1.5px dashed rgba(16,32,64,.18)',
        background: color.fill,
        display: 'grid',
        placeItems: 'center',
        fontSize: 8,
        letterSpacing: '.06em',
        color: color.faint
      }}
    >
      IMG
    </span>
  );
}
