import { db } from '@/db/database';
import type {
  FoodLogItem,
  FoodLogStatus,
  FoodReference,
  FoodUnit,
  MealSlot,
  NutritionDay,
  NutritionSettings,
  SavedMeal,
  UserFood,
} from '@/domain/types';
import { nutrientsForFood, savedMealTotals, scaleNutrients, scaleSavedMealItems } from '@/domain/nutrition';
import { getCurrentUserId } from '@/repositories/context';
import {
  foodCacheRepo,
  nutritionDayRepo,
  nutritionSettingsRepo,
  userFoodRepo,
} from '@/repositories/dexie';
import { nowISO, stableUuid, uuid } from '@/lib/id';

const SLOT_NAMES = ['Café da manhã', 'Lanche da manhã', 'Almoço', 'Lanche da tarde', 'Jantar', 'Ceia'];

export function defaultMealSlots(): MealSlot[] {
  return SLOT_NAMES.map((name, order) => ({ id: uuid(), name, order }));
}

export function defaultNutritionSettings(userId: string): NutritionSettings {
  const stamp = nowISO();
  return {
    id: userId,
    userId,
    createdAt: stamp,
    updatedAt: stamp,
    calorieTarget: 2400,
    proteinTarget: 180,
    carbsTarget: 260,
    fatTarget: 70,
    fiberTarget: null,
    mealSlots: defaultMealSlots(),
    favoriteFoodIds: [],
    recentFoodIds: [],
  };
}

export async function ensureNutritionSettings(): Promise<NutritionSettings> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Nenhum usuario autenticado');
  const current = await db.nutritionSettings.get(userId);
  if (current) return current;
  const settings = defaultNutritionSettings(userId);
  await nutritionSettingsRepo.put(settings);
  return settings;
}

async function getOrCreateDay(date: string): Promise<NutritionDay> {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Nenhum usuario autenticado');
  const existing = await db.nutritionDays.where('userId').equals(userId).filter((day) => day.date === date).first();
  if (existing) return existing;
  const stamp = nowISO();
  return {
    id: stableUuid(`${userId}:nutrition-day:${date}`),
    userId,
    date,
    items: [],
    createdAt: stamp,
    updatedAt: stamp,
  };
}

export async function cacheFood(food: FoodReference, search = ''): Promise<void> {
  if (food.source === 'manual' || food.source === 'taco') return;
  const stamp = nowISO();
  await foodCacheRepo.put({
    id: food.id,
    food,
    normalizedSearch: search.trim().toLocaleLowerCase('pt-BR'),
    createdAt: stamp,
    updatedAt: stamp,
  });
}

export async function rememberFood(food: FoodReference): Promise<void> {
  await cacheFood(food);
  const settings = await ensureNutritionSettings();
  const recentFoodIds = [food.id, ...settings.recentFoodIds.filter((id) => id !== food.id)].slice(0, 30);
  await nutritionSettingsRepo.put({ ...settings, recentFoodIds, updatedAt: nowISO() });
}

export async function addFoodToDay(args: {
  date: string;
  mealSlotId: string;
  food: FoodReference;
  quantity: number;
  unit: FoodUnit;
  status: FoodLogStatus;
}): Promise<FoodLogItem> {
  if (!Number.isFinite(args.quantity) || args.quantity <= 0) throw new Error('Informe uma quantidade maior que zero.');
  const day = await getOrCreateDay(args.date);
  const stamp = nowISO();
  const item: FoodLogItem = {
    id: uuid(),
    mealSlotId: args.mealSlotId,
    kind: 'food',
    sourceId: args.food.id,
    nameSnapshot: args.food.name,
    brandSnapshot: args.food.brand ?? null,
    quantity: args.quantity,
    unit: args.unit,
    status: args.status,
    nutrients: nutrientsForFood(args.food, args.quantity, args.unit),
    createdAt: stamp,
    updatedAt: stamp,
  };
  await nutritionDayRepo.put({ ...day, items: [...day.items, item], updatedAt: stamp });
  await rememberFood(args.food);
  return item;
}

export async function addSavedMealToDay(args: {
  date: string;
  mealSlotId: string;
  meal: SavedMeal;
  portions: number;
  status: FoodLogStatus;
}): Promise<FoodLogItem> {
  if (!Number.isFinite(args.portions) || args.portions <= 0) throw new Error('Informe uma quantidade maior que zero.');
  const day = await getOrCreateDay(args.date);
  const stamp = nowISO();
  const item: FoodLogItem = {
    id: uuid(),
    mealSlotId: args.mealSlotId,
    kind: 'saved-meal',
    sourceId: args.meal.id,
    nameSnapshot: args.meal.name,
    quantity: args.portions,
    unit: 'porcao',
    status: args.status,
    nutrients: scaleNutrients(savedMealTotals(args.meal), args.portions),
    components: scaleSavedMealItems(args.meal.items, args.portions),
    createdAt: stamp,
    updatedAt: stamp,
  };
  await nutritionDayRepo.put({ ...day, items: [...day.items, item], updatedAt: stamp });
  return item;
}

export async function updateFoodLog(date: string, itemId: string, patch: Partial<FoodLogItem>): Promise<void> {
  const day = await getOrCreateDay(date);
  const stamp = nowISO();
  await nutritionDayRepo.put({
    ...day,
    items: day.items.map((item) => item.id === itemId ? { ...item, ...patch, updatedAt: stamp } : item),
    updatedAt: stamp,
  });
}

export async function removeFoodLog(date: string, itemId: string): Promise<void> {
  const day = await getOrCreateDay(date);
  await nutritionDayRepo.put({
    ...day,
    items: day.items.filter((item) => item.id !== itemId),
    updatedAt: nowISO(),
  });
}

export async function createManualFood(input: Omit<UserFood, 'id' | 'userId' | 'source' | 'sourceId' | 'createdAt' | 'updatedAt'>) {
  const userId = getCurrentUserId();
  if (!userId) throw new Error('Nenhum usuario autenticado');
  const id = uuid();
  const stamp = nowISO();
  const food: UserFood = {
    ...input,
    id,
    userId,
    source: 'manual',
    sourceId: id,
    createdAt: stamp,
    updatedAt: stamp,
  };
  await userFoodRepo.put(food);
  return food;
}
