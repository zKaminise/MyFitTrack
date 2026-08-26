// Usuario atual em memoria — usado pelos repositorios para isolar dados por conta.
// Definido pelo authStore ao autenticar/deslogar.
let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null): void {
  currentUserId = id;
}

export function getCurrentUserId(): string | null {
  return currentUserId;
}

export function requireUserId(): string {
  if (!currentUserId) throw new Error('Nenhum usuario autenticado');
  return currentUserId;
}
