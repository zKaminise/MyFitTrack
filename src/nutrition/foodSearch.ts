import { db } from '@/db/database';
import type { FoodReference } from '@/domain/types';
import { cacheFood } from '@/services/nutritionService';
import { openFoodFactsProvider } from './providers/openFoodFacts';

export function normalizeFoodSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export async function cachedFoods(query = ''): Promise<FoodReference[]> {
  const normalized = normalizeFoodSearch(query);
  const rows = await db.foodCache.toArray();
  return rows
    .map((row) => row.food)
    .filter((food) => {
      if (!normalized) return true;
      return normalizeFoodSearch(`${food.name} ${food.brand ?? ''}`).includes(normalized);
    });
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodReference[]> {
  const normalized = normalizeFoodSearch(query);
  if (normalized.length < 2) return [];
  const local = await cachedFoods(query);
  if (typeof navigator !== 'undefined' && !navigator.onLine) return local;
  const remote = await openFoodFactsProvider.searchFoods(query, signal);
  await Promise.all(remote.map((food) => cacheFood(food, query)));
  const unique = new Map<string, FoodReference>();
  for (const food of [...local, ...remote]) unique.set(food.id, food);
  return [...unique.values()].slice(0, 30);
}
