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

export function foodUnitLabel(unit: FoodUnit, quantity = 1): string {
  if (unit === 'g' || unit === 'ml') return unit;
  if (unit === 'fatia') return quantity === 1 ? 'fatia' : 'fatias';
  if (unit === 'unidade') return quantity === 1 ? 'unidade' : 'unidades';
  return quantity === 1 ? 'porção' : 'porções';
}

export function defaultFoodUnit(food: FoodReference): FoodUnit {
  return food.servingNutrients && food.servingUnit ? food.servingUnit : 'g';
}

export function defaultFoodQuantity(food: FoodReference): number {
  if (food.servingNutrients && food.servingSize && food.servingSize > 0) return food.servingSize;
  return food.servingWeightGrams && food.servingWeightGrams > 0 ? food.servingWeightGrams : 100;
}

export function foodReferenceNutrients(food: FoodReference): NutrientValues {
  return food.servingNutrients ?? {
    calories: food.caloriesPer100g ?? 0,
    protein: food.proteinPer100g ?? 0,
    carbs: food.carbsPer100g ?? 0,
    fat: food.fatPer100g ?? 0,
    fiber: food.fiberPer100g ?? 0,
  };
}

export function foodReferenceLabel(food: FoodReference): string {
  if (food.servingNutrients && food.servingSize && food.servingUnit) {
    return `${food.servingSize} ${foodUnitLabel(food.servingUnit, food.servingSize)}`;
  }
  return '100 g';
}

/** Calcula sem arredondar; arredondamento pertence somente a apresentacao. */
export function nutrientsForFood(
  food: FoodReference,
  quantity: number,
  unit: FoodUnit,
): NutrientValues {
  if (food.servingNutrients && food.servingSize && food.servingSize > 0 && food.servingUnit === unit) {
    return scaleNutrients(food.servingNutrients, quantity / food.servingSize);
  }
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
  // `manualNutrients` permanece apenas para importar backups antigos. Novas
  // refeições são sempre a soma auditável dos ingredientes.
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
  return !!food.servingNutrients || (food.caloriesPer100g != null
    && food.proteinPer100g != null
    && food.carbsPer100g != null
    && food.fatPer100g != null);
}
