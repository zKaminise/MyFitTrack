// Store da sessao ativa. Fonte unica de verdade durante a execucao do treino.
// Toda alteracao e persistida imediatamente no IndexedDB (autosave), de modo
// que o treino em andamento nunca e perdido ao fechar/atualizar o app.
import { create } from 'zustand';
import type { Exercise, Session, SessionExercise, SetLog, PerceivedEffort } from '@/domain/types';
import { uuid, nowISO } from '@/lib/id';
import { sessionRepo } from '@/repositories/dexie';
import { finalizeSession, newSessionExercise } from '@/services/sessionService';

interface SessionState {
  active: Session | null;
  savedAt: string | null;
  load: () => Promise<void>;
  start: (session: Session) => Promise<void>;
  updateSet: (exId: string, setId: string, patch: Partial<SetLog>) => void;
  toggleComplete: (exId: string, setId: string) => void;
  addSet: (exId: string) => void;
  removeSet: (exId: string, setId: string) => void;
  setExerciseMeta: (exId: string, patch: Partial<Pick<SessionExercise, 'targetSets' | 'repMin' | 'repMax' | 'restSeconds' | 'notes'>>) => void;
  substituteToday: (exId: string, exercise: Exercise, reason?: string) => void;
  skipExercise: (exId: string, reason?: string) => void;
  unskipExercise: (exId: string) => void;
  addExerciseToday: (exercise: Exercise, defaultRest: number) => void;
  removeExerciseToday: (exId: string) => void;
  moveExercise: (exId: string, dir: -1 | 1) => void;
  setNote: (note: string) => void;
  setEffort: (effort: PerceivedEffort) => void;
  finalize: () => Promise<{ prCount: number; sessionId: string } | null>;
  discard: () => Promise<void>;
}

function persist(session: Session) {
  const withStamp = { ...session, updatedAt: nowISO() };
  void sessionRepo.put(withStamp);
  return withStamp;
}

function mapExercise(
  session: Session,
  exId: string,
  fn: (ex: SessionExercise) => SessionExercise,
): Session {
  return {
    ...session,
    exercises: session.exercises.map((ex) => (ex.id === exId ? fn(ex) : ex)),
  };
}

export const useSession = create<SessionState>((set, get) => {
  const commit = (session: Session) => {
    const saved = persist(session);
    set({ active: saved, savedAt: saved.updatedAt });
  };

  return {
    active: null,
    savedAt: null,

    load: async () => {
      const active = await sessionRepo.active();
      set({ active: active ?? null });
    },

    start: async (session) => {
      await sessionRepo.put(session);
      set({ active: session, savedAt: session.updatedAt });
    },

    updateSet: (exId, setId, patch) => {
      const s = get().active;
      if (!s) return;
      commit(
        mapExercise(s, exId, (ex) => ({
          ...ex,
          sets: ex.sets.map((set) => (set.id === setId ? { ...set, ...patch } : set)),
        })),
      );
    },

    toggleComplete: (exId, setId) => {
      const s = get().active;
      if (!s) return;
      commit(
        mapExercise(s, exId, (ex) => {
          const sets = ex.sets.map((set) =>
            set.id === setId
              ? {
                  ...set,
                  completed: !set.completed,
                  completedAt: !set.completed ? nowISO() : null,
                }
              : set,
          );
          const anyDone = sets.some((x) => x.completed);
          const status: SessionExercise['status'] =
            ex.status === 'skipped' ? 'skipped' : anyDone ? 'completed' : 'planned';
          return { ...ex, sets, status };
        }),
      );
    },

    addSet: (exId) => {
      const s = get().active;
      if (!s) return;
      commit(
        mapExercise(s, exId, (ex) => {
          const last = ex.sets[ex.sets.length - 1];
          const newSet: SetLog = {
            id: uuid(),
            setIndex: ex.sets.length + 1,
            setType: last?.setType ?? 'normal',
            weight: last ? last.weight : null,
            reps: null,
            targetRir: last?.targetRir ?? null,
            targetRpe: last?.targetRpe ?? null,
            targetRepMin: last?.targetRepMin ?? ex.repMin,
            targetRepMax: last?.targetRepMax ?? ex.repMax,
            restSeconds: last?.restSeconds ?? ex.restSeconds,
            intraSetRestSeconds: last?.intraSetRestSeconds ?? null,
            prescriptionNotes: last?.prescriptionNotes,
            completed: false,
            completedAt: null,
          };
          return { ...ex, sets: [...ex.sets, newSet] };
        }),
      );
    },

    removeSet: (exId, setId) => {
      const s = get().active;
      if (!s) return;
      commit(
        mapExercise(s, exId, (ex) => {
          const sets = ex.sets
            .filter((set) => set.id !== setId)
            .map((set, i) => ({ ...set, setIndex: i + 1 }));
          return { ...ex, sets };
        }),
      );
    },

    setExerciseMeta: (exId, patch) => {
      const s = get().active;
      if (!s) return;
      commit(mapExercise(s, exId, (ex) => ({ ...ex, ...patch })));
    },

    substituteToday: (exId, exercise, reason) => {
      const s = get().active;
      if (!s) return;
      commit(
        mapExercise(s, exId, (ex) => ({
          ...ex,
          performedExerciseId: exercise.id,
          performedExerciseName: exercise.name,
          substituted: true,
          reason: reason || ex.reason,
        })),
      );
    },

    skipExercise: (exId, reason) => {
      const s = get().active;
      if (!s) return;
      commit(mapExercise(s, exId, (ex) => ({ ...ex, status: 'skipped', reason })));
    },

    unskipExercise: (exId) => {
      const s = get().active;
      if (!s) return;
      commit(
        mapExercise(s, exId, (ex) => ({
          ...ex,
          status: ex.sets.some((x) => x.completed) ? 'completed' : 'planned',
        })),
      );
    },

    addExerciseToday: (exercise, defaultRest) => {
      const s = get().active;
      if (!s) return;
      const order = s.exercises.length;
      commit({ ...s, exercises: [...s.exercises, newSessionExercise(exercise, order, defaultRest)] });
    },

    removeExerciseToday: (exId) => {
      const s = get().active;
      if (!s) return;
      const exercises = s.exercises
        .filter((ex) => ex.id !== exId)
        .map((ex, i) => ({ ...ex, order: i }));
      commit({ ...s, exercises });
    },

    moveExercise: (exId, dir) => {
      const s = get().active;
      if (!s) return;
      const arr = [...s.exercises].sort((a, b) => a.order - b.order);
      const idx = arr.findIndex((e) => e.id === exId);
      const target = idx + dir;
      if (idx < 0 || target < 0 || target >= arr.length) return;
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      commit({ ...s, exercises: arr.map((e, i) => ({ ...e, order: i })) });
    },

    setNote: (note) => {
      const s = get().active;
      if (!s) return;
      commit({ ...s, note });
    },

    setEffort: (effort) => {
      const s = get().active;
      if (!s) return;
      commit({ ...s, perceivedEffort: effort });
    },

    finalize: async () => {
      const s = get().active;
      if (!s) return null;
      const withEnd: Session = { ...s, endedAt: nowISO() };
      const { session, prCount } = await finalizeSession(withEnd);
      set({ active: null, savedAt: null });
      return { prCount, sessionId: session.id };
    },

    discard: async () => {
      const s = get().active;
      if (!s) return;
      await sessionRepo.remove(s.id);
      set({ active: null, savedAt: null });
    },
  };
});
