# Midia e dados de terceiros

Este documento registra as fontes de terceiros usadas na biblioteca visual de
exercicios, suas licencas e como sao utilizadas.

## Body map (visualizacao muscular)

- **Pacote:** [`react-body-highlighter`](https://www.npmjs.com/package/react-body-highlighter) v2.0.5
- **Licenca:** MIT
- **Uso:** componente React que renderiza um SVG do corpo (frente/costas) e
  destaca musculos. Roda 100% local/offline; nenhuma API e chamada em runtime.
- **Por que este pacote:** foi avaliado `react-muscle-highlighter` (tambem MIT),
  porem `react-body-highlighter` e mais maduro, traz tipos TypeScript, enum de
  musculos documentado (compativel com o nosso mapper) e suporte a cores
  customizadas por frequencia — ideal para os dois niveis (principal/secundario).
- **Limitacoes:** o componente nao diferencia deltoide anterior/lateral/posterior
  (mapeamos "ombros" para front-deltoids) e nao possui granularidade de dorsais
  (mapeamos "costas" para upper-back). Ver `src/data/muscleMapper.ts`.

## Imagens de demonstracao dos exercicios

- **Fonte:** [`yuhonas/free-exercise-db`](https://github.com/yuhonas/free-exercise-db)
- **Licenca:** **Unlicense (dominio publico)** — livre para uso, copia, cache e
  redistribuicao. Imagens creditadas a colaboradores do Flaticon na origem.
- **Uso:** URLs remotas (`raw.githubusercontent.com/.../exercises/...`) referenciadas
  pelos exercicios apos o enriquecimento. As imagens **nao** sao embutidas no bundle;
  ficam disponiveis offline via Cache Storage (cache sob demanda + "preparar treinos
  para uso offline"). Como sao dominio publico, tambem poderiam ser redistribuidas.
- **Enriquecimento:** `scripts/enrich-exercises.mjs` casa a nossa biblioteca (pt-BR)
  com o dataset e grava metadados em `src/data/exerciseEnrichment.json`.

## ExerciseDB — avaliado e NAO utilizado

Conforme solicitado, o ExerciseDB (AscendAPI) foi validado tecnicamente e **nao** foi
adotado como fonte de midia, pelos seguintes motivos:

1. **Licenca:** os termos permitem usar os dados/visual dentro de um app, mas
   **proibem redistribuir/empacotar/publicar** os arquivos brutos como uma biblioteca
   de midia. Embutir os GIFs no bundle violaria a licenca.
2. **Disponibilidade:** o endpoint aberto e sem chave (`exercisedb-api.vercel.app`)
   respondeu **`DEPLOYMENT_DISABLED / Payment required`** — indisponivel.
3. **Acesso pratico:** o uso confiavel exige uma chave via RapidAPI (tier gratuito de
   ~10 req/dia), e uma chave **nunca** pode ser exposta no bundle de uma PWA.

**Decisao:** usar o `free-exercise-db` (dominio publico) como fonte de midia/dados,
com body map derivado dos nossos proprios dados (offline). O modelo de dados continua
suportando `gif`/`video` para exercicios personalizados ou para um futuro pipeline
opcional de GIFs (ExerciseDB via script build-time com `.env` local, nunca no browser).

## wger — nao utilizado nesta fase

Avaliado como possivel fonte secundaria (conteudo sob licencas Creative Commons por
entrada). Nao foi necessario: o `free-exercise-db` cobriu 67 dos 68 exercicios com
midia de dominio publico. Fontes nao foram misturadas para evitar inconsistencia de
licenciamento.

## Observacao

Nenhuma midia foi copiada de aplicativos como FitFolio, Hevy ou MuscleWiki.
