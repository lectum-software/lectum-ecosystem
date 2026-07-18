# ADR-0279: Demanda real por filtros no dashboard Admin de psicólogos

## Status

Accepted

## Contexto

O dashboard Admin de psicólogos possui o bloco **Comparativo de oferta e demanda**. O produto pediu que o seletor **Tipo de filtro** passasse a cobrir também Modalidades, Estado, Cidade, Gênero, Raça, Religião e Selos e facilidades.

A regra do projeto proíbe mocks para concluir uma task. Além disso, a TASK-53 já registrava que filtros buscados não deveriam ser inventados quando não houvesse fonte real. Para sustentar a leitura de demanda por novas dimensões, era necessário criar uma captura first-party sem adicionar schema ou dependência, aproveitando a infraestrutura existente de analytics.

## Decisão

- Usar `important_action_event` existente para registrar a aplicação de filtros no diretório público de psicólogos.
- Adicionar o `action_type="psychologist_directory_filter_search"` ao endpoint first-party `/api/public/analytics/action`.
- Registrar somente opções controladas em `target_type` e `target_id`, por exemplo `psychologist_filter_state` + `SP` ou `psychologist_filter_feature` + `verified`.
- Não registrar texto livre de busca por nome/CRP nesse evento.
- Agregar o dashboard Admin a partir desses eventos no período selecionado, retornando `filters_searches.dimensions` por especialidade, serviço, abordagem, público, idioma, modalidade, estado, cidade, gênero, raça, religião e selos/facilidades.
- Manter **Estado** com todas as UFs brasileiras na tabela, mesmo com zero buscas.
- Manter **Cidade** somente com opções que tenham mais de 10 buscas reais no período selecionado.
- Calcular oferta apenas de dados reais de `psychologist_profile`, catálogos, endereço, assinatura/verificação e facilidades já existentes.

## Consequências

- O comparativo deixa de depender de contagens hardcoded no frontend para demanda.
- As novas dimensões aparecem no mesmo controle visual do Admin e passam a evoluir conforme usuários aplicam filtros reais no diretório público.
- Cidades com baixa amostra ficam ocultas para reduzir ruído e exposição granular excessiva.
- Como a solução reutiliza `important_action_event`, não há migration, tabela nova, package novo, seed, backfill ou dado artificial.
- Seleções de gênero/raça/religião são tratadas como sinais sensíveis: o evento guarda apenas IDs de opções controladas e não captura busca textual livre.
- Builder/Quick Copy não estava acessível como ferramenta callable; a referência visual usada foi `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build` (primeira tentativa bloqueada por lock de outro `next build`; segunda tentativa concluída sem erros)
- `pnpm check`
- Browser local headless com Chrome em `http://localhost:3002/psicologos`, confirmando carregamento da rota Admin/Next; validação visual autenticada depende da sessão Admin real do operador.
