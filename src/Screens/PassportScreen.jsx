import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ROUTES } from '../constants.js';
import { usePassport } from '../hooks/useDpp.js';
import { useUi } from '../context/UiContext.jsx';
import { PassportSkeleton } from '../components/Skeleton.jsx';
import { ErrorState } from '../components/StateViews.jsx';
import { BackIcon, ShareIcon } from '../components/icons.jsx';
import { card, color, radius, shadow } from '../theme.js';

const sectionTitle = { fontSize: 17, fontWeight: 700, letterSpacing: '-.02em' };

function repairTone(score) {
  if (score >= 8) return { color: color.ok, verdict: '수리하기 쉬운 제품입니다' };
  if (score >= 6) return { color: color.warn, verdict: '전문 서비스센터 수리를 권장합니다' };
  return { color: color.danger, verdict: '자가 수리가 어려운 제품입니다' };
}

export default function PassportScreen() {
  const { passportId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { showToast } = useUi();
  const { passport, loading, error, refetch } = usePassport(passportId);

  const backTo = location.state?.from || ROUTES.history;
  const goBack = () => navigate(backTo, { replace: true });

  const failed = passport?.verification?.status === 'FAILED';
  const repair = passport ? repairTone(passport.repair.score) : null;

  // 상세 스펙도 배열로 선언 → 서버 필드가 늘어나면 여기만 추가
  const specRows = passport
    ? [
        { id: 'model', label: '모델명', value: passport.spec.model },
        { id: 'gtin', label: '바코드 (GTIN)', value: passport.spec.gtin },
        { id: 'batch', label: '제조 번호', value: passport.spec.batch },
        { id: 'origin', label: '생산지', value: passport.spec.origin },
        { id: 'made', label: '생산 시기', value: passport.spec.manufacturedAt }
      ]
    : [];

  const footprints = passport
    ? [
        { id: 'carbon', label: '탄소 발자국', ...passport.sustainability.carbon },
        { id: 'water', label: '물 발자국', ...passport.sustainability.water }
      ]
    : [];

  return (
    <div style={{ minHeight: '100dvh' }}>
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          padding: 'calc(12px + env(safe-area-inset-top)) 14px 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          background: 'rgba(247,249,253,.94)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(16,32,64,.06)'
        }}
      >
        <button
          type="button"
          onClick={goBack}
          style={{ height: 38, padding: '0 13px 0 9px', display: 'inline-flex', alignItems: 'center', gap: 6, border: 0, borderRadius: radius.sm, background: 'transparent', color: color.body, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}
        >
          <BackIcon />
          뒤로
        </button>
        <span style={{ fontSize: 12.5, fontWeight: 600, color: color.soft, letterSpacing: '.04em' }}>DIGITAL PRODUCT PASSPORT</span>
        <button
          type="button"
          onClick={() => showToast('제품 여권 링크를 공유했습니다.')}
          aria-label="공유"
          style={{ width: 38, height: 38, display: 'grid', placeItems: 'center', border: 0, borderRadius: radius.sm, background: 'transparent', color: color.body, cursor: 'pointer' }}
        >
          <ShareIcon />
        </button>
      </header>

      {loading ? <PassportSkeleton /> : null}
      {error ? (
        <div style={{ padding: '0 20px' }}>
          <ErrorState error={error} onRetry={refetch} />
        </div>
      ) : null}

      {passport ? (
        <div style={{ padding: '14px 20px 40px', display: 'flex', flexDirection: 'column', gap: 22 }}>
          {failed ? (
            <div style={{ display: 'flex', gap: 12, padding: '15px 16px', borderRadius: 16, background: 'rgba(224,59,59,.07)', border: '1px solid rgba(224,59,59,.20)' }}>
              <span style={{ width: 28, height: 28, flex: 'none', borderRadius: 999, background: color.danger, display: 'grid', placeItems: 'center', color: '#fff', fontSize: 14, fontWeight: 700 }}>!</span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: color.dangerInk }}>블록체인 서명 검증에 실패했습니다</span>
                <span style={{ fontSize: 12, lineHeight: 1.6, color: color.body, textWrap: 'pretty' }}>
                  원본 기록과 현재 데이터의 해시가 일치하지 않습니다. 아래 정보는 참고용입니다.
                </span>
              </span>
            </div>
          ) : null}

          <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {passport.imageUrl ? (
              <img src={passport.imageUrl} alt={passport.name} style={{ width: '100%', height: 186, objectFit: 'cover', borderRadius: 20, background: color.fill }} />
            ) : (
              <div style={{ height: 186, borderRadius: 20, border: '1.5px dashed rgba(16,32,64,.16)', background: color.fill, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, letterSpacing: '.08em', color: color.muted }}>PRODUCT PHOTO</span>
                <span style={{ fontSize: 11.5, color: color.faint }}>스캔한 제품의 대표 이미지</span>
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 11,
                padding: '13px 15px',
                borderRadius: 15,
                background: failed ? 'rgba(224,59,59,.07)' : 'rgba(18,161,80,.08)',
                border: `1px solid ${failed ? 'rgba(224,59,59,.20)' : 'rgba(18,161,80,.20)'}`
              }}
            >
              <span
                style={{
                  width: 9,
                  height: 9,
                  flex: 'none',
                  borderRadius: 999,
                  background: failed ? color.danger : color.ok,
                  boxShadow: `0 0 0 4px ${failed ? 'rgba(224,59,59,.16)' : 'rgba(18,161,80,.16)'}`
                }}
              />
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ fontSize: 13.5, fontWeight: 700, color: failed ? color.dangerInk : color.okInk }}>
                  {failed ? '검증 실패 · 참고용 정보' : '블록체인 검증 완료'}
                </span>
                <span style={{ fontSize: 10.5, color: color.soft }}>
                  {failed ? '해시 불일치 · ' : '블록체인 앵커 '}
                  {passport.verification.anchorHash}
                </span>
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <h1 style={{ margin: 0, fontSize: 25, fontWeight: 700, lineHeight: 1.3, letterSpacing: '-.02em', textWrap: 'pretty' }}>{passport.name}</h1>
              <span style={{ fontSize: 14, color: color.body }}>{passport.brand}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 1, background: 'rgba(16,32,64,.08)', borderRadius: radius.md, overflow: 'hidden' }}>
              {specRows.map((row) => (
                <span key={row.id} style={{ background: color.surface, padding: '13px 15px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontSize: 11.5, color: color.soft }}>{row.label}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, textAlign: 'right' }}>{row.value}</span>
                </span>
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span style={sectionTitle}>지속가능성 요약</span>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {footprints.map((item) => (
                <div key={item.id} style={{ ...card, borderRadius: 17, padding: 16, display: 'flex', flexDirection: 'column', gap: 9 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: color.body }}>{item.label}</span>
                  <span style={{ fontSize: 26, fontWeight: 700, lineHeight: 1 }}>{item.value}</span>
                  <span style={{ fontSize: 11, color: color.soft }}>{item.unit}</span>
                </div>
              ))}
            </div>
            <div style={{ ...card, borderRadius: 17, padding: 18, display: 'flex', flexDirection: 'column', gap: 11 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 12.5, fontWeight: 600, color: color.body }}>재생 원료 사용률</span>
                <span style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                  <span style={{ fontSize: 24, fontWeight: 700, lineHeight: 1, color: color.brand }}>{passport.sustainability.recycledRate}</span>
                  <span style={{ fontSize: 12, color: color.muted }}>%</span>
                </span>
              </div>
              <div style={{ height: 9, borderRadius: 6, background: '#EEF2F8', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${passport.sustainability.recycledRate}%`, borderRadius: 6, background: color.brand }} />
              </div>
              <span style={{ fontSize: 11.5, lineHeight: 1.6, color: color.soft }}>
                원자재 채굴부터 출하까지 산정된 값이며, 제3자 검증 기관의 확인을 받았습니다.
              </span>
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span style={sectionTitle}>내구성 및 수리</span>
            <div style={{ background: color.ink, borderRadius: 20, padding: 20, color: '#fff', display: 'flex', flexDirection: 'column', gap: 13 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'rgba(255,255,255,.62)' }}>수리 용이성 점수</span>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 7 }}>
                <span style={{ fontSize: 34, fontWeight: 700, lineHeight: 1, color: repair.color }}>{passport.repair.score.toFixed(1)}</span>
                <span style={{ fontSize: 15, color: 'rgba(255,255,255,.6)' }}>/ 10</span>
              </div>
              <div style={{ height: 9, borderRadius: 6, background: 'rgba(255,255,255,.14)', overflow: 'hidden' }}>
                <span style={{ display: 'block', height: '100%', width: `${passport.repair.score * 10}%`, borderRadius: 6, background: repair.color }} />
              </div>
              <span style={{ fontSize: 12, lineHeight: 1.6, color: 'rgba(255,255,255,.76)' }}>{repair.verdict}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 3 }}>
                <a
                  href={passport.repair.manualUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ height: 46, display: 'grid', placeItems: 'center', borderRadius: 13, background: '#fff', color: color.ink, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}
                >
                  {passport.repair.manualLabel}
                </a>
                <a
                  href={passport.repair.videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ height: 46, display: 'grid', placeItems: 'center', border: '1px solid rgba(255,255,255,.26)', borderRadius: 13, background: 'rgba(255,255,255,.10)', color: '#fff', fontSize: 13.5, fontWeight: 600, textDecoration: 'none' }}
                >
                  수리 영상 보기
                </a>
              </div>
            </div>

            <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>예비 부품 및 수리 서비스</span>
              {passport.repair.parts.map((part) => (
                <div key={part.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, alignItems: 'center', padding: '13px 14px', border: `1px solid rgba(16,32,64,.09)`, borderRadius: radius.md, background: color.surfaceAlt }}>
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, textWrap: 'pretty' }}>{part.title}</span>
                    <span style={{ fontSize: 11.5, color: color.muted }}>{part.detail}</span>
                  </span>
                  <a href={part.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap' }}>
                    구매처
                  </a>
                </div>
              ))}
            </div>

            <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 13 }}>
              <span style={{ fontSize: 14.5, fontWeight: 700 }}>오래 쓰는 관리 방법</span>
              {passport.repair.care.map((item) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 11, alignItems: 'start' }}>
                  <span style={{ width: 6, height: 6, marginTop: 6, flex: 'none', borderRadius: 999, background: color.brand }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                    <span style={{ fontSize: 12, lineHeight: 1.62, color: color.muted, textWrap: 'pretty' }}>{item.detail}</span>
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span style={sectionTitle}>우려 물질 및 안전</span>
            <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 11, padding: '15px 16px', borderRadius: radius.md, background: passport.hazard.hasConcern ? 'rgba(227,160,8,.10)' : 'rgba(18,161,80,.08)' }}>
                <span
                  style={{
                    width: 32,
                    height: 32,
                    flex: 'none',
                    borderRadius: 999,
                    background: passport.hazard.hasConcern ? color.warn : color.ok,
                    display: 'grid',
                    placeItems: 'center',
                    color: '#fff',
                    fontSize: 15,
                    fontWeight: 700
                  }}
                >
                  {passport.hazard.hasConcern ? '!' : '✓'}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: passport.hazard.hasConcern ? color.warnInk : color.okInk }}>
                    {passport.hazard.hasConcern ? '주의가 필요한 물질 포함' : '우려 물질 무첨가'}
                  </span>
                  <span style={{ fontSize: 12, lineHeight: 1.55, color: color.body, textWrap: 'pretty' }}>{passport.hazard.note}</span>
                </span>
              </div>
              <span style={{ fontSize: 11.5, lineHeight: 1.65, color: color.soft, textWrap: 'pretty' }}>
                EU REACH 규정 기준 고위험 우려물질(SVHC) 목록에 따라 신고된 정보입니다. 이상 증상이 있을 경우 사용을 중단하고 제조사에 문의하세요.
              </span>
            </div>
          </section>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            <span style={sectionTitle}>올바른 폐기 및 재활용</span>
            <div style={{ ...card, padding: 18, display: 'flex', flexDirection: 'column', gap: 13 }}>
              {passport.disposal.items.map((item) => (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 11, alignItems: 'start' }}>
                  <span style={{ width: 6, height: 6, marginTop: 6, flex: 'none', borderRadius: 999, background: color.ok }} />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                    <span style={{ fontSize: 12, lineHeight: 1.62, color: color.muted, textWrap: 'pretty' }}>{item.detail}</span>
                  </span>
                </div>
              ))}
              <a
                href={passport.disposal.takeback.url}
                target="_blank"
                rel="noreferrer"
                style={{ height: 48, display: 'grid', placeItems: 'center', borderRadius: 13, background: color.brand, color: '#fff', fontSize: 14, fontWeight: 700, textDecoration: 'none', boxShadow: shadow.cta }}
              >
                {passport.brand} 제품 회수 바로가기
              </a>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
