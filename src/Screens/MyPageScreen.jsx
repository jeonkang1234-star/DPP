import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../constants.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { useScans, useUpdateSettings } from '../hooks/useDpp.js';
import { Skeleton } from '../components/Skeleton.jsx';
import { PROVIDER_ICONS } from '../components/icons.jsx';
import { formatDate, initials, maskEmail } from '../utils/format.js';
import { card, color, radius } from '../theme.js';

export default function MyPageScreen() {
  const navigate = useNavigate();
  const { user, setUser, logout } = useAuth();
  const { showToast, confirmAction } = useUi();
  const { scans, total, loading } = useScans();
  const { mutate: updateSettings } = useUpdateSettings();

  const notify = user?.settings?.notifyOnUpdate ?? false;

  const stats = [
    { id: 'scanned', value: total, label: '열람한 제품', color: color.ink },
    { id: 'verified', value: scans.filter((s) => s.status === 'VERIFIED').length, label: '검증 완료', color: color.okInk }
  ];

  const profileRows = user
    ? [
        { id: 'name', label: '이름', value: user.name },
        { id: 'email', label: '이메일', value: maskEmail(user.email) },
        { id: 'joined', label: '가입일', value: formatDate(user.joinedAt) }
      ]
    : [];

  async function toggleNotify() {
    const next = !notify;
    setUser((prev) => ({ ...prev, settings: { ...prev.settings, notifyOnUpdate: next } })); // 낙관적 업데이트
    try {
      const updated = await updateSettings({ notifyOnUpdate: next });
      setUser(updated);
      showToast(next ? '정보 갱신 알림을 켰습니다.' : '정보 갱신 알림을 껐습니다.');
    } catch (error) {
      setUser((prev) => ({ ...prev, settings: { ...prev.settings, notifyOnUpdate: !next } })); // 롤백
      showToast(error.message || '설정을 저장하지 못했습니다.');
    }
  }

  async function handleLogout() {
    const ok = await confirmAction({ title: '로그아웃할까요?', body: '다시 로그인하면 조회 기록을 그대로 볼 수 있습니다.', confirmLabel: '로그아웃' });
    if (!ok) return;
    logout();
    navigate(ROUTES.login, { replace: true });
  }

  return (
    <div style={{ minHeight: '100dvh', paddingBottom: 110 }}>
      <header style={{ padding: 'calc(16px + env(safe-area-inset-top)) 20px 14px' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, letterSpacing: '-.02em' }}>마이페이지</h1>
      </header>

      <div style={{ padding: '4px 20px 0', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <section style={{ ...card, display: 'flex', alignItems: 'center', gap: 14, padding: 18 }}>
          <span style={{ width: 52, height: 52, flex: 'none', borderRadius: 999, background: color.brand, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700 }}>
            {initials(user?.name)}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 16.5, fontWeight: 700 }}>{user?.name || <Skeleton width={80} height={17} />}</span>
            <span style={{ fontSize: 12, color: color.soft }}>개인 계정 · {formatDate(user?.joinedAt)} 가입</span>
          </span>
        </section>

        <section style={{ display: 'flex', gap: 1, background: 'rgba(16,32,64,.08)', border: `1px solid ${color.line}`, borderRadius: radius.lg, overflow: 'hidden' }}>
          {stats.map((stat) => (
            <span key={stat.id} style={{ flex: 1, background: color.surface, padding: 16, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 22, fontWeight: 700, lineHeight: 1, color: stat.color }}>{loading ? '—' : stat.value}</span>
              <span style={{ fontSize: 11.5, color: color.soft }}>{stat.label}</span>
            </span>
          ))}
        </section>

        <section style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>기본 정보</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(16,32,64,.08)', borderRadius: 13, overflow: 'hidden' }}>
            {profileRows.map((row) => (
              <span key={row.id} style={{ background: color.surface, padding: '14px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12, color: color.soft }}>{row.label}</span>
                <span style={{ fontSize: 13.5, fontWeight: 600 }}>{row.value}</span>
              </span>
            ))}
          </div>
        </section>

        <section style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>연결된 계정</span>
          {(user?.linkedAccounts ?? []).map((account) => {
            const Icon = PROVIDER_ICONS[account.provider];
            return (
              <div key={account.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 15px', border: '1px solid rgba(16,32,64,.09)', borderRadius: radius.md, background: color.surfaceAlt }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                  <span style={{ width: 32, height: 32, flex: 'none', borderRadius: 999, background: '#FEE500', display: 'grid', placeItems: 'center' }}>
                    {Icon ? <Icon size={19} /> : null}
                  </span>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{account.providerLabel}</span>
                    <span style={{ fontSize: 11, color: color.soft }}>{maskEmail(account.email)}</span>
                  </span>
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 27, padding: '0 11px 0 9px', flex: 'none', borderRadius: 999, background: color.surface, boxShadow: '0 1px 3px rgba(11,27,51,.10),0 0 0 1px rgba(16,32,64,.05)' }}>
                  <span style={{ width: 7, height: 7, borderRadius: 999, background: account.connected ? color.ok : color.faint }} />
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: '#2A3A55' }}>{account.connected ? '연결됨' : '해제됨'}</span>
                </span>
              </div>
            );
          })}
        </section>

        <section style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 15 }}>
          <span style={{ fontSize: 14.5, fontWeight: 700 }}>알림 설정</span>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600 }}>정보 갱신 알림</span>
              <span style={{ fontSize: 11.5, color: color.soft }}>열람한 제품의 여권이 갱신되면 알려드립니다.</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={notify}
              onClick={toggleNotify}
              style={{
                width: 48,
                height: 29,
                flex: 'none',
                padding: 3,
                border: 0,
                borderRadius: 999,
                background: notify ? color.brand : 'rgba(16,32,64,.16)',
                display: 'flex',
                justifyContent: notify ? 'flex-end' : 'flex-start',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background .18s ease'
              }}
            >
              <span style={{ width: 23, height: 23, borderRadius: 999, background: '#fff', boxShadow: '0 1px 3px rgba(11,27,51,.24)' }} />
            </button>
          </div>
        </section>

        <button
          type="button"
          onClick={handleLogout}
          style={{ height: 50, border: `1px solid ${color.lineStrong}`, borderRadius: radius.md, background: color.surface, color: color.body, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          로그아웃
        </button>
      </div>
    </div>
  );
}
