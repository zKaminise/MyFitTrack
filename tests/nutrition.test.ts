import { describe, expect, it } from 'vitest';
import { nutrientsForFood, savedMealTotals, scaleNutrients } from '../src/domain/nutrition';
import type { FoodReference, SavedMeal } from '../src/domain/types';
import { normalizeOpenFoodFactsProduct } from '../src/nutrition/providers/openFoodFacts';

const rice: FoodReference = { id:'rice',source:'manual',sourceId:'rice',name:'Arroz',caloriesPer100g:130,proteinPer100g:2.5,carbsPer100g:28,fatPer100g:.3,fiberPer100g:1 };

describe('nutrition calculations', () => {
  it('scales 100g nutrients to 150g without premature rounding', () => {
    const result = nutrientsForFood(rice,150,'g');
    expect(result).toMatchObject({calories:195,protein:3.75,carbs:42});
    expect(result.fat).toBeCloseTo(.45, 8);
  });
  it('sums a saved meal and supports half a portion', () => {
    const meal: SavedMeal = {id:'m',name:'Marmita',userId:'u',createdAt:'x',updatedAt:'x',items:[
      {id:'1',food:rice,quantity:150,unit:'g',nutrients:nutrientsForFood(rice,150,'g')},
      {id:'2',food:{...rice,id:'meat',name:'Patinho'},quantity:200,unit:'g',nutrients:{calories:440,protein:60,carbs:0,fat:20,fiber:0}},
      {id:'3',food:{...rice,id:'veg',name:'Legumes'},quantity:100,unit:'g',nutrients:{calories:50,protein:3,carbs:10,fat:.5,fiber:4}},
    ]};
    const total=savedMealTotals(meal); expect(total).toMatchObject({calories:685,protein:66.75,carbs:52}); expect(scaleNutrients(total,.5).calories).toBe(342.5);
  });
  it('normalizes Open Food Facts without inventing missing nutrients', () => {
    const food = normalizeOpenFoodFactsProduct({code:'789',product_name_pt:'Arroz brasileiro',brands:'Marca',nutriments:{'energy-kcal_100g':130,proteins_100g:2.5,carbohydrates_100g:28,fat_100g:.3}});
    expect(food).toMatchObject({id:'open-food-facts:789',name:'Arroz brasileiro',brand:'Marca',caloriesPer100g:130});
    expect(food?.fiberPer100g).toBeNull();
  });
});
