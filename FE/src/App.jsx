import React from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAppLogic } from './useAppLogic.js';
import AppView from './AppView.jsx';
import { DEFAULT_PATH, ROUTES } from './routes.js';

/**
 * IEUM Digital Product Passport
 *
 * URL 이 화면을 결정합니다. 경로 목록은 src/routes.js 에 있습니다.
 *   /login, /signup
 *   /admin/dashboard, /admin/approvals, /admin/tier-reviews, /admin/documents
 *   /steel|battery|textile/{dashboard,input,partners,products,my-page}
 *   /market-surveillance/{registry,audit-log}
 *   /customs/clearance
 *   /me/{history,passport,account}
 */

function Screen() {
  const vals = useAppLogic();

  if (vals.loadError) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#C22B2B', fontSize: 15 }}>
        데이터를 불러오지 못했습니다.
      </div>
    );
  }

  if (vals.loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#8494AC', fontSize: 14 }}>
        불러오는 중…
      </div>
    );
  }

  return <AppView {...vals} />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/*
          "/"는 그냥 /login으로 무조건 리다이렉트하면 안 된다 — SNS 로그인 콜백이
          "/?sns_access=...&sns_refresh=..." 형태로 여기로 돌아오는데, <Navigate>는
          쿼리스트링을 읽지도 않고 즉시 이동시켜버려서 useAppLogic()이 토큰을 소비할
          기회 자체가 없었다 (DB엔 계정이 생겼는데 화면은 로그인 화면에 머무는 버그의 원인).
          그래서 "/"도 Screen을 그대로 렌더링해서 useAppLogic이 먼저 콜백을 처리하게 하고,
          세션이 진짜 없을 때만 그 안에서 /login으로 보내도록 한다.
        */}
        <Route path="/" element={<Screen />} />
        {ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={<Screen />} />
        ))}
        <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
