import type { Equipment, MuscleGroup, SetType, PerceivedEffort } from '@/domain/types';

export const MUSCLE_LABEL: Record<MuscleGroup, string> = {
  peito: 'Peito',
  costas: 'Costas',
  quadriceps: 'Quadriceps',
  posterior: 'Posterior',
  gluteos: 'Gluteos',
  ombros: 'Ombros',
  biceps: 'Biceps',
  triceps: 'Triceps',
  panturrilha: 'Panturrilha',
  abdomen: 'Abdomen',
  lombar: 'Lombar',
  trapezio: 'Trapezio',
  antebraco: 'Antebraco',
  cardio: 'Cardio',
  'corpo-inteiro': 'Corpo inteiro',
};

export const MUSCLE_ORDER: MuscleGroup[] = [
  'peito', 'costas', 'quadriceps', 'posterior', 'gluteos', 'ombros',
  'biceps', 'triceps', 'panturrilha', 'abdomen', 'lombar', 'trapezio',
  'antebraco', 'cardio', 'corpo-inteiro',
];

export const EQUIPMENT_LABEL: Record<Equipment, string> = {
  maquina: 'Maquina',
  barra: 'Barra',
  halteres: 'Halteres',
  polia: 'Polia',
  smith: 'Smith',
  'peso-corporal': 'Peso corporal',
  elastico: 'Elastico',
  kettlebell: 'Kettlebell',
  banco: 'Banco',
  'sem-equipamento': 'Sem equipamento',
};

export const EQUIPMENT_ORDER: Equipment[] = [
  'maquina', 'barra', 'halteres', 'polia', 'smith', 'peso-corporal',
  'elastico', 'kettlebell', 'banco', 'sem-equipamento',
];

export const SET_TYPE_LABEL: Record<SetType, string> = {
  normal: 'Normal',
  aquecimento: 'Aquecimento',
  ajuste: 'Ajuste',
  trabalho: 'Trabalho',
  'drop-set': 'Drop-set',
  'rest-pause': 'Rest-pause',
  amrap: 'AMRAP',
  falha: 'Falha',
  preparacao: 'Preparacao',
};

export const EFFORT_LABEL: Record<PerceivedEffort, string> = {
  'muito-leve': 'Muito leve',
  leve: 'Leve',
  normal: 'Normal',
  dificil: 'Dificil',
  'muito-dificil': 'Muito dificil',
};

export const EFFORT_ORDER: PerceivedEffort[] = [
  'muito-leve', 'leve', 'normal', 'dificil', 'muito-dificil',
];

export function repRange(min: number, max: number): string {
  return min === max ? `${min}` : `${min}-${max}`;
}

export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

export function formatMinutes(totalSeconds: number): string {
  const m = Math.round(totalSeconds / 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return rem ? `${h}h${String(rem).padStart(2, '0')}` : `${h}h`;
  }
  return `${m} min`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('pt-BR').format(Math.round(n));
}
