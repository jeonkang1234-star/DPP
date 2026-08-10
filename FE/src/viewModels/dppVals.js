import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function dppVals(ctx) {
  const { state, setState, props, data } = ctx;
  const rows = ctx.compData();
  const row = rows.find(r => r[0] === state.dppId) || rows[0];
  const [id, name, done, , , spec] = row;
  const stages = [
    ['원자재 조달', '완료', '공급사 3곳 데이터 연동 완료'],
    ['제조·가공', done >= 60 ? '완료' : '진행중', done >= 60 ? '공정 데이터 및 시험성적서 등록' : '압연 공정 데이터 미제출'],
    ['유통·물류', done >= 88 ? '완료' : '대기', done >= 88 ? '운송 구간 2건 기록' : '출하 후 자동 기록 예정'],
    ['사용·수리', '대기', '판매 이후 이벤트 수집 예정'],
    ['재활용·폐기', '대기', '재활용 사업자 스캔 시 기록']
  ];
  const missing = data.dppMissingData;
  return {
    dppOpen: state.dppOpen,
    closeDpp: () => setState({ dppOpen: false }),
    dppId: id, dppName: name, dppPct: done, dppSpec: spec,
    dppStatusChip: done === 100 ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : done === 0 ? ctx.chip('rgba(224,59,59,.10)', '#C22B2B') : ctx.chip('rgba(227,160,8,.16)', '#96660A'),
    dppMissingCount: done === 100 ? 0 : missing.length,
    lifecycle: stages.map(([stage, state, detail], i) => ({
      key: stage, stage, state, detail,
      dot: { width: 14, height: 14, flex: 'none', borderRadius: 8, background: state === '완료' ? '#12A150' : state === '진행중' ? '#E3A008' : '#fff', border: state === '대기' ? '2px solid #D5DCE8' : '2px solid transparent' },
      line: { width: 2, flex: 1, minHeight: i === stages.length - 1 ? 0 : 30, background: state === '완료' ? 'rgba(18,161,80,.32)' : 'rgba(16,32,64,.10)' },
      chip: state === '완료' ? ctx.chip('rgba(18,161,80,.12)', '#0E7A3D') : state === '진행중' ? ctx.chip('rgba(227,160,8,.16)', '#96660A') : ctx.chip('rgba(16,32,64,.07)', '#8494AC')
    })),
    missingFields: (done === 100 ? [] : missing).map(([field, owner, role, c]) => ({
      key: field, field, owner, role,
      sevDot: { width: 7, height: 7, flex: 'none', borderRadius: 4, background: c },
      nudge: () => ctx.say(owner + '에 문서 업로드 독촉 알림을 전송했습니다.')
    }))
  };
}
