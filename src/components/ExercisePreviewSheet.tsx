import type { Exercise } from '@/domain/types';
import { EQUIPMENT_LABEL, MUSCLE_LABEL } from '@/lib/labels';
import { Sheet } from '@/ui/components';
import { BodyMap } from './BodyMap';
import { ExerciseMedia } from './ExerciseMedia';

export function ExercisePreviewSheet({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  if (!exercise) return null;
  const instructions = exercise.instructionsList?.length
    ? exercise.instructionsList
    : exercise.instructions
      ? [exercise.instructions]
      : [];

  return (
    <Sheet open onClose={onClose} title="Visualizar exercício" className="sheet--preview">
      <div className="exercise-preview">
        <div className="exercise-preview__media"><ExerciseMedia exercise={exercise} /></div>
        <div className="exercise-preview__content">
          <div>
            <h2>{exercise.name}</h2>
            <p className="muted">{MUSCLE_LABEL[exercise.primaryMuscle]} · {EQUIPMENT_LABEL[exercise.equipment]}</p>
          </div>
          <section className="exercise-preview__section">
            <div className="section-title">Músculos trabalhados</div>
            <BodyMap primary={exercise.primaryMuscle} secondary={exercise.secondaryMuscles} />
            <div className="muscle-summary">
              <div><span className="legend-dot legend-dot--primary" /><span><small>PRINCIPAL</small><strong>{MUSCLE_LABEL[exercise.primaryMuscle]}</strong></span></div>
              {exercise.secondaryMuscles.length > 0 && (
                <div><span className="legend-dot legend-dot--secondary" /><span><small>SECUNDÁRIOS</small><strong>{exercise.secondaryMuscles.map((muscle) => MUSCLE_LABEL[muscle]).join(', ')}</strong></span></div>
              )}
            </div>
          </section>
          <section className="exercise-preview__section">
            <div className="section-title">Como executar</div>
            {instructions.length ? (
              <ol className="instruction-list">
                {instructions.map((instruction, index) => <li key={`${index}-${instruction}`}>{instruction}</li>)}
              </ol>
            ) : <p className="muted">Instruções ainda não disponíveis para este exercício.</p>}
          </section>
        </div>
      </div>
    </Sheet>
  );
}
