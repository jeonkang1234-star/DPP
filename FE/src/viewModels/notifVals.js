import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 *
 * 실 API(GET /notifications, /notifications/categories) 연동 버전. 예전엔 mockApi의
 * data.notifications/notificationCats/notificationColors(위치 기반 튜플)를 읽었는데,
 * 지금은 useAppLogic.js가 로그인 후 따로 불러오는 notifCatsData/notifsData(이름 있는
 * 필드 객체, meApi.js)를 읽는다. 카테고리 필터(state.notifCat)는 그대로 클라이언트에서
 * 거른다 - 서버에 category 쿼리파라미터가 있긴 하지만 카테고리 바꿀 때마다 재요청하지
 * 않고 처음 한 번 받은 전체 목록을 재사용한다.
 */
export function notifVals(ctx) {
  const { state, setState, notifCatsData, notifsData } = ctx;
  const cats = notifCatsData || [];
  const all = notifsData || [];
  const cur = state.notifCat;
  return {
    notifOpen: state.notifOpen,
    closeNotif: () => setState({ notifOpen: false }),
    notifCats: [{ key: 'all', label: '전체' }, ...cats].map(({ key, label }) => ({
      key, label,
      style: { height: 34, padding: '0 14px', border: 0, borderRadius: 11, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: cur === key ? '#0B1B33' : '#F2F6FC', color: cur === key ? '#fff' : '#44546F' },
      go: () => setState({ notifCat: key })
    })),
    notifications: all.filter(n => cur === 'all' || n.key === cur).map((n, i) => ({
      key: n.key + '-' + i, cat: n.label, title: n.title, body: n.body, at: ctx.fmtRelative(n.createdAt),
      dot: ctx.dot(n.colorHex),
      chip: ctx.chip(n.key === 'zkp' ? 'rgba(0,69,169,.10)' : n.key === 'cert' ? 'rgba(227,160,8,.16)' : n.key === 'tier' ? 'rgba(18,161,80,.12)' : 'rgba(16,32,64,.07)', n.key === 'zkp' ? '#0045A9' : n.key === 'cert' ? '#96660A' : n.key === 'tier' ? '#0E7A3D' : '#44546F'),
      hasAction: !!n.actionLabel, actionLabel: n.actionLabel,
      act: () => ctx.say((n.actionLabel || '') + ' · 처리 화면으로 이동했습니다.')
    })),
    notifEmpty: all.length === 0,
    notifUnreadCount: all.filter(n => !n.read).length
  };
}
