import React from 'react';

/*
 * 대시보드 KPI 카드용 2D(플랫) 아이콘 - 2026-09-28 강 요청으로 3D PNG
 * (assets/icons/dash-*.png)를 대체한다. 그림자·그라디언트·하이라이트 없이 단색 면과
 * 선만 쓴다. size만 받고 색은 고정 - 카드마다 의미 색(파랑=DPP/회원, 초록=등록완료,
 * 주황=작성중)을 유지하기 위해서다.
 */

/** 여권(DPP) - 관리자 "등록 DPP 수". */
export function PassportFlatIcon({ size = 48 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <rect x="9" y="5" width="30" height="38" rx="4" fill="#2563EB" />
      <rect x="9" y="5" width="5" height="38" rx="2" fill="#1D4ED8" />
      <circle cx="26.5" cy="21" r="7.5" fill="none" stroke="#fff" strokeWidth="1.8" />
      <ellipse cx="26.5" cy="21" rx="3.2" ry="7.5" fill="none" stroke="#fff" strokeWidth="1.6" />
      <path d="M19 21h15M20.2 17h12.6M20.2 25h12.6" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
      <rect x="19" y="33" width="15" height="2.4" rx="1.2" fill="#BFD3FB" />
    </svg>
  );
}

/** 사용자 - 관리자 "전체 가입자 수". */
export function UsersFlatIcon({ size = 48 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <circle cx="33" cy="17" r="6" fill="#93B8F8" />
      <path d="M22.5 40c0-7 4.7-12 10.5-12S43.5 33 43.5 40Z" fill="#93B8F8" />
      <circle cx="20" cy="15.5" r="8" fill="#2563EB" />
      <path d="M5 42c0-9 6.7-15.5 15-15.5S35 33 35 42Z" fill="#2563EB" />
    </svg>
  );
}

/** 체크리스트+연필 - 제조사 "작성중인 DPP 수". */
export function DraftingFlatIcon({ size = 48 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <rect x="6" y="5" width="28" height="36" rx="4" fill="#FFF4E0" stroke="#F2B45A" strokeWidth="1.6" />
      <path d="M11 14l2.2 2.2L17 12.4M11 23l2.2 2.2L17 21.4M11 32l2.2 2.2L17 30.4" fill="none" stroke="#F08A00" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M20.5 14.5h8M20.5 23.5h8M20.5 32.5h5" stroke="#B9C2D0" strokeWidth="2" strokeLinecap="round" />
      <path d="M39.8 17.2l3 3L30.6 32.4l-4.3 1.3 1.3-4.3Z" fill="#F59E0B" />
      <path d="M38.1 18.9l3 3" stroke="#FFF4E0" strokeWidth="1.4" />
      <path d="M39.8 17.2l1.3-1.3a1.4 1.4 0 0 1 2 0l1 1a1.4 1.4 0 0 1 0 2l-1.3 1.3Z" fill="#EF6B6B" />
    </svg>
  );
}

/** 체크 배지 - 제조사 "등록 DPP 수"(작성 완료). */
export function RegisteredFlatIcon({ size = 48 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true" style={{ display: 'block', flex: 'none' }}>
      <circle cx="24" cy="24" r="19" fill="#16A34A" />
      <path d="M15 24.5l6.2 6.2L33.5 18.4" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
