# Build nhiều tầng; chạy bằng user không phải root, có HEALTHCHECK; cấu hình chỉ qua biến môi trường (KSVB_*).
FROM maven:3.9-eclipse-temurin-25 AS build
WORKDIR /src
COPY pom.xml .
RUN mvn -q -B dependency:go-offline
COPY src ./src
RUN mvn -q -B package -DskipTests

FROM eclipse-temurin:25-jre
WORKDIR /app
RUN groupadd --system --gid 10001 ksvb && useradd --system --uid 10001 --gid ksvb --no-create-home ksvb \
    && mkdir -p /app/data && chown -R ksvb:ksvb /app/data
COPY --from=build --chown=ksvb:ksvb /src/target/ksvb-backend-*.jar app.jar
USER ksvb
ENV TZ=Asia/Ho_Chi_Minh JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=75"
EXPOSE 8082
# Sống = /actuator/health/liveness trả UP (không cần curl: dùng /dev/tcp của bash)
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/${KSVB_SERVER_PORT:-8082} && printf "GET /actuator/health/liveness HTTP/1.0\r\nHost: localhost\r\n\r\n" >&3 && grep -q "\"UP\"" <&3'
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
