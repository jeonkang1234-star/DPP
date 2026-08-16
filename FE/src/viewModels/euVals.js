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
      open: () => setState({ docPreview: { name: r.modelName + ' · ' + r.orgName, meta: 'HS ' + (r.hsCode || '—') + ' · ' + (r.issuedAtDate || '—'), status: '발급됨' } })
    })),
    auditLog: [
      ['2026-07-30 07:41:12', '대성제강 · 박지우', 'DPP 발급', 'DPP-KR-ST-2607-0142', '성공', '0x8a41…c92d'],
      ['2026-07-30 07:12:04', 'IEUM · 김도현', 'Tier 심사 승인', '우진메탈 · Tier 3', '성공', '0x71bc…4f08'],
      ['2026-07-29 22:08:55', '루멘셀 · 이서준', 'ZKP 증명 제출', 'DPP-KR-BT-2607-0298', '반려', '0x33ef…a1b7'],
      ['2026-07-29 18:44:31', '시장감독기관 · 윤가람', '레지스트리 열람', 'DPP-DE-ST-2607-0088', '성공', '0x0d92…77aa'],
      ['2026-07-29 15:20:09', '아라텍스 · 최유진', '데이터 수정', 'DPP-KR-TX-2607-0533', '성공', '0xb410…2e51'],
      ['2026-07-29 11:03:47', 'IEUM · 시스템', '블록체인 앵커링', 'BATCH-2607-118 (240건)', '성공', '0xf7a2…9c30'],
      ['2026-07-28 20:31:18', '우진메탈 · 초대계정', '문서 업로드', 'DOC-2607-1151', '검증 실패', '0x5511…be6f'],
      ['2026-07-28 09:14:52', 'IEUM · 김도현', '가입 승인', 'Fibrelune SAS', '성공', '0x2cd8…10f4']
    ].map(([at, actor, action, target, result, hash]) => ({
      key: hash + at, at, actor, action, target, result, hash,
      chip: result === '성공' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : ctx.chip('rgba(224,59,59,.10)', '#C22B2B')
    }))
  };
}
