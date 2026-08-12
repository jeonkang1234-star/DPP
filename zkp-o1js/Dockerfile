# zkp-o1js를 HTTP 서비스로 감싼 이미지. Spring Boot BE(com.dpp.document)가 호출한다.
FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY circuits.mjs server.mjs ./

EXPOSE 4001

# SteelMillCheck.compile()이 기동 시 10~15초 걸린다 - healthcheck의 start_period를
# docker-compose에서 넉넉히 잡을 것.
CMD ["node", "server.mjs"]
