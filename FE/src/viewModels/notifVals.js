import React from 'react';

/**
 * Builds the view-model slice consumed by AppView.
 * @param ctx shared context from useAppLogic (state, setState, props, style + helper fns)
 */
export function notifVals(ctx) {
  const { state, setState, props, data } = ctx;
  const cats = data.notificationCats;
  const all = data.notifications;
  const cur = state.notifCat;
  const colorFor = data.notificationColors;
  return {
    notifOpen: state.notifOpen,
    closeNotif: () => setState({ notifOpen: false }),
    notifCats: cats.map(([k, label]) => ({
      key: k, label,
      style: { height: 34, padding: '0 14px', border: 0, borderRadius: 11, cursor: 'pointer', fontSize: 12.5, fontWeight: 600, background: cur === k ? '#0B1B33' : '#F2F6FC', color: cur === k ? '#fff' : '#44546F' },
      go: () => setState({ notifCat: k })
    })),
    notifications: all.filter(n => cur === 'all' || n[0] === cur).map(([k, cat, title, body, at, action]) => ({
      key: title, cat, title, body, at,
      dot: ctx.dot(colorFor[k]),
      chip: ctx.chip(k === 'zkp' ? 'rgba(0,69,169,.10)' : k === 'cert' ? 'rgba(227,160,8,.16)' : k === 'tier' ? 'rgba(18,161,80,.12)' : 'rgba(16,32,64,.07)', k === 'zkp' ? '#0045A9' : k === 'cert' ? '#96660A' : k === 'tier' ? '#0E7A3D' : '#44546F'),
      hasAction: !!action, actionLabel: action,
      act: () => ctx.say(action + ' · 처리 화면으로 이동했습니다.')
    }))
  };
}
