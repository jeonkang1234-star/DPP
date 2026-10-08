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
  const shown = all.filter(n => cats.length === 0 || cur === 'all' || n.key === cur);
  // 지금 보고 있는 탭 이름 - '모두 지우기' 확인 문구에 쓴다.
  const curLabel = cur === 'all' || cats.length === 0 ? '전체' : ((cats.find(c => c.key === cur) || {}).label || '이 탭의');
  return {
    notifOpen: state.notifOpen,
    closeNotif: () => setState({ notifOpen: false }),
    // 서버가 카테고리를 하나도 안 주면(운영자 - 2026-08-20 강 요청 "카테고라이징 자체 X")
    // '전체' 탭 하나만 남는데, 선택지가 하나뿐인 탭 줄은 의미가 없으니 줄 자체를 감춘다.
    notifCatsVisible: cats.length > 0,
    notifCats: [{ key: 'all', label: '전체' }, ...cats].map(({ key, label }) => ({
      key, label,
      style: { height: 34, padding: '0 14px', border: 0, borderRadius: 11, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: cur === key ? '#0B1B33' : '#F2F6FC', color: cur === key ? '#fff' : '#44546F' },
      go: () => setState({ notifCat: key })
    })),
    notifications: shown.map((n, i) => ({
      key: n.key + '-' + i, cat: n.label, title: n.title, body: n.body, at: ctx.fmtRelative(n.createdAt),
      dot: ctx.dot(n.colorHex),
      chip: ctx.chip(n.key === 'zkp' ? 'rgba(0,69,169,.10)' : n.key === 'cert' ? 'rgba(227,160,8,.16)' : n.key === 'tier' ? 'rgba(18,161,80,.12)' : 'rgba(16,32,64,.07)', n.key === 'zkp' ? '#0045A9' : n.key === 'cert' ? '#96660A' : n.key === 'tier' ? '#0E7A3D' : '#44546F'),
      hasAction: !!n.actionLabel, actionLabel: n.actionLabel,
      // 서버가 준 linkUrl로 실제 이동한다. 예전엔 토스트만 띄우고 끝이라
      // "바로가기를 눌러도 안 간다"는 리포트가 나왔다(2026-08-21).
      act: () => ctx.goToLink(n.linkUrl),
      // 카드 우측 상단 X - 알림 하나 지우기(2026-10-08 강 요청).
      canRemove: n.id != null,
      remove: () => ctx.removeNotification(n.id).catch(e => ctx.say(e.message || '알림을 지우지 못했습니다.'))
    })),
    // 알림센터 상단 '모두 지우기' - 지금 보고 있는 탭의 알림만 지운다(전체 탭이면 전부).
    notifClearVisible: shown.length > 0,
    clearNotifs: () => setState({
      confirm: {
        title: '알림을 모두 지울까요?',
        body: (curLabel === '전체' ? '알림 ' : curLabel + ' 알림 ') + shown.length + '건을 지웁니다. 지운 알림은 되돌릴 수 없습니다.',
        label: '모두 지우기',
        danger: true,
        run: () => {
          setState({ confirm: null });
          ctx.clearNotifications(cur === 'all' || cats.length === 0 ? 'all' : cur)
            .then(() => ctx.say('알림을 지웠습니다.'))
            .catch(e => ctx.say(e.message || '알림을 지우지 못했습니다.'));
        }
      }
    }),
    notifEmpty: shown.length === 0,
    notifUnreadCount: all.filter(n => !n.read).length
  };
}
