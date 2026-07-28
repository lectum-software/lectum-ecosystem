# ADR-0339: Categorias de demanda não convertida na matriz Demanda x Engajamento

## Status

Accepted

## Tasks relacionadas

TASK-89

## Contexto

O dashboard Admin de psicólogos já separa a análise isolada de **Demanda** em **Demanda Forte**, **Interesse Não Convertido**, **Tráfego Não Convertido**, **Baixa Demanda** e **Dados Insuficientes**. Porém a matriz **Demanda x Engajamento** ainda condensava todo psicólogo sem demanda forte em uma única linha **Sem demanda forte**, escondendo se o problema era interesse não convertido, tráfego não convertido ou baixa demanda.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A execução usou `_product/tasks/PROTO-INVENTORY.md`, a referência local `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuário.

## Decisão

- Expandir os quadrantes de `demand_engagement` para cruzar quatro linhas de demanda com os quatro níveis de engajamento comunitário:
  - **Demanda forte**;
  - **Interesse Não Convertido**;
  - **Tráfego Não Convertido**;
  - **Baixa Demanda**.
- Manter **Dados Insuficientes** fora do eixo composto, conforme ADR-0338; quando a classificação isolada de demanda for `insufficient_data`, o comparativo continua tratando o perfil na linha operacional **Baixa Demanda** para preservar cobertura sem reintroduzir a categoria na matriz.
- Manter os cards da matriz como links reais para `/psicologos/lista?demand_engagement=...`, agora aceitando os novos filtros compostos `unconverted_interest_*` e `unconverted_traffic_*`.
- Preservar o resumo lateral como taxa de **Demanda Forte** por nível de engajamento, porque ele responde a comparação observacional central sem afirmar causalidade.

## Consequências

- O Admin consegue diferenciar psicólogos engajados com interesse não convertido daqueles com tráfego não convertido dentro do mesmo bloco visual.
- A lista administrativa continua navegável a partir da matriz com filtros profundos por quadrante real.
- O contrato `demand_engagement` cresce de 8 para 16 quadrantes, sem criar endpoint paralelo, mock, seed, package novo, migration ou backfill.
- A UI permanece mobile-first, com as linhas de demanda empilhadas no mobile e matriz compacta no desktop.

## Validação

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke de serviço local `buildPsychologistsDashboard({ period: "all" })`: retornou 16 quadrantes, incluindo `unconverted_interest_very_engaged` e `unconverted_traffic_no_engagement`, com 15 psicólogos reais no total.
- HTTP local no Admin dev server: `GET http://localhost:3002/psicologos`, `GET http://localhost:3002/psicologos/lista?demand_engagement=unconverted_interest_no_engagement` e `GET http://localhost:3002/psicologos/lista?demand_engagement=unconverted_traffic_engaged` retornaram 200.
- Validação estática do build: bundle de `/psicologos`/`/psicologos/lista` contém **Interesse Não Convertido**, **Tráfego Não Convertido**, `unconverted_interest_very_engaged`, `unconverted_traffic_no_engagement` e `lg:grid-cols-[132px_repeat(4,minmax(0,1fr))]`.
- Browser local/headless autenticado em 390x844 validou `/psicologos` e `/psicologos/lista?engagement=sem_base`, com `scrollWidth=390` e screenshots em `.tmp/admin-psychologists-weighted-engagement-mobile.png` e `.tmp/admin-psychologists-list-weighted-engagement-mobile.png`.

## Pendências

- Nenhuma pendência externa.
