import type {
  FoodReference,
  FoodUnit,
  NutrientValues,
  NutritionDay,
  SavedMeal,
  SavedMealItem,
} from './types';

export const ZERO_NUTRIENTS: NutrientValues = {
  calories: 0,
  protein: 0,
  carbs: 0,
  fat: 0,
  fiber: 0,
};

export function addNutrients(a: NutrientValues, b: NutrientValues): NutrientValues {
  return {
    calories: a.calories + b.calories,
    protein: a.protein + b.protein,
    carbs: a.carbs + b.carbs,
    fat: a.fat + b.fat,
    fiber: (a.fiber ?? 0) + (b.fiber ?? 0),
  };
}

export function scaleNutrients(values: NutrientValues, factor: number): NutrientValues {
  return {
    calories: values.calories * factor,
    protein: values.protein * factor,
    carbs: values.carbs * factor,
    fat: values.fat * factor,
    fiber: (values.fiber ?? 0) * factor,
  };
}

function gramsFor(food: FoodReference, quantity: number, unit: FoodUnit): number {
  if (unit === 'g' || unit === 'ml') return quantity;
  const servingGrams = food.servingWeightGrams
    ?? (food.servingUnit === 'g' || food.servingUnit === 'ml' ? food.servingSize : null);
  return quantity * (servingGrams ?? 100);
}

/** Calcula sem arredondar; arredondamento pertence somente a apresentacao. */
export function nutrientsForFood(
  food: FoodReference,
  quantity: number,
  unit: FoodUnit,
): NutrientValues {
  const factor = gramsFor(food, quantity, unit) / 100;
  return {
    calories: (food.caloriesPer100g ?? 0) * factor,
    protein: (food.proteinPer100g ?? 0) * factor,
    carbs: (food.carbsPer100g ?? 0) * factor,
    fat: (food.fatPer100g ?? 0) * factor,
    fiber: (food.fiberPer100g ?? 0) * factor,
  };
}

export function sumNutrients(values: NutrientValues[]): NutrientValues {
  return values.reduce(addNutrients, ZERO_NUTRIENTS);
}

export function savedMealTotals(meal: Pick<SavedMeal, 'items' | 'manualNutrients'>): NutrientValues {
  if (meal.manualNutrients) return meal.manualNutrients;
  return sumNutrients(meal.items.map((item) => item.nutrients));
}

export function scaleSavedMealItems(items: SavedMealItem[], portions: number): SavedMealItem[] {
  return items.map((item) => ({
    ...item,
    quantity: item.quantity * portions,
    nutrients: scaleNutrients(item.nutrients, portions),
  }));
}

export function nutritionDayTotals(day: NutritionDay | undefined, status: 'planned' | 'consumed' = 'consumed') {
  if (!day) return ZERO_NUTRIENTS;
  return sumNutrients(day.items.filter((item) => item.status === status).map((item) => item.nutrients));
}

export function hasCompleteMacros(food: FoodReference): boolean {
  return food.caloriesPer100g != null
    && food.proteinPer100g != null
    && food.carbsPer100g != null
    && food.fatPer100g != null;
}
