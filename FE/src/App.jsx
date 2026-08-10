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
        <Route path="/" element={<Navigate to={DEFAULT_PATH} replace />} />
        {ROUTES.map((r) => (
          <Route key={r.path} path={r.path} element={<Screen />} />
        ))}
        <Route path="*" element={<Navigate to={DEFAULT_PATH} replace />} />
      </Routes>
    </BrowserRouter>
  );
}
