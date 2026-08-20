/**
 * 공개 여권(/p/{publicUuid}) QR에 넣을 절대 URL을 만든다.
 *
 * 예전엔 세 군데(makerVals·customsVals·useAppLogic)에서 각자
 * `window.location.origin + '/p/' + uuid`를 조립했다. PC 브라우저에서 앱을
 * http://localhost 로 열어두면 QR에도 http://localhost/p/... 가 그대로 박히는데,
 * 그 QR을 휴대폰으로 찍으면 휴대폰 자기 자신의 localhost로 가버려서 아무것도
 * 뜨지 않는다(2026-08-20 강 리포트 "QR코드 모바일로 찍어도 조회가 안 된다").
 *
 * 해결 순서:
 *   1) 사용자가 화면에서 직접 지정한 공개 주소(localStorage) - 재빌드 없이 바꿀 수 있다
 *   2) 현재 origin이 loopback이 아니면 그대로 - EC2(http://15.134.9.240)로 접속했든
 *      PC를 LAN IP로 열었든, 지금 보고 있는 그 주소가 언제나 정답이다. 빌드에 박아둔
 *      값보다 이걸 먼저 보는 이유: 그 DPP가 실제로 있는 DB는 지금 접속한 서버의
 *      DB이므로, 다른 호스트를 QR에 박으면 "없는 DPP"가 뜬다.
 *   3) VITE_PUBLIC_BASE_URL (빌드 인자) - origin이 localhost/127.0.0.1일 때만 쓰인다.
 *      로컬 PC에서 http://localhost로 열어둔 채 QR을 만들 때의 구제책.
 *   4) 그래도 없으면 origin 그대로(= localhost). 모달이 빨간 경고를 띄운다.
 */

const STORAGE_KEY = 'dpp.publicBaseUrl';

const trimSlash = (s) => String(s || '').trim().replace(/\/+$/, '');

/** localStorage 접근이 막힌 환경(사생활 보호 모드 등)에서도 앱이 죽지 않게 감싼다. */
function readOverride() {
  try {
    return trimSlash(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return '';
  }
}

export function setPublicBaseUrl(value) {
  try {
    const v = trimSlash(value);
    if (v) window.localStorage.setItem(STORAGE_KEY, v);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // 저장 실패해도 이번 세션의 QR 생성 자체는 인자로 받은 값으로 계속 진행한다.
  }
}

/** 휴대폰에서 절대 열리지 않는 주소인가(= QR이 무의미한가). */
export function isUnreachableFromPhone(base) {
  const b = String(base == null ? publicBaseUrl() : base).toLowerCase();
  return b.includes('//localhost') || b.includes('//127.0.0.1') || b.includes('//[::1]');
}

export function publicBaseUrl() {
  const override = readOverride();
  if (override) return override;

  const origin = trimSlash(window.location.origin);
  if (origin && !isUnreachableFromPhone(origin)) return origin;

  return trimSlash(import.meta.env?.VITE_PUBLIC_BASE_URL) || origin;
}

/** QR/링크에 넣을 공개 여권 절대 URL. publicUuid가 없으면 null. */
export function publicPassportUrl(publicUuid) {
  if (!publicUuid) return null;
  return publicBaseUrl() + '/p/' + publicUuid;
}
