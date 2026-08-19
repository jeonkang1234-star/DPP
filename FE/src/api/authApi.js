/**
 * 실제 인증 API 연동.
 *
 * mockApi.js와 분리한 이유: 저긴 화면 데이터(BASE_URL=/api)고, 여긴 인증(/auth)이라
 * 경로 prefix 자체가 다름. vite.config.ts(dev)와 nginx.conf(운영) 둘 다 /auth를
 * 백엔드로 프록시하도록 이미 맞춰져 있어서, 여기서는 그냥 상대경로로 호출한다.
 */

async function handleResponse(res) {
  if (!res.ok) {
    let message = '요청을 처리하지 못했습니다.';
    try {
      const data = await res.json();
      if (data && data.message) message = data.message;
    } catch {
      /* 본문이 없는 에러 응답(204 등)은 무시 */
    }
    const err = new Error(message);
    err.status = res.status;
    throw err;
  }

  if (res.status === 204 || res.status === 202) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return handleResponse(res);
}

/**
 * "data"(JSON) part + 파일 part(들)를 함께 보내는 multipart/form-data POST.
 * 사업자등록증처럼 JSON 필드와 파일을 같이 제출해야 하는 엔드포인트용
 * (completeBusinessSignup, 2026-08-19 강 요청 - 가입 시 사업자등록증 업로드 필수화).
 */
async function postMultipart(path, jsonPart, files) {
  const form = new FormData();
  form.append('data', new Blob([JSON.stringify(jsonPart)], { type: 'application/json' }));
  Object.entries(files || {}).forEach(([key, file]) => {
    if (file) form.append(key, file);
  });
  const res = await fetch(path, { method: 'POST', body: form });
  return handleResponse(res);
}

/** 이메일+비밀번호 로그인 (BUSINESS/ADMIN 전용). 성공 시 {accessToken, refreshToken, tokenType, accountType, email, displayName}. */
export function login(email, password) {
  return postJson('/auth/login', { email, password });
}

/** 기업 회원가입 1단계 - 이메일로 6자리 인증코드 발급. */
export function requestBusinessSignupCode(email) {
  return postJson('/auth/signup/business/email/code', { email });
}

/** 기업 회원가입 2단계 - 인증코드 검증. */
export function verifyBusinessSignupCode(email, code) {
  return postJson('/auth/signup/business/email/verify', { email, code });
}

/** 기업 회원가입 - 전화번호로 6자리 인증코드 발급. */
export function requestBusinessSignupPhoneCode(phone) {
  return postJson('/auth/signup/business/phone/code', { phone });
}

/** 기업 회원가입 - 전화번호 인증코드 검증. */
export function verifyBusinessSignupPhoneCode(phone, code) {
  return postJson('/auth/signup/business/phone/verify', { phone, code });
}

/**
 * 기업 회원가입 마지막 단계 - 계정 생성. 이메일·전화번호 인증이 둘 다 끝난 상태여야 통과한다.
 * multipart/form-data로 보낸다("data" part=JSON, "bizRegCert" part=사업자등록증 파일) -
 * 2026-08-19 강 요청으로 체크섬 단독 자동승인 대신 문서 형식·데이터 확인을 쓰게 되면서
 * 파일 업로드가 필요해짐. domain은 제조사/협력사만 값이 있고, orgTypeHint는 세관/시장감독기관
 * ('CUSTOMS'/'EU_AUTHORITY')만 값이 있다 - 둘은 상호 배타적(useAppLogic.submitSignup 참고).
 */
export function completeBusinessSignup({ email, password, companyName, businessRegNo, country, domain, orgTypeHint, phone, bizRegCert }) {
  return postMultipart(
    '/auth/signup/business',
    { email, password, companyName, businessRegNo, country, domain, orgTypeHint, phone },
    { bizRegCert },
  );
}

/**
 * SNS 로그인 페이지로 이동. AJAX가 아니라 브라우저 자체를 리다이렉트시켜야 하므로
 * 함수가 값을 반환하는 게 아니라 location을 직접 바꾼다.
 */
export function goToSnsLogin(provider) {
  window.location.href = `/auth/sns/${provider}/login`;
}

/**
 * SNS 콜백(BE가 /?sns_access=...&sns_refresh=... 또는 /?sns_error=...로 리다이렉트시킨 것)을 처리.
 * 성공하면 {accessToken, refreshToken}, 실패하면 {error}를 반환하고 URL에서 파라미터를 지운다.
 * 둘 다 없으면(SNS 콜백이 아니면) null.
 */
export function consumeSnsCallback() {
  const params = new URLSearchParams(window.location.search);
  const accessToken = params.get('sns_access');
  const refreshToken = params.get('sns_refresh');
  const error = params.get('sns_error');
  if (!accessToken && !error) return null;

  params.delete('sns_access');
  params.delete('sns_refresh');
  params.delete('sns_error');
  const cleanQuery = params.toString();
  const cleanUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '') + window.location.hash;
  window.history.replaceState({}, '', cleanUrl);

  if (error) return { error };
  return { accessToken, refreshToken, tokenType: 'bearer', accountType: 'PERSONAL' };
}
