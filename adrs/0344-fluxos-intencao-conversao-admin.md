# ADR-0344: Fluxos de intenção, conversão e qualidade do tráfego no Admin

## Status

Accepted

## Data

2026-07-29

## Tasks relacionadas

TASK-91

## Contexto

O Admin já possuía leituras separadas para intenção de pacientes e conversão de psicólogos. O produto decidiu que esses dois lados precisam conversar melhor no Dashboard, mas uma tabela seria limitada para interpretar a relação entre demanda e oferta. Também foi decidido que, na página individual de cada psicólogo, a tabela **Origem do tráfego** deve deixar de ser a leitura principal, pois mostra canal e volume, mas não explica se o tráfego foi qualificado.

A implementação precisava preservar os critérios já aceitos:

- intenção do paciente baseada em sinais reais de perfil, favorito e WhatsApp;
- conversão do psicólogo baseada nos thresholds normalizados em 30 dias já usados no Admin;
- nenhum mock, seed, endpoint paralelo, pacote novo ou migration;
- experiência Admin-only, agregada e sem inferência clínica.

Builder/Quick Copy não estava exposto como ferramenta callable neste ambiente. A execução usou `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Dashboard.png`, `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` e capturas enviadas pelo usuário na conversa.

## Decisão

- Expandir `GET /api/admin/private/dashboard/summary` com `intent_conversion_flow`.
- Construir o fluxo geral por par real paciente-psicólogo, usando `profile_view_event`, `psychologist_favorite` e `contact_request`.
- Classificar a intenção do par com o mesmo racional operacional já discutido:
  - **Curiosos**: perfil aberto sem favorito ou WhatsApp para o mesmo psicólogo;
  - **Interessados**: retorno ao perfil ou favorito antes do contato;
  - **Qualificados**: WhatsApp ou múltiplos sinais fortes para o mesmo psicólogo.
- Não incluir **Frios** no fluxo cruzado porque eles não possuem par paciente-psicólogo com sinal real; essa ausência deve aparecer como nota de cobertura, não como dado inventado.
- Classificar a conversão do psicólogo com as categorias já padronizadas: `strong_conversion`, `unconverted_interest`, `unconverted_traffic` e `low_conversion`.
- Expandir `GET /api/admin/private/psychologists/:id/statistics` com `traffic_quality`.
- Usar `page_view_event` como fonte de origem, `profile_view_event` como sinal de visita ao perfil, `psychologist_favorite` como interesse, `contact_request` como total canônico de WhatsApp e `important_action_event` como ajuda de atribuição por visitor/session/user quando disponível.
- Representar contatos sem vínculo de origem como **Origem não atribuída**, sem redistribuir ou estimar canal.
- Tornar o visual principal em UI um fluxo mobile-first em cards, preservando a tabela de origem em `<details>` apenas como detalhamento auditável.

## Consequências

- O Dashboard passa a mostrar, em uma única leitura, se a demanda qualificada está sendo absorvida por psicólogos com alta conversão ou retida em categorias não convertidas.
- A página individual do psicólogo passa a explicar a qualidade do tráfego e não apenas o volume por origem.
- A atribuição de WhatsApp continua conservadora: o total vem de `contact_request`; a origem só é marcada quando há vínculo first-party suficiente.
- O Admin evita inferir origem por aproximação quando não há visitor/session/user compartilhado.
- Não houve alteração de schema Prisma, migration, pacote novo, backfill, seed, mock ou tracking adicional.

## Complemento 2026-07-29 - exemplo visual local no Dashboard

Para apoiar conferência visual no ambiente de desenvolvimento, o card **Fluxo de intenção e conversão** pode preencher apenas a renderização local (`localhost`/`127.0.0.1` em `NODE_ENV=development`) com números de exemplo quando o contrato real retorna `total_pairs=0`.

Essa decisão não altera o backend, não cria seed, não muda o contrato da API, não persiste dados e não substitui os dados reais quando houver pelo menos um fluxo real. A UI exibe aviso explícito de que os valores são somente de visualização e não representam sinais reais de pacientes, psicólogos ou conversões.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm check`
- Smoke direto de serviço para `buildDashboardSummary` e `showAdminPsychologistStatistics`, validando contratos `intent_conversion_flow` e `traffic_quality`.
- Browser local em `/dashboard` e `/psicologos/[id]?tab=estatisticas`.
- Browser local/headless autenticado validou `/dashboard` e `/psicologos/visual-user-no-traction-psychologist?tab=estatisticas` em 390px e 1366px, sem overflow horizontal, com screenshots em `.tmp/admin-dashboard-intent-conversion-mobile.png`, `.tmp/admin-psychologist-traffic-quality-mobile.png`, `.tmp/admin-dashboard-intent-conversion-desktop.png` e `.tmp/admin-psychologist-traffic-quality-desktop.png`.
- O admin temporário real criado para validação browser foi removido do banco ao final.

## Pendências

- Nenhuma pendência externa.
