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
- Manter **Cidade** com opções que tenham pelo menos 10 buscas reais no período selecionado ou pelo menos um psicólogo cadastrado.
- Calcular oferta apenas de dados reais de `psychologist_profile`, catálogos, endereço, assinatura/verificação e facilidades já existentes.

## Consequências

- O comparativo deixa de depender de contagens hardcoded no frontend para demanda.
- As novas dimensões aparecem no mesmo controle visual do Admin e passam a evoluir conforme usuários aplicam filtros reais no diretório público.
- Cidades sem psicólogo cadastrado e com baixa amostra ficam ocultas para reduzir ruído e exposição granular excessiva.
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


## Atualização em 2026-07-18: paridade com filtros públicos do paciente

Após validação visual no Admin, foi corrigida a fonte das opções estáticas do comparativo para espelhar exatamente as opções disponíveis no formulário público do paciente:

- **Modalidades** usa apenas `Online` e `Presencial`, iguais ao site público. `Híbrido` não é opção pública e, portanto, não é renderizado como linha própria no comparativo.
- Como o diretório público trata `hibrido` como compatível com `online` e `presencial`, a oferta Admin de `Online` inclui perfis `online` + `hibrido`, e a oferta de `Presencial` inclui perfis `presencial` + `hibrido`.
- **Estado** usa os mesmos rótulos públicos (`Acre`, `São Paulo`, etc.), sem sufixo `(UF)`, preservando o ID da UF para matching.
- **Gênero**, **Raça** e **Religião** seguem as opções públicas filtradas sem `Prefiro não informar`.
- Dimensões com catálogo/lista controlada ignoram eventos históricos ou inválidos cujo `target_id` não exista na lista pública atual; **Cidade** combina oferta real cadastrada com buscas reais filtradas por pelo menos 10 buscas quando não houver oferta.

Validações adicionais: verificação Node local de paridade entre arrays públicos e Admin; `pnpm --dir backend check`; `pnpm --dir backend build`; `pnpm --dir admin check`; `pnpm --dir admin build`; `pnpm check`; smoke HTTP local em `/psicologos` com status 200.

## Atualização em 2026-07-19: cidades com oferta ou demanda mínima

Pedido do usuário no dashboard Admin de psicólogos: **Cidade** deve exibir cidades com pelo menos 10 buscas reais no período ou pelo menos um psicólogo cadastrado, e o rótulo deve incluir a UF no formato `Cidade/UF`.


Decisão:

- A oferta de cidades passa a agrupar `psychologist_profile.professional_address_city` junto de `professional_address_state`, gerando IDs por cidade+UF e rótulos como `São Paulo/SP`.
- O comparativo de **Cidade** passa a unir cidades com oferta real (`psicólogos > 0`) e cidades sem oferta apenas quando a demanda atingir `>= 10` buscas reais no período.
- O evento first-party futuro de cidade passa a gravar `target_id` como `Cidade/UF` quando o filtro público possui estado selecionado, preservando compatibilidade com eventos históricos que gravavam apenas a cidade.
- Não houve migration, schema novo, seed, backfill, mock ou pacote novo.

Consequência: cidades com psicólogos cadastrados aparecem mesmo sem demanda recente, permitindo leitura de cobertura geográfica; cidades buscadas sem oferta continuam protegidas por corte mínimo de amostra.

Validações adicionais: `pnpm --dir backend check`; `pnpm --dir backend build`; `pnpm --dir admin check`; `pnpm --dir admin build`; `pnpm --dir frontend check`; `pnpm --dir frontend build`; `pnpm check`; smoke HTTP local em `http://localhost:3002/psicologos` retornando 200.
