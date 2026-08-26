// Operacoes de CRUD de treinos e exercicios (com autosave via repositorios).
import type { Workout, WorkoutExercise, Exercise, Program } from '@/domain/types';
import { workoutRepo, programRepo } from '@/repositories/dexie';
import { uuid, nowISO } from '@/lib/id';

export function createWorkout(partial?: Partial<Workout>): Workout {
  return {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    name: partial?.name ?? 'Novo treino',
    description: partial?.description ?? '',
    color: partial?.color ?? '#ff7a1a',
    estimatedMinutes: partial?.estimatedMinutes,
    notes: partial?.notes,
    archived: false,
    exercises: partial?.exercises ?? [],
  };
}

export async function saveWorkout(w: Workout): Promise<void> {
  await workoutRepo.put({ ...w, updatedAt: nowISO() });
}

export async function duplicateWorkout(w: Workout): Promise<Workout> {
  const copy: Workout = {
    ...w,
    id: uuid(),
    name: `${w.name} (copia)`,
    createdAt: nowISO(),
    updatedAt: nowISO(),
    exercises: w.exercises.map((e) => ({ ...e, id: uuid() })),
  };
  await workoutRepo.put(copy);
  return copy;
}

/** Remove um treino e limpa referencias em programas. */
export async function deleteWorkout(id: string): Promise<void> {
  await workoutRepo.remove(id);
  const programs = await programRepo.all();
  for (const p of programs) {
    let changed = false;
    const fixedDays = p.fixedDays.map((d) => {
      if (d.workoutId === id) {
        changed = true;
        return { ...d, workoutId: null };
      }
      return d;
    });
    const cycleItems = p.cycleItems.map((c) => {
      if (c.workoutId === id) {
        changed = true;
        return { ...c, workoutId: null };
      }
      return c;
    });
    if (changed) await programRepo.put({ ...p, fixedDays, cycleItems, updatedAt: nowISO() });
  }
}

export function newWorkoutExercise(exerciseId: string, order: number, defaultRest = 90): WorkoutExercise {
  return {
    id: uuid(),
    exerciseId,
    order,
    sets: 4,
    repMin: 10,
    repMax: 12,
    restSeconds: defaultRest,
    setType: 'normal',
    targetRir: null,
    targetRpe: null,
    supersetId: null,
  };
}

export function createCustomExercise(partial: Partial<Exercise>): Exercise {
  return {
    id: uuid(),
    createdAt: nowISO(),
    updatedAt: nowISO(),
    name: partial.name ?? 'Meu exercicio',
    aliases: partial.aliases ?? [],
    primaryMuscle: partial.primaryMuscle ?? 'peito',
    secondaryMuscles: partial.secondaryMuscles ?? [],
    equipment: partial.equipment ?? 'maquina',
    instructions: partial.instructions,
    mediaUrl: null,
    isCustom: true,
    isFavorite: false,
    alternativeIds: partial.alternativeIds ?? [],
  };
}

export async function setActiveProgram(program: Program): Promise<void> {
  const all = await programRepo.all();
  for (const p of all) {
    if (p.id !== program.id && p.active) await programRepo.put({ ...p, active: false });
  }
  await programRepo.put({ ...program, active: true, updatedAt: nowISO() });
}
