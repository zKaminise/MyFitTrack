import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useNutritionDay, useNutritionDays, useNutritionSettings } from '@/hooks/useData';
import { addDays, longDate, todayISO } from '@/domain/dates';
import { nutritionDayTotals } from '@/domain/nutrition';
import { ensureNutritionSettings, removeFoodLog, updateFoodLog } from '@/services/nutritionService';
import { toast } from '@/ui/feedback';
import { FoodPicker } from '@/components/FoodPicker';

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
    {slotId && <FoodPicker slotId={slotId} date={date} onClose={() => setSlotId(null)} />}
  </div>;
}

function Progress({value,target}:{value:number;target:number}) { return <div className="nutrition-progress"><span style={{width:`${percent(value,target)}%`}}/></div>; }
function Macro({label,short,value,target}:{label:string;short:string;value:number;target:number}) { return <div className="macro"><div className="row-between"><span><b>{short}</b> {label}</span><small>{n(value)} / {n(target)}g</small></div><Progress value={value} target={target}/></div>; }
