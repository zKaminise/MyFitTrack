import { db } from '@/db/database';
import type { FoodReference } from '@/domain/types';
import { cacheFood } from '@/services/nutritionService';
import { openFoodFactsProvider } from './providers/openFoodFacts';
import { localFoods, filterFoodCatalog, normalizeFoodSearch } from './localFoods';
import { getCurrentUserId } from '@/repositories/context';

export { normalizeFoodSearch } from './localFoods';

export async function cachedFoods(query = ''): Promise<FoodReference[]> {
  const uid = getCurrentUserId();
  const [rows, mine] = await Promise.all([
    db.foodCache.toArray(), uid ? db.userFoods.where('userId').equals(uid).toArray() : [],
  ]);
  const unique = new Map<string, FoodReference>();
  // Cache externo é público; itens manuais são lidos somente da conta atual.
  for (const food of [...mine, ...localFoods, ...rows.map(row => row.food).filter(f => f.source !== 'manual')]) unique.set(food.id, food);
  return filterFoodCatalog([...unique.values()], query);
}

export async function searchFoods(query: string, signal?: AbortSignal): Promise<FoodReference[]> {
  const normalized = normalizeFoodSearch(query);
  const local = await cachedFoods(query);
  if (normalized.length < 2) return local.slice(0, 40);
  if (typeof navigator !== 'undefined' && !navigator.onLine) return local;
  let remote: FoodReference[];
  try { remote = await openFoodFactsProvider.searchFoods(query, signal); }
  catch (error) { if (signal?.aborted) throw error; return local; }
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  await Promise.all(remote.map((food) => cacheFood(food, query)));
  const unique = new Map<string, FoodReference>();
  for (const food of [...local, ...remote]) unique.set(food.id, food);
  return [...unique.values()];
}
