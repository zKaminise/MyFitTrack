import type { FoodReference } from '@/domain/types';

export interface NutritionProvider {
  searchFoods(query: string, signal?: AbortSignal): Promise<FoodReference[]>;
  getFood(id: string, signal?: AbortSignal): Promise<FoodReference | null>;
}
