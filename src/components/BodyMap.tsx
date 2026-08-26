import Model, { type IExerciseData } from 'react-body-highlighter';
import type { MuscleGroup } from '@/domain/types';
import { ourMuscleToBody, type BodyMuscle } from '@/data/muscleMapper';

const PRIMARY_COLOR = '#ff7a1a';
const SECONDARY_COLOR = '#f5c542';
const BODY_COLOR = '#8a8a93';

interface Props {
  primary: MuscleGroup;
  secondary: MuscleGroup[];
}

/**
 * Visualizacao muscular (frente e costas). 100% local/offline: os musculos
 * destacados sao derivados dos nossos proprios dados via muscleMapper.
 * Dois niveis: principal (laranja forte) e secundario (amarelo).
 */
export function BodyMap({ primary, secondary }: Props) {
  const primaryBody = unique(ourMuscleToBody(primary));
  const primarySet = new Set(primaryBody);
  const secondaryBody = unique(secondary.flatMap(ourMuscleToBody)).filter((m) => !primarySet.has(m));

  if (primaryBody.length === 0 && secondaryBody.length === 0) {
    return <p className="faint center" style={{ fontSize: 13 }}>Sem mapa muscular para este exercicio.</p>;
  }

  const data: IExerciseData[] = [];
  if (secondaryBody.length) data.push({ name: 'Secundario', muscles: secondaryBody, frequency: 1 });
  if (primaryBody.length) data.push({ name: 'Principal', muscles: primaryBody, frequency: 2 });
  const colors = [SECONDARY_COLOR, PRIMARY_COLOR]; // index = frequency - 1

  return (
    <div className="bodymap">
      <div className="bodymap-view">
        <Model data={data} type="anterior" bodyColor={BODY_COLOR} highlightedColors={colors} style={{ width: '100%' }} />
        <span className="faint" style={{ fontSize: 12 }}>Frente</span>
      </div>
      <div className="bodymap-view">
        <Model data={data} type="posterior" bodyColor={BODY_COLOR} highlightedColors={colors} style={{ width: '100%' }} />
        <span className="faint" style={{ fontSize: 12 }}>Costas</span>
      </div>
    </div>
  );
}

function unique(arr: BodyMuscle[]): BodyMuscle[] {
  return [...new Set(arr)];
}
