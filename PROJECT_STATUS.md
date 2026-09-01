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

Fora de escopo de forma intencional: feed, seguidores, clubes, pagamentos,
IA, chat, rankings e integracoes sociais.
