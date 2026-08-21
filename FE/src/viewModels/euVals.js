import { fetchPublicPassport } from '../api/publicApi.js';
import React from 'react';
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
export function euVals(ctx) {
  const { state, setState } = ctx;
  const rows = ctx.euRegistryData || [];

  const runSearch = (q) => {
    searchDppRegistry(q)
      .then((res) => ctx.setEuRegistryData(res || []))
      .catch((err) => ctx.say(err.message || 'DPP 레지스트리 조회에 실패했습니다.'));
  };

  return {
    euQuery: state.euQuery || '',
    onEuQueryChange: (e) => setState({ euQuery: e.target.value }),
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
    searchRegistry: () => runSearch(state.euQuery || ''),
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
        setState({ passportModal: { loading: true, title: r.modelName, sub: r.orgName, data: null, error: null } });
        try {
          const data = await fetchPublicPassport(r.publicUuid);
          setState({ passportModal: { loading: false, title: r.modelName, sub: r.orgName, data, error: null } });
        } catch (e) {
          setState({ passportModal: { loading: false, title: r.modelName, sub: r.orgName, data: null, error: e.message || '조회에 실패했습니다.' } });
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
    auditLog: (ctx.auditLogData || []).map((l, i) => ({
      key: (l.txId || '') + l.atIso + i,
      at: l.atIso ? l.atIso.replace('T', ' ').slice(0, 19) : '—',
      actor: l.actor, action: l.action, target: l.target, result: l.result,
      hash: l.txId || '—',
      chip: l.result === '성공' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(224,59,59,.10)', '#C22B2B')
    }))
  };
}
