# Fontes da biblioteca de alimentos

## Base brasileira offline

Fonte original: **NEPA/UNICAMP. Tabela Brasileira de Composição de Alimentos — TACO, 4ª edição revisada e ampliada, 2011**.

- Publicação oficial: https://nepa.unicamp.br/wp-content/uploads/sites/27/2023/10/taco_4_edicao_ampliada_e_revisada.pdf
- A publicação permite reprodução total ou parcial com citação da fonte. A atribuição está na busca de alimentos e neste documento.
- Transcrição numérica utilizada: https://github.com/brolesi/taco
- CSV: https://raw.githubusercontent.com/brolesi/taco/main/data/processed/taco/taco_composicao.csv
- Dicionário: https://raw.githubusercontent.com/brolesi/taco/main/docs/dicionario-dados.md

O arquivo `src/nutrition/taco-foods.json` contém as 597 linhas da transcrição. A busca oferece **582 alimentos** com energia, proteína, carboidratos e gordura preenchidos. Valores não analisados permanecem `null`; não são inventados zeros. Traços da transcrição (`0.00001`) são preservados. IDs são estáveis, prefixados por `taco:`.

Todos os valores são por **100 g de parte comestível**. Não se presume que uma maçã pese 100 g: o usuário informa a quantidade em gramas. Preparos crus e cozidos são entradas distintas. O cálculo conserva a precisão; apenas a apresentação arredonda para uma casa decimal.

O catálogo faz parte do bundle/PWA, não requer API, chave ou conexão. Não é um banco de rótulos atualizado em tempo real. As informações servem ao registro alimentar e não substituem o rótulo de um produto específico.

## Produtos e marcas online

- Fonte: https://world.openfoodfacts.org
- Documentação: https://openfoodfacts.github.io/openfoodfacts-server/api/
- Dados sob ODbL; atribuição exibida junto à busca. Não são usadas imagens de produtos.
- Pesquisa somente ao tocar em **Buscar marcas e produtos online**, evitando uma chamada a cada tecla.
- Usa a Edge Function `nutrition-search` existente quando configurada. Caso indisponível, tenta a busca pública do fornecedor. Não envia treinos, histórico ou macros pessoais; envia somente o termo pesquisado.
- Produtos retornados são normalizados e mantidos no cache local de resultados; não são incorporados ao arquivo TACO nem redistribuídos como um catálogo unificado.
- Só são oferecidos resultados com os quatro macros principais. Conexão, disponibilidade e qualidade dos dados do fornecedor podem variar. Em falha, a base local permanece utilizável.

## Dados pessoais e refeições

Alimentos manuais pertencem à conta e ficam em `userFoods`, nunca no cache público de produtos. Refeições pertencem à conta e ficam em `savedMeals`. Ambas usam os repositórios locais e a fila de sincronização já existentes.

Uma refeição salva contém nome, ingredientes, quantidades e, opcionalmente, `manualNutrients`: os totais de **uma porção inteira**. Esses valores substituem, e não somam novamente, os macros calculados pelos ingredientes. Porções fracionadas escalam ingredientes e totais. Ao lançar no diário, os valores são copiados: editar a receita posteriormente não altera os dias já registrados.

Backups incluem refeições, macros manuais, ingredientes e alimentos pessoais. Não precisam incluir a biblioteca estática nem o cache público. O novo campo é opcional e dispensa migration de IndexedDB ou SQL; backups anteriores continuam usando a soma dos ingredientes.
