var _a, _b;
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// 로컬 백엔드 포트: 기본은 8080 (docker-compose.yml 기본값, 팀원들 대부분 이대로 됨).
// 일부 Windows/Docker Desktop 환경에서 호스트 8080 바인딩이 간헐적으로 끊기는 문제가 있어서,
// 그럴 때만 터미널에서 `$env:VITE_BACKEND_PORT=18080` 잡고 npm run dev 하면 됨
// (docker-compose.override.yml로 18080도 같이 열어둔 경우). 커밋되는 기본값은 그대로 8080.
var backendPort = ((_b = (_a = globalThis.process) === null || _a === void 0 ? void 0 : _a.env) === null || _b === void 0 ? void 0 : _b.VITE_BACKEND_PORT) || "8080";
// 브라우저 주소창 이동·새로고침을 API 프록시가 가로채지 않게 한다.
// 운영(nginx)에서 겪은 것과 같은 함정 - /admin/dashboard 같은 프론트 라우트가 /admin 프록시에
// 먼저 잡혀서 F5를 누르면 401 JSON이 화면에 그려진다. Accept에 text/html이 있으면(=문서 요청)
// 프록시를 건너뛰고 vite가 index.html을 주도록 되돌린다. fetch/XHR은 */*로 나가서 안 걸린다.
function spaBypass(req) {
    var accept = req.headers && req.headers.accept;
    if (accept && accept.indexOf("text/html") !== -1) {
        return "/index.html";
    }
}

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
                bypass: spaBypass,
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
                bypass: spaBypass,
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
