import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Sheet } from '@/ui/components';
import { useNutritionDay, useNutritionDays, useNutritionSettings, useSavedMeals, useUserFoods } from '@/hooks/useData';
import { addDays, longDate, todayISO } from '@/domain/dates';
import { nutritionDayTotals, nutrientsForFood } from '@/domain/nutrition';
import type { FoodLogStatus, FoodReference, SavedMeal } from '@/domain/types';
import { addFoodToDay, addSavedMealToDay, createManualFood, ensureNutritionSettings, removeFoodLog, updateFoodLog } from '@/services/nutritionService';
import { searchFoods } from '@/nutrition/foodSearch';
import { toast } from '@/ui/feedback';
import { db } from '@/db/database';

const n = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);
const percent = (value: number, target: number) => Math.min(100, target ? value / target * 100 : 0);

export default function NutritionPage() {
  const nav = useNavigate();
  const [date, setDate] = useState(todayISO());
  const settings = useNutritionSettings();
  const day = useNutritionDay(date);
  const days = useNutritionDays() ?? [];
  const [slotId, setSlotId] = useState<string | null>(null);
  useEffect(() => { if (!settings) void ensureNutritionSettings(); }, [settings]);
  if (!settings) return <div className="screen"><div className="nutrition-skeleton card">Preparando sua alimentação...</div></div>;
  const totals = nutritionDayTotals(day);
  const remaining = settings.calorieTarget - totals.calories;
  const recentDays = days.filter(d => d.date < date).sort((a,b) => b.date.localeCompare(a.date)).slice(0,7);
  const average = recentDays.length ? recentDays.reduce((sum,d) => sum + nutritionDayTotals(d).calories, 0) / recentDays.length : 0;
  return <div className="screen nutrition-screen">
    <div className="row-between"><div><span className="eyebrow">MYFITTRACK</span><h1 className="page-title">Alimentação</h1></div><div className="row"><button className="icon-btn" onClick={() => nav('/nutrition/meals')} aria-label="Refeições salvas">🍱</button><button className="icon-btn" onClick={() => nav('/nutrition/settings')} aria-label="Configurações">⚙</button></div></div>
    <div className="nutrition-date row-between"><button className="icon-btn" onClick={() => setDate(addDays(date,-1))}>‹</button><div className="center"><strong>{date === todayISO() ? 'Hoje' : longDate(date)}</strong><small>{longDate(date)}</small></div><button className="icon-btn" onClick={() => setDate(addDays(date,1))}>›</button></div>
    <section className="nutrition-hero card">
      <div className="row-between"><div><span className="faint">Consumido</span><div className="nutrition-kcal"><strong>{n(totals.calories)}</strong><span> / {n(settings.calorieTarget)} kcal</span></div></div><div className={`remaining ${remaining < 0 ? 'over' : ''}`}>{remaining >= 0 ? `${n(remaining)} restantes` : `+${n(-remaining)} kcal`}</div></div>
      <Progress value={totals.calories} target={settings.calorieTarget} />
      <div className="macro-grid"><Macro label="Proteína" short="P" value={totals.protein} target={settings.proteinTarget}/><Macro label="Carboidrato" short="C" value={totals.carbs} target={settings.carbsTarget}/><Macro label="Gordura" short="G" value={totals.fat} target={settings.fatTarget}/></div>
    </section>
    <div className="row-between section-head"><h2>Refeições</h2>{average > 0 && <span className="faint">Média 7 dias: {n(average)} kcal</span>}</div>
    <div className="nutrition-meals">
      {[...settings.mealSlots].sort((a,b) => a.order-b.order).map(slot => {
        const items = day?.items.filter(i => i.mealSlotId === slot.id) ?? [];
        const consumed = items.filter(i => i.status === 'consumed').reduce((s,i)=>s+i.nutrients.calories,0);
        return <section className="meal-card card" key={slot.id}><div className="row-between"><h3>{slot.name}</h3><strong>{n(consumed)} kcal</strong></div>
          {items.length === 0 ? <p className="faint meal-empty">Nenhum item registrado</p> : items.map(item => <div className={`food-log ${item.status}`} key={item.id}><div className="grow"><strong>{item.nameSnapshot}</strong><small>{n(item.quantity)} {item.unit} · {n(item.nutrients.calories)} kcal · P {n(item.nutrients.protein)} C {n(item.nutrients.carbs)} G {n(item.nutrients.fat)}</small></div>{item.status === 'planned' && <button className="mini-action" onClick={() => void updateFoodLog(date,item.id,{status:'consumed'}).then(()=>toast('Refeição registrada'))}>Consumir</button>}<button className="mini-action danger-text" aria-label="Remover" onClick={() => void removeFoodLog(date,item.id)}>×</button></div>)}
          <button className="meal-add" onClick={() => setSlotId(slot.id)}>＋ Adicionar</button>
        </section>;
      })}
    </div>
    <FoodPicker open={Boolean(slotId)} slotId={slotId ?? ''} date={date} onClose={() => setSlotId(null)} />
  </div>;
}

function Progress({value,target}:{value:number;target:number}) { return <div className="nutrition-progress"><span style={{width:`${percent(value,target)}%`}}/></div>; }
function Macro({label,short,value,target}:{label:string;short:string;value:number;target:number}) { return <div className="macro"><div className="row-between"><span><b>{short}</b> {label}</span><small>{n(value)} / {n(target)}g</small></div><Progress value={value} target={target}/></div>; }

function FoodPicker({open,slotId,date,onClose}:{open:boolean;slotId:string;date:string;onClose:()=>void}) {
  const settings = useNutritionSettings(); const userFoods = useUserFoods(); const meals = useSavedMeals() ?? [];
  const foodCache = useLiveQuery(() => db.foodCache.toArray(), [], []);
  const [tab,setTab] = useState<'search'|'recent'|'favorites'|'mine'|'meals'|'manual'>('search'); const [query,setQuery]=useState(''); const [results,setResults]=useState<FoodReference[]>([]); const [loading,setLoading]=useState(false); const [selected,setSelected]=useState<FoodReference|null>(null); const [selectedMeal,setSelectedMeal]=useState<SavedMeal|null>(null); const [quantity,setQuantity]=useState(100); const [status,setStatus]=useState<FoodLogStatus>('consumed');
  useEffect(()=>{ if(tab!=='search'||query.trim().length<2){setResults([]);return;} const ctrl=new AbortController(); const id=setTimeout(()=>{setLoading(true); void searchFoods(query,ctrl.signal).then(setResults).catch(()=>setResults([])).finally(()=>setLoading(false));},450); return()=>{clearTimeout(id);ctrl.abort();};},[query,tab]);
  const cached = useMemo(() => [...(userFoods ?? []), ...(foodCache ?? []).map(row => row.food)].filter((food,index,all)=>all.findIndex(candidate=>candidate.id===food.id)===index) as FoodReference[], [userFoods, foodCache]);
  const visible = tab==='mine' ? cached : tab==='recent' ? cached.filter(f=>settings?.recentFoodIds.includes(f.id)) : tab==='favorites' ? cached.filter(f=>settings?.favoriteFoodIds.includes(f.id)) : results;
  const choose = (food:FoodReference)=>{setSelected(food);setSelectedMeal(null);setQuantity(food.servingWeightGrams ?? 100);};
  async function add(){ if(selected){await addFoodToDay({date,mealSlotId:slotId,food:selected,quantity,unit:'g',status});} else if(selectedMeal){await addSavedMealToDay({date,mealSlotId:slotId,meal:selectedMeal,portions:quantity,status});} else return; toast(status==='planned'?'Adicionado ao planejamento':'Adicionado ao dia'); setSelected(null);setSelectedMeal(null);onClose(); }
  return <Sheet open={open} onClose={onClose} title="Adicionar à refeição" subtitle="Busque online ou use seus itens disponíveis offline." className="food-picker-sheet">
    {!selected && !selectedMeal ? <><div className="food-tabs">{([['search','Buscar'],['recent','Recentes'],['favorites','Favoritos'],['mine','Meus'],['meals','Refeições'],['manual','Criar']] as const).map(([id,label])=><button className={tab===id?'active':''} onClick={()=>setTab(id)} key={id}>{label}</button>)}</div>
      {tab==='search'&&<input className="input" autoFocus placeholder="Buscar alimento ou marca..." value={query} onChange={e=>setQuery(e.target.value)}/>} {loading&&<p className="muted">Buscando alimentos...</p>}
      {tab==='meals'?<div className="food-results">{meals.map(m=><button className="food-result" key={m.id} onClick={()=>{setSelectedMeal(m);setQuantity(1)}}><span className="grow"><strong>{m.name}</strong><small>{m.items.length} ingredientes</small></span><span>＋</span></button>)}</div>:tab==='manual'?<ManualFood onCreated={choose}/>:<div className="food-results">{visible.map(food=><button className="food-result" key={food.id} onClick={()=>choose(food)}><span className="grow"><strong>{food.name}</strong><small>{food.brand ? `${food.brand} · `:''}{n(food.caloriesPer100g ?? 0)} kcal / 100g</small></span><span>＋</span></button>)}{tab==='search'&&!loading&&query.length>1&&!visible.length&&<p className="empty-small">Nenhum resultado. Você ainda pode criar um alimento manual.</p>}</div>}
    </>:<div className="food-detail"><button className="btn btn--ghost" onClick={()=>{setSelected(null);setSelectedMeal(null)}}>← Voltar</button><h3>{selected?.name ?? selectedMeal?.name}</h3><label>Quantidade</label><div className="quantity-row"><input className="input" type="number" min="0.1" step="0.5" value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/><span>{selectedMeal?'porção':'g'}</span></div>{selected&&<div className="macro-preview">{n(nutrientsForFood(selected,quantity,'g').calories)} kcal</div>}<div className="segmented"><button className={status==='consumed'?'active':''} onClick={()=>setStatus('consumed')}>Consumido</button><button className={status==='planned'?'active':''} onClick={()=>setStatus('planned')}>Planejado</button></div><button className="btn btn--primary btn--block" onClick={()=>void add()}>ADICIONAR</button></div>}
  </Sheet>;
}

function ManualFood({onCreated}:{onCreated:(f:FoodReference)=>void}) { const [name,setName]=useState(''); const [kcal,setKcal]=useState(0); const [protein,setProtein]=useState(0); const [carbs,setCarbs]=useState(0); const [fat,setFat]=useState(0); async function save(){if(!name.trim())return; const food=await createManualFood({name:name.trim(),brand:null,servingSize:100,servingUnit:'g',servingWeightGrams:100,caloriesPer100g:kcal,proteinPer100g:protein,carbsPer100g:carbs,fatPer100g:fat,fiberPer100g:null});onCreated(food);} const fields: Array<[string,number,(value:number)=>void]>=[['kcal',kcal,setKcal],['Proteína',protein,setProtein],['Carbo',carbs,setCarbs],['Gordura',fat,setFat]]; return <div className="manual-food stack-sm"><input className="input" placeholder="Nome do alimento" value={name} onChange={e=>setName(e.target.value)}/><p className="faint">Valores por 100 g</p><div className="macro-inputs">{fields.map(([label,value,setter])=><label key={label}>{label}<input className="input" type="number" value={value} onChange={e=>setter(Number(e.target.value))}/></label>)}</div><button className="btn btn--primary btn--block" onClick={()=>void save()}>CRIAR ALIMENTO</button></div>; }
