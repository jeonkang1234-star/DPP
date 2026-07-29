# 저장소 경로: FE/Dockerfile 로 저장하세요.
# 멀티스테이지 빌드: Vite로 정적 파일 빌드 → nginx로 서빙 + 백엔드 리버스 프록시

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
