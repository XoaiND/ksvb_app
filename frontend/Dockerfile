# Build nhiều tầng; nginx chạy bằng user không phải root (nginx-unprivileged, uid 101), có HEALTHCHECK.
FROM node:24-alpine AS build
WORKDIR /src
COPY package*.json ./
RUN npm ci
COPY . .
# Địa chỉ Keycloak là địa chỉ TRÌNH DUYỆT truy cập (không phải tên container). Nhúng vào bản build.
ARG VITE_KEYCLOAK_URL=https://sso.xoaind.io.vn
ARG VITE_KEYCLOAK_REALM=dev
ARG VITE_KEYCLOAK_CLIENT_ID=ksvb-web
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /src/dist /usr/share/nginx/html
# Nghe 8080 (user không phải root không bind được cổng < 1024 khi không đặt sysctl); compose map 3001:8080.
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
