import Keycloak from 'keycloak-js';

/**
 * Đăng nhập Keycloak (Authorization Code + PKCE), realm `dev` dùng chung mọi app (docs/kien-truc-chuan.md mục 4).
 * VITE_AUTH_DISABLED=true: bỏ qua đăng nhập (chỉ dev/test; backend phải tắt bảo mật) và gửi header
 * X-User-Id = VITE_DEV_USER_ID để backend biết người đang thao tác.
 */
export const authDisabled = import.meta.env.VITE_AUTH_DISABLED === 'true';

/** Người dùng giả khi tắt đăng nhập (header X-User-Id). */
export const devUserId: string = import.meta.env.VITE_DEV_USER_ID ?? '1';

const keycloak = authDisabled
  ? null
  : new Keycloak({
      url: import.meta.env.VITE_KEYCLOAK_URL,
      realm: import.meta.env.VITE_KEYCLOAK_REALM,
      clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
    });

/** Đăng nhập (chuyển sang Keycloak nếu chưa có phiên). Trả về false nếu không đăng nhập được. */
export async function initAuth(): Promise<boolean> {
  if (!keycloak) return true;
  const ok = await keycloak.init({ onLoad: 'login-required', pkceMethod: 'S256', checkLoginIframe: false });
  // tự làm mới token trước khi hết hạn
  setInterval(() => {
    keycloak.updateToken(60).catch(() => keycloak.login());
  }, 30_000);
  return ok;
}

/** Access token hợp lệ (làm mới nếu sắp hết hạn). */
export async function getToken(): Promise<string | undefined> {
  if (!keycloak) return undefined;
  try {
    await keycloak.updateToken(30);
  } catch {
    await keycloak.login();
  }
  return keycloak.token;
}

export function login() {
  keycloak?.login();
}

export function logout() {
  keycloak?.logout({ redirectUri: window.location.origin });
}
