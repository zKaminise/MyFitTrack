export const AUTH_CALLBACK_PATH = '/auth/callback';
export const RESET_PASSWORD_PATH = '/reset-password';

export function authCallbackUrl(origin = window.location.origin): string {
  return `${origin}${AUTH_CALLBACK_PATH}`;
}

export function resetPasswordUrl(origin = window.location.origin): string {
  return `${origin}${RESET_PASSWORD_PATH}`;
}

export function googleOAuthOptions(origin = window.location.origin) {
  return {
    redirectTo: authCallbackUrl(origin),
    scopes: 'openid email profile',
  } as const;
}

export interface AuthCallbackError {
  code: string;
  description: string;
}

/** Le erros retornados pelo Supabase tanto na query quanto no hash implicit. */
export function parseAuthCallbackError(url: string): AuthCallbackError | null {
  const parsed = new URL(url, 'http://localhost');
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  const code = parsed.searchParams.get('error_code')
    ?? parsed.searchParams.get('error')
    ?? hash.get('error_code')
    ?? hash.get('error');
  if (!code) return null;
  const description = parsed.searchParams.get('error_description')
    ?? hash.get('error_description')
    ?? 'O link nao pode ser validado.';
  return { code, description: description.replace(/\+/g, ' ') };
}

export function isExpiredAuthLink(error: AuthCallbackError): boolean {
  const value = `${error.code} ${error.description}`.toLowerCase();
  return value.includes('expired') || value.includes('otp_expired');
}
