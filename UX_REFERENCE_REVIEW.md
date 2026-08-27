# MyFitTrack — referencias de UX para o seletor de exercicios

Esta revisao usa padroes de produtos consolidados como referencia de interacao,
sem copiar layout, marca, assets ou textos.

## Produtos consultados

- [Hevy — Track Workouts](https://www.hevyapp.com/features/track-workouts/):
  biblioteca orientada a rotina, acao explicita de adicionar e registro rapido;
- [Strong — App Store](https://apps.apple.com/us/app/strong-workout-tracker-gym-log/id464254577):
  rotinas simples, instrucoes animadas e detalhe do exercicio acessivel durante o treino;
- [Alpha Progression](https://alphaprogression.com/en): videos integrados ao plano e
  hierarquia clara entre execucao e progressao;
- [Stronger](https://www.strongermobileapp.com/): instrucoes e distribuicao muscular
  dentro da biblioteca;
- [StrongLifts](https://stronglifts.com/app/): fluxo direto entre biblioteca,
  demonstracao e inclusao no treino.

## Decisoes aplicadas

1. **Previa e selecao sao acoes diferentes.** Imagem/nome abre execucao,
   musculos e instrucoes; o botao lateral seleciona.
2. **Selecao persistente e visivel.** `+` muda para `✓`, o card ganha destaque e
   a selecao sobrevive a busca, filtros e abertura da previa.
3. **Confirmacao em lote.** Nada e salvo ao tocar no `+`; um CTA fixo adiciona os
   selecionados de uma vez e na ordem escolhida.
4. **Duplicidade impossivel pela interface.** Exercicios existentes aparecem como
   `✓ No treino` e nao podem ser selecionados novamente.
5. **Sheet estavel.** O seletor usa altura fixa no mobile; mudar de Peito para
   Gluteos altera apenas os resultados, nao a posicao da interface.
6. **Midia com intencao clara.** Thumbnail possui indicador de play e texto
   `Ver execucao`; GIF completo so carrega na previa para preservar desempenho.
7. **Editor menos administrativo.** Nome, descricao e resumo ficam no hero;
   configuracoes secundarias permanecem recolhidas ate serem necessarias.

## Restricoes preservadas

- mobile-first e touch targets de pelo menos 44 px;
- biblioteca e body map continuam offline;
- nenhuma dependencia de API em runtime;
- nenhum fluxo social ou funcionalidade fora do gerenciador de treinos.
