import { useState } from 'react';
import type { FoodReference, FoodUnit, NutrientValues } from '@/domain/types';
import { createManualFood } from '@/services/nutritionService';
import { toast } from '@/ui/feedback';
import { LocalizedDecimalInput } from './LocalizedDecimalInput';
import { foodUnitLabel } from '@/domain/nutrition';

export const macroFields = [['calories', 'Calorias (kcal)'], ['protein', 'Proteína (g)'], ['carbs', 'Carboidratos (g)'], ['fat', 'Gorduras (g)']] as const;
export function validNutrients(values: NutrientValues) { return macroFields.every(([key]) => Number.isFinite(values[key]) && values[key] >= 0); }
export function MacroInputs({ values, onChange }: { values: NutrientValues; onChange: (values: NutrientValues) => void }) {
  return <div className="macro-inputs">{macroFields.map(([key, label]) => <label key={key}>{label}<LocalizedDecimalInput value={Number.isFinite(values[key]) ? values[key] : null} ariaLabel={label} onValueChange={value => onChange({ ...values, [key]: value ?? Number.NaN })} /></label>)}</div>;
}

type ManualUnit = Extract<FoodUnit, 'g' | 'unidade' | 'fatia'>;

export function ManualFoodForm({ onCreated }: { onCreated: (food: FoodReference) => void }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState<ManualUnit>('g');
  const [servingSize, setServingSize] = useState<number | null>(100);
  const [values, setValues] = useState<NutrientValues>({ calories: Number.NaN, protein: Number.NaN, carbs: Number.NaN, fat: Number.NaN });
  const [saving, setSaving] = useState(false);
  const validServing = servingSize != null && Number.isFinite(servingSize) && servingSize > 0;
  const reference = validServing ? `${servingSize} ${foodUnitLabel(unit, servingSize)}` : 'a porção escolhida';
  async function save() {
    if (saving || !name.trim() || !validServing || !validNutrients(values)) return;
    setSaving(true);
    try {
      const per100Factor = unit === 'g' ? 100 / servingSize : null;
      const food = await createManualFood({
        name: name.trim(), servingSize, servingUnit: unit, servingWeightGrams: unit === 'g' ? servingSize : null,
        servingNutrients: values,
        caloriesPer100g: per100Factor == null ? null : values.calories * per100Factor,
        proteinPer100g: per100Factor == null ? null : values.protein * per100Factor,
        carbsPer100g: per100Factor == null ? null : values.carbs * per100Factor,
        fatPer100g: per100Factor == null ? null : values.fat * per100Factor,
      });
      onCreated(food); setName('');
    } catch { toast('Não foi possível salvar o alimento. Tente novamente.'); }
    finally { setSaving(false); }
  }
  return <div className="stack-sm"><label>Nome do alimento<input className="input" placeholder="Ex.: ovos mexidos ou fatia de bacon" value={name} onChange={e => setName(e.target.value)} /></label>
    <div><strong>Como você mede este alimento?</strong><div className="segmented segmented--three">
      {([['g', 'Peso (g)'], ['unidade', 'Quantidade'], ['fatia', 'Fatias']] as const).map(([value, label]) => <button key={value} className={unit === value ? 'active' : ''} onClick={() => { setUnit(value); setServingSize(value === 'g' ? 100 : 1); }}>{label}</button>)}
    </div></div>
    <label>Quantidade de referência<LocalizedDecimalInput value={servingSize} min={0.01} ariaLabel="Quantidade de referência" placeholder={unit === 'g' ? '150' : '1'} onValueChange={setServingSize} /></label>
    <p className="faint">Informe os macros de <strong>{reference}</strong>. Ao usar outra quantidade, o aplicativo calcula a proporção.</p>
    <MacroInputs values={values} onChange={setValues} />
    <button className="btn btn--primary btn--block" disabled={saving || !name.trim() || !validServing || !validNutrients(values)} onClick={() => void save()}>{saving ? 'SALVANDO...' : 'SALVAR ALIMENTO'}</button>
  </div>;
}
