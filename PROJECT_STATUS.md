# MyFitTrack — status

## COMPLETE

- branding publico MyFitTrack, package `myfittrack`, logo e icones PWA;
- IndexedDB preservado e migrado para entidades namespaced por `userId`;
- cadastro/login/logout/sessao persistente e troca de conta;
- recovery request + rota real `/reset-password`;
- onboarding curto e importacao de dados legados com UUID preservado;
- isolamento local Gabriel × Joao;
- repositorios cloud, fila persistente, retry, pull, upsert e LWW;
- migrations SQL, grants, RLS por operacao e protecao contra update antigo;
- Edge Function de exclusao derivando o usuario pelo JWT;
- backup account-aware, mesclar/substituir e compatibilidade antiga;
- nucleo completo: Hoje, fixed/cycle, periodizacao, execucao, timer, historico,
  progressao, PR, streak, graficos, biblioteca visual e midia offline;
- layouts mobile/desktop, sidebar, bottom navigation, loading e estados vazios;
- Vercel SPA/PWA configurado.
- calendario flexivel com treino extra, replace, swap, restauracao e snapshot planejado/realizado;
- Alimentacao local-first: metas, slots, planejado/consumido, alimentos manuais,
  busca Open Food Facts, cache offline, refeicoes salvas, totais e media recente;
- sync/RLS/backup para schedule overrides e agregados nutricionais.
- prescrição individual por série com faixa, tipo, descanso, RIR/RPE, rest-pause e snapshot histórico;
- observações do exercício destacadas durante a execução;
- exercícios autorais com instruções, imagens início/fim ou vídeo e publicação opcional com autoria;
- catálogo comunitário com RLS de escrita por autor e cache local.
- edição posterior dos exercícios autorais, preservação da mídia existente e atualização comunitária propagada pelo mesmo UUID.

## NEEDS EXTERNAL CONFIGURATION

- criar o projeto Supabase dedicado `myfittrack`;
- fornecer `Project URL`, `Publishable Key` e `Project Ref`;
- aplicar as novas migrations `0004_schedule_overrides.sql` e `0005_nutrition.sql`;
- aplicar `0006_set_prescriptions_and_community_exercises.sql`;
- configurar Auth Site URL/Redirect URLs;
- deploy da nova function `nutrition-search` (alem de `delete-account`);
- republicar `delete-account` para limpeza das mídias do Storage;
- executar smoke test real de RLS, dois clientes, offline→reconnect e cross-device;
- configurar as duas env vars na Vercel e fazer o deploy.

O cloud anterior está configurado; as duas novas migrations e a nova Edge Function
ainda precisam ser publicadas antes do smoke test desta rodada: **CODE READY — NEW CLOUD MIGRATIONS PENDING**.

## FUTURE

- habilitar Google Login no provider Supabase;
- decidir/ativar confirmacao de e-mail antes do beta;
- push notifications, somente se houver necessidade real.

## PARTIAL

- smoke test real das migrations, RLS e sync em duas contas depende do deploy no Supabase;
- QA autenticado das novas telas em 375/390/430/1440 depende de uma sessao de teste; o login publico foi validado sem overflow.

## Atualização 2026-09-22 — referências e refeições

COMPLETE (implementação local):

- Referência de peso/reps entre treinos pelo exercício executado, tipo e ocorrência da série, com origem visível e pré-preenchimento correspondente.
- `Mais → Minhas refeições`: criar/editar refeições, ingredientes e quantidades, com soma automática dos macros.
- `Mais → Meus alimentos`: cadastro privado por gramas, unidades ou fatias, aceitando vírgula decimal.
- Adicionar uma refeição pronta ou porção fracionada no diário; metas calculadas e histórico preservado ao editar a receita.
- 582 alimentos TACO com macros completos embarcados; busca sem acento e complemento de marcas online sob demanda.
- Backup/restore do campo opcional de macros e compatibilidade com refeições antigas.
- 92 testes automatizados aprovados, incluindo associação de séries, busca offline, isolamento de alimento privado, porções, histórico e backup/restore.

QA realmente executado em navegador local isolado, sem usar dados pessoais ou a conta cloud: referências A/E (trabalho a 50 kg sem confundir ajuste a 35 kg), registro de série/timer e reload; criação e edição de Marmita Almoço (arroz 150 g + patinho 200 g), macros manuais 650 kcal, lançamento de 0,5 porção (325 kcal), chocolate 25 g e totais (459,9 kcal), persistência após reload, busca por maçã, resposta real da busca pública Open Food Facts. Layouts revisados em 390 e 1440 px. Não equivale a teste de Safari físico, instalação PWA ou sync de produção.

Esta rodada não exige nova migration nem variável de ambiente. Publicação na Vercel e verificação na conta real não foram executadas.

## Atualização — porções personalizadas de alimentos

COMPLETE:

- Campos numéricos localizados aceitam `0,7`, `0,3`, ponto decimal e estado vazio durante a digitação.
- Alimento pessoal configurável por peso em gramas, quantidade/unidades ou fatias.
- Macros vinculados à porção-base escolhida e escalados proporcionalmente ao alterar a quantidade.
- Alimento criado dentro da refeição é salvo na conta e adicionado imediatamente como ingrediente.
- Totais da refeição são sempre somados automaticamente pelos ingredientes; totais manuais antigos permanecem apenas como compatibilidade de backup.
- QA mobile local em 390 px: `2 unidades` de ovos (140 kcal, P 12,6, C 0,7, G 9,5) + `1 fatia` de bacon (45 kcal, P 3, C 0,3, G 3,5) = 185 kcal, P 15,6, C 1, G 13. Reutilização dos ovos em uma segunda refeição confirmada.

Fora de escopo de forma intencional: feed, seguidores, clubes, pagamentos,
IA, chat, rankings e integracoes sociais.
