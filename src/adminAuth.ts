/**
 * Reads the CF_Authorization cookie set by Cloudflare Access after Zero Trust login.
 * This is forwarded as the cf-access-jwt-assertion header on every admin API call.
 * Running locally (no Zero Trust) -> returns null -> worker rejects with 401.
 */
export function getCFAccessToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find((c) => c.startsWith('CF_Authorization='));
  return match ? match.split('=').slice(1).join('=') : null;
}

/** Returns headers for an admin API call. Throws if no CF Access token is found. */
export function adminHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getCFAccessToken();
  if (!token) {
    throw new Error('No Cloudflare Access token found. Are you logged in via Zero Trust?');
  }
  return {
    'Content-Type': 'application/json',
    'cf-access-jwt-assertion': token,
    ...extra,
  };
}
