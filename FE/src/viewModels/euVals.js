import { fetchPublicPassport } from '../api/publicApi.js';
import React from 'react';
import QRCode from 'qrcode';
import { publicPassportUrl } from '../publicUrl.js';
import { searchDppRegistry } from '../api/meApi.js';

/**
 * EU 시장감시(레지스트리 조회) - 예전엔 하드코딩 배열 6건을 그대로 보여줬다. 이제
 * com.dpp.verify.controller.DppRegistryController(GET /verify/dpp/search) 실데이터로
 * 붙인다(2026-08-16, 강 요청). 감사 로그(auditLog)는 아직 그대로다 - audit_log 테이블
 * 자체가 없고 전 서비스에 로깅을 새로 심어야 하는 별도 작업이라 이번 범위에서 제외했다.
 *
 * 실제 dpp.public_uuid는 그냥 UUID라 "DPP-KR-ST-2607-0142" 같은 예쁜 코드가 없다 - 화면엔
 * 앞 8자리만 잘라서 보여준다. 검색창 3개(식별자/회사/HS코드)는 백엔드가 단일 검색어로
 * 한 번에 OR 매칭하므로 실제로는 하나의 입력값을 공유한다(euQuery) - 나머지 두 칸은
 * 참고용으로 읽기전용 표시만 한다.
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

export function euVals(ctx) {
  const { state, setState } = ctx;
  const rows = ctx.euRegistryData || [];

  /*
   * 2026-08-23 강 요청: 등록회사·HS 코드 칸이 각각 개별 필터로 동작해야 한다.
   * 예전엔 두 칸이 첫 칸(euQuery) 값을 그대로 비추는 읽기전용 표시였다 - "HS 코드만으로
   * 좁히기"가 아예 불가능했다. 이제 세 값을 따로 보내고 서버가 AND로 겹친다.
   */
  const runSearch = () => {
    searchDppRegistry(state.euQuery || '', state.euOrgName || '', state.euHsCode || '')
      .then((res) => ctx.setEuRegistryData(res || []))
      .catch((err) => ctx.say(err.message || 'DPP 레지스트리 조회에 실패했습니다.'));
  };

  return {
    euQuery: state.euQuery || '',
    onEuQueryChange: (e) => setState({ euQuery: e.target.value }),
    euOrgName: state.euOrgName || '',
    onEuOrgNameChange: (e) => setState({ euOrgName: e.target.value }),
    euHsCode: state.euHsCode || '',
    onEuHsCodeChange: (e) => setState({ euHsCode: e.target.value }),
    onEuSearchKeyDown: (e) => { if (e.key === 'Enter') runSearch(); },
    exportCsv: () => {
      if (rows.length === 0) { ctx.say('내보낼 조회 결과가 없습니다.'); return; }
      const header = 'publicUuid,serialNumber,modelName,orgName,hsCode,domain,issuedAtDate\n';
      const body = rows.map((r) => [r.id, r.code, r.name, r.company, r.hs, r.domainRaw, r.date].join(',')).join('\n');
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
      name: r.modelName, company: r.orgName, hs: r.hsCode || '—', domainRaw: r.domain,
      /*
       * 2026-08-21 강 요청: "열람을 누르면 DPP 생성 때 입력한 정보가 다 보여야 한다".
       * 예전엔 회색 막대만 그린 가짜 문서 미리보기 모달을 띄웠다(docPreview).
       * 이제 GET /public/dpp/{publicUuid}를 실제로 불러 그 값을 그린다 -
       * 시장감시당국 토큰으로 부르므로 제한(RESTRICTED) 항목까지 함께 온다.
       * 영업비밀 항목은 실측값을 저장하지 않으므로 "규정 충족" 판정만 온다.
       */
      open: async () => {
        setState({ passportModal: { loading: true, title: r.modelName, sub: r.orgName, data: null, error: null, qr: '', url: '' } });
        // 열람 모달에도 그 제품의 공개 여권 QR을 같이 띄운다(2026-08-23 강 요청).
        // 조사관이 화면에서 본 제품을 현장에서 바로 대조하거나 공유할 수 있어야 한다.
        // QR 생성 실패가 열람 자체를 막으면 안 되므로 따로 잡는다.
        const url = publicPassportUrl(r.publicUuid) || '';
        let qr = '';
        try {
          if (url) qr = await QRCode.toDataURL(url, { width: 320, margin: 1, errorCorrectionLevel: 'M' });
        } catch { /* QR 없이도 본문은 보여준다 */ }
        try {
          const data = await fetchPublicPassport(r.publicUuid);
          setState({ passportModal: { loading: false, title: r.modelName, sub: r.orgName, data, error: null, qr, url } });
        } catch (e) {
          setState({ passportModal: { loading: false, title: r.modelName, sub: r.orgName, data: null, error: e.message || '조회에 실패했습니다.', qr, url } });
        }
      }
    })),
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
