import type { FoodReference, FoodUnit } from '@/domain/types';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import type { NutritionProvider } from './types';

interface OffProduct {
  code?: string;
  product_name_pt?: string;
  product_name?: string;
  generic_name_pt?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

function numberValue(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const parsed = typeof value === 'number' ? value : Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

function serving(value?: string): { size: number | null; unit: FoodUnit | null } {
  const match = value?.match(/([\d.,]+)\s*(g|ml)/i);
  if (!match) return { size: null, unit: null };
  return { size: numberValue(match[1]), unit: match[2].toLowerCase() as FoodUnit };
}

export function normalizeOpenFoodFactsProduct(product: OffProduct): FoodReference | null {
  const sourceId = product.code?.trim();
  const name = (product.product_name_pt || product.product_name || product.generic_name_pt || '').trim();
  if (!sourceId || !name) return null;
  const n = product.nutriments ?? {};
  const kcal = numberValue(n['energy-kcal_100g'])
    ?? (numberValue(n.energy_100g) != null ? numberValue(n.energy_100g)! / 4.184 : null);
  const parsedServing = serving(product.serving_size);
  return {
    id: `open-food-facts:${sourceId}`,
    source: 'open-food-facts',
    sourceId,
    name,
    brand: product.brands?.trim() || null,
    servingSize: parsedServing.size,
    servingUnit: parsedServing.unit,
    servingWeightGrams: parsedServing.unit === 'g' ? parsedServing.size : null,
    caloriesPer100g: kcal,
    proteinPer100g: numberValue(n.proteins_100g),
    carbsPer100g: numberValue(n.carbohydrates_100g),
    fatPer100g: numberValue(n.fat_100g),
    fiberPer100g: numberValue(n.fiber_100g),
  };
}

async function directSearch(query: string, signal?: AbortSignal): Promise<OffProduct[]> {
  const params = new URLSearchParams({
    action: 'process',
    search_simple: '1',
    search_terms: query,
    json: '1',
    page_size: '20',
    fields: 'code,product_name_pt,product_name,generic_name_pt,brands,serving_size,nutriments',
  });
  const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params}`, { signal });
  if (!response.ok) throw new Error('nutrition_provider_unavailable');
  const json = await response.json() as { products?: OffProduct[] };
  return json.products ?? [];
}

export const openFoodFactsProvider: NutritionProvider = {
  async searchFoods(query, signal) {
    let products: OffProduct[];
    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.functions.invoke('nutrition-search', {
        body: { query },
      });
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (error) throw error;
      products = (data?.products ?? []) as OffProduct[];
    } else {
      products = await directSearch(query, signal);
    }
    return products
      .map(normalizeOpenFoodFactsProduct)
      .filter((food): food is FoodReference => food !== null && food.caloriesPer100g !== null);
  },

  async getFood(id, signal) {
    const code = id.replace(/^open-food-facts:/, '');
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v3/product/${encodeURIComponent(code)}?fields=code,product_name_pt,product_name,generic_name_pt,brands,serving_size,nutriments`,
      { signal },
    );
    if (!response.ok) return null;
    const json = await response.json() as { product?: OffProduct };
    return json.product ? normalizeOpenFoodFactsProduct(json.product) : null;
  },
};
