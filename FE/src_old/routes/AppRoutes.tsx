import { Routes, Route, Navigate } from "react-router-dom";

// 1. 로그인/가입
// import LoginPage from "../pages/auth/LoginPage";
// 2. 대시보드
// import DashboardPage from "../pages/dashboard/DashboardPage";
// 3. DPP 목록/상세
// 4. 문서관리
// 5. 알림센터
// 6. 마이페이지
// 7. 데이터입력폼
// 8. 검증·규정준수
// 9. 순환·재활용
// 10. 세관 모바일통관
// 11. 운영관리
// 12. QR조회

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      {/* 각 담당 페이지 완성되면 여기에 라우트 추가 */}
    </Routes>
  );
}
