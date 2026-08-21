/**
 * Pure style builders shared across screens (pills, chips, tabs, bars).
 * Each returns a plain React style object — no state, safe to call during render.
 */
export function pill(active) {
  return active
    ? { height: 44, border: 0, borderRadius: 10, background: '#0045A9', color: '#fff', fontSize: 14.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,69,169,.26)' }
    : { height: 44, border: 0, borderRadius: 10, background: 'transparent', color: '#5A6B85', fontSize: 14.5, fontWeight: 600, cursor: 'pointer' };
}

export function roleCard(active) {
  return {
    display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-start', textAlign: 'left',
    padding: '14px 14px', borderRadius: 14, cursor: 'pointer',
    border: active ? '1.5px solid #0045A9' : '1.5px solid rgba(16,32,64,.12)',
    background: active ? 'rgba(0,69,169,.05)' : '#fff',
    boxShadow: active ? '0 4px 14px rgba(0,69,169,.14)' : 'none'
  };
}

export function pillDot(color) {
  return { width: 8, height: 8, flex: 'none', borderRadius: 999, background: color };
}

export function domainCard(active) {
  return {
    display: 'grid', placeItems: 'center', height: 92, padding: '0 14px', cursor: 'pointer',
    border: active ? '1.5px solid #0045A9' : '1.5px solid rgba(16,32,64,.12)',
    background: active ? 'rgba(0,69,169,.05)' : '#fff',
    color: active ? '#0045A9' : '#0B1B33',
    boxShadow: active ? '0 4px 14px rgba(0,69,169,.14)' : 'none'
  };
}


export function tabStyle(active) {
  return active
    ? { height: 40, padding: '0 18px', border: 0, borderRadius: 11, background: '#0045A9', color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(0,69,169,.26)', whiteSpace: 'nowrap' }
    : { height: 40, padding: '0 18px', border: 0, borderRadius: 11, background: 'transparent', color: '#5A6B85', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' };
}

/**
 * 상태 배지(성공/반려/검증 실패, 데이터 검증/형식 확인, 법정필수/조건부 ...).
 *
 * 2026-08-20 강 요청: "감사 로그 결과에 보이는 것과 같은 형식의 디자인을 전부 입체적인
 * 버튼 느낌으로 - 배경색 삭제하고 텍스트만 색깔 남기기". 그래서 둥근 배경 pill을 걷어내고
 * badgeText3d와 같은 엠보싱 글자로 바꿨다. 배경이 사라져도 색은 그대로라 의미(초록=성공,
 * 빨강=실패)는 유지된다.
 *
 * 첫 인자 bg는 이제 그리는 데 쓰지 않는다. 호출부가 30군데라 시그니처를 바꾸면 전부
 * 손봐야 하고, 나중에 pill로 되돌리고 싶어질 때 색 짝을 다시 찾아야 한다 - 그래서 인자는
 * 남겨두고 무시한다. 새로 쓰는 곳은 badgeText3d(색)를 직접 부르는 쪽이 더 정직하다.
 */
export function chip(bg, fg) {
  return { ...badgeText3d(fg), justifyContent: 'center', height: 24, fontSize: 11.5, width: 'fit-content', whiteSpace: 'nowrap' };
}

export function domainChipFor(d) {
  if (d === '철강') return chip('rgba(0,69,169,.10)', '#0045A9');
  if (d === '배터리') return chip('rgba(18,161,80,.12)', '#0E7A3D');
  if (d === '섬유·패션') return chip('rgba(227,160,8,.16)', '#96660A');
  return chip('rgba(16,32,64,.07)', '#44546F');
}

export function avatarStyle(hue) {
  return { width: 30, height: 30, flex: 'none', borderRadius: 999, background: hue, color: '#fff', display: 'grid', placeItems: 'center', fontSize: 12, fontWeight: 700 };
}

export function bar(pct, color) { return { display: 'block', height: '100%', width: pct + '%', borderRadius: 6, background: color }; }

export function pctStyle(pct) {
  const c = pct === 0 ? '#C22B2B' : pct >= 100 ? '#0E7A3D' : '#96660A';
  return { fontFamily: "'JetBrains Mono',monospace", fontSize: 12.5, fontWeight: 700, color: c, textAlign: 'right' };
}

export function segStyle(w, color) { return { display: 'block', width: w + '%', height: '100%', background: color }; }

export function dot(color) { return { width: 9, height: 9, marginTop: 5, flex: 'none', borderRadius: 5, background: color }; }

/**
 * "배경 없는 3D 텍스트" 배지(2026-08-19, 강 요청) - 예전엔 pill(둥근 배경 박스)로 표시되던
 * 작은 숫자/라벨 배지가 "너무 AI스럽다"는 피드백을 받아서, 배경을 걷어내고 글자 자체에
 * 살짝 입체감(엠보싱)을 주는 방식으로 바꿨다. 색은 원래 쓰던 색(color 인자) 그대로 유지 -
 * 요청사항이 "텍스트 색은 유지"였다. 위쪽엔 밝은 하이라이트, 아래쪽엔 어두운 그림자를
 * 겹쳐서 글자가 살짝 도드라져 보이게 하는 원리(순수 CSS text-shadow, 이미지/아이콘 없음).
 */
export function badgeText3d(color) {
  return {
    display: 'inline-flex', alignItems: 'center', fontWeight: 800, letterSpacing: '.01em',
    color,
    // 그림자는 '글자가 살짝 튀어나온' 정도까지만. 예전엔 0 4px 8px 짜리 넓은 드롭섀도가
    // 한 겹 더 깔려 있어서 글자 밑이 번져 지저분해 보였다(2026-08-20 강 리포트
    // "밑에 있는 그림자로 인해 지저분해 보인다"). 위쪽 하이라이트(0 -1px 0 흰색)와
    // 1px 짜리 아래 음영만 남겨 오프셋을 최소화한다.
    textShadow: '0 -1px 0 rgba(255,255,255,.85), 0 1px 1px rgba(16,32,64,.18)'
  };
}

/**
 * DPP 입력률 그래프용 3D 바 세그먼트(2026-08-19, 강 요청 - "너무 2D라서 생동감 없고
 * 재미없음"). 단색 평면 대신 위에서 빛이 떨어지는 듯한 그라디언트 광택 + 아래쪽 음영을
 * 겹쳐서 살짝 튀어나온 느낌을 준다. 막대 트랙 쪽(둘러싸는 부모 div)에는 반대로 안쪽으로
 * 파인 홈처럼 보이도록 inset 그림자를 추가로 준다(아래 groove3d 참고) - 막대가 그 홈 위에
 * 얹힌 것처럼 보이게 하는 짝.
 */
export function segStyle3D(w, color) {
  return {
    display: 'block', width: w + '%', height: '100%',
    background: `linear-gradient(180deg, rgba(255,255,255,.45) 0%, rgba(255,255,255,0) 45%, rgba(0,0,0,.12) 100%), ${color}`,
    boxShadow: 'inset 0 1px 0 rgba(255,255,255,.35), inset 0 -2px 3px rgba(0,0,0,.14), 0 1px 2px rgba(16,32,64,.10)',
    position: 'relative'
  };
}

/** segStyle3D와 짝을 이루는 바 트랙(부모 컨테이너) 스타일 - 안쪽으로 파인 홈처럼 보이게. */
export function groove3d(bg) {
  return {
    background: bg,
    boxShadow: 'inset 0 2px 4px rgba(16,32,64,.12), inset 0 -1px 0 rgba(255,255,255,.5)'
  };
}
