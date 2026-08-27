import { describe, expect, it } from 'vitest';
import {
  authCallbackUrl,
  googleOAuthOptions,
  isExpiredAuthLink,
  parseAuthCallbackError,
  resetPasswordUrl,
} from '@/auth/redirects';

describe('redirecionamentos de autenticacao', () => {
  const origin = 'https://myfittrack.example';

  it('inicia Google OAuth com callback do ambiente atual', () => {
    expect(googleOAuthOptions(origin)).toEqual({
      redirectTo: 'https://myfittrack.example/auth/callback',
      scopes: 'openid email profile',
    });
  });

  it('usa callback dedicado para confirmacao e rota separada para reset', () => {
    expect(authCallbackUrl(origin)).toBe('https://myfittrack.example/auth/callback');
    expect(resetPasswordUrl(origin)).toBe('https://myfittrack.example/reset-password');
  });

  it('interpreta token de confirmacao expirado vindo na query', () => {
    const error = parseAuthCallbackError(`${origin}/auth/callback?error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired`);
    expect(error).toEqual({ code: 'otp_expired', description: 'Email link is invalid or has expired' });
    expect(error && isExpiredAuthLink(error)).toBe(true);
  });

  it('interpreta erro no hash e ignora callback sem erro', () => {
    expect(parseAuthCallbackError(`${origin}/auth/callback#error=access_denied&error_description=Invalid+token`)).toEqual({
      code: 'access_denied',
      description: 'Invalid token',
    });
    expect(parseAuthCallbackError(`${origin}/auth/callback#access_token=token`)).toBeNull();
  });
});
