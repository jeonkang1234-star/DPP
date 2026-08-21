# 저장소 경로: FE/Dockerfile 로 저장하세요.
# 멀티스테이지 빌드: Vite로 정적 파일 빌드 → nginx로 서빙 + 백엔드 리버스 프록시

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# QR에 넣을 공개 주소. 비워두면 브라우저가 접속한 origin을 그대로 쓴다(로컬에서
# http://localhost 로 열면 QR도 localhost가 되어 휴대폰에서 안 열린다 - 그럴 땐
# 여기에 PC의 LAN 주소를 넣거나, QR 모달의 "공개 주소 변경"으로 바꾸면 된다).
#   docker compose build --build-arg VITE_PUBLIC_BASE_URL=http://192.168.0.10 frontend
ARG VITE_PUBLIC_BASE_URL=""
ENV VITE_PUBLIC_BASE_URL=$VITE_PUBLIC_BASE_URL
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
