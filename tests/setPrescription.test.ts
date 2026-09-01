import { describe, expect, it } from 'vitest';
import type { Exercise, Workout, WorkoutExercise } from '@/domain/types';
import { applyPrescriptionSummary, hasMixedPrescription, resizePrescriptions } from '@/domain/setPrescription';
import { buildSession } from '@/services/sessionService';

const exerciseConfig: WorkoutExercise = {
  id: 'we', exerciseId: 'incline', order: 0, sets: 6,
  repMin: 4, repMax: 15, restSeconds: 60, setType: 'normal',
  setPrescriptions: [
    ...[0, 1].map((order) => ({ id: `warm-${order}`, order, repMin: 10, repMax: 15, restSeconds: 60, setType: 'aquecimento' as const })),
    ...[2, 3].map((order) => ({ id: `adjust-${order}`, order, repMin: 4, repMax: 6, restSeconds: 120, setType: 'ajuste' as const })),
    { id: 'work-4', order: 4, repMin: 6, repMax: 10, restSeconds: 180, setType: 'trabalho' as const },
    { id: 'rp-5', order: 5, repMin: 6, repMax: 10, restSeconds: 180, setType: 'rest-pause' as const, intraSetRestSeconds: 10, notes: 'Última série com rest-pause' },
  ],
};

describe('prescrição individual por série', () => {
  it('preserva faixas, tipos e descansos diferentes', () => {
    const normalized = applyPrescriptionSummary(exerciseConfig, exerciseConfig.setPrescriptions!);
    expect(normalized.sets).toBe(6);
    expect(normalized.repMin).toBe(4);
    expect(normalized.repMax).toBe(15);
    expect(hasMixedPrescription(normalized)).toBe(true);
  });

  it('redimensiona copiando a última prescrição sem reutilizar id', () => {
    const resized = resizePrescriptions({ ...exerciseConfig, sets: 6 }, 7);
    expect(resized).toHaveLength(7);
    expect(resized[6].setType).toBe('rest-pause');
    expect(resized[6].id).not.toBe(resized[5].id);
  });

  it('congela metas e observação no snapshot da sessão', () => {
    const exercise: Exercise = { id:'incline',createdAt:'',updatedAt:'',name:'Supino inclinado',aliases:[],primaryMuscle:'peito',secondaryMuscles:[],equipment:'barra',isCustom:false,isFavorite:false,alternativeIds:[] };
    const workout: Workout = { id:'w',createdAt:'',updatedAt:'',name:'A',archived:false,exercises:[exerciseConfig] };
    const session = buildSession({workout,exercisesById:new Map([[exercise.id,exercise]]),program:null,periodWeek:null,allSessions:[]});
    expect(session.exercises[0].sets[0]).toMatchObject({targetRepMin:10,targetRepMax:15,restSeconds:60,setType:'aquecimento'});
    expect(session.exercises[0].sets[5]).toMatchObject({targetRepMin:6,targetRepMax:10,restSeconds:180,setType:'rest-pause',intraSetRestSeconds:10,prescriptionNotes:'Última série com rest-pause'});
  });
});
