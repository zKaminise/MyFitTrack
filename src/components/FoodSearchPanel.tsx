import { useEffect, useRef, useState } from 'react';
import type { FoodReference } from '@/domain/types';
import { cachedFoods } from '@/nutrition/foodSearch';
import { localFoods, foodSourceLabel, filterFoodCatalog } from '@/nutrition/localFoods';
import { openFoodFactsProvider } from '@/nutrition/providers/openFoodFacts';
import { cacheFood } from '@/services/nutritionService';
import { foodReferenceLabel, foodReferenceNutrients } from '@/domain/nutrition';

export const formatNutrient = (value: number) => new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value);

export function FoodResult({ food, onPick }: { food: FoodReference; onPick: (food: FoodReference) => void }) {
  const nutrients = foodReferenceNutrients(food);
  return <button className="food-result" onClick={() => onPick(food)}>
    <span className="grow"><strong>{food.name}</strong>
      <small>{food.brand ? `${food.brand} · ` : ''}{foodSourceLabel(food)}</small>
      <small>{formatNutrient(nutrients.calories)} kcal · P {formatNutrient(nutrients.protein)} · C {formatNutrient(nutrients.carbs)} · G {formatNutrient(nutrients.fat)} / {foodReferenceLabel(food)}</small>
    </span><span aria-hidden>＋</span>
  </button>;
}

/** Busca local imediata; marcas são consultadas sob demanda para evitar disparos
 * por tecla e os limites de pesquisa do Open Food Facts. */
export function FoodSearchPanel({ onPick }: { onPick: (food: FoodReference) => void }) {
  const [query, setQuery] = useState('');
  const [local, setLocal] = useState<FoodReference[]>(localFoods);
  const [remote, setRemote] = useState<FoodReference[]>([]);
  const [limit, setLimit] = useState(25);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    request.current?.abort(); setLoading(false); setRemote([]); setLimit(25); setMessage('');
    setLocal(filterFoodCatalog(localFoods, query));
    void cachedFoods(query).then(foods => { if (active) setLocal(foods); }).catch(() => {
      if (active) setMessage('Não foi possível ler seus alimentos salvos. A base local continua disponível.');
    });
    return () => { active = false; request.current?.abort(); };
  }, [query]);
  async function brands() {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    if (!navigator.onLine) { setMessage('Sem conexão. Os alimentos locais continuam disponíveis.'); return; }
    setLoading(true); setMessage('');
    try {
      const foods = await openFoodFactsProvider.searchFoods(query, controller.signal);
      if (controller.signal.aborted) return;
      setRemote(foods);
      setMessage(foods.length ? '' : 'Nenhum produto com macros completos encontrado para esta busca.');
      await Promise.all(foods.map(food => cacheFood(food, query)));
    } catch { if (!controller.signal.aborted) setMessage('A busca de marcas não respondeu. Você pode usar os resultados locais ou tentar novamente.'); }
    finally { if (!controller.signal.aborted) setLoading(false); }
  }
  return <div className="stack-sm">
    <input className="input" aria-label="Buscar alimento" placeholder="Maçã, arroz cozido, chocolate..." value={query} onChange={e => setQuery(e.target.value)} />
    <div className="food-catalog-info"><strong>{localFoods.length} alimentos com macros disponíveis offline</strong><small>Escolha o preparo correto e informe a quantidade consumida.</small></div>
    <div className="food-results">{local.slice(0, limit).map(food => <FoodResult key={food.id} food={food} onPick={onPick} />)}</div>
    {local.length > limit && <button className="btn btn--block" onClick={() => setLimit(value => value + 25)}>Mostrar mais ({local.length - limit})</button>}
    {!local.length && <p className="faint">Nenhum alimento local encontrado.</p>}
    <button className="btn btn--block" disabled={query.trim().length < 2 || loading} onClick={() => void brands()}>{loading ? 'Buscando produtos...' : 'Buscar marcas e produtos online'}</button>
    <p className="faint" role="status">{message}</p>
    {!!remote.length && <div className="stack-sm"><h3>Produtos · Open Food Facts</h3>{remote.map(food => <FoodResult key={food.id} food={food} onPick={onPick} />)}</div>}
    <small className="food-attribution">Base local: <a href="https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf" target="_blank" rel="noreferrer">TACO, NEPA/UNICAMP, 4ª ed., 2011</a>. Produtos: <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer">Open Food Facts</a> (ODbL). Valores por 100 g de parte comestível.</small>
  </div>;
}
