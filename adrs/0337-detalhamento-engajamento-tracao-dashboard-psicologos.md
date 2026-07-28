# ADR-0337: Detalhamento de Engajamento no dashboard Admin de psicólogos

## Status

Accepted

## Task relacionada

TASK-89

## Contexto

O bloco **Tração e engajamento dos psicólogos** agregava o envolvimento comunitário em apenas
**Alto engajamento** e **Baixo engajamento**. O produto pediu detalhamento explícito entre
**Muito engajado**, **Engajado**, **Pouco engajado** e **Dados insuficientes**, incluindo o bloco
**Tração x Engajamento**.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A execução usou
`_product/tasks/PROTO-INVENTORY.md`, a referência local
`_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e a captura enviada pelo usuário.

## Decisão

- Reaproveitar a classificação real já existente de engajamento comunitário:
  - `muito_ativo` → **Muito engajado**;
  - `ativo` → **Engajado**;
  - `pouco_ativo` e `sem_base` → **Pouco engajado** quando o perfil já tem base temporal suficiente;
  - **Dados insuficientes** permanece reservado para perfis com menos de 7 dias ativos sem tração forte
    nem engajamento classificado.
- Estender `traction_engagement` no dashboard com totais e comparações para
  `very_engaged`, `engaged` e `low_engaged`, mantendo os agregados legados
  `high_engagement`/`low_engagement` como compatibilidade.
- Expandir os quadrantes de **Tração x Engajamento** de 2 colunas para 3 colunas:
  **Muito engajado**, **Engajado** e **Pouco engajado**, com o recorte separado de
  **Dados insuficientes**.
- Atualizar o filtro composto `traction_engagement` da lista Admin para aceitar os novos ids dos
  seis recortes e o recorte de dados insuficientes.

## Consequências

- O Admin passa a enxergar se a tração forte aparece entre psicólogos muito engajados, engajados ou
  pouco engajados, sem criar tracking novo, migration, seed, mock ou endpoint paralelo.
- Links do dashboard continuam navegando para a lista com filtro composto real, agora mais granular.
- O texto de apoio mantém a leitura como observacional e não causal.
- O bloco fica maior no desktop, mas segue mobile-first: no mobile os cards aparecem em fluxo único,
  e no desktop a matriz usa três colunas.

## Validação

- `pnpm --dir backend exec biome check "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts" "src/modules/api/admin/private/psychologists/list/DTOs/IAdminPsychologistsListDTO.ts" "src/modules/api/admin/private/psychologists/list/use-cases/services.ts"`
- `pnpm --dir admin exec biome check "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/psicologos/lista/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke local no Admin dev server: `GET http://localhost:3002/psicologos` e `GET http://localhost:3002/psicologos/lista?traction_engagement=strong_traction_very_engaged` retornaram 200.
- Validação estática do build: bundle de `/psicologos` contém `strong_traction_very_engaged`, `low_traction_engaged` e **Muito engajado**.
- Tentativa de smoke direto do use case foi limitada pelo banco de desenvolvimento com `EMAXCONNSESSION`; não houve reset nem comando destrutivo.

## Pendências

- Nenhuma pendência externa.
