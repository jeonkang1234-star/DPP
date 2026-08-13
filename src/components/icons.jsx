export function KakaoIcon({ size = 21 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path
        fill="#1B1B1B"
        d="M12 3.4c-4.86 0-8.8 3.06-8.8 6.84 0 2.42 1.62 4.54 4.06 5.75l-.9 3.32c-.09.32.26.58.54.4l3.98-2.63c.36.03.73.05 1.12.05 4.86 0 8.8-3.06 8.8-6.89S16.86 3.4 12 3.4Z"
      />
    </svg>
  );
}

export function NaverIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
      <path fill="#fff" d="M4 3h5.4l5.1 7.6V3H20v18h-5.4L9.5 13.4V21H4V3Z" />
    </svg>
  );
}

export function GoogleIcon({ size = 21 }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
      <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.7-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.3c4.1-3.8 6.6-9.4 6.6-15.6Z" />
      <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.3c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.4 15.4 46 24 46Z" />
      <path fill="#FBBC05" d="M11.5 28.5c-.5-1.4-.7-2.9-.7-4.5s.3-3.1.7-4.5l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 10l7.1-5.5Z" />
      <path fill="#EA4335" d="M24 10.6c4.1 0 6.9 1.8 8.5 3.3l6.2-6C34.9 4.4 29.9 2 24 2 15.4 2 8 6.6 4.4 14l7.1 5.5c1.8-5.3 6.7-8.9 12.5-8.9Z" />
    </svg>
  );
}

export const PROVIDER_ICONS = { kakao: KakaoIcon, naver: NaverIcon, google: GoogleIcon };

export function ScanIcon({ size = 21 }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        d="M3 7.4V4.6A1.6 1.6 0 0 1 4.6 3h2.8M14.6 3h2.8A1.6 1.6 0 0 1 19 4.6v2.8M19 14.6v2.8a1.6 1.6 0 0 1-1.6 1.6h-2.8M7.4 19H4.6A1.6 1.6 0 0 1 3 17.4v-2.8M5.6 11h10.8"
      />
    </svg>
  );
}

export function HistoryIcon({ size = 21 }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" d="M4 5.5h14M4 11h14M4 16.5h9" />
    </svg>
  );
}

export function ProfileIcon({ size = 21 }) {
  return (
    <svg viewBox="0 0 22 22" width={size} height={size} aria-hidden="true">
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        d="M11 11.4a3.6 3.6 0 1 0 0-7.2 3.6 3.6 0 0 0 0 7.2ZM4.4 18.4a6.6 6.6 0 0 1 13.2 0"
      />
    </svg>
  );
}

export const TAB_ICONS = { scan: ScanIcon, history: HistoryIcon, my: ProfileIcon };

export function BackIcon({ size = 17 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M12.3 3.6 6 10l6.3 6.4 1.3-1.3L8.6 10l5-5.1-1.3-1.3Z" />
    </svg>
  );
}

export function ShareIcon({ size = 17 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path fill="currentColor" d="M10 2.4 14 6.4l-1.2 1.2-2-2v7.2H9.2V5.6l-2 2L6 6.4l4-4ZM4 11.4h1.6v4.2h8.8v-4.2H16v5.8H4v-5.8Z" />
    </svg>
  );
}

export function TrashIcon({ size = 16 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path
        fill="currentColor"
        d="M7.5 2.8h5v1.4h4v1.7h-1.3l-.8 10a1.6 1.6 0 0 1-1.6 1.5H7.2a1.6 1.6 0 0 1-1.6-1.5l-.8-10H3.5V4.2h4V2.8Zm-.9 3.1.8 9.8h5.2l.8-9.8H6.6Zm2.1 1.5h1.5v6.6H8.7V7.4Zm2.6 0h1.5v6.6h-1.5V7.4Z"
      />
    </svg>
  );
}

export function SearchIcon({ size = 15 }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-hidden="true">
      <path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M8.8 14.6a5.8 5.8 0 1 0 0-11.6 5.8 5.8 0 0 0 0 11.6Zm4.3-1.5 3.4 3.4" />
    </svg>
  );
}
