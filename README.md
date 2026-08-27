# MyFitTrack

A mobile-first workout tracking PWA for managing training routines, sets, reps,
progression and workout history.

MyFitTrack e um gerenciador de treinos multiusuario, local-first e offline-first.
Cada alteracao e gravada primeiro no IndexedDB; quando o Supabase esta configurado,
a fila local sincroniza os dados com a nuvem sem bloquear a interface.

## Recursos

- treino do dia, calendario, dias fixos e ciclo continuo;
- editor de treinos, supersets, periodizacao e deload;
- execucao mobile com carga anterior, peso, repeticoes e timer;
- substituicao/pulo/reordenacao somente na sessao atual;
- historico imutavel, volume, PR, streak, progressao e graficos;
- biblioteca visual offline com imagens, mapa muscular e instrucoes;
- contas isoladas, backup por conta e sincronizacao entre dispositivos;
- PWA instalavel com cache do app shell e das midias preparadas.

Nao ha feed, seguidores, dieta, pagamentos ou recursos sociais.

## Stack

React 18 · TypeScript · Vite · React Router · Dexie/IndexedDB · Zustand · Zod ·
Recharts · vite-plugin-pwa · Supabase Auth/Postgres/RLS.

## Rodar localmente

```bash
npm install
npm run dev
```

Sem variaveis Supabase, o app usa contas locais para desenvolvimento. Para login
real e sync, copie `.env.example` para `.env.local`:

```env
VITE_SUPABASE_URL=https://SEU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Nunca coloque secret key, service role, senha do banco ou access token no frontend.

## Scripts

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm run preview
npm run enrich
```

## Supabase

As migrations versionadas estao em `supabase/migrations/`:

1. `0001_init.sql` — tabelas, indices, constraints e profile trigger;
2. `0002_rls.sql` — grants minimos e policies RLS por operacao;
3. `0003_sync_integrity.sql` — protecao LWW contra updates antigos.

O `supabase/config.toml` versionado deixa o diretorio inicializado para a CLI e
nao contem credenciais.

Configuracao completa: [EXTERNAL_SETUP.md](EXTERNAL_SETUP.md).

## Vercel

- Framework: `Vite`
- Build command: `npm run build`
- Output directory: `dist`
- Environment variables: `VITE_SUPABASE_URL` e
  `VITE_SUPABASE_PUBLISHABLE_KEY`

O [vercel.json](vercel.json) inclui o rewrite de SPA, permitindo abrir rotas como
`/account` e `/reset-password` diretamente.

## Compatibilidade de dados

O nome interno do IndexedDB continua `fit-system-2` de proposito. Renomea-lo faria
o navegador criar outro banco e esconder dados existentes. Isso nao aparece como
branding publico. Backups antigos com `format: fit-system-2` continuam aceitos;
novos backups usam `format: myfittrack`.

## Documentacao

- [ARCHITECTURE.md](ARCHITECTURE.md) — arquitetura local-first e sync;
- [DATA_MODEL.md](DATA_MODEL.md) — modelo local/cloud;
- [PROJECT_STATUS.md](PROJECT_STATUS.md) — estado real do projeto;
- [EXTERNAL_SETUP.md](EXTERNAL_SETUP.md) — Supabase e Vercel;
- [AUTH_EMAIL_SETUP.md](AUTH_EMAIL_SETUP.md) — Google OAuth, callback, Resend SMTP e templates;
- [THIRD_PARTY_MEDIA.md](THIRD_PARTY_MEDIA.md) — licencas de midia.
