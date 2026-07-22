# TASK-79: Sessões por device no detalhe administrativo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-79 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Admin / Analytics |
| Status | Completed |
| Dependências | TASK-47, TASK-57, TASK-61, TASK-72 |
| ADR alvo | ADR sobre a métrica de device no uso individual |

## Contexto

Os dashboards administrativos de psicólogos e pacientes já exibem **Devices** usando sessões reais de `visitor_session` por papel no período. No detalhe individual, o bloco **Uso da plataforma** exibe acessos, dias, sessões, duração média, PWA e páginas mais acessadas, mas ainda não mostra a distribuição de sessões por tipo de dispositivo.

Pedido de produto de 2026-07-22: não medir "device principal por usuário"; nas páginas individuais de psicólogo e paciente, implementar a mesma lógica de **sessões por device** usada nos dashboards. No bloco **Uso da plataforma**, **Páginas mais acessadas** e **Devices** devem ficar lado a lado em telas maiores, e **Devices** deve ser exibido como gráfico de pizza.

Referências visuais:

- screenshots enviados pelo usuário em 2026-07-22 com o bloco **Uso da plataforma** nos detalhes de psicólogo e paciente;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; usar os PNGs locais e registrar a limitação.

## Objetivo

Adicionar, no bloco **Uso da plataforma** das páginas individuais de psicólogo e paciente, a distribuição de sessões autenticadas por device no período filtrado.

## Escopo backend

- Estender `GET /api/admin/private/psychologists/:id/statistics` para retornar `platform_usage.device_usage`.
- Estender `GET /api/admin/private/patients/:id` para retornar `platform_usage.device_usage`.
- Calcular sessões por device a partir de `visitor_session.device_type`, filtrando:
  - `user_id` do psicólogo/paciente aberto;
  - papel real (`user.role`);
  - sessões que interceptam o período (`first_seen_at <= to` e `last_seen_at >= from`);
  - `deleted=false`.
- Normalizar device para `desktop`, `mobile`, `tablet` e `unknown`.
- Manter `sessions_count` coerente com `visitor_session` quando houver sessões no período.

## Escopo frontend

- Atualizar tipos dos contratos Admin.
- Renderizar um sub-bloco **Devices** dentro de **Uso da plataforma**:
  - total de sessões no período;
  - lista por device com contagem de sessões e percentual;
  - gráfico de pizza;
  - estado vazio honesto quando não houver sessão por device.
- Manter layout mobile-first: **Páginas mais acessadas** e **Devices** empilhados em ~390px e lado a lado em duas colunas em telas maiores.
- Não usar `<img>` cru.

## Fora do escopo

- Medir ou persistir "device principal por usuário".
- Criar tracking novo, backfill, seed, mock ou estimativa.
- Alterar schema Prisma, migrations ou instalar package novo.
- Medir dados de atendimento, consultas, mensagens ou conteúdo digitado.

## Critérios de aceite

- [x] Detalhe de psicólogo retorna `platform_usage.device_usage` com sessões reais de `visitor_session`.
- [x] Detalhe de paciente retorna `platform_usage.device_usage` com sessões reais de `visitor_session`.
- [x] Percentuais usam total de sessões por device no período, não cadastro único nem device principal por usuário.
- [x] UI de psicólogo exibe **Devices** como gráfico de pizza dentro de **Uso da plataforma**.
- [x] UI de paciente exibe **Devices** como gráfico de pizza dentro de **Uso da plataforma**.
- [x] **Páginas mais acessadas** e **Devices** ficam lado a lado em duas colunas em telas maiores e empilhados no mobile.
- [x] Estados vazios são honestos e não usam dados fake.
- [x] UI mobile-first validada; nenhum `<img>` cru foi usado.
- [x] Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi adicionado.
- [x] ADR criado ou atualizado.
- [x] Checks/builds relevantes executados.
- [x] Commit criado e `git push` executado.

## Execução

- Backend retornando `platform_usage.device_usage` em psicólogo e paciente a partir de `visitor_session.device_type+user_id`, com interseção de período e filtro de papel real.
- Frontend Admin exibe **Páginas mais acessadas** e **Devices** em duas colunas no desktop e empilhado no mobile; **Devices** usa SVG de pizza e legenda por sessão.
- Browser local validado em 2026-07-22 via Chrome headless/CDP nas rotas `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas` e `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas`.
- Validação direta dos use-cases confirmou psicólogo com 30 sessões por device (28 Desktop, 2 Não identificado) e paciente com estado vazio honesto por ausência de `visitor_session` autenticada no período.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com Admin real nas rotas:
  - `/psicologos/:id?tab=estatisticas`;
  - `/pacientes/:id?tab=estatisticas`.
