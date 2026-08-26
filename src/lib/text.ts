// Normaliza texto para busca: minusculo e sem acentos (remove diacriticos).
const DIACRITICS = new RegExp('[\\u0300-\\u036f]', 'g');

export function normalizeText(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(DIACRITICS, '');
}
