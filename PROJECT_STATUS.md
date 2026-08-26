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

## NEEDS EXTERNAL CONFIGURATION

- criar o projeto Supabase dedicado `myfittrack`;
- fornecer `Project URL`, `Publishable Key` e `Project Ref`;
- aplicar `0001_init.sql`, `0002_rls.sql`, `0003_sync_integrity.sql`;
- configurar Auth Site URL/Redirect URLs;
- deploy da function `delete-account`;
- executar smoke test real de RLS, dois clientes, offline→reconnect e cross-device;
- configurar as duas env vars na Vercel e fazer o deploy.

O codigo de cloud esta pronto, mas o status correto enquanto as credenciais nao
existem e: **CODE READY — LIVE TEST PENDING**.

## FUTURE

- habilitar Google Login no provider Supabase;
- decidir/ativar confirmacao de e-mail antes do beta;
- push notifications, somente se houver necessidade real.

Fora de escopo de forma intencional: feed, seguidores, clubes, dieta, pagamentos,
IA, chat, rankings e integracoes sociais.
