# 저장소 경로: BE/Dockerfile 로 저장하세요.
# 멀티스테이지 빌드: Gradle로 jar 빌드 → 가벼운 JRE 이미지로 실행

FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace

# 의존성 캐시 레이어 분리 (소스 변경만으로 매번 전체 재다운로드 안 하도록)
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
# Windows에서 체크아웃하면 gradlew가 CRLF로 바뀌어 있을 수 있어 셔뱅(#!/bin/sh)이 깨짐.
# .gitattributes로 막아뒀지만, 혹시 모를 경우를 대비해 빌드 단계에서도 방어적으로 정규화.
RUN sed -i 's/\r$//' gradlew && chmod +x gradlew

COPY src src
# Gradle 배포판·Maven 의존성을 BuildKit 캐시에 남긴다(2026-09-23). 캐시가 없으면 소스만 바꿔도
# 매번 수백 개를 새로 받아야 해서, 네트워크가 한 번만 끊겨도 빌드 전체가 실패했다.
# 캐시가 있으면 실패 전까지 받은 파일은 남으므로 재시도할수록 진행된다.
RUN --mount=type=cache,target=/root/.gradle ./gradlew build -x test --no-daemon

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN useradd -r -u 1001 spring
COPY --from=build /workspace/build/libs/*-SNAPSHOT.jar app.jar
RUN chown spring:spring app.jar
USER spring

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
