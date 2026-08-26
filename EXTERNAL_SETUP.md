# MyFitTrack — configuracao externa

O codigo esta pronto. Estas etapas ativam Auth real, RLS, sincronizacao e deploy.

## 1. Criar o projeto Supabase

1. Entre em [supabase.com](https://supabase.com) e crie um projeto.
2. Nome sugerido: `myfittrack`.
3. Escolha a regiao mais proxima dos usuarios.
4. Crie uma senha forte do banco e guarde-a no seu gerenciador de senhas.
   Nao envie essa senha pelo chat e nao coloque no repositorio.
5. No **Connect** ou **Settings → API Keys**, copie:
   - Project URL;
   - Publishable Key (`sb_publishable_...`);
   - Project Ref.

Nao copie secret key nem service role para o frontend.

## 2. Configurar o ambiente local

Crie `.env.local` na raiz (ele ja esta ignorado pelo Git):

```env
VITE_SUPABASE_URL=https://PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Reinicie `npm run dev`.

## 3. Aplicar migrations

Instale/use a Supabase CLI e autentique-se no seu proprio terminal:

```bash
supabase login
supabase link --project-ref PROJECT_REF
supabase db push --dry-run
supabase db push
```

O repositorio ja contem `supabase/config.toml`; nao e necessario executar
`supabase init` novamente.

Nao passe personal access token, database password ou secret key pelo chat.

O push aplica, em ordem:

1. `0001_init.sql`;
2. `0002_rls.sql`;
3. `0003_sync_integrity.sql`.

## 4. Configurar Auth URLs

Em **Supabase → Authentication → URL Configuration**:

Durante desenvolvimento:

```text
Site URL: http://localhost:5173
Redirect URLs:
http://localhost:5173/
http://localhost:5173/reset-password
```

Apos o deploy, troque o Site URL para a URL principal da Vercel e adicione:

```text
https://SEU-PROJETO.vercel.app/
https://SEU-PROJETO.vercel.app/reset-password
```

## 5. E-mail

Para QA inicial, a confirmacao de e-mail pode ser desativada em
**Authentication → Providers → Email**. Antes do beta, decida/ative a confirmacao.
O app ja possui estado "Verifique seu e-mail" e acao de reenvio.

## 6. Excluir conta

Faça o deploy da Edge Function:

```bash
supabase functions deploy delete-account
```

As variaveis de sistema da function ficam no ambiente Supabase. Nenhuma service
role vai para a PWA. A function aceita somente o JWT autenticado e deriva dele o
usuario a excluir.

## 7. Google Login (opcional/futuro)

1. Crie Client ID/Secret no Google Cloud;
2. habilite Google em **Authentication → Providers**;
3. use o callback indicado pelo Supabase;
4. mantenha localhost e Vercel na allowlist.

O botao e o codigo ja estao preparados; e-mail/senha independe disso.

## 8. Vercel

1. Crie um repositorio GitHub chamado `myfittrack`;
2. importe-o na Vercel;
3. confirme:

```text
Framework: Vite
Build command: npm run build
Output directory: dist
```

4. Em **Project → Settings → Environment Variables**, adicione:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

5. Faça o deploy e depois complete as URLs de producao no Supabase.

## 9. Smoke test real obrigatorio

Depois de conectar o projeto:

- Conta A cria Treino A/B/C e sincroniza;
- Conta B consulta workouts/sessions/settings da A e recebe 0 rows;
- dois contextos da Conta A validam workout e sessao cross-device;
- um cliente fica offline, registra sets, recarrega, reconecta e sincroniza;
- o outro cliente confirma historico, progressao, streak e PR;
- PWA instalada exibe `MyFitTrack` e abre offline.

## Dados que preciso receber para concluir o teste real

Somente:

```text
Project URL
Publishable Key
Project Ref
```

Senha do banco, secret/service role e personal access token devem permanecer com
voce e ser usados somente nos comandos executados no seu terminal.
