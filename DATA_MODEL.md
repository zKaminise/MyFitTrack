# Modelo de dados — MyFitTrack

## IndexedDB

Database name interno: `fit-system-2`, versao Dexie `2`. O nome foi preservado
para que o rebranding nao esconda dados existentes do navegador.

| Store | Chave/indices principais | Escopo |
| --- | --- | --- |
| `settings` | `id, userId` | usuario |
| `exercises` | `id, isCustom, userId` | global + custom do usuario |
| `workouts` | `id, userId, archived` | usuario |
| `programs` | `id, userId, active` | usuario |
| `periodizations` | `id, userId` | usuario |
| `sessions` | `id, userId, date, status` | usuario |
| `personalRecords` | `id, userId, exerciseId` | usuario |
| `backups` | `id, userId, createdAt` | usuario |
| `users` | `id, email` | somente fallback local |
| `syncQueue` | `id, userId, status, createdAt` | usuario |
| `syncMeta` | `id` (= userId) | usuario |

Entidades relevantes usam UUID, `createdAt`, `updatedAt` e, quando necessario,
`deletedAt`.

## Supabase

| Tabela | Conteudo |
| --- | --- |
| `profiles` | nome basico da conta |
| `workouts` | template completo em `data` |
| `programs` | fixed/cycle, anchor, offset, pausa e periodizacao ativa |
| `periodizations` | semanas, reps, intensidade, RIR/RPE, deload |
| `workout_sessions` | snapshot atomico da sessao, exercicios e sets |
| `personal_records` | PR derivado/cacheado por exercicio |
| `custom_exercises` | exercicios privados do usuario |
| `user_settings` | unidade, tema, progressao, timer e favoritos |

Todas as tabelas pessoais referenciam `auth.users` com `ON DELETE CASCADE`. RLS
restringe cada operacao ao dono. O catalogo oficial de exercicios nao e duplicado
na nuvem.

## Snapshot historico

Uma `Session` armazena:

- `workoutName` e descricao no momento da execucao;
- `plannedExerciseId` e `performedExerciseId`;
- nomes planejado/executado;
- ordem, status, substituicao, motivo e notas;
- cada set com numero, tipo, peso, reps, RIR/RPE alvo e conclusao.

Assim, editar um treino hoje nao altera uma sessao antiga.

## Backup

Novos arquivos usam:

```json
{ "format": "myfittrack", "version": 3 }
```

O schema continua aceitando `format: "fit-system-2"` das versoes anteriores.
O JSON inclui somente os dados da conta atual e nao embute binarios de midia.
Cache Storage e reconstruido por visualizacao ou por "Preparar meus treinos para
uso offline" apos um restore.
