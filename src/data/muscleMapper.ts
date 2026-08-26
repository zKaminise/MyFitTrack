// Mapeamento centralizado de nomes musculares.
// - Nossos MuscleGroup (pt-BR) -> musculos do react-body-highlighter (body map).
// - Vocabulario externo (free-exercise-db / ExerciseDB) -> nossos MuscleGroup.
//
// Isso evita espalhar conversoes pelo codigo. O body map funciona 100% offline,
// derivado apenas dos nossos proprios dados de exercicio.
import type { Muscle } from 'react-body-highlighter';
import type { MuscleGroup } from '@/domain/types';

export type BodyMuscle = Muscle;

/**
 * Nossos grupos -> musculos do body map. Alguns grupos nao possuem
 * granularidade equivalente no componente e sao aproximados (ver LIMITACOES).
 */
const OUR_TO_BODY: Record<MuscleGroup, BodyMuscle[]> = {
  peito: ['chest'],
  costas: ['upper-back'], // lats/dorsal aproximado para upper-back
  quadriceps: ['quadriceps'],
  posterior: ['hamstring'],
  gluteos: ['gluteal'],
  ombros: ['front-deltoids'], // sem deltoide lateral no componente (ver LIMITACOES)
  biceps: ['biceps'],
  triceps: ['triceps'],
  panturrilha: ['calves'],
  abdomen: ['abs'],
  lombar: ['lower-back'],
  trapezio: ['trapezius'],
  antebraco: ['forearm'],
  cardio: [],
  'corpo-inteiro': ['chest', 'quadriceps', 'gluteal', 'abs'],
};

export function ourMuscleToBody(m: MuscleGroup): BodyMuscle[] {
  return OUR_TO_BODY[m] ?? [];
}

/** Vocabulario externo (minusculo) -> nosso MuscleGroup. */
const EXTERNAL_TO_OUR: Record<string, MuscleGroup> = {
  // peito
  chest: 'peito',
  pectorals: 'peito',
  'pectoralis major': 'peito',
  // costas
  lats: 'costas',
  'latissimus dorsi': 'costas',
  back: 'costas',
  'upper back': 'costas',
  'middle back': 'costas',
  // lombar
  'lower back': 'lombar',
  spine: 'lombar',
  // ombros
  shoulders: 'ombros',
  delts: 'ombros',
  deltoids: 'ombros',
  'front deltoids': 'ombros',
  'rear deltoids': 'ombros',
  // bracos
  biceps: 'biceps',
  triceps: 'triceps',
  forearms: 'antebraco',
  forearm: 'antebraco',
  // pernas
  quadriceps: 'quadriceps',
  quads: 'quadriceps',
  hamstrings: 'posterior',
  hamstring: 'posterior',
  glutes: 'gluteos',
  gluteal: 'gluteos',
  calves: 'panturrilha',
  abductors: 'gluteos',
  adductors: 'gluteos',
  // tronco
  abdominals: 'abdomen',
  abs: 'abdomen',
  obliques: 'abdomen',
  // outros
  traps: 'trapezio',
  trapezius: 'trapezio',
  neck: 'trapezio',
  cardiovascular: 'cardio',
};

export function externalMuscleToOur(name: string): MuscleGroup | null {
  return EXTERNAL_TO_OUR[name.trim().toLowerCase()] ?? null;
}

/** Conveniencia: vocabulario externo -> musculos do body map. */
export function externalMuscleToBody(name: string): BodyMuscle[] {
  const our = externalMuscleToOur(name);
  return our ? ourMuscleToBody(our) : [];
}

/**
 * LIMITACOES conhecidas do body map (documentadas):
 * - O componente nao diferencia deltoide anterior/lateral/posterior; "ombros"
 *   e mapeado para front-deltoids (aproximacao).
 * - "costas" (dorsal/lats) e aproximado para upper-back.
 * - abductors/adductors sao aproximados para gluteos.
 */
