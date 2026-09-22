import data from './taco-foods.json';
import type { FoodReference } from '@/domain/types';
import { hasCompleteMacros } from '@/domain/nutrition';

/** NEPA/UNICAMP, TACO 4ª edição (2011). Valores por 100 g de parte comestível.
 * Linhas não analisadas ficam no arquivo fonte mas não são oferecidas como completas. */
export const localFoods: FoodReference[] = (data as FoodReference[]).filter(hasCompleteMacros);
export const foodSourceLabel = (food: FoodReference) => food.source === 'taco'
  ? 'TACO · NEPA/UNICAMP' : food.source === 'open-food-facts' ? 'Open Food Facts' : food.source === 'usda' ? 'USDA' : 'Meu alimento';

export function normalizeFoodSearch(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();
}

export function filterFoodCatalog(foods: FoodReference[], query: string): FoodReference[] {
  const terms = normalizeFoodSearch(query).split(/\s+/).filter(Boolean);
  const score = (food: FoodReference) => {
    const words = normalizeFoodSearch(food.name).split(/[^a-z0-9]+/);
    return terms.reduce((total, term) => total + (words[0] === term ? 4 : words.includes(term) ? 2 : 0), 0);
  };
  return foods.filter(food => terms.every(term => normalizeFoodSearch(`${food.name} ${food.brand ?? ''}`).includes(term)))
    .sort((a, b) => score(b) - score(a));
}
