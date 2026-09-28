import { fetchPublicPassport } from '../api/publicApi.js';
import React from 'react';
import QRCode from 'qrcode';
import { publicPassportUrl } from '../publicUrl.js';
import { searchDppRegistry, fetchRegulatorDppDetail } from '../api/meApi.js';

/**
 * EU 시장감시(레지스트리 조회) - 예전엔 하드코딩 배열 6건을 그대로 보여줬다. 이제
 * com.dpp.verify.controller.DppRegistryController(GET /verify/dpp/search) 실데이터로
 * 붙인다(2026-08-16, 강 요청). 감사 로그(auditLog)는 아직 그대로다 - audit_log 테이블
 * 자체가 없고 전 서비스에 로깅을 새로 심어야 하는 별도 작업이라 이번 범위에서 제외했다.
 *
 * 실제 dpp.public_uuid는 그냥 UUID라 "DPP-KR-ST-2607-0142" 같은 예쁜 코드가 없다 - 화면엔
 * 앞 8자리만 잘라서 보여준다. 검색은 2026-09-28부터 [회사|제품명|식별자·HS] 토글 + 도메인
 * pill(개인 제품 조회와 같은 방식)이고, 세관(customs)도 같은 화면을 쓴다.
 *
 * 감사 로그(auditLog)는 2026-08-19부터 com.dpp.audit.controller.AuditLogController(GET
 * /audit-log) 실데이터다 - 그 전엔 audit_log 테이블 자체엔 자바 코드가 전혀 없어서 하드코딩
 * 배열 8건을 그대로 보여줬다. ADMIN이거나 org_type=EU_AUTHORITY가 아니면 403이라 그 경우
 * ctx.auditLogData는 null로 남고 화면엔 빈 목록으로 보인다.
 */
/**
 * 클립보드 복사. navigator.clipboard는 보안 컨텍스트(HTTPS/localhost)에서만 존재하는데
 * 데모는 퍼블릭 IP 평문 HTTP라 그대로 쓰면 조용히 실패한다 - textarea + execCommand로
 * 대체하고, 그것도 막히면 값을 토스트로 띄워 최소한 눈으로 읽고 옮길 수 있게 한다.
 */
function copyText(value, say, okMessage) {
  const v = String(value || '');
  if (!v) { say('복사할 값이 없습니다.'); return; }
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(v).then(() => say(okMessage)).catch(() => say(v));
    return;
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = v; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta); say(okMessage);
  } catch { say(v); }
}

/** ISO 문자열을 'YYYY-MM-DD HH:MM:SS'로. 값이 없으면 '—'. */
function fmtAt(atIso) {
  if (!atIso) return '—';
  const t = String(atIso).replace('T', ' ');
  return t.length >= 19 ? t.slice(0, 19) : t;
}

/* ---------------------------------------------------------------------------
 * 규제기관 전용 DPP 상세(2026-09-28 강 요청) - 표시용 라벨/행 변환.
 * 서버(GET /verify/dpp/{uuid}/detail)는 코드값을 그대로 주고, 사람이 읽는 말은 여기서 붙인다.
 * ------------------------------------------------------------------------- */
const DOMAIN_LABEL = { STEEL: '철강', BATTERY: '배터리', TEXTILE: '섬유·패션' };
function domainChip(domain) {
  const color = { STEEL: '#0045A9', BATTERY: '#0E7A3D', TEXTILE: '#6A2FA8' }[domain] || '#6B7A93';
  return {
    display: 'inline-flex', alignItems: 'center', height: '24px', padding: '0 10px', borderRadius: '8px',
    background: '#fff', border: '1px solid rgba(16,32,64,.12)',
    color, fontSize: '11.5px', fontWeight: '700', whiteSpace: 'nowrap'
  };
}
const L = {
  dppStatus: { ACTIVE: '발급(유효)', SUSPENDED: '효력 정지', EOL: '폐기(EOL)', DRAFT: '작성중', PENDING: '발급 대기' },
  granularity: { MODEL: '모델 단위', BATCH: '배치(Lot) 단위', ITEM: '개별 제품 단위' },
  submit: { INVITED: '초대됨', IN_PROGRESS: '작성중', SUBMITTED: '제출', COMPLETED: '완료' },
  review: { PENDING: '심사중', APPROVED: '승인', REJECTED: '반려', EXPIRED: '만료' },
  claim: { ORIGIN: '원산지', CERT_VALID: '인증서 유효성', RECYCLED_RATE: '재활용 함량', CUSTOMS_FIT: '통관 적합성', CARBON_LIMIT: '탄소 한계값' },
  zkp: { REQUESTED: '요청됨', GENERATED: '생성됨', VERIFIED: '검증 통과', REJECTED: '검증 실패', MOCK: '모의 증명' },
  anchorTarget: { DPP_SNAPSHOT: 'DPP 스냅샷', DOCUMENT: '증빙서류', EVENT: '이벤트' },
  anchor: { PENDING: '대기', MOCK: '모의', CONFIRMED: '확정', FAILED: '실패' },
  side: { EXPORT: '수출', IMPORT: '수입' },
  decision: { PENDING: '심사 대기', APPROVE: '통관 승인', HOLD: '보류', REJECT: '반려' },
  integrity: { MATCH: '원본 일치', MISMATCH: '불일치', NOT_ANCHORED: '앵커 없음' }
};
const lab = (map, v) => (v ? (map[v] || v) : '—');
const dash = (v) => (v === null || v === undefined || v === '' ? '—' : String(v));
const tone = (kind) => ({
  ok: { color: '#0E7A3D', background: 'rgba(18,161,80,.10)' },
  warn: { color: '#96660A', background: 'rgba(227,160,8,.14)' },
  bad: { color: '#C22B2B', background: 'rgba(224,59,59,.10)' },
  mute: { color: '#6B7A93', background: 'rgba(16,32,64,.06)' }
}[kind]);
const badge = (kind) => ({ display: 'inline-flex', alignItems: 'center', height: '22px', padding: '0 8px', borderRadius: '7px', fontSize: '11px', fontWeight: '700', whiteSpace: 'nowrap', ...tone(kind) });
const shortHash = (h) => (h && h.length > 20 ? h.slice(0, 10) + '…' + h.slice(-6) : dash(h));

function regDetailVals(ctx) {
  const { state, setState } = ctx;
  const rd = state.regDetail || null;
  const d = (rd && rd.data) || null;
  const p = (d && d.product) || {};
  const m = (d && d.manufacturer) || {};
  const pass = (d && d.passport) || {};
  const restrictedSet = new Set((d && d.restrictedLabels) || []);
  const fields = (pass.fields || []).map((f, i) => ({
    key: (f.labelKo || '') + i,
    label: f.labelKo,
    value: f.value || f.proofLabel || '—',
    isProof: !f.value && !!f.proofLabel,
    // 개인이 QR로 열면 가려지는 항목 - 규제기관이라 값이 보인다.
    restricted: !!f.value && restrictedSet.has(f.labelKo)
  }));
  const tab = state.regDetailTab || 'fields';
  const tabBtn = (key, label, count) => ({
    key, label: count === undefined ? label : label + ' ' + count, active: tab === key,
    pick: () => setState({ regDetailTab: key })
  });
  const participants = (d && d.participants) || [];
  const documents = (d && d.documents) || [];
  const proofs = (d && d.proofs) || [];
  const anchors = (d && d.anchors) || [];
  const clearances = (d && d.clearances) || [];
  const completeness = p.completeness ? Math.round(Number(p.completeness)) + '%' : '—';

  return {
    regDetailOpen: !!rd,
    regDetailLoading: !!(rd && rd.loading),
    regDetailError: (rd && rd.error) || '',
    regDetailTitle: (rd && rd.title) || '',
    regDetailSub: (rd && rd.sub) || '',
    regDetailViewer: pass.viewerLabel || '',
    regDetailQr: (rd && rd.qr) || '',
    regDetailUrl: (rd && rd.url) || '',
    regDetailPhoto: d && d.hasPhoto && rd.uuid ? `/public/dpp/${rd.uuid}/photo` : '',
    copyRegDetailUrl: () => copyText((rd && rd.url) || '', ctx.say, '공개 주소를 복사했습니다.'),
    closeRegDetail: () => setState({ regDetail: null }),
    regDetailTabs: [
      tabBtn('fields', 'DPP 항목', fields.length),
      tabBtn('maker', '제품·제조사'),
      tabBtn('chain', '공급망', participants.length),
      tabBtn('docs', '서류·ZKP', documents.length + proofs.length),
      tabBtn('trace', '블록체인·통관', anchors.length + clearances.length)
    ],
    regTabFields: tab === 'fields',
    regTabMaker: tab === 'maker',
    regTabChain: tab === 'chain',
    regTabDocs: tab === 'docs',
    regTabTrace: tab === 'trace',
    regDetailFields: fields,
    regDetailRestrictedShown: fields.filter((f) => f.restricted).length,
    regDetailTradeSecretNote: pass.tradeSecretCount ? '영업비밀 항목 ' + pass.tradeSecretCount + '개는 실측값을 저장하지 않아 규제기관도 "한계값 충족" 판정만 봅니다.' : '',
    regDetailProduct: [
      ['DPP 식별자(UUID)', dash(p.publicUuid), true],
      ['시리얼 / Lot', dash(p.serialNumber), true],
      ['관리 단위', lab(L.granularity, p.granularity), false],
      ['제품명', dash(p.modelName), false],
      ['브랜드', dash(p.brand), false],
      ['내부 SKU', dash(p.internalSku), true],
      ['GTIN', dash(p.gtin), true],
      ['HS 코드', dash(p.hsCode), true],
      ['원산지', dash(p.originCountry), true],
      ['분야', lab(DOMAIN_LABEL, p.domain), false],
      ['DPP 상태', lab(L.dppStatus, p.status), false],
      ['생애주기 단계', p.lifecycleStage ? p.lifecycleStage + '단계' + (p.lifecycleStageName ? ' · ' + p.lifecycleStageName : '') : '—', false],
      ['데이터 완성도', completeness, true],
      ['발급 일시', dash(p.issuedAt), true]
    ].map(([label, value, mono]) => ({ label, value, mono })),
    regDetailMaker: [
      ['회사명', dash(m.orgName), false],
      ['사업자등록번호', dash(m.bizRegNo), true],
      ['EORI 번호', dash(m.eoriCode), true],
      ['LEI 코드', dash(m.leiCode), true],
      ['국가', dash(m.countryCode), true],
      ['주소', dash(m.address), false],
      ['담당자', dash(m.contactName), false],
      ['담당자 이메일', dash(m.contactEmail), true],
      ['담당자 연락처', dash(m.contactPhone), true]
    ].map(([label, value, mono]) => ({ label, value, mono })),
    regDetailParticipants: participants.map((r, i) => ({
      key: i, org: dash(r.orgName), role: dash(r.roleName),
      status: lab(L.submit, r.submitStatus),
      statusStyle: badge(r.submitStatus === 'COMPLETED' || r.submitStatus === 'SUBMITTED' ? 'ok' : r.submitStatus === 'IN_PROGRESS' ? 'warn' : 'mute'),
      at: dash(r.completedAt)
    })),
    regDetailParticipantsEmpty: participants.length === 0,
    regDetailDocs: documents.map((r, i) => ({
      key: i, type: dash(r.docType), file: dash(r.fileName), issuer: dash(r.issuer),
      period: (r.issuedAt || r.expiresAt) ? dash(r.issuedAt) + ' ~ ' + dash(r.expiresAt) : '—',
      review: lab(L.review, r.reviewStatus),
      reviewStyle: badge(r.reviewStatus === 'APPROVED' ? 'ok' : r.reviewStatus === 'PENDING' ? 'warn' : 'bad'),
      hash: shortHash(r.contentHash), fullHash: r.contentHash || '',
      uploaded: dash(r.uploadedAt), by: dash(r.submittedBy)
    })),
    regDetailDocsEmpty: documents.length === 0,
    regDetailProofs: proofs.map((r, i) => ({
      key: i, claim: lab(L.claim, r.claimType), circuit: dash(r.circuitName),
      status: lab(L.zkp, r.status),
      statusStyle: badge(r.status === 'VERIFIED' ? 'ok' : r.status === 'REJECTED' ? 'bad' : 'mute'),
      at: dash(r.verifiedAt || r.createdAt)
    })),
    regDetailProofsEmpty: proofs.length === 0,
    regDetailAnchors: anchors.map((r, i) => ({
      key: i, target: lab(L.anchorTarget, r.targetType), tx: shortHash(r.txId), block: dash(r.blockNo),
      status: lab(L.anchor, r.status),
      statusStyle: badge(r.status === 'CONFIRMED' ? 'ok' : r.status === 'FAILED' ? 'bad' : 'mute'),
      at: dash(r.anchoredAt), hash: shortHash(r.contentHash),
      openTx: r.txId ? () => setState({ txModal: { hash: r.txId, at: dash(r.anchoredAt), action: lab(L.anchorTarget, r.targetType) + ' 앵커링', target: rd && rd.title, actor: '—' } }) : undefined
    })),
    regDetailAnchorsEmpty: anchors.length === 0,
    regDetailClearances: clearances.map((r, i) => ({
      key: i, side: lab(L.side, r.side),
      route: dash(r.exportCountry) + ' → ' + dash(r.importCountry),
      office: dash(r.customsOrg), hs: dash(r.hsCode),
      decision: lab(L.decision, r.decision),
      decisionStyle: badge(r.decision === 'APPROVE' ? 'ok' : r.decision === 'PENDING' ? 'mute' : r.decision === 'HOLD' ? 'warn' : 'bad'),
      integrity: lab(L.integrity, r.integrityResult),
      at: dash(r.decidedAt || r.requestedAt)
    })),
    regDetailClearancesEmpty: clearances.length === 0
  };
}

export function euVals(ctx) {
  const { state, setState } = ctx;
  const rows = ctx.euRegistryData || [];

  /*
   * 2026-09-28 강 요청: 개인 페이지 제품 조회처럼 [회사 | 제품명 | 식별자·HS] 토글 + 검색창 하나 +
   * 도메인(분야) pill로 검색한다. 예전 세 칸(식별자/등록회사/HS 코드) 입력은 "식별자·HS" 모드로
   * 흡수했다 - 그 모드는 q(식별자/시리얼/모델명/HS/회사명 OR 매칭)로 보낸다.
   *   회사   → orgName
   *   제품명 → productName (모델명·브랜드)
   *   도메인 → domain (STEEL/BATTERY/TEXTILE, 비면 전체) - 다른 조건과 AND.
   */
  const euBy = state.euBy || 'org';
  const euDomain = state.euDomain || '';
  const runSearch = (over) => {
    const by = (over && over.by) || euBy;
    const input = ((over && over.input !== undefined) ? over.input : (state.euInput || '')).trim();
    const domain = (over && over.domain !== undefined) ? over.domain : euDomain;
    const q = by === 'id' ? input : '';
    const orgName = by === 'org' ? input : '';
    const productName = by === 'product' ? input : '';
    searchDppRegistry(q, orgName, '', { productName, domain })
      .then((res) => ctx.setEuRegistryData(res || []))
      .catch((err) => ctx.say(err.message || 'DPP 레지스트리 조회에 실패했습니다.'));
  };
  const setBy = (by) => { setState({ euBy: by }); if ((state.euInput || '').trim()) runSearch({ by }); };

  return {
    euBy,
    euByOrg: () => setBy('org'),
    euByProduct: () => setBy('product'),
    euById: () => setBy('id'),
    euInput: state.euInput || '',
    onEuInputChange: (e) => setState({ euInput: e.target.value }),
    euInputClear: () => { setState({ euInput: '' }); runSearch({ input: '' }); },
    euPlaceholder: euBy === 'org' ? '회사명으로 검색 (예: 가온스틸)' : euBy === 'product' ? '제품명·브랜드로 검색' : 'DPP 식별자(UUID 일부) · 시리얼 · HS 코드',
    euDomainPills: [['', '전체'], ['STEEL', '철강'], ['BATTERY', '배터리'], ['TEXTILE', '섬유·패션']].map(([code, label]) => ({
      key: code || 'ALL', label, active: euDomain === code,
      pick: () => { setState({ euDomain: code }); runSearch({ domain: code }); }
    })),
    onEuSearchKeyDown: (e) => { if (e.key === 'Enter') runSearch(); },
    exportCsv: () => {
      if (rows.length === 0) { ctx.say('내보낼 조회 결과가 없습니다.'); return; }
      const header = 'publicUuid,serialNumber,modelName,orgName,hsCode,domain,issuedAtDate\n';
      const body = rows.map((r) => [r.publicUuid, r.serialNumber, r.modelName, r.orgName, r.hsCode, r.domain, r.issuedAtDate].join(',')).join('\n');
      const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'dpp-registry.csv'; a.click();
      URL.revokeObjectURL(url);
      ctx.say('조회 결과 ' + rows.length + '건을 CSV로 내보냈습니다.');
    },
    searchRegistry: () => runSearch(),
    registry: rows.map((r) => ({
      key: r.dppId, id: (r.publicUuid || '').slice(0, 8), fullId: r.publicUuid,
      code: r.serialNumber || '—', date: r.issuedAtDate || '—', time: '',
      name: r.modelName, brand: r.brand || '—', company: r.orgName, hs: r.hsCode || '—', domainRaw: r.domain,
      domainLabel: DOMAIN_LABEL[r.domain] || '—', domainChip: domainChip(r.domain),
      /*
       * 2026-09-28 강 요청: 규제기관은 QR이 아니라 목록에서 바로 열람하고, 개인 QR 조회보다
       * 많은 정보를 본다 - GET /verify/dpp/{uuid}/detail(규제기관 전용)로 제품 식별·제조사
       * 신원·공급망·증빙서류·ZKP·블록체인 앵커·통관 이력 + 제한(RESTRICTED) 항목 값까지.
       */
      open: async () => {
        setState({ regDetail: { loading: true, title: r.modelName, sub: r.orgName, uuid: r.publicUuid, data: null, error: null, qr: '', url: '' }, regDetailTab: 'fields' });
        const url = publicPassportUrl(r.publicUuid) || '';
        let qr = '';
        try {
          if (url) qr = await QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
        } catch { /* QR 없이도 본문은 보여준다 */ }
        try {
          const data = await fetchRegulatorDppDetail(r.publicUuid);
          setState({ regDetail: { loading: false, title: r.modelName, sub: r.orgName, uuid: r.publicUuid, data, error: null, qr, url } });
        } catch (e) {
          setState({ regDetail: { loading: false, title: r.modelName, sub: r.orgName, uuid: r.publicUuid, data: null, error: e.message || '조회에 실패했습니다.', qr, url } });
        }
      }
    })),
    ...regDetailVals(ctx),
    // --- 열람 모달 ---
    passportModalOpen: !!state.passportModal,
    passportModalLoading: !!(state.passportModal && state.passportModal.loading),
    passportModalTitle: (state.passportModal && state.passportModal.title) || '',
    passportModalSub: (state.passportModal && state.passportModal.sub) || '',
    passportModalError: (state.passportModal && state.passportModal.error) || '',
    passportModalViewer: (state.passportModal && state.passportModal.data && state.passportModal.data.viewerLabel) || '',
    passportModalQr: (state.passportModal && state.passportModal.qr) || '',
    passportModalUrl: (state.passportModal && state.passportModal.url) || '',
    copyPassportUrl: () => copyText((state.passportModal && state.passportModal.url) || '', ctx.say, '공개 주소를 복사했습니다.'),
    passportModalHiddenNote: (() => {
      const d = state.passportModal && state.passportModal.data;
      if (!d) return '';
      const parts = [];
      if (d.restrictedCount) parts.push('권한 밖 ' + d.restrictedCount + '개');
      if (d.tradeSecretCount) parts.push('영업비밀 ' + d.tradeSecretCount + '개');
      return parts.length ? parts.join(' · ') + ' 는 값이 표시되지 않습니다' : '';
    })(),
    passportModalFields: (((state.passportModal || {}).data || {}).fields || []).map((f, i) => ({
      key: (f.labelKo || '') + i,
      label: f.labelKo,
      section: f.section || '',
      // 값이 없고 proofLabel만 있는 항목 = 영업비밀(ZKP로 대체된 판정)
      value: f.value || f.proofLabel || '—',
      isProof: !f.value && !!f.proofLabel
    })),
    closePassportModal: () => setState({ passportModal: null }),
    /*
     * 트랜잭션 해시는 64자라 표 칸에 그대로 넣으면 줄바꿈이 생겨 해시가 있는 행과
     * 없는 행('—')의 높이가 어긋난다(2026-08-23 강 지적). 목록에서는 앞뒤만 잘라
     * 한 줄로 고정하고, 전체 값은 클릭해서 모달로 본다.
     */
    auditLog: (ctx.auditLogData || []).map((l, i) => {
      const hash = l.txId || '';
      const at = fmtAt(l.atIso);
      return {
        key: hash + (l.atIso || '') + i,
        at,
        actor: l.actor, action: l.action, target: l.target, result: l.result,
        hasHash: !!hash,
        hashShort: hash ? hash.slice(0, 10) + '…' + hash.slice(-6) : '—',
        openHash: hash
          ? () => setState({ txModal: { hash, at, action: l.action, target: l.target, actor: l.actor } })
          : undefined,
        chip: l.result === '성공' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(224,59,59,.10)', '#C22B2B')
      };
    }),
    // --- 트랜잭션 해시 전체 보기 모달 ---
    txModalOpen: !!state.txModal,
    txModalHash: (state.txModal && state.txModal.hash) || '',
    txModalAt: (state.txModal && state.txModal.at) || '—',
    txModalAction: (state.txModal && state.txModal.action) || '—',
    txModalTarget: (state.txModal && state.txModal.target) || '—',
    txModalActor: (state.txModal && state.txModal.actor) || '—',
    closeTxModal: () => setState({ txModal: null }),
    copyTxHash: () => copyText((state.txModal && state.txModal.hash) || '', ctx.say, '트랜잭션 해시를 복사했습니다.')
  };
}
