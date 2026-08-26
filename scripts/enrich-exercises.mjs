// Script de enriquecimento (build-time, Node). NAO roda no browser.
//
// Consulta o free-exercise-db (Unlicense / dominio publico), casa com a nossa
// biblioteca local, e gera src/data/exerciseEnrichment.json com metadados de
// midia/musculos/instrucoes. A nossa biblioteca continua sendo a fonte principal;
// o dataset externo apenas ENRIQUECE os exercicios existentes (nao cria novos).
//
// Uso:
//   node scripts/enrich-exercises.mjs
//
// Fontes de midia:
//   - free-exercise-db: imagens de dominio publico (redistribuiveis / cacheaveis).
//   - ExerciseDB NAO e usado: sua licenca proibe redistribuir/empacotar os GIFs
//     como biblioteca de midia, e o endpoint aberto (sem key) esta indisponivel.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { classifyMatch, normalize } from './matching.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const FEDB_URL = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json';
const IMG_BASE = 'https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/';
const SOURCE = 'free-exercise-db';

const library = JSON.parse(readFileSync(resolve(root, 'src/data/exerciseLibrary.json'), 'utf8'));
const overrides = JSON.parse(readFileSync(resolve(__dirname, 'exercise-media-overrides.json'), 'utf8'));

async function loadFedb() {
  try {
    const res = await fetch(FEDB_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('Falha ao buscar free-exercise-db:', e.message);
    console.error('Verifique a conexao. Nada foi escrito.');
    process.exit(1);
  }
}

function imagesFor(fedb) {
  return (fedb.images || []).map((p) => IMG_BASE + p);
}

const fedb = await loadFedb();
const byName = new Map(fedb.map((e) => [normalize(e.name), e]));

const enrichment = {};
const report = { matched: [], ambiguous: [], unmatched: [], overridden: [] };
let gif = 0;
let image = 0;
let none = 0;

for (const ex of library) {
  const override = overrides[ex.slug];
  let match = null;
  let confidence = null;
  let via = 'auto';

  if (override) {
    match = byName.get(normalize(override));
    if (match) {
      confidence = 1;
      via = 'override';
      report.overridden.push(`${ex.name} -> ${override}`);
    } else {
      console.warn(`Override invalido para ${ex.slug}: "${override}" nao existe no dataset`);
    }
  }

  if (!match) {
    const result = classifyMatch(ex, fedb);
    if (result.status === 'matched') {
      match = result.match;
      confidence = result.confidence;
      report.matched.push(`${ex.name} -> ${match.name} (conf ${confidence.toFixed(2)})`);
    } else if (result.status === 'ambiguous') {
      report.ambiguous.push({
        name: ex.name,
        candidates: result.candidates.map((c) => `${c.fedb.name} (${c.score.toFixed(2)})`),
      });
    } else {
      report.unmatched.push({
        name: ex.name,
        candidates: result.candidates.slice(0, 3).map((c) => `${c.fedb.name} (${c.score.toFixed(2)})`),
      });
    }
  }

  if (match) {
    const imgs = imagesFor(match);
    const entry = {
      source: SOURCE,
      sourceExerciseId: normalize(match.name).replace(/ /g, '_'),
      confidence,
      via,
      mediaType: imgs.length ? 'image' : 'none',
      images: imgs,
      bodyPart: (match.primaryMuscles && match.primaryMuscles[0]) || null,
      instructionsEn: match.instructions || [],
    };
    enrichment[ex.slug] = entry;
    if (imgs.length) image++;
    else none++;
  } else {
    none++;
  }
}

// Ordena por slug para diff estavel.
const ordered = {};
for (const slug of Object.keys(enrichment).sort()) ordered[slug] = enrichment[slug];

writeFileSync(
  resolve(root, 'src/data/exerciseEnrichment.json'),
  JSON.stringify(ordered, null, 2) + '\n',
);

// ---------------- Relatorio ----------------
const total = library.length;
console.log('\n=== RELATORIO DE MATCH ===');
console.log(`Biblioteca local: ${total} exercicios`);
console.log(`Matched:    ${report.matched.length}`);
console.log(`Override:   ${report.overridden.length}`);
console.log(`Ambiguous:  ${report.ambiguous.length}`);
console.log(`Unmatched:  ${report.unmatched.length}`);

if (report.ambiguous.length) {
  console.log('\n--- AMBIGUOUS (revisar / adicionar override) ---');
  for (const a of report.ambiguous) {
    console.log(`${a.name}\n  candidatos: ${a.candidates.join(' | ')}`);
  }
}
if (report.unmatched.length) {
  console.log('\n--- UNMATCHED (sem correspondencia) ---');
  for (const u of report.unmatched) {
    console.log(`${u.name}\n  proximos: ${u.candidates.join(' | ') || '(nenhum)'}`);
  }
}

console.log('\n=== RELATORIO DE MIDIA ===');
console.log(`GIF disponivel:      ${gif}`);
console.log(`Imagem disponivel:   ${image}`);
console.log(`Sem midia/placeholder: ${none}`);
console.log(`Muscle map: 100% (derivado dos nossos dados, offline)`);
console.log(`Instrucoes (fonte externa): ${Object.values(ordered).filter((e) => e.instructionsEn.length).length}`);
console.log(`\nEscrito: src/data/exerciseEnrichment.json (${Object.keys(ordered).length} entradas)`);
