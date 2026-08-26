// Logica de matching entre a nossa biblioteca (pt-BR) e o free-exercise-db (en).
// Pura e sem dependencias, compartilhada pelo script de enriquecimento e testes.

export function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set(['the', 'a', 'an', 'with', 'and', 'of', 'to', 'on', 'grip', 'medium', 'over', 'bench']);

export function tokens(s) {
  return normalize(s)
    .split(' ')
    .filter((t) => t && !STOP.has(t));
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  if (sa.size === 0 || sb.size === 0) return 0;
  let inter = 0;
  for (const t of sa) if (sb.has(t)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return inter / union;
}

// Equipamento nosso -> equipamento free-exercise-db.
const EQUIP_MAP = {
  maquina: 'machine',
  barra: 'barbell',
  halteres: 'dumbbell',
  polia: 'cable',
  smith: 'machine',
  'peso-corporal': 'body only',
  elastico: 'bands',
  kettlebell: 'kettlebells',
  banco: 'body only',
  'sem-equipamento': 'body only',
};

// Musculo free-exercise-db -> nosso grupo (subconjunto usado no bonus).
const EXT_TO_OUR = {
  chest: 'peito',
  triceps: 'triceps',
  biceps: 'biceps',
  shoulders: 'ombros',
  quadriceps: 'quadriceps',
  hamstrings: 'posterior',
  glutes: 'gluteos',
  calves: 'panturrilha',
  abdominals: 'abdomen',
  lats: 'costas',
  'middle back': 'costas',
  'lower back': 'lombar',
  traps: 'trapezio',
  forearms: 'antebraco',
  abductors: 'gluteos',
  adductors: 'gluteos',
  neck: 'trapezio',
};

/** Pontua um candidato do free-exercise-db para um exercicio nosso (0..1). */
export function scoreCandidate(our, fedb) {
  const terms = [our.en, our.name, ...(our.aliases || [])];
  const fedbTokens = tokens(fedb.name);
  let nameScore = 0;
  for (const term of terms) {
    nameScore = Math.max(nameScore, jaccard(tokens(term), fedbTokens));
    if (normalize(term) === normalize(fedb.name)) nameScore = 1;
  }

  let score = 0.7 * nameScore;

  // Bonus/penalidade de equipamento.
  const wantEquip = EQUIP_MAP[our.equipment];
  if (fedb.equipment && wantEquip) {
    if (fedb.equipment === wantEquip) score += 0.18;
    else score -= 0.08;
  }

  // Bonus de musculo primario.
  const fedbPrimary = (fedb.primaryMuscles || []).map((m) => EXT_TO_OUR[m]).filter(Boolean);
  if (fedbPrimary.includes(our.primaryMuscle)) score += 0.15;

  return Math.max(0, Math.min(1, score));
}

/** Retorna candidatos ordenados por score desc. */
export function rankCandidates(our, fedbList, limit = 4) {
  return fedbList
    .map((fedb) => ({ fedb, score: scoreCandidate(our, fedb) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export const MATCH_THRESHOLD = 0.68;
export const AMBIGUOUS_MIN = 0.45;
export const LEAD_MARGIN = 0.1;

/** Classifica: matched | ambiguous | unmatched, com candidatos. */
export function classifyMatch(our, fedbList) {
  const ranked = rankCandidates(our, fedbList);
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.score < AMBIGUOUS_MIN) {
    return { status: 'unmatched', candidates: ranked };
  }
  const lead = top.score - (second ? second.score : 0);
  if (top.score >= MATCH_THRESHOLD && lead >= LEAD_MARGIN) {
    return { status: 'matched', match: top.fedb, confidence: top.score, candidates: ranked };
  }
  return { status: 'ambiguous', candidates: ranked };
}
