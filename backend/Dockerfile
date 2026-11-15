# Build nhiều tầng; chạy bằng user không phải root; có HEALTHCHECK (ECOSYSTEM.md 12.5). Cấu hình chỉ qua biến môi trường.
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src src
RUN mvn -q -B -DskipTests package

FROM eclipse-temurin:25-jre
# curl chỉ để HEALTHCHECK gọi /actuator/health/readiness
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --system --create-home --uid 10001 ksvb \
    && mkdir -p /app/data/upload && chown -R ksvb /app
WORKDIR /app
COPY --from=build /src/target/ksvb-be-*.jar app.jar
USER 10001
ENV TZ=Asia/Ho_Chi_Minh \
    SPRING_PROFILES_ACTIVE=prod \
    JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8082
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8082/actuator/health/readiness || exit 1
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
