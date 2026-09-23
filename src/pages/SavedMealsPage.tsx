import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { FoodReference, SavedMeal, SavedMealItem } from '@/domain/types';
import { useSavedMeals } from '@/hooks/useData';
import { defaultFoodQuantity, defaultFoodUnit, foodUnitLabel, nutrientsForFood, savedMealTotals } from '@/domain/nutrition';
import { savedMealRepo } from '@/repositories/dexie';
import { getCurrentUserId } from '@/repositories/context';
import { nowISO, uuid } from '@/lib/id';
import { confirmAction, toast } from '@/ui/feedback';
import { Sheet } from '@/ui/components';
import { FoodSearchPanel, formatNutrient as f } from '@/components/FoodSearchPanel';
import { ManualFoodForm, validNutrients } from '@/components/ManualFoodForm';
import { LocalizedDecimalInput } from '@/components/LocalizedDecimalInput';

export default function SavedMealsPage() {
  const nav = useNavigate();
  const saved = useSavedMeals() ?? [];
  const [editing, setEditing] = useState<SavedMeal | 'new' | null>(null);
  return <div className="screen narrow-screen">
    <div className="row-between"><div><button className="back-btn" onClick={() => nav('/more')}>← Mais</button><h1 className="page-title">Minhas refeições</h1></div><button className="btn btn--primary" onClick={() => setEditing('new')}>＋ Criar</button></div>
    <p className="muted">Monte sua marmita uma vez. Depois, adicione uma porção ao almoço, jantar ou outra refeição do dia.</p>
    {!saved.length && <div className="empty card"><span className="emoji">🍱</span><strong>Sua rotina, pronta para repetir</strong><p>Salve “Café da manhã” ou “Marmita Almoço” com os alimentos e quantidades. Os macros são somados automaticamente.</p><button className="btn btn--primary" onClick={() => setEditing('new')}>CRIAR PRIMEIRA REFEIÇÃO</button></div>}
    <div className="stack-sm">{saved.map(meal => { const total = savedMealTotals(meal); return <section className="card saved-meal-card" key={meal.id}>
      <div className="row-between"><div><h3>{meal.name}</h3><small>{meal.items.length} ingredientes · 1 porção</small></div><button className="btn btn--sm" onClick={() => setEditing(meal)}>Editar</button></div>
      <p>{meal.items.map(item => `${item.food.name} (${f(item.quantity)} ${foodUnitLabel(item.unit, item.quantity)})`).join(' · ')}</p>
      <div className="meal-total"><strong>{f(total.calories)} kcal</strong><span>P {f(total.protein)} · C {f(total.carbs)} · G {f(total.fat)}</span></div>
      <small>Macros calculados automaticamente pelos ingredientes</small>
    </section>; })}</div>
    {editing && <SavedMealEditor meal={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
  </div>;
}

function SavedMealEditor({ meal, onClose }: { meal?: SavedMeal; onClose: () => void }) {
  const [name, setName] = useState(meal?.name ?? '');
  const [items, setItems] = useState<SavedMealItem[]>(meal?.items ?? []);
  const [picker, setPicker] = useState(false);
  const [manualFood, setManualFood] = useState(false);
  const [saving, setSaving] = useState(false);
  const total = savedMealTotals({ items, manualNutrients: null });
  const valid = name.trim() && items.length > 0 && items.every(item => Number.isFinite(item.quantity) && item.quantity > 0) && validNutrients(total);
  function add(food: FoodReference) {
    const quantity = defaultFoodQuantity(food);
    const unit = defaultFoodUnit(food);
    setItems(current => [...current, { id: uuid(), food, quantity, unit, nutrients: nutrientsForFood(food, quantity, unit) }]);
    setPicker(false); setManualFood(false);
  }
  function change(id: string, quantity: number) {
    setItems(current => current.map(item => item.id === id ? { ...item, quantity, nutrients: nutrientsForFood(item.food, quantity, item.unit) } : item));
  }
  async function save() {
    const uid = getCurrentUserId();
    if (!uid || !valid || saving) return;
    setSaving(true);
    try {
      const stamp = nowISO();
      await savedMealRepo.put({ ...meal, id: meal?.id ?? uuid(), userId: uid, name: name.trim(), items, manualNutrients: null, createdAt: meal?.createdAt ?? stamp, updatedAt: stamp });
      toast('✓ Refeição salva. Disponível ao adicionar à dieta.'); onClose();
    } catch { toast('Não foi possível salvar a refeição. Tente novamente.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!meal || !await confirmAction({ title: 'Excluir refeição salva?', message: 'Os registros já consumidos no histórico serão mantidos.', danger: true, confirmLabel: 'Excluir' })) return;
    try { await savedMealRepo.remove(meal.id); onClose(); } catch { toast('Não foi possível excluir.'); }
  }
  return <Sheet open onClose={onClose} title={meal ? 'Editar refeição' : 'Criar refeição personalizada'}>
    <div className="stack">
      <label>Nome<input className="input" placeholder="Marmita Almoço" value={name} onChange={e => setName(e.target.value)} /></label>
      <div><h3>Ingredientes de uma porção</h3><p className="faint">As quantidades abaixo formam uma marmita completa.</p></div>
      {items.map(item => <div className="saved-ingredient" key={item.id}>
        <span className="grow"><strong>{item.food.name}</strong><small>{f(item.nutrients.calories)} kcal</small></span>
        <LocalizedDecimalInput ariaLabel={`Quantidade de ${item.food.name}`} value={Number.isFinite(item.quantity) ? item.quantity : null} min={0.01} onValueChange={value => change(item.id, value ?? Number.NaN)} />
        <span>{foodUnitLabel(item.unit, item.quantity)}</span><button className="icon-btn" aria-label={`Remover ${item.food.name}`} onClick={() => setItems(current => current.filter(i => i.id !== item.id))}>×</button>
      </div>)}
      <button className="btn btn--block" onClick={() => setPicker(true)}>＋ Adicionar ingrediente</button>
      {picker && <section className="card stack-sm">
        <div className="row-between"><h3>Escolher ingrediente</h3><button className="icon-btn" aria-label="Fechar busca" onClick={() => setPicker(false)}>×</button></div>
        <div className="segmented"><button className={!manualFood ? 'active' : ''} onClick={() => setManualFood(false)}>Buscar alimento</button><button className={manualFood ? 'active' : ''} onClick={() => setManualFood(true)}>Criar alimento</button></div>
        {manualFood ? <ManualFoodForm onCreated={add} /> : <FoodSearchPanel onPick={add} />}
      </section>}
      <div><h3>Macros da refeição</h3><p className="faint">Soma automática de todos os ingredientes desta porção.</p></div>
      <div className="meal-total"><strong>{f(total.calories)} kcal</strong><span>P {f(total.protein)} g · C {f(total.carbs)} g · G {f(total.fat)} g</span></div>
      <button className="btn btn--primary btn--block" disabled={!valid || saving} onClick={() => void save()}>{saving ? 'SALVANDO...' : 'SALVAR REFEIÇÃO'}</button>
      {meal && <button className="btn btn--danger btn--block" disabled={saving} onClick={() => void remove()}>Excluir refeição salva</button>}
    </div>
  </Sheet>;
}
