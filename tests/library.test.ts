import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '@/db/database';
import { ensureLibrary } from '@/db/seed';
import { nowISO } from '@/lib/id';
import type { Exercise } from '@/domain/types';
import { EXERCISE_LIBRARY } from '@/data/exerciseLibrary';
import { INSTRUCTIONS_PT } from '@/data/instructionsPt';

beforeEach(async () => {
  await db.exercises.clear();
});

describe('biblioteca visual: enriquecimento e migracao', () => {
  it('possui instrucoes locais em portugues para toda a biblioteca oficial', () => {
    expect(Object.keys(INSTRUCTIONS_PT)).toHaveLength(EXERCISE_LIBRARY.length);
    for (const seed of EXERCISE_LIBRARY) {
      expect(INSTRUCTIONS_PT[seed.slug], seed.name).toBeDefined();
      expect(INSTRUCTIONS_PT[seed.slug].length, seed.name).toBeGreaterThanOrEqual(3);
    }
  });

  it('enriquece exercicios da biblioteca com midia e aliases em ingles', async () => {
    await ensureLibrary();
    const supino = (await db.exercises.toArray()).find((e) => e.name === 'Supino Reto Barra')!;
    expect(supino).toBeTruthy();
    expect(supino.media?.type).toBe('image');
    expect(supino.media?.remoteUrl).toContain('raw.githubusercontent.com');
    expect(supino.aliases).toContain('barbell bench press');
    expect((supino.instructionsList ?? []).length).toBeGreaterThan(0);
  });

  it('migra install existente preservando favorito, alternativas e id', async () => {
    const legacy: Exercise = {
      id: 'legacy-1', createdAt: nowISO(), updatedAt: nowISO(),
      name: 'Supino Reto Barra', aliases: [], primaryMuscle: 'peito',
      secondaryMuscles: ['triceps', 'ombros'], equipment: 'barra',
      instructionsList: ['Lie back on a flat bench.'],
      isCustom: false, isFavorite: true, alternativeIds: ['other-id'],
    };
    await db.exercises.put(legacy);
    await ensureLibrary();
    const migrated = await db.exercises.get('legacy-1');
    expect(migrated).toBeTruthy();
    expect(migrated!.media?.type).toBe('image');
    expect(migrated!.isFavorite).toBe(true);
    expect(migrated!.alternativeIds).toEqual(['other-id']);
    expect(migrated!.instructionsList).toEqual(INSTRUCTIONS_PT['supino-reto-barra']);
    // Nao deve duplicar o exercicio.
    const dupes = (await db.exercises.toArray()).filter((e) => e.name === 'Supino Reto Barra');
    expect(dupes.length).toBe(1);
  });

  it('nao altera exercicios personalizados', async () => {
    const custom: Exercise = {
      id: 'c1', createdAt: nowISO(), updatedAt: nowISO(),
      name: 'Meu Exercicio Unico', aliases: [], primaryMuscle: 'peito',
      secondaryMuscles: [], equipment: 'maquina',
      isCustom: true, isFavorite: false, alternativeIds: [],
    };
    await db.exercises.put(custom);
    await ensureLibrary();
    const c = await db.exercises.get('c1');
    expect(c!.media).toBeUndefined();
  });
});
