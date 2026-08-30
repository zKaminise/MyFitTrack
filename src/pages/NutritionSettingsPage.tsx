import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import type { NutritionSettings } from '@/domain/types';
import { useNutritionSettings } from '@/hooks/useData';
import { ensureNutritionSettings } from '@/services/nutritionService';
import { nutritionSettingsRepo } from '@/repositories/dexie';
import { nowISO, uuid } from '@/lib/id';
import { toast } from '@/ui/feedback';
import { db } from '@/db/database';

export default function NutritionSettingsPage() {
  const nav = useNavigate(); const current = useNutritionSettings();
  const [draft, setDraft] = useState<NutritionSettings | undefined>(current);
  const cachedFoods = useLiveQuery(() => db.foodCache.orderBy('updatedAt').reverse().limit(30).toArray(), [], []);
  useEffect(() => { if (current) setDraft(current); else void ensureNutritionSettings(); }, [current]);
  if (!draft) return <div className="screen">Carregando...</div>;
  const set = (key: 'calorieTarget'|'proteinTarget'|'carbsTarget'|'fatTarget', value: number) => setDraft({...draft,[key]:value});
  async function save() { if (!draft) return; await nutritionSettingsRepo.put({...draft,updatedAt:nowISO()}); toast('✓ Metas salvas'); nav('/nutrition'); }
  return <div className="screen narrow-screen"><button className="back-btn" onClick={()=>nav('/nutrition')}>← Alimentação</button><h1 className="page-title">Metas e refeições</h1><p className="muted">Você define suas metas. O MyFitTrack apenas acompanha o que foi registrado.</p>
    <section className="card settings-card"><h2>Metas diárias</h2>{([['Calorias','calorieTarget','kcal'],['Proteína','proteinTarget','g'],['Carboidratos','carbsTarget','g'],['Gorduras','fatTarget','g']] as const).map(([label,key,unit])=><label className="setting-field" key={key}><span>{label}</span><div><input className="input" type="number" value={draft[key]} onChange={e=>set(key,Number(e.target.value))}/><b>{unit}</b></div></label>)}</section>
    <section className="card settings-card"><div className="row-between"><h2>Refeições</h2><button className="mini-action" onClick={()=>setDraft({...draft,mealSlots:[...draft.mealSlots,{id:uuid(),name:'Nova refeição',order:draft.mealSlots.length}]})}>＋ Nova</button></div>{draft.mealSlots.map((slot,i)=><div className="row" key={slot.id}><input className="input grow" value={slot.name} onChange={e=>setDraft({...draft,mealSlots:draft.mealSlots.map(s=>s.id===slot.id?{...s,name:e.target.value}:s)})}/><button className="icon-btn" onClick={()=>setDraft({...draft,mealSlots:draft.mealSlots.filter(s=>s.id!==slot.id).map((s,j)=>({...s,order:j}))})}>×</button><span className="faint">{i+1}</span></div>)}</section>
    <section className="card settings-card"><h2>Favoritos</h2><p className="faint">Marque alimentos já pesquisados para encontrá-los rapidamente e offline.</p>{cachedFoods.map(({food})=>{const active=draft.favoriteFoodIds.includes(food.id);return <button type="button" className="favorite-food-row" key={food.id} onClick={()=>setDraft({...draft,favoriteFoodIds:active?draft.favoriteFoodIds.filter(id=>id!==food.id):[...draft.favoriteFoodIds,food.id]})}><span className="grow">{food.name}</span><span>{active?'★':'☆'}</span></button>})}{cachedFoods.length===0&&<p className="faint">Pesquise um alimento primeiro para adicioná-lo aos favoritos.</p>}</section>
    <button className="btn btn--primary btn--block btn--lg sticky-save" onClick={()=>void save()}>SALVAR ALTERAÇÕES</button></div>;
}
