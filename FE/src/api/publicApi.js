import { loadSession } from './session.js';

/**
 * 로그인 없이 호출하는 공개 API. QR/링크로 DPP를 조회하는 PublicPassport.jsx 전용
 * (2026-08-18). meApi.js의 authedFetch와 다르게 401을 만나도 로그인 화면으로 쫓아내지
 * 않는다 - 애초에 로그인 여부와 무관한 화면이다.
 *
 * 2026-08-21: 세션이 있으면 토큰을 붙인다. 서버가 토큰의 소속(세관/시장감시당국/운영자)에
 * 따라 제한 항목까지 보여주기 때문이다(강 요청 "QR로 볼 때 개인·세관·EU가 보는 결과가
 * 달라야 함"). 토큰이 없으면 예전과 똑같이 공개 항목만 온다 - 붙이지 못해도 조회 자체는
 * 항상 성공한다.
 */

export async function fetchPublicPassport(publicUuid) {
  let token = null;
  try {
    token = loadSession()?.accessToken || null;
  } catch {
    /* 세션 저장소 접근이 막힌 환경(사생활 보호 모드 등) - 공개 뷰로 진행 */
  }

  const res = await fetch(`/public/dpp/${publicUuid}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) {
    let message = res.status === 404 ? '해당 DPP를 찾을 수 없습니다.' : '조회에 실패했습니다.';
    try {
      const data = await res.json();
      if (data && data.message) message = data.message;
    } catch {
      /* 본문 없는 에러 응답은 무시 */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
