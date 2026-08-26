export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_in_use'
  | 'weak_password'
  | 'invalid_email'
  | 'user_not_found'
  | 'reset_unavailable_local'
  | 'delete_needs_backend'
  | 'google_unavailable'
  | 'needs_email_confirm'
  | 'unknown';

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message?: string) {
    super(message ?? code);
    this.code = code;
    this.name = 'AuthError';
  }
}

export interface SignUpResult {
  user: AuthUser | null;
  needsEmailConfirm: boolean;
}

export interface AuthProvider {
  mode: 'supabase' | 'local';
  supportsGoogle: boolean;
  getCurrentUser(): Promise<AuthUser | null>;
  signUp(name: string, email: string, password: string): Promise<SignUpResult>;
  signIn(email: string, password: string): Promise<AuthUser>;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  resetPassword(email: string): Promise<void>;
  resendConfirmation(email: string): Promise<void>;
  updateName(name: string): Promise<AuthUser>;
  changePassword(current: string, next: string): Promise<void>;
  deleteAccount(): Promise<void>;
  /** Observa mudancas de sessao. Retorna funcao de unsubscribe. */
  onChange(cb: (user: AuthUser | null) => void): () => void;
}

/** Mensagens amigaveis em pt-BR para cada codigo de erro. */
export function authErrorMessage(err: unknown): string {
  const code = err instanceof AuthError ? err.code : 'unknown';
  switch (code) {
    case 'invalid_credentials':
      return 'E-mail ou senha incorretos.';
    case 'email_in_use':
      return 'Este e-mail ja esta cadastrado.';
    case 'weak_password':
      return 'A senha deve ter pelo menos 6 caracteres.';
    case 'invalid_email':
      return 'Informe um e-mail valido.';
    case 'user_not_found':
      return 'Nao encontramos uma conta com este e-mail.';
    case 'reset_unavailable_local':
      return 'Recuperacao por e-mail requer a nuvem (Supabase). No modo local, crie uma nova conta.';
    case 'delete_needs_backend':
      return 'Nao foi possivel excluir sua conta agora. Seus dados continuam seguros e nada foi apagado.';
    case 'google_unavailable':
      return 'Login com Google ainda nao esta disponivel.';
    case 'needs_email_confirm':
      return 'Verifique seu e-mail para confirmar a conta.';
    default:
      return 'Nao foi possivel concluir. Tente novamente.';
  }
}
