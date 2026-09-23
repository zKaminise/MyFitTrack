import { useState } from 'react';
import { BackHeader } from '@/ui/PageHeader';
import { Sheet } from '@/ui/components';
import { useUserFoods } from '@/hooks/useData';
import { ManualFoodForm } from '@/components/ManualFoodForm';
import { formatNutrient as f } from '@/components/FoodSearchPanel';
import { toast } from '@/ui/feedback';
import { foodReferenceLabel, foodReferenceNutrients } from '@/domain/nutrition';

export default function UserFoodsPage() {
  const foods = useUserFoods() ?? [];
  const [creating, setCreating] = useState(false);
  return <div className="screen narrow-screen"><BackHeader title="Meus alimentos" right={<button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>＋ Criar</button>} />
    <p className="muted">Cadastre alimentos pelo rótulo ou pela sua receita. Eles aparecem em “Meus” ao adicionar à dieta.</p>
    {!foods.length && <p className="empty card">Nenhum alimento personalizado ainda. Para juntar arroz, carne e outros ingredientes, use “Minhas refeições”.</p>}
    <div className="stack-sm">{foods.map(food => { const nutrients = foodReferenceNutrients(food); return <article className="card" key={food.id}><h3>{food.name}</h3><p>{f(nutrients.calories)} kcal · P {f(nutrients.protein)} · C {f(nutrients.carbs)} · G {f(nutrients.fat)} / {foodReferenceLabel(food)}</p></article>; })}</div>
    {creating && <Sheet open title="Criar alimento" onClose={() => setCreating(false)}><ManualFoodForm onCreated={() => { setCreating(false); toast('✓ Alimento salvo'); }} /></Sheet>}
  </div>;
}
