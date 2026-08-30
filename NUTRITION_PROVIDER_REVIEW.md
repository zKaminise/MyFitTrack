# Provedores nutricionais avaliados

Decisão em 30/08/2026: o MyFitTrack usa **Open Food Facts** para pesquisa de produtos e marcas, por meio da Edge Function autenticada `nutrition-search`. A interface depende somente do formato interno `NutritionProvider`; alimentos manuais, recentes, cacheados e refeições salvas continuam funcionando offline.

| Provider | Brasil | Custo/chave | Limites e licença | Decisão |
|---|---|---|---|---|
| Open Food Facts | Boa cobertura de industrializados brasileiros | Sem chave | Leitura de produto 100 req/min; busca 10 req/min. Base ODbL, conteúdo DBCL e imagens CC BY-SA; exige identificação do app | Provider atual, cache local de itens consultados |
| USDA FoodData Central | Boa base genérica, orientada aos EUA | Chave data.gov; `DEMO_KEY` restrita | 1.000 req/h padrão; dados CC0/domínio público | Candidato secundário futuro para genéricos |
| TBCA | Excelente para alimentos brasileiros | Sem API oficial localizada | Site restringe reprodução/alteração e uso comercial; CC BY-NC-ND | Não copiar, raspar ou redistribuir |
| Edamam | Internacional | Planos pagos/chave | Atribuição e retenção condicionadas ao plano | Não usado |
| Nutritionix | Internacional; pt-BR licenciado | App ID/key | Cache restrito e produto localizado licenciado | Não usado |
| FatSecret | Brasil somente em edição superior | OAuth/chave | Basic gratuita é US-only | Não usado |

Referências oficiais: https://openfoodfacts.github.io/openfoodfacts-server/api/ · https://fdc.nal.usda.gov/api-guide/ · https://www.tbca.net.br/ · https://developer.edamam.com/food-database-api · https://platform.fatsecret.com/api-editions

## Cache e fallback

Resultados escolhidos são normalizados e guardados no IndexedDB. O histórico salva um snapshot dos nutrientes, portanto alterações futuras do provider não modificam dias antigos. Sem conexão, a busca nova é desativada, mas alimentos manuais/cacheados, favoritos, recentes e refeições salvas permanecem disponíveis.
