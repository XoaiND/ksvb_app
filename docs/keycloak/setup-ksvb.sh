#!/usr/bin/env bash
# Tạo client + role của KSVB trong Keycloak realm "dev" (cùng realm với HRM). Chạy MỘT lần, an toàn khi chạy lại.
# CHƯA chạy thử trên Keycloak thật — xem kết quả từng bước và sửa nếu phiên bản Keycloak khác cú pháp.
#
# Chạy từ máy có Docker (mật khẩu truyền bằng biến, không ghi vào file):
#   docker exec -i -e KC_ADMIN_USER -e KC_ADMIN_PASSWORD -e WEB_URLS keycloak bash -s < docs/keycloak/setup-ksvb.sh
# Tuỳ chọn: REALM (mặc định dev), KC_SERVER (mặc định http://localhost:8080 — địa chỉ TRONG container),
#           WEB_URLS (redirect URI của giao diện, cách nhau dấu phẩy; mặc định gồm cổng dev 5174 và cổng Docker 3001 của KSVB; 5173/3000 là của HRM).
set -euo pipefail

KCADM=${KCADM:-/opt/keycloak/bin/kcadm.sh}
REALM=${REALM:-dev}
KC_SERVER=${KC_SERVER:-http://localhost:8080}
WEB_URLS=${WEB_URLS:-http://localhost:5174/*,http://127.0.0.1:5174/*,http://localhost:3001/*}
: "${KC_ADMIN_USER:?cần KC_ADMIN_USER}" "${KC_ADMIN_PASSWORD:?cần KC_ADMIN_PASSWORD}"

"$KCADM" config credentials --server "$KC_SERVER" --realm master --user "$KC_ADMIN_USER" --password "$KC_ADMIN_PASSWORD"

client_id() { "$KCADM" get clients -r "$REALM" -q "clientId=$1" --fields id --format csv --noquotes | head -n1; }

# ---- 1) ksvb-api: nơi chứa quyền (client role). Không có đăng nhập người dùng, chỉ dùng service account nếu cần gọi HRM.
API_ID=$(client_id ksvb-api)
if [ -z "$API_ID" ]; then
  "$KCADM" create clients -r "$REALM" -s clientId=ksvb-api -s protocol=openid-connect -s enabled=true \
    -s publicClient=false -s standardFlowEnabled=false -s directAccessGrantsEnabled=false \
    -s serviceAccountsEnabled=true -s 'description=Quyền (client role) của hệ thống Ký số văn bản'
  API_ID=$(client_id ksvb-api)
  echo "đã tạo client ksvb-api ($API_ID)"
fi

role_exists() { "$KCADM" get "clients/$API_ID/roles/$1" -r "$REALM" --fields name >/dev/null 2>&1; }
role_id() { "$KCADM" get "clients/$API_ID/roles/$1" -r "$REALM" --fields id --format csv --noquotes; }

# ---- 2) Quyền chi tiết (khớp backend/.../shared/security/Permissions.java và docs/PHAN_QUYEN.md)
for r in document.create document.sign document.view.all report.view user.manage audit.view config.manage cert.manage system.monitor; do
  role_exists "$r" || { "$KCADM" create "clients/$API_ID/roles" -r "$REALM" -s "name=$r"; echo "đã tạo quyền $r"; }
done

# ---- 3) Role tổng hợp (composite)
composite() { # composite <tên> <quyền...>
  local name=$1; shift
  role_exists "$name" || "$KCADM" create "clients/$API_ID/roles" -r "$REALM" -s "name=$name" -s composite=true
  local body="["; local first=1
  for p in "$@"; do
    [ $first -eq 1 ] || body+=","; first=0
    body+="{\"id\":\"$(role_id "$p")\",\"name\":\"$p\"}"
  done
  body+="]"
  echo "$body" | "$KCADM" create "clients/$API_ID/roles/$name/composites" -r "$REALM" -f - 2>/dev/null || true
  echo "role tổng hợp $name: $*"
}
composite role.user   document.create document.sign
composite role.leader document.create document.sign document.view.all report.view
composite role.admin  document.create document.sign document.view.all report.view user.manage audit.view config.manage cert.manage system.monitor

# ---- 4) ksvb-web: giao diện (public, Authorization Code + PKCE)
WEB_ID=$(client_id ksvb-web)
if [ -z "$WEB_ID" ]; then
  IFS=',' read -ra URLS <<< "$WEB_URLS"
  URI_JSON=$(printf '"%s",' "${URLS[@]}"); URI_JSON="[${URI_JSON%,}]"
  ORIGIN_JSON=$(printf '"%s",' "${URLS[@]%/\*}"); ORIGIN_JSON="[${ORIGIN_JSON%,}]"
  "$KCADM" create clients -r "$REALM" -s clientId=ksvb-web -s protocol=openid-connect -s enabled=true \
    -s publicClient=true -s standardFlowEnabled=true -s directAccessGrantsEnabled=false \
    -s "redirectUris=$URI_JSON" -s "webOrigins=$ORIGIN_JSON" -s 'attributes."pkce.code.challenge.method"=S256'
  WEB_ID=$(client_id ksvb-web)
  echo "đã tạo client ksvb-web ($WEB_ID)"

  # audience: access token phải có aud=ksvb-api (backend kiểm tra audience)
  "$KCADM" create "clients/$WEB_ID/protocol-mappers/models" -r "$REALM" -s name=audience-ksvb-api \
    -s protocol=openid-connect -s protocolMapper=oidc-audience-mapper \
    -s 'config."included.client.audience"=ksvb-api' -s 'config."access.token.claim"=true' -s 'config."id.token.claim"=false'

  # thông tin nhân sự do HRM đồng bộ vào thuộc tính người dùng → claim trong token (giống /api/me của HRM)
  for a in employee_code unit_code position_code; do
    "$KCADM" create "clients/$WEB_ID/protocol-mappers/models" -r "$REALM" -s "name=$a" \
      -s protocol=openid-connect -s protocolMapper=oidc-usermodel-attribute-mapper \
      -s "config.\"user.attribute\"=$a" -s "config.\"claim.name\"=$a" -s 'config."jsonType.label"=String' \
      -s 'config."access.token.claim"=true' -s 'config."id.token.claim"=true' -s 'config."userinfo.token.claim"=true'
  done
fi

echo "Xong. Việc còn lại thủ công: gán role.user / role.leader / role.admin (tab Role mapping → client ksvb-api) cho người dùng."
