
# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
=======
# DPP Platform

Digital Product Passport 플랫폼. Backend(Spring Boot) + Frontend(React/TS) 모노레포.

## 구조

```
dpp-platform/
├── .github/workflows/   # CI
├── docker/              # 로컬 개발용 docker-compose (Postgres)
├── docs/                # 요구사항, ERD, API 명세
├── BE/                  # Spring Boot 백엔드
└── FE/                  # React + TypeScript 프론트엔드
```

## 시작하기

### 1. 클론

```bash
git clone https://github.com/jeonkang1234-star/DPP.git
cd DPP
```

### 2. 로컬 DB 실행 (Postgres)

```bash
cd docker
docker compose up -d
```

### 3. 백엔드 실행

```bash
cd BE
./gradlew bootRun
```

기본 포트: `8080`. `BE/src/main/resources/application.yml`에서 DB 접속 정보 확인.

### 4. 프론트엔드 실행

```bash
cd FE
npm install
npm run dev
```

기본 포트: `5173`.

## 담당

| 영역 | 담당 |
|---|---|
| BE / 인프라 / DB | 강 |
| FE | 민영 |
| ERD / 요구사항 문서 | 범서 |

## API 계약

BE-FE 간 API 스펙은 `docs/api-spec/openapi.yaml`에서 관리합니다. 스펙 변경 시 PR로 리뷰 후 머지하세요.
