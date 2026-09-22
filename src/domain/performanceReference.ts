import type { Session, SetLog, SetType } from './types';

export interface SetReference {
  weight: number | null;
  reps: number | null;
  setType: SetType;
  setIndex: number;
  date: string;
  workoutName: string;
  sessionId: string;
  reused: boolean;
  targetRepMin?: number | null;
  targetRepMax?: number | null;
}

// Legado: séries "normal" equivalem às séries de trabalho, nunca a ajustes.
export const referenceGroup = (type: SetType) => type === 'normal' ? 'trabalho' : type;

/** Mais recente primeiro, independente do treino. Mantém a posição dentro do tipo,
 * inclusive quando uma série anterior não foi concluída, para não deslocar linhas. */
export function performanceReferences(
  sessions: Session[], exerciseId: string, targets: Pick<SetLog, 'setType'>[], excludeSessionId?: string,
): (SetReference | null)[] {
  const executions = sessions
    .filter(s => s.status === 'completed' && s.id !== excludeSessionId)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .flatMap(session => session.exercises
      .filter(ex => ex.performedExerciseId === exerciseId && ex.status !== 'skipped')
      .map(ex => ({ session, sets: [...ex.sets].sort((a, b) => a.setIndex - b.setIndex) })));
  const occurrences = new Map<string, number>();
  return targets.map(target => {
    const group = referenceGroup(target.setType);
    const ordinal = occurrences.get(group) ?? 0;
    occurrences.set(group, ordinal + 1);
    for (const { session, sets } of executions) {
      const matching = sets.filter(s => referenceGroup(s.setType) === group);
      const valid = (s: SetLog | undefined): s is SetLog => !!s && s.completed && s.weight != null && s.reps != null;
      const exact = matching[ordinal];
      // Uma série extra usa a última disponível do mesmo tipo, identificada na UI.
      const chosen = valid(exact) ? exact : [...matching].reverse().find(valid);
      if (!chosen) continue;
      return {
        weight: chosen.weight, reps: chosen.reps, setType: chosen.setType, setIndex: chosen.setIndex,
        date: session.date, workoutName: session.workoutName, sessionId: session.id,
        reused: chosen !== exact,
        targetRepMin: chosen.targetRepMin, targetRepMax: chosen.targetRepMax,
      };
    }
    return null;
  });
}
