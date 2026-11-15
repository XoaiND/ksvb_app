FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Địa chỉ Keycloak là địa chỉ TRÌNH DUYỆT truy cập (không phải tên container). Nhúng vào bản build.
ARG VITE_KEYCLOAK_URL=https://sso.xoaind.io.vn
ARG VITE_KEYCLOAK_REALM=dev
ARG VITE_KEYCLOAK_CLIENT_ID=ksvb-web
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL \
    VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM \
    VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
RUN npm run build

# nginx chạy bằng user không phải root (uid 101), nghe cổng 8080 (ECOSYSTEM.md 12.5)
FROM nginxinc/nginx-unprivileged:stable-alpine
COPY nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
