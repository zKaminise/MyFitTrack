import { describe, expect, it } from 'vitest';
import { nutrientsForFood, savedMealTotals, scaleNutrients } from '../src/domain/nutrition';
import type { FoodReference, SavedMeal } from '../src/domain/types';
import { normalizeOpenFoodFactsProduct } from '../src/nutrition/providers/openFoodFacts';
import { parseLocalizedDecimal } from '../src/components/LocalizedDecimalInput';

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
  it('accepts comma decimals and scales custom foods by grams, units and slices', () => {
    expect(parseLocalizedDecimal('0,7')).toBe(.7);
    expect(parseLocalizedDecimal('0.3')).toBe(.3);
    expect(parseLocalizedDecimal('')).toBeNull();
    const eggs: FoodReference = { id:'eggs',source:'manual',sourceId:'eggs',name:'Ovos',servingSize:2,servingUnit:'unidade',servingWeightGrams:null,
      servingNutrients:{calories:140,protein:12.6,carbs:.7,fat:9.5},caloriesPer100g:null,proteinPer100g:null,carbsPer100g:null,fatPer100g:null };
    const bacon: FoodReference = { id:'bacon',source:'manual',sourceId:'bacon',name:'Bacon',servingSize:1,servingUnit:'fatia',servingWeightGrams:null,
      servingNutrients:{calories:45,protein:3,carbs:.3,fat:3.5},caloriesPer100g:null,proteinPer100g:null,carbsPer100g:null,fatPer100g:null };
    expect(nutrientsForFood(eggs,1,'unidade')).toMatchObject({calories:70,protein:6.3,carbs:.35,fat:4.75});
    expect(nutrientsForFood(bacon,2,'fatia')).toMatchObject({calories:90,protein:6,carbs:.6,fat:7});
    const meal: SavedMeal = {id:'breakfast',name:'Café da manhã',userId:'u',createdAt:'x',updatedAt:'x',manualNutrients:{calories:999,protein:0,carbs:0,fat:0},items:[
      {id:'eggs',food:eggs,quantity:2,unit:'unidade',nutrients:nutrientsForFood(eggs,2,'unidade')},
      {id:'bacon',food:bacon,quantity:1,unit:'fatia',nutrients:nutrientsForFood(bacon,1,'fatia')},
    ]};
    expect(savedMealTotals(meal)).toMatchObject({calories:185,protein:15.6,carbs:1,fat:13});
  });
  it('normalizes Open Food Facts without inventing missing nutrients', () => {
    const food = normalizeOpenFoodFactsProduct({code:'789',product_name_pt:'Arroz brasileiro',brands:'Marca',nutriments:{'energy-kcal_100g':130,proteins_100g:2.5,carbohydrates_100g:28,fat_100g:.3}});
    expect(food).toMatchObject({id:'open-food-facts:789',name:'Arroz brasileiro',brand:'Marca',caloriesPer100g:130});
    expect(food?.fiberPer100g).toBeNull();
  });
});
