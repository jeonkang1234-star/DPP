import { color, radius, shadow } from '../theme.js';

export default function Toast({ message }) {
  if (!message) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: 18,
        right: 18,
        bottom: 'calc(96px + env(safe-area-inset-bottom))',
        zIndex: 80,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <span
        style={{
          maxWidth: '100%',
          padding: '13px 17px',
          borderRadius: radius.md,
          background: 'rgba(11,27,51,.94)',
          color: color.surface,
          fontSize: 12.5,
          fontWeight: 600,
          lineHeight: 1.5,
          boxShadow: shadow.toast,
          textWrap: 'pretty'
        }}
      >
        {message}
      </span>
    </div>
  );
}
