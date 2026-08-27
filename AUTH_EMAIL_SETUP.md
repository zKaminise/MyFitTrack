# MyFitTrack — Google Auth, URLs e Resend

O frontend não usa nem precisa de `GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` ou
`SUPABASE_SERVICE_ROLE_KEY`. Os segredos ficam somente no Google/Supabase/Resend.

Projeto Supabase vinculado:

```text
Project ref: dhbyhqomhotfzvgvxerb
Project URL: https://dhbyhqomhotfzvgvxerb.supabase.co
Supabase OAuth callback: https://dhbyhqomhotfzvgvxerb.supabase.co/auth/v1/callback
```

## 1. URLs do Supabase

Em **Supabase Dashboard → Authentication → URL Configuration**:

1. Defina **Site URL** como a URL principal e estável do deploy Vercel.
2. Em **Redirect URLs**, adicione, trocando `URL-REAL-DA-VERCEL` pelo domínio que
   aparece em Vercel → projeto MyFitTrack → Domains:

```text
http://localhost:5173/auth/callback
http://localhost:5173/reset-password
https://URL-REAL-DA-VERCEL/auth/callback
https://URL-REAL-DA-VERCEL/reset-password
```

Se o Vite escolher outra porta local, adicione essa origem/porta exata. O código
deriva `window.location.origin`, portanto preview e produção não retornam para
localhost por hardcode.

## 2. Google Cloud

1. Abra **Google Cloud Console → APIs & Services → OAuth consent screen**.
2. Configure o nome `MyFitTrack`, e-mail de suporte e os domínios autorizados.
3. Em **Data Access**, mantenha os escopos básicos `openid`, `email` e `profile`.
4. Abra **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
5. Escolha **Web application** e nomeie `MyFitTrack Web`.
6. Em **Authorized JavaScript origins**, adicione:

```text
http://localhost:5173
https://URL-REAL-DA-VERCEL
```

7. Em **Authorized redirect URIs**, adicione exatamente:

```text
https://dhbyhqomhotfzvgvxerb.supabase.co/auth/v1/callback
```

8. Crie o client e copie **Client ID** e **Client Secret**.
9. Em **Supabase → Authentication → Sign In / Providers → Google**, habilite o
   provider e cole esses dois valores. Não coloque o secret na Vercel.
10. Teste pela URL real da Vercel. O retorno do app será `/auth/callback` e a
    sessão continuará sendo gerenciada pelo Supabase.

## 3. Resend via Custom SMTP

Estratégia adotada: **Supabase Auth emite tokens e controla confirmação/reset;
Resend apenas entrega o e-mail pelo Custom SMTP**. Não existe Edge Function de
e-mail nem API key no bundle.

1. No Resend, abra **Domains → Add Domain** e informe:

```text
auth.gabrielmisao.com.br
```

2. No provedor DNS de `gabrielmisao.com.br`, crie exatamente os registros que a
   tela do Resend apresentar (DKIM, SPF e os demais exibidos). Copie tipo, nome,
   valor e prioridade literalmente; os valores são únicos e não estão no repo.
3. Aguarde o domínio aparecer como **Verified** no Resend.
4. Abra **API Keys → Create API Key**, restrinja a envio quando a interface
   permitir e guarde a chave em um gerenciador de senhas.
5. Em **Supabase → Project Settings → Authentication → SMTP Settings** (em
   algumas versões: **Authentication → SMTP Settings**), habilite Custom SMTP:

```text
Sender name: MyFitTrack
Sender email: no-reply@auth.gabrielmisao.com.br
Host: smtp.resend.com
Port: 465 (TLS) ou 587 (STARTTLS)
Username: resend
Password: API key criada no Resend
```

A chave Resend fica apenas nesse campo secreto do Supabase. Não criar variável
`VITE_RESEND_API_KEY` e não configurar Resend na Vercel.

## 4. Templates de e-mail

Em **Supabase → Authentication → Email Templates**:

- **Confirm signup**: copie `supabase/email-templates/confirmation.html`;
- **Reset password / Recovery**: copie `supabase/email-templates/recovery.html`.

Os templates usam `{{ .ConfirmationURL }}`, mantendo o token gerado pelo
Supabase e o `redirect_to` enviado pelo frontend. Se habilitar tracking de links
no provedor de e-mail, desative-o para mensagens Auth: reescrita de URL pode
invalidar links de confirmação.

## 5. Smoke test real

1. Abra a URL Vercel em janela anônima e cadastre um e-mail real.
2. Confirme remetente, assunto e botão; clique uma vez.
3. Verifique retorno em `https://URL-REAL-DA-VERCEL/auth/callback`, mensagem
   `E-mail confirmado` e sessão restaurada após reload.
4. Reutilize ou expire um link e confirme a tela amigável de reenvio.
5. Faça logout, use **Continuar com Google**, conclua o consentimento e confirme
   retorno ao MyFitTrack com perfil, userId e dados da conta.
6. Solicite redefinição de senha e confirme retorno em `/reset-password`.

O teste de produção só pode ser marcado PASS depois dessas configurações externas.
