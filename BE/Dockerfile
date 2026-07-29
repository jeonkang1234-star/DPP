# 저장소 경로: BE/Dockerfile 로 저장하세요.
# 멀티스테이지 빌드: Gradle로 jar 빌드 → 가벼운 JRE 이미지로 실행

FROM eclipse-temurin:17-jdk-jammy AS build
WORKDIR /workspace

# 의존성 캐시 레이어 분리 (소스 변경만으로 매번 전체 재다운로드 안 하도록)
COPY gradlew .
COPY gradle gradle
COPY build.gradle settings.gradle ./
RUN chmod +x gradlew

COPY src src
RUN ./gradlew build -x test --no-daemon

FROM eclipse-temurin:17-jre-jammy
WORKDIR /app
RUN useradd -r -u 1001 spring
COPY --from=build /workspace/build/libs/*-SNAPSHOT.jar app.jar
RUN chown spring:spring app.jar
USER spring

EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
