import { useState } from 'react';
import type { FoodReference, NutrientValues } from '@/domain/types';
import { createManualFood } from '@/services/nutritionService';
import { toast } from '@/ui/feedback';

export const macroFields = [['calories', 'Calorias (kcal)'], ['protein', 'Proteína (g)'], ['carbs', 'Carboidratos (g)'], ['fat', 'Gorduras (g)']] as const;
export function validNutrients(values: NutrientValues) { return macroFields.every(([key]) => Number.isFinite(values[key]) && values[key] >= 0); }
export function MacroInputs({ values, onChange }: { values: NutrientValues; onChange: (values: NutrientValues) => void }) {
  return <div className="macro-inputs">{macroFields.map(([key, label]) => <label key={key}>{label}<input className="input" type="number" inputMode="decimal" min="0" step="any" placeholder="0" value={values[key] || ''} onChange={e => onChange({ ...values, [key]: Number(e.target.value) })} /></label>)}</div>;
}
export function ManualFoodForm({ onCreated }: { onCreated: (food: FoodReference) => void }) {
  const [name, setName] = useState('');
  const [values, setValues] = useState<NutrientValues>({ calories: 0, protein: 0, carbs: 0, fat: 0 });
  const [saving, setSaving] = useState(false);
  async function save() {
    if (saving || !name.trim() || !validNutrients(values)) return;
    setSaving(true);
    try {
      const food = await createManualFood({ name: name.trim(), servingSize: 100, servingUnit: 'g', servingWeightGrams: 100,
        caloriesPer100g: values.calories, proteinPer100g: values.protein, carbsPer100g: values.carbs, fatPer100g: values.fat });
      onCreated(food); setName('');
    } catch { toast('Não foi possível salvar o alimento. Tente novamente.'); }
    finally { setSaving(false); }
  }
  return <div className="stack-sm"><label>Nome do alimento<input className="input" placeholder="Ex.: meu pão caseiro" value={name} onChange={e => setName(e.target.value)} /></label>
    <p className="faint">Informe os valores por 100 g, conforme o rótulo ou sua receita.</p>
    <MacroInputs values={values} onChange={setValues} />
    <button className="btn btn--primary btn--block" disabled={saving || !name.trim() || !validNutrients(values)} onClick={() => void save()}>{saving ? 'SALVANDO...' : 'SALVAR ALIMENTO'}</button>
  </div>;
}
