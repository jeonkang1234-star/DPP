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

/**
 * 이 QR 주소에 대해 사용자에게 띄울 경고. 없으면 null.
 *
 * 두 가지를 구분한다.
 *  - loopback: 휴대폰이 자기 자신을 찾아가서 아무것도 안 뜬다.
 *  - mismatch: 열리기는 하는데 "지금 보고 있는 서버"가 아닌 다른 서버를 가리킨다.
 *    로컬 도커로 발급한 DPP는 그 서버 DB에 없으므로 "조회 실패"가 뜬다 - 주소가
 *    멀쩡해 보여서 원인을 찾기 가장 어려운 경우라 명시적으로 경고한다
 *    (2026-08-20: VITE_PUBLIC_BASE_URL 폴백이 EC2를 가리키게 되면서 생긴 상황).
 */
export function qrUrlWarning(url) {
  if (!url) return null;
  if (isUnreachableFromPhone(url)) {
    return '이 주소는 이 PC에서만 열립니다. 휴대폰으로 스캔하려면 아래에서 접속 가능한 주소(예: http://192.168.0.10)로 바꿔 주세요.';
  }
  let qrOrigin;
  try {
    qrOrigin = new URL(url).origin;
  } catch {
    return null;
  }
  const here = String(window.location.origin || '');
  if (qrOrigin && here && qrOrigin !== here) {
    return 'QR이 지금 보고 있는 서버가 아니라 ' + qrOrigin + ' 를 가리킵니다. 여기서 발급한 DPP가 그 서버에 없으면 조회되지 않습니다.';
  }
  return null;
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
