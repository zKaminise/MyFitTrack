// Hashing de senha para contas locais (fallback sem Supabase). PBKDF2-SHA256.
// Nunca armazena a senha em texto puro; nunca loga senha/hash.

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function randomSaltHex(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return [...arr].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function derive(password: string, saltHex: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = Uint8Array.from(saltHex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100_000, hash: 'SHA-256' },
    keyMaterial,
    256,
  );
  return toHex(bits);
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomSaltHex();
  const hash = await derive(password, salt);
  return { hash, salt };
}

export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  const computed = await derive(password, salt);
  // Comparacao de tempo aproximadamente constante.
  if (computed.length !== hash.length) return false;
  let diff = 0;
  for (let i = 0; i < computed.length; i++) diff |= computed.charCodeAt(i) ^ hash.charCodeAt(i);
  return diff === 0;
}
