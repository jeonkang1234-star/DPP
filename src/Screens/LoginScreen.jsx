import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SOCIAL_PROVIDERS, ROUTES } from '../constants.js';
import { PROVIDER_ICONS } from '../components/icons.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useUi } from '../context/UiContext.jsx';
import { color, radius } from '../theme.js';

// 로그인 화면 상단 지표 — 운영 중에는 GET /stats 로 대체
const SERVICE_STATS = [
  { id: 'passports', value: '48,392', label: '발급된 DPP' },
  { id: 'companies', value: '1,284', label: '참여 기업' }
];

export default function LoginScreen() {
  const { login } = useAuth();
  const { showToast } = useUi();
  const navigate = useNavigate();
  const [pending, setPending] = useState(null);

  async function handleLogin(provider) {
    if (pending) return;
    setPending(provider.id);
    try {
      const me = await login(provider.id);
      showToast(`${me.name}님, 환영합니다.`);
      navigate(ROUTES.scan, { replace: true });
    } catch (error) {
      showToast(error.message || '로그인에 실패했습니다.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: color.brand, color: '#fff' }}>
      <div style={{ flex: 1, padding: 'calc(56px + env(safe-area-inset-top)) 26px 0', display: 'flex', flexDirection: 'column', gap: 26 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <span style={{ background: '#fff', borderRadius: 9, padding: '7px 11px', display: 'flex' }}>
            <img src="/logo-ieum.png" alt="IEUM" style={{ height: 15, display: 'block' }} />
          </span>
          <span style={{ fontSize: 9.5, letterSpacing: '.14em', fontWeight: 600, color: 'rgba(255,255,255,.72)', lineHeight: 1.4 }}>
            DIGITAL PRODUCT
            <br />
            PASSPORT SERVICE
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <h1 style={{ margin: 0, fontSize: 31, lineHeight: 1.28, fontWeight: 700, letterSpacing: '-.03em', textWrap: 'pretty' }}>
            내가 산 제품의
            <br />
            여권을 확인하세요
          </h1>
          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.72, color: 'rgba(255,255,255,.78)', textWrap: 'pretty' }}>
            QR 하나로 원자재부터 재활용까지의 이력을 열람하고, 블록체인으로 검증된 정보만 보여드립니다.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 1, background: 'rgba(255,255,255,.16)', borderRadius: 13, overflow: 'hidden', marginTop: 2 }}>
          {SERVICE_STATS.map((stat) => (
            <div key={stat.id} style={{ flex: 1, background: 'rgba(255,255,255,.07)', padding: '14px 15px', display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 19, fontWeight: 700, lineHeight: 1 }}>{stat.value}</span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.66)', lineHeight: 1 }}>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: '#fff',
          borderRadius: '26px 26px 0 0',
          padding: '26px 22px calc(32px + env(safe-area-inset-bottom))',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          color: color.ink
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 2 }}>
          <span style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-.02em' }}>개인 회원 로그인</span>
          <span style={{ fontSize: 12.5, color: color.muted }}>간편 로그인으로 바로 시작하세요.</span>
        </div>

        {SOCIAL_PROVIDERS.map((provider) => {
          const Icon = PROVIDER_ICONS[provider.id];
          const isPending = pending === provider.id;
          return (
            <button
              key={provider.id}
              type="button"
              onClick={() => handleLogin(provider)}
              disabled={Boolean(pending)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                height: 54,
                padding: '0 18px',
                border: `1px solid ${provider.border}`,
                borderRadius: radius.md,
                background: provider.background,
                color: provider.color,
                fontSize: 15,
                fontWeight: 600,
                cursor: pending ? 'progress' : 'pointer',
                opacity: pending && !isPending ? 0.55 : 1
              }}
            >
              <span style={{ width: 22, height: 22, display: 'grid', placeItems: 'center', flex: 'none' }}>
                <Icon />
              </span>
              {isPending ? '로그인 중…' : provider.label}
            </button>
          );
        })}

        <p style={{ margin: '6px 0 0', fontSize: 11.5, lineHeight: 1.6, color: color.soft, textWrap: 'pretty' }}>
          로그인하면 QR로 스캔한 제품의 열람 이력이 계정에 저장됩니다. 기업 회원은 웹에서 이용해 주세요.
        </p>
      </div>
    </div>
  );
}
