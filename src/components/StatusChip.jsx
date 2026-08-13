import { statusMeta } from '../constants.js';
import { color } from '../theme.js';

const TONES = {
  ok: { background: 'rgba(18,161,80,.12)', color: color.okInk },
  brand: { background: 'rgba(0,69,169,.10)', color: color.brand },
  danger: { background: 'rgba(224,59,59,.12)', color: color.dangerInk }
};

export default function StatusChip({ status }) {
  const meta = statusMeta(status);
  const tone = TONES[meta.tone] || TONES.ok;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        flex: 'none',
        height: 24,
        padding: '0 10px',
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        ...tone
      }}
    >
      {meta.label}
    </span>
  );
}
