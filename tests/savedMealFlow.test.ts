import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('@/sync/queue', () => ({ enqueue: vi.fn() }));
import { db } from '@/db/database';
import { setCurrentUserId } from '@/repositories/context';
import { savedMealRepo } from '@/repositories/dexie';
import { addSavedMealToDay, addFoodToDay } from '@/services/nutritionService';
import { nutritionDayTotals, nutrientsForFood } from '@/domain/nutrition';
import type { SavedMeal } from '@/domain/types';
import { localFoods, filterFoodCatalog } from '@/nutrition/localFoods';
import { cachedFoods } from '@/nutrition/foodSearch';
import { searchFoods } from '@/nutrition/foodSearch';
import { buildBackup, restoreBackup } from '@/services/backup';
import { validateBackup } from '@/domain/backupSchema';
import { openFoodFactsProvider } from '@/nutrition/providers/openFoodFacts';

afterEach(async () => { await Promise.all([db.savedMeals.clear(), db.nutritionDays.clear(), db.nutritionSettings.clear(), db.foodCache.clear(), db.userFoods.clear()]); setCurrentUserId(null); vi.unstubAllGlobals(); vi.restoreAllMocks(); });
describe('Marmita e alimento avulso nas metas', () => {
  it('contabiliza macros manuais, meia porção e chocolate sem alterar o histórico ao editar a marmita', async () => {
    setCurrentUserId('qa-user');
    const rice = localFoods.find(f => f.name === 'Arroz, tipo 1, cozido')!;
    expect(rice).toBeTruthy();
    const meal: SavedMeal = { id: 'marmita', userId: 'qa-user', name: 'Marmita Almoço', createdAt: '', updatedAt: '',
      items: [{ id: 'arroz', food: rice, quantity: 150, unit: 'g', nutrients: nutrientsForFood(rice, 150, 'g') }],
      manualNutrients: { calories: 650, protein: 45, carbs: 70, fat: 20 },
    };
    await savedMealRepo.put(meal);
    await addSavedMealToDay({ date: '2026-09-22', mealSlotId: 'almoço', meal, portions: .5, status: 'consumed' });
    await addSavedMealToDay({ date: '2026-09-22', mealSlotId: 'jantar', meal, portions: 1, status: 'planned' });
    const chocolate = filterFoodCatalog(localFoods, 'chocolate ao leite')[0];
    expect(chocolate).toBeTruthy();
    await addFoodToDay({ date: '2026-09-22', mealSlotId: 'lanche', food: chocolate, quantity: 25, unit: 'g', status: 'consumed' });
    await savedMealRepo.put({ ...meal, manualNutrients: { calories: 900, protein: 60, carbs: 90, fat: 30 } });
    const day = (await db.nutritionDays.toArray())[0];
    expect(day.items[0].components?.[0].quantity).toBe(75);
    expect(day.items[0].nutrients.calories).toBe(325);
    expect(nutritionDayTotals(day).calories).toBeCloseTo(325 + chocolate.caloriesPer100g! / 4);
    expect(nutritionDayTotals(day, 'planned').calories).toBe(650);
    await expect(addSavedMealToDay({ date: '2026-09-22', mealSlotId: 'almoço', meal, portions: 0, status: 'consumed' })).rejects.toThrow();
  });
  it('busca alimentos cotidianos sem acento e não expõe alimento manual de outra conta', async () => {
    setCurrentUserId('a');
    expect(filterFoodCatalog(localFoods, 'maca').some(f => f.name.startsWith('Maçã'))).toBe(true);
    expect(localFoods.length).toBeGreaterThan(500);
    const food = { ...localFoods[0], id: 'private', source: 'manual' as const, name: 'Receita privada', userId: 'b', createdAt: '', updatedAt: '' };
    await db.userFoods.put(food);
    await db.foodCache.put({ id: 'private', food, normalizedSearch: '', createdAt: '', updatedAt: '' });
    expect(await cachedFoods('Receita privada')).toEqual([]);
    expect(filterFoodCatalog(localFoods, 'maca')[0].name.startsWith('Maçã')).toBe(true);
    expect(filterFoodCatalog(localFoods, 'chocolate')[0].name).toBe('Chocolate, ao leite');
  });
  it('busca offline sem chamar o fornecedor externo', async () => {
    vi.stubGlobal('navigator', { onLine: false });
    const remote = vi.spyOn(openFoodFactsProvider, 'searchFoods');
    expect((await searchFoods('maca')).some(food => food.name.startsWith('Maçã'))).toBe(true);
    expect(remote).not.toHaveBeenCalled();
  });
  it('exporta e restaura macros manuais e ingredientes; rejeita valores inválidos', async () => {
    setCurrentUserId('qa-user');
    const food = localFoods[0];
    const meal: SavedMeal = { id: 'backup-meal', userId: 'qa-user', name: 'Marmita', createdAt: '', updatedAt: '',
      items: [{ id: 'rice', food, quantity: 150, unit: 'g', nutrients: nutrientsForFood(food, 150, 'g') }],
      manualNutrients: { calories: 650, protein: 45, carbs: 70, fat: 20 } };
    await savedMealRepo.put(meal);
    const backup = await buildBackup();
    const parsed = validateBackup(JSON.parse(JSON.stringify(backup)));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error(parsed.error);
    await db.savedMeals.clear();
    await restoreBackup(parsed.data);
    expect(await db.savedMeals.get(meal.id)).toEqual(meal);
    expect(validateBackup({ ...backup, savedMeals: [{ ...meal, manualNutrients: { ...meal.manualNutrients, calories: -1 } }] }).ok).toBe(false);
    const legacy = { ...meal }; delete legacy.manualNutrients;
    expect(validateBackup({ ...backup, savedMeals: [legacy] }).ok).toBe(true);
  });
});
