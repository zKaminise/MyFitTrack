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
| `programs` | fixed/cycle, anchor, offset, ajustes pontuais, pausa e periodizacao ativa |
| `periodizations` | semanas, reps, intensidade, RIR/RPE, deload |
| `workout_sessions` | snapshot atomico da sessao, exercicios e sets |
| `personal_records` | PR derivado/cacheado por exercicio |
| `custom_exercises` | exercicios privados do usuario |
| `user_settings` | unidade, tema, progressao, timer e favoritos |

Todas as tabelas pessoais referenciam `auth.users` com `ON DELETE CASCADE`. RLS
restringe cada operacao ao dono. O catalogo oficial de exercicios nao e duplicado
na nuvem.

Em programas rotativos, `cycleAdjustments[]` guarda reposicionamentos com data
de vigencia e item inicial. Assim e possivel iniciar o ciclo com Treino A hoje
sem reescrever o que estava programado nos dias anteriores. O campo faz parte
do agregado `Program`, portanto acompanha backup e sincronizacao cloud no mesmo
JSON.

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
## Calendario flexivel

`scheduleOverrides` aplica `replace`, `rest` ou um par `swap` sobre uma única data. A resolução sempre calcula a programação base primeiro e só então aplica o override. Sessões guardam `scheduledWorkoutId`, `scheduledWorkoutName`, `performedWorkoutId` e `scheduleSource`.

## Alimentacao

- `nutritionSettings`: metas e slots de refeição por usuário.
- `userFoods`: alimentos manuais privados.
- `savedMeals`: preset agregado com ingredientes e macros.
- `nutritionDays`: um agregado por `userId + YYYY-MM-DD`, com snapshots planejados/consumidos.
- `foodCache`: cache local não pessoal de resultados normalizados do provider.

Somente itens `consumed` entram nos totais. Quantidades e nutrientes são persistidos no item diário para preservar o histórico.

## Prescrição por série

`WorkoutExercise.setPrescriptions[]` é opcional para compatibilidade. Quando ausente, o domínio expande os campos legados (`sets`, `repMin`, `repMax`, `restSeconds`, `setType`) em séries iguais. Quando presente, cada item guarda faixa de repetições, tipo, descanso após a série, RIR/RPE, pausa interna de técnicas como rest-pause e observação própria.

Ao iniciar o treino, cada prescrição vira um `SetLog` com snapshot de `targetRepMin`, `targetRepMax`, `restSeconds`, `setType`, `intraSetRestSeconds` e `prescriptionNotes`. Alterações futuras no template não reescrevem sessões anteriores.

## Exercícios autorais

- `exercises`: biblioteca oficial e exercícios privados da conta.
- `communityExercises`: cache local do catálogo compartilhado.
- `community_exercises`: catálogo cloud legível por usuários autenticados; escrita somente pelo autor.
- `exercise-media`: bucket de mídia própria, com upload restrito ao prefixo `auth.uid()`.

Publicação é opt-in. O exercício privado continua pertencendo ao autor; uma cópia com `visibility: community`, `authorId`, `authorName` e `sourceExerciseId` é publicada no catálogo.

O UUID da cópia comunitária é estável e derivado do exercício privado. Edições posteriores fazem `upsert` no mesmo registro, portanto treinos de outras contas recebem novas instruções, nomes e mídias sem trocar o `exerciseId`. Imagens inicial/final e vídeo podem ser adicionados ou substituídos depois da criação; arquivos não selecionados durante a edição são preservados.
