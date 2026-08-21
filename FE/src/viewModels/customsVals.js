import React from 'react';
import QRCode from 'qrcode';
import { publicPassportUrl } from '../publicUrl.js';

/**
 * 세관 통관 검증 화면 - 2026-08-19 강 요청 "실 데이터로 연결해야함... 세관마다 확인해야
 * 할 DPP가 달라야 함"으로 전면 교체. 예전엔 하드코딩 배열(data.customsItems) 6건을
 * 어느 세관 계정으로 로그인해도 똑같이 보여줬다. 이제 com.dpp.customs.controller.
 * CustomsClearanceController(GET /customs/queue)가 로그인한 세관 조직에 실제로
 * 배정된 케이스만 돌려준다 - 배정은 서비스 쪽에서 DPP 수출국/수입국과 세관 조직의
 * country_code를 매칭해서 결정한다(OrganizationService와 짝을 이루는 신규 기능).
 *
 * 검색(cQuery)은 예전처럼 전체 DPP 레지스트리를 뒤지지 않는다 - "세관마다 확인해야 할
 * DPP가 달라야 한다"는 요청의 취지상, 내 큐(ctx.customsQueueData)에 이미 배정된 케이스
 * 안에서만 필터링한다(EU 시장감시 쪽 euVals.js의 전체 레지스트리 검색과는 의도적으로
 * 다른 범위).
 */
export function customsVals(ctx) {
  const { state, setState } = ctx;
  const queue = ctx.customsQueueData || [];
  const detail = ctx.customsCaseDetail;
  const green = '#12A150', red = '#E03B3B';

  const short = (uuid) => (uuid || '').replace(/-/g, '').slice(0, 8).toUpperCase();

  const match = (q) => {
    const k = (q || '').trim().toLowerCase();
    if (!k) return null;
    return queue.find((i) =>
      short(i.publicUuid).toLowerCase() === k
      || (i.importerEori || '').toLowerCase() === k
      || short(i.publicUuid).toLowerCase().includes(k)
      || (i.modelName || '').toLowerCase().includes(k)
      || (i.importerName || '').toLowerCase().includes(k)
      || (i.hsCode || '').toLowerCase().includes(k)
    ) || null;
  };

  const found = queue.find((i) => i.clearanceId === state.customsId) || null;
  const noResult = !!state.customsSearched && !found;
  const summary = detail ? detail.summary : found;
  const checks = (detail ? detail.checks : []) || [];
  const checkByLabel = (label) => checks.find((c) => c.label === label);
  const docCheck = checkByLabel('EU 적합성 선언서(DoC)');
  const techCheck = checkByLabel('CE 마크');
  const ceOk = !!docCheck && !!techCheck && docCheck.pass && techCheck.pass;
  const loading = !!found && !detail;

  const openCase = (clearanceId) => {
    setState({ customsSearched: true, customsId: clearanceId });
  };

  return {
    cSearchMode: !state.customsSearched,
    cResultMode: !!state.customsSearched && !noResult,
    cNoResult: noResult,
    cQuery: state.customsQuery || '',
    onCustomsQuery: (e) => setState({ customsQuery: e.target.value }),
    runCustomsSearch: () => {
      const hit = match(state.customsQuery);
      setState({ customsSearched: true, customsId: hit ? hit.clearanceId : null });
    },
    resetCustomsSearch: () => setState({ customsSearched: false, customsQuery: '', customsId: null }),
    cRecent: queue.slice(0, 3).map((i) => ({
      key: i.clearanceId, label: short(i.publicUuid) + ' · ' + (i.modelName || ''),
      pick: () => openCase(i.clearanceId),
    })),
    // 큐 목록 - AppView의 검색 화면(cSearchMode)에 "내 세관에 배정된 대기 건" 표로 보여준다.
    // 배정 자체가 이미 수출국/수입국 관할로 걸러진 결과라, 이 목록에 뜨는 것 자체가 곧
    // "이 세관이 확인해야 할 DPP"의 실제 증거다.
    cQueueEmpty: queue.length === 0,
    cQueueRows: queue.map((i) => ({
      key: i.clearanceId,
      idLabel: short(i.publicUuid),
      name: i.modelName || '—',
      importer: i.importerName || '—',
      sideLabel: i.clearanceSide === 'EXPORT' ? '수출측 심사' : i.clearanceSide === 'IMPORT' ? '수입측 심사' : '—',
      route: (i.exportCountryCode || '?') + ' → ' + (i.importCountryCode || '?'),
      open: () => openCase(i.clearanceId),
    })),
    cVerdict: loading ? '조회 중…' : summary ? (detail ? (detail.overallPass ? '통관 요건 충족' : '통관 요건 미충족') : '') : '',
    cVerdictStyle: {
      display: 'flex', flexDirection: 'column', gap: 10, padding: '26px 28px', borderRadius: 20,
      background: '#fff', border: '1px solid rgba(16,32,64,.07)', boxShadow: '0 1px 2px rgba(16,32,64,.05)'
    },
    cVerdictDot: { width: 9, height: 9, flex: 'none', borderRadius: 999, background: detail && detail.overallPass ? green : red },
    cVerdictTextStyle: { fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#0B1B33' },
    cId: summary ? short(summary.publicUuid) : '',
    cName: summary ? (summary.modelName || '—') : '',
    cEori: summary ? (summary.importerEori || '—') : '',
    cImporter: summary ? (summary.importerName || '—') : '',
    cImporterAddr: summary ? (summary.importerAddress || '') : '',
    cExporter: summary ? ((summary.exporterOrgName || '—') + (summary.exportCountryCode ? ' (' + summary.exportCountryCode + ')' : '')) : '',
    cHs: summary ? (summary.hsCode || '미신고') : '',
    // HS 코드 설명(hsName) 대신 실제 정합성 확인 결과를 보여준다 - 상품명 데이터베이스
    // 연동이 없어 "철 또는 비합금강의 평판압연제품" 같은 문구를 지어낼 수 없다.
    cHsName: checkByLabel('HS 코드 정합성') ? checkByLabel('HS 코드 정합성').detail : '',
    // 수입신고번호 대신 이 케이스가 수출측/수입측 중 어느 세관 심사인지 표시 - 원래 필드는
    // 이 프로토타입에 신고번호 채번 기능 자체가 없어 대체.
    cDeclared: summary ? (summary.clearanceSide === 'EXPORT' ? '수출측 심사' : summary.clearanceSide === 'IMPORT' ? '수입측 심사' : '—') : '',
    // 수량 대신 신청일 - 마찬가지로 수량 데이터가 없어 실제로 있는 값으로 대체.
    cQty: summary && summary.createdAtIso ? summary.createdAtIso.slice(0, 10) : '—',
    cCeNote: docCheck ? docCheck.detail : '',
    cDoc: 'EU 적합성 선언서 · 기술문서',
    cTech: techCheck ? techCheck.detail : '',
    cCeOk: ceOk,
    cCeFail: !!detail && !ceOk,
    cChecks: checks.map((c) => ({
      key: c.label, label: c.label, detail: c.detail,
      mark: c.pass ? '✓' : '✕',
      markStyle: { display: 'grid', placeItems: 'center', width: 22, height: 22, flex: 'none', borderRadius: 999, background: c.pass ? green : red, color: '#fff', fontSize: 11, fontWeight: 700 },
      detailStyle: { fontSize: 11.5, lineHeight: 1.5, color: c.pass ? '#8494AC' : '#C22B2B' }
    })),
    cDownloadAll: () => ctx.say('적합성 선언서·기술문서·DPP 증명서를 하나의 ZIP으로 내려받습니다.'),
    // QR - 실제 publicUuid로 공개 조회 URL(/p/{publicUuid})을 인코딩한다(makerVals.js와
    // 동일 패턴, 2026-08-19 - 예전엔 세관 화면이 목데이터라 이 부분만 텍스트 그대로
    // 인코딩했었다).
    showQr: () => {
      if (!summary) return;
      const url = publicPassportUrl(summary.publicUuid) || short(summary.publicUuid);
      QRCode.toDataURL(url, { margin: 1, width: 220, color: { dark: '#0B1B33', light: '#FFFFFF' } })
        .then((dataUrl) => {
          setState({ qrModal: { id: cIdLabel(summary), dataUrl, url, badge: '통관 조회', title: '해당 DPP의 QR 코드입니다', hint: '수입업체·현장 검수 시 이 QR로 동일한 DPP를 다시 조회할 수 있습니다.' } });
        })
        .catch(() => ctx.say('QR 생성에 실패했습니다.'));
    },
    cCanDecide: !!found && found.decision === 'PENDING',
    cApprove: () => decide(ctx, found, 'APPROVE', '통관 승인'),
    cHold: () => decide(ctx, found, 'HOLD', '통관 보류'),
    cReject: () => decide(ctx, found, 'REJECT', '통관 반려'),
  };

  function cIdLabel(s) {
    return short(s.publicUuid);
  }
}

function decide(ctx, found, decision, verb) {
  if (!found) return;
  const clearanceId = found.clearanceId;
  const label = found.modelName || 'DPP';
  ctx.decideCustomsCase(clearanceId, decision)
    .then(() => {
      ctx.say(label + ' ' + verb + ' 처리했습니다.');
      ctx.refetchCustomsQueue();
      ctx.refetchCustomsCase(clearanceId);
    })
    .catch((err) => ctx.say(err.message || (verb + ' 처리에 실패했습니다.')));
}
