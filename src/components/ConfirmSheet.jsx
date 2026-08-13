import { color, radius } from '../theme.js';

export default function ConfirmSheet({
  title,
  body,
  confirmLabel = '확인',
  cancelLabel = '취소',
  tone = 'danger',
  loading = false,
  onConfirm,
  onCancel
}) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onCancel}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(11,27,51,.42)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: color.surface,
          borderRadius: '24px 24px 0 0',
          padding: '24px 22px calc(34px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          animation: 'dpp-sheet-up .18s ease-out'
        }}
      >
        <span style={{ width: 44, height: 4, borderRadius: 3, background: 'rgba(16,32,64,.14)', alignSelf: 'center' }} />
        <span style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-.02em' }}>{title}</span>
        {body ? (
          <span style={{ fontSize: 13, lineHeight: 1.65, color: color.body, textWrap: 'pretty' }}>{body}</span>
        ) : null}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 9, paddingTop: 4 }}>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            style={{
              height: 50,
              border: 0,
              borderRadius: radius.md,
              background: tone === 'danger' ? color.danger : color.brand,
              color: '#fff',
              fontSize: 14.5,
              fontWeight: 700,
              cursor: loading ? 'progress' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? '처리 중…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            style={{
              height: 50,
              border: `1px solid ${color.lineStrong}`,
              borderRadius: radius.md,
              background: color.surface,
              color: color.body,
              fontSize: 14.5,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
