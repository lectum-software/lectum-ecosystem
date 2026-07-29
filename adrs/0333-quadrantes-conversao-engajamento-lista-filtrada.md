# ADR-0333: Quadrantes de Conversão x Engajamento navegam para lista filtrada

## Status

Accepted

## Task relacionada

TASK-89

## Contexto

O bloco **Conversão x Engajamento** do dashboard Admin de psicólogos exibia quatro quadrantes agregados, mas não permitia ao Admin chegar rapidamente à lista operacional de profissionais daquele recorte. A lista Admin já possui filtros reais de conversão e engajamento por profissional, porém os quadrantes do dashboard usam uma regra composta: alta conversão versus sem alta conversão e alto versus baixo engajamento.

## Decisão

Transformar os quatro cards de quadrante em links visualmente tratados como botões para `/psicologos/lista`, usando o novo filtro de URL/API `profile_conversion_engagement` com o id exato do quadrante. Quando o seletor por plano do bloco estiver em **Assinantes**, **Gratuitos** ou **Cortesia**, a navegação também carrega o filtro `plan` correspondente da lista.

Na lista Admin, `profile_conversion_engagement` é validado no contrato real e aplicado após calcular os sinais reais de cada psicólogo, sem mock, seed, endpoint paralelo ou migration. O parâmetro permanece aceito por URL/search params para links profundos vindos do dashboard; a modal principal da lista não reintroduz o campo **Quadrante**, preservando a decisão registrada na TASK-54.

## Consequências

- O Admin consegue sair do agregado para a lista operacional com um clique, preservando o recorte do quadrante.
- A regra composta fica centralizada como filtro real da lista, sem depender de combinação imprecisa de categorias simples.
- O filtro composto usa as métricas reais já disponíveis na lista; por enquanto ele não adiciona filtro de período à lista.
- O bloco de dashboard deixa de exibir descrições interpretativas nos quadrantes e orienta explicitamente o clique para ver profissionais.

## Validação

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/repositories/interfaces/IAdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/repositories/AdminPsychologistsListRepository.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/validator/index.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?profile_conversion_engagement=strong_conversion_high_engagement` retornaram 200.

## Pendências

- Nenhuma pendência externa. O refinamento futuro possível é adicionar período à lista, caso o produto decida que os recortes da lista devem acompanhar janelas temporais do dashboard.
