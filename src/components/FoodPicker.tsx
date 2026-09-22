import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '@/ui/components';
import { useNutritionSettings, useSavedMeals, useUserFoods } from '@/hooks/useData';
import { db } from '@/db/database';
import type { FoodLogStatus, FoodReference, FoodUnit, SavedMeal } from '@/domain/types';
import { nutrientsForFood, savedMealTotals, scaleNutrients } from '@/domain/nutrition';
import { addFoodToDay, addSavedMealToDay } from '@/services/nutritionService';
import { localFoods, foodSourceLabel } from '@/nutrition/localFoods';
import { FoodResult, FoodSearchPanel, formatNutrient as n } from './FoodSearchPanel';
import { ManualFoodForm } from './ManualFoodForm';
import { toast } from '@/ui/feedback';
import { nutritionSettingsRepo } from '@/repositories/dexie';
import { nowISO } from '@/lib/id';

export function FoodPicker({ slotId, date, onClose }: { slotId: string; date: string; onClose: () => void }) {
  const nav = useNavigate();
  const settings = useNutritionSettings();
  const mine = useUserFoods();
  const meals = useSavedMeals() ?? [];
  const cache = useLiveQuery(() => db.foodCache.toArray(), [], []);
  const [tab, setTab] = useState<'search' | 'recent' | 'favorites' | 'mine' | 'meals' | 'manual'>('search');
  const [food, setFood] = useState<FoodReference | null>(null);
  const [meal, setMeal] = useState<SavedMeal | null>(null);
  const [quantity, setQuantity] = useState('100');
  const [unit, setUnit] = useState<FoodUnit>('g');
  const [status, setStatus] = useState<FoodLogStatus>('consumed');
  const [saving, setSaving] = useState(false);
  const available = useMemo(() => [...(mine ?? []), ...localFoods, ...cache.map(row => row.food).filter(f => f.source !== 'manual')]
    .filter((f, i, all) => all.findIndex(other => other.id === f.id) === i), [mine, cache]);
  const visible = tab === 'mine' ? mine ?? [] : tab === 'recent'
    ? (settings?.recentFoodIds ?? []).map(id => available.find(f => f.id === id)).filter((f): f is FoodReference => !!f)
    : available.filter(f => settings?.favoriteFoodIds.includes(f.id));
  const amount = Number(quantity);
  const valid = Number.isFinite(amount) && amount > 0;
  const totals = food ? nutrientsForFood(food, valid ? amount : 0, unit) : meal ? scaleNutrients(savedMealTotals(meal), valid ? amount : 0) : null;
  function choose(selected: FoodReference) {
    setFood(selected); setMeal(null); setQuantity(String(selected.servingWeightGrams ?? 100)); setUnit('g');
  }
  async function add() {
    if (!valid || saving) return;
    setSaving(true);
    try {
      if (food) await addFoodToDay({ date, mealSlotId: slotId, food, quantity: amount, unit, status });
      else if (meal) await addSavedMealToDay({ date, mealSlotId: slotId, meal, portions: amount, status });
      else return;
      toast(status === 'consumed' ? '✓ Adicionado às suas metas do dia' : 'Adicionado ao planejamento'); onClose();
    } catch { toast('Não foi possível registrar. Tente novamente.'); }
    finally { setSaving(false); }
  }
  async function favorite() {
    if (!food || !settings) return;
    const ids = settings.favoriteFoodIds;
    await nutritionSettingsRepo.put({ ...settings, favoriteFoodIds: ids.includes(food.id) ? ids.filter(id => id !== food.id) : [...ids, food.id], updatedAt: nowISO() });
  }
  return <Sheet open onClose={onClose} title="Adicionar à refeição" subtitle="Alimentos avulsos ou uma marmita pronta." className="food-picker-sheet">
    {!food && !meal ? <div className="stack-sm">
      <div className="food-tabs">{([['search', 'Buscar'], ['meals', 'Minhas refeições'], ['recent', 'Recentes'], ['favorites', 'Favoritos'], ['mine', 'Meus'], ['manual', 'Criar']] as const).map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</div>
      {tab === 'search' ? <FoodSearchPanel onPick={choose} /> : tab === 'manual' ? <ManualFoodForm onCreated={choose} /> : tab === 'meals' ? <>
        <button className="btn btn--block" onClick={() => { onClose(); nav('/nutrition/meals'); }}>Gerenciar minhas refeições</button>
        {!meals.length && <p className="empty-small">Crie sua primeira marmita para adicioná-la aqui com um toque.</p>}
        {meals.map(saved => { const t = savedMealTotals(saved); return <button className="food-result" key={saved.id} onClick={() => { setMeal(saved); setFood(null); setQuantity('1'); }}>
          <span className="grow"><strong>{saved.name}</strong><small>{saved.items.length} ingredientes · 1 porção</small><small>{n(t.calories)} kcal · P {n(t.protein)} · C {n(t.carbs)} · G {n(t.fat)}</small></span><span>＋</span>
        </button>; })}
      </> : <div className="food-results">{visible.map(f => <FoodResult key={f.id} food={f} onPick={choose} />)}{!visible.length && <p className="empty-small">Nenhum item nesta lista ainda.</p>}</div>}
    </div> : <div className="food-detail stack-sm">
      <button className="btn btn--ghost" onClick={() => { setFood(null); setMeal(null); }}>← Voltar aos alimentos</button>
      <div className="row-between"><h3>{food?.name ?? meal?.name}</h3>{food && <button className="icon-btn" aria-label="Favoritar alimento" onClick={() => void favorite().catch(() => toast('Não foi possível favoritar'))}>{settings?.favoriteFoodIds.includes(food.id) ? '★' : '☆'}</button>}</div>
      {food && <small className="faint">{foodSourceLabel(food)} · {food.brand ?? 'Composição por 100 g'}</small>}
      {meal && <><p className="faint">1 porção = uma refeição completa. Use 0,5 para meia marmita.</p>{meal.items.map(item => <small key={item.id}>{item.food.name} · {n(item.quantity * (valid ? amount : 0))} {item.unit}</small>)}</>}
      <label>Quantidade<div className="quantity-row"><input className="input" type="number" inputMode="decimal" min="0.1" step="any" value={quantity} onChange={e => setQuantity(e.target.value)} /><span>{meal ? 'porção(ões)' : unit}</span></div></label>
      {food?.servingWeightGrams != null && food.servingWeightGrams > 0 && <div className="segmented"><button className={unit === 'g' ? 'active' : ''} onClick={() => { setUnit('g'); setQuantity(String(food.servingWeightGrams)); }}>Gramas</button><button className={unit === 'porcao' ? 'active' : ''} onClick={() => { setUnit('porcao'); setQuantity('1'); }}>Porção do rótulo ({food.servingWeightGrams} g)</button></div>}
      {food && !food.servingWeightGrams && <small className="faint">Informe o peso em gramas. O tamanho de uma unidade pode variar.</small>}
      {totals && <div className="meal-total"><strong>{n(totals.calories)} kcal</strong><span>P {n(totals.protein)} g · C {n(totals.carbs)} g · G {n(totals.fat)} g</span></div>}
      <div className="segmented"><button className={status === 'consumed' ? 'active' : ''} onClick={() => setStatus('consumed')}>Consumido</button><button className={status === 'planned' ? 'active' : ''} onClick={() => setStatus('planned')}>Planejado</button></div>
      <button className="btn btn--primary btn--block" disabled={!valid || saving} onClick={() => void add()}>{saving ? 'REGISTRANDO...' : 'ADICIONAR'}</button>
    </div>}
  </Sheet>;
}
