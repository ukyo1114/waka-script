const ACCESS_TOKEN_KEY = "jinro.accessToken";
/** 旧実装の残骸を掃除（refresh は Cookie へ移行済み） */
const LEGACY_REFRESH_TOKEN_KEY = "jinro.refreshToken";

if (typeof localStorage !== "undefined") {
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function saveAccessToken(accessToken: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(LEGACY_REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}
