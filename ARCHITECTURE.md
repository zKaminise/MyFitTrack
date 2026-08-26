# Arquitetura do MyFitTrack

```text
                 Supabase Auth + Postgres + RLS
                              ↕
                     CloudRepository
                              ↕
                 Sync Engine + Sync Queue
                              ↕
                    IndexedDB / Dexie
                              ↕
                 Repositories + Domain
                              ↕
                              UI
```

## Principio local-first

Uma acao de treino nunca aguarda a rede:

```text
tap na serie → IndexedDB → UI atualiza → fila persistente → Supabase
```

O app shell, a biblioteca oficial e as midias preparadas continuam disponiveis
offline. A sessao ativa e persistida a cada alteracao.

## Isolamento por conta

- `repositories/context.ts` mantem o UUID da conta ativa;
- todas as entidades pessoais possuem `userId` no IndexedDB;
- hooks e repositorios filtram pelo UUID ativo antes de renderizar;
- logout limpa o contexto visual, mas preserva o cache namespaced;
- no Postgres, grants + RLS aplicam `(select auth.uid()) = user_id`;
- a biblioteca oficial permanece estatica/global; favoritos e custom exercises
  pertencem a cada usuario.

## Autenticacao

`AuthProvider` possui duas implementacoes:

- `supabaseAuth`: producao, e-mail/senha, recovery, OAuth Google preparado,
  persistencia e refresh de sessao;
- `localAuth`: fallback de desenvolvimento quando as env vars nao existem.

O recovery redireciona para `/reset-password`, onde a nova senha e definida com
`auth.updateUser`. O splash impede flash de login ou dados de outra conta durante
a hidratacao.

## Sincronizacao

Cada item da fila contem:

```ts
{ id, userId, entityType, entityId, operation, payload,
  createdAt, retryCount, status }
```

- UUID estavel + `upsert` tornam retries idempotentes;
- operacoes da mesma entidade sao consolidadas;
- falhas permanecem na fila e sao tentadas novamente ao voltar online e no loop;
- pull nunca sobrescreve uma entidade com operacao local pendente;
- o banco impede que `updated_at` regrida (`0003_sync_integrity.sql`).

### Conflitos

O MVP usa Last-Write-Wins por `updatedAt`. A regra existe nos dois lados:

1. local aplica remoto somente se a versao remota nao for mais antiga;
2. Postgres rejeita update cujo `updated_at` seja anterior ao atual;
3. sessao concluida guarda o snapshot inteiro (planned/performed/sets), portanto
   alteracoes futuras no template nao reconstroem o historico.

## Agregados cloud

Cada agregado e uma linha com colunas de indexacao + `data jsonb`. Sets e
session exercises ficam dentro do snapshot da sessao, garantindo uma operacao
atomica e evitando historico parcialmente sincronizado.

| Agregado | IndexedDB | Supabase |
| --- | :---: | :---: |
| Workouts | ✅ | ✅ |
| Programs | ✅ | ✅ |
| Periodizations | ✅ | ✅ |
| Sessions + sets | ✅ | ✅ |
| Personal records | ✅ | ✅ |
| Custom exercises | ✅ | ✅ |
| Settings + favorites | ✅ | ✅ |
| Biblioteca oficial | ✅ | — |

## Exclusao de conta

`delete-account` e uma Edge Function autenticada. Ela deriva o usuario do JWT e
nunca aceita `userId` do body. Somente no servidor usa a service role para chamar
`auth.admin.deleteUser`; as foreign keys `ON DELETE CASCADE` removem os dados da
propria conta. O cache local e removido apenas apos sucesso.

## Compatibilidade

O IndexedDB permanece com o nome interno `fit-system-2`. A migration Dexie v2
atribui `local-legacy` a dados pre-conta sem resetar o banco; a primeira conta pode
importa-los preservando UUIDs. O marcador impede oferecer o mesmo legado a outra
conta.
