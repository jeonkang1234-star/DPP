/**
 * 로그인 없이 호출하는 공개 API. QR/링크로 DPP를 조회하는 PublicPassport.jsx 전용
 * (2026-08-18). meApi.js의 authedFetch와 다르게 세션 토큰을 붙이지 않고, 401을 만나도
 * 로그인 화면으로 쫓아내지 않는다 - 애초에 로그인 여부와 무관한 화면이다.
 */

export async function fetchPublicPassport(publicUuid) {
  const res = await fetch(`/public/dpp/${publicUuid}`);
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
