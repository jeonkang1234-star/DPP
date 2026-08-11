import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// 로컬 백엔드 포트: 기본은 8080 (docker-compose.yml 기본값, 팀원들 대부분 이대로 됨).
// 일부 Windows/Docker Desktop 환경에서 호스트 8080 바인딩이 간헐적으로 끊기는 문제가 있어서,
// 그럴 때만 터미널에서 `$env:VITE_BACKEND_PORT=18080` 잡고 npm run dev 하면 됨
// (docker-compose.override.yml로 18080도 같이 열어둔 경우). 커밋되는 기본값은 그대로 8080.
const backendPort = (globalThis as any).process?.env?.VITE_BACKEND_PORT || "8080";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
      "/auth": {
        target: `http://localhost:${backendPort}`,
        changeOrigin: true,
      },
    },
  },
});
