var _a, _b;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 로컬 백엔드 포트: 기본은 8080 (docker-compose.yml 기본값, 팀원들 대부분 이대로 됨).
// 일부 Windows/Docker Desktop 환경에서 호스트 8080 바인딩이 간헐적으로 끊기는 문제가 있어서,
// 그럴 때만 터미널에서 `$env:VITE_BACKEND_PORT=18080` 잡고 npm run dev 하면 됨
// (docker-compose.override.yml로 18080도 같이 열어둔 경우). 커밋되는 기본값은 그대로 8080.
var backendPort = ((_b = (_a = globalThis.process) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b.VITE_BACKEND_PORT) || "8080";
export default defineConfig({
    plugins: [react()],
    server: {
        port: 5173,
        proxy: {
            "/api": {
                target: "http://localhost:".concat(backendPort),
                changeOrigin: true,
            },
            "/auth": {
                target: "http://localhost:".concat(backendPort),
                changeOrigin: true,
            },
            // com.dpp.mypage.controller.AdminOrganizationController - 관리자 가입승인
            // (2026-08-16). 참고: /me, /document, /notifications는 이 dev proxy에 원래부터
            // 없었다(운영은 nginx.conf가 대신 프록시) - 기존 범위 밖이라 같이 안 건드림, dev
            // 서버로 관리자 화면을 테스트하려면 이것도 추가해야 함을 기록.
            "/admin": {
                target: "http://localhost:".concat(backendPort),
                changeOrigin: true,
            },
            // com.dpp.verify.controller.DppRegistryController - EU 시장감시/관세청 DPP 검색.
            "/verify": {
                target: "http://localhost:".concat(backendPort),
                changeOrigin: true,
            },
            // com.dpp.customs.controller.CustomsClearanceController - 2026-08-19 통관 기능
            // 추가 당시 여기 반영이 누락됐던 걸 감사 로그 작업 중 발견해서 같이 고침.
            "/customs": {
                target: "http://localhost:".concat(backendPort),
                changeOrigin: true,
            },
            // com.dpp.audit.controller.AuditLogController - EU 시장감시 감사 로그 조회.
            "/audit-log": {
                target: "http://localhost:".concat(backendPort),
                changeOrigin: true,
            },
            "/public": {
                target: "http://localhost:".concat(backendPort),
                changeOrigin: true,
            },
        },
    },
});
