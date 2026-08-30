import type { ISODate, Program, Workout } from '@/domain/types';
import { addDays, weekday, weekdayLabel } from '@/domain/dates';
import { Sheet } from '@/ui/components';

interface Props {
  open: boolean;
  program: Program;
  workouts: Workout[];
  date: ISODate;
  onClose: () => void;
  onChoose: (cycleIndex: number) => void;
}

export function CycleAdjustmentSheet({ open, program, workouts, date, onClose, onChoose }: Props) {
  const items = [...program.cycleItems].sort((a, b) => a.order - b.order);
  const names = new Map(workouts.map((workout) => [workout.id, workout.name]));
  const itemName = (workoutId: string | null) =>
    workoutId ? names.get(workoutId) ?? 'Treino removido' : 'Descanso';
  const previewLength = Math.min(items.length, 5);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Ajustar ciclo a partir de hoje"
      subtitle="Escolha qual etapa do seu ciclo deve acontecer hoje"
      className="sheet--cycle-adjustment"
    >
      <div className="cycle-adjustment-note">
        <span aria-hidden>↻</span>
        <div>
          <strong>Um novo ponto de partida</strong>
          <p>O ciclo continua normalmente daqui para frente. Dias anteriores e sessões concluídas não mudam.</p>
        </div>
      </div>

      <div className="cycle-adjustment-options">
        {items.map((item, cycleIndex) => (
          <button
            type="button"
            key={item.id}
            className="cycle-adjustment-option"
            onClick={() => onChoose(cycleIndex)}
            aria-label={`Começar hoje com ${itemName(item.workoutId)}`}
          >
            <span className="cycle-adjustment-index">{cycleIndex + 1}</span>
            <span className="cycle-adjustment-content">
              <strong>Começar hoje com {itemName(item.workoutId)}</strong>
              <span className="cycle-adjustment-preview">
                {Array.from({ length: previewLength }, (_, step) => {
                  const previewItem = items[(cycleIndex + step) % items.length];
                  const day =
                    step === 0
                      ? 'Hoje'
                      : step === 1
                        ? 'Amanhã'
                        : weekdayLabel(weekday(addDays(date, step)));
                  return (
                    <span key={`${item.id}-${step}`}>
                      <small>{day}</small>
                      <b>{itemName(previewItem.workoutId)}</b>
                    </span>
                  );
                })}
              </span>
            </span>
            <span className="cycle-adjustment-arrow" aria-hidden>›</span>
          </button>
        ))}
      </div>
    </Sheet>
  );
}
