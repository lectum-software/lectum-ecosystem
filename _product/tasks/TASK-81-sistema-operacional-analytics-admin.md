# TASK-81: Sistema operacional nos analytics Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-81 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin analytics |
| Status | Completed |
| Dependências | TASK-47, TASK-53, TASK-57, TASK-60, TASK-61, TASK-79 |
| ADR alvo | ADR-0315 |

## Contexto

O Admin já exibe distribuição de sessões por device nos dashboards de psicólogos e pacientes e no detalhe estatístico individual. A necessidade de produto é complementar essa leitura com o sistema operacional capturado pelo analytics first-party para responder, principalmente em mobile, se a base usa mais iOS ou Android, mantendo tablet separado e desktop dividido em Windows, macOS e outros quando identificável.

A fonte real disponível é `visitor_session.os` combinado com `visitor_session.device_type`, ambos criados pela TASK-47. Não há requisito de identificar versão exata do sistema operacional e não deve haver armazenamento de user-agent bruto.

Referências visuais consultadas:

- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.
- `_product/proto/admin/Pacientes/Pacientes - Dashboard.png`.
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`.
- `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.
- Screenshots enviados pelo usuário em 2026-07-25 para `/psicologos`, `/pacientes` e abas `tab=estatisticas` de psicólogo/paciente.
- Screenshot enviado pelo usuário em 2026-07-25 após a primeira versão, apontando que o card separado de **Sistema operacional** ficava grande demais por listar muitas categorias.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução o ambiente não expôs ferramenta Builder/Quick Copy callable, então as imagens locais e os screenshots enviados foram usados como fonte visual auditável.

## Objetivo

Adicionar leitura de sistema operacional aos analytics administrativos:

1. Dashboard de psicólogos: card combinado **Devices e sistemas**, mantendo o gráfico principal por device e exibindo os sistemas operacionais observados dentro de cada item de device.
2. Dashboard de pacientes: card combinado **Devices e sistemas**, mantendo o gráfico principal por device e exibindo os sistemas operacionais dentro de cada item; no dashboard, a disposição segue a ordem **Gênero / Forma de cadastro / Devices e sistemas** e depois **Localização / Uso da plataforma**.
3. Detalhes estatísticos individuais de psicólogo e paciente: cada item de device lista os sistemas operacionais observados naquele device.

## Pré-requisitos e bloqueios

- TASK-47 concluída para captura first-party de `visitor_session.device_type` e `visitor_session.os`.
- TASK-53/TASK-60 concluídas para dashboards Admin.
- TASK-57/TASK-61/TASK-79 concluídas para detalhes estatísticos e seção de Devices.
- Sem dependência externa nova.
- Sem package novo.
- Sem alteração de Prisma schema/migrations; `visitor_session.os` já existe.
- Não há backfill histórico: sessões antigas sem `os` entram em **Não identificado**.

## Escopo frontend

- `admin/src/app/(admin)/psicologos/client.tsx`: card mobile-first **Devices e sistemas** no bloco de conversão/uso, sem card separado de OS.
- `admin/src/app/(admin)/pacientes/client.tsx`: card **Devices e sistemas** na primeira linha de estatísticas agregadas, depois de **Gênero** e **Forma de cadastro**, sem card separado de OS.
- `admin/src/app/(admin)/psicologos/[id]/client.tsx`: chips de sistema operacional em cada device da aba Estatísticas.
- `admin/src/app/(admin)/pacientes/[id]/client.tsx`: chips de sistema operacional em cada device da aba Estatísticas.
- Sem formulários, campos ou submits novos.
- Nenhum `<img>` novo.

## Escopo backend

- Estender DTOs Admin de dashboard e detalhe com agregações de sistema operacional.
- Agregar `visitor_session.os` + `visitor_session.device_type` por sessão autenticada e papel real do usuário.
- Normalizar categorias:
  - mobile/tablet: Android, iOS, iPadOS, Outros, Não identificado;
  - desktop: Windows, macOS, Outros, Não identificado;
  - iPadOS pode ser derivado quando `device_type="tablet"` e o `os` capturado vier como `ios` ou `macos`.
- Listar, no detalhe individual, os sistemas operacionais observados dentro de cada device com contagem e percentual relativo ao device.

## Fora do escopo

- Identificar versão exata do sistema operacional.
- Capturar ou persistir user-agent bruto.
- Criar migration, backfill ou dados estimados.
- Segmentar dashboards por versão, navegador, modelo de aparelho ou fabricante.
- Alterar coleta de localização.

## Contrato técnico detalhado

Backend esperado:

- Repositórios de dashboard/detalhe selecionam `visitor_session.os` junto com `device_type`.
- `backend/src/utils/admin-operating-system.ts` centraliza labels e normalização de OS para evitar divergência entre dashboards e detalhes.
- Dashboards retornam `operating_system_usage` para compatibilidade do contrato e também `device_usage.items[].operating_systems` para vincular OS ao device no mesmo gráfico.
- Detalhes retornam `device_usage.items[].operating_systems` com percentuais relativos ao total de sessões daquele device.
- Fonte declarada no contrato: `visitor_session.os+visitor_session.device_type+user.role=...` nos dashboards e `visitor_session.device_type+visitor_session.os+user_id` nos detalhes.

Frontend esperado:

- Reutilizar o padrão visual existente de cards/pie chart/legenda dos blocos de Devices, adicionando uma linha textual leve de OS dentro da legenda de cada device, sem tag ou bolinha colorida adicional.
- UI mobile-first: cards empilham no mobile e progridem para colunas no desktop.
- Cores por classes/tokens do Admin; paleta dos segmentos segue o padrão já usado nos cards.
- Estados vazios exibem mensagem honesta quando não houver sessão autenticada com OS no período.

Packages usados:

- Nenhum package novo; usar stack instalada de Admin/Backend.

Regras anti-recriação:

- Não criar biblioteca de charts nova.
- Não criar endpoint paralelo de analytics.
- Reutilizar DTOs, repositories e services existentes dos módulos Admin.

## Critérios de aceite

- [x] Dashboard de psicólogos exibe **Devices e sistemas** no mesmo card/gráfico, usando `visitor_session.device_type` + `visitor_session.os` sem um card separado grande.
- [x] Dashboard de pacientes exibe **Devices e sistemas** no mesmo card/gráfico e mantém a ordem **Gênero / Forma de cadastro / Devices e sistemas** seguida de **Localização / Uso da plataforma**.
- [x] Detalhe estatístico de psicólogo mostra os sistemas operacionais dentro de cada device.
- [x] Detalhe estatístico de paciente mostra os sistemas operacionais dentro de cada device.
- [x] Categorias de OS não expõem versão, modelo ou user-agent bruto; sessões sem informação aparecem como **Não identificado**.
- [x] UI mobile-first; nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `pnpm --dir backend db:migrate` não se aplica.
- [x] Formulários/campos da TASK-02 não se aplicam porque a task não adiciona formulário.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais de `_product/proto` foram citadas quando houver UI.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e push executado.

## Validação mínima

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Browser local nas rotas `/psicologos`, `/pacientes`, `/psicologos/:id?tab=estatisticas` e `/pacientes/:id?tab=estatisticas`.

## Evidencias de validacao executada em 2026-07-25

- `pnpm --dir backend exec biome check --write ...` nos arquivos backend da task.
- `pnpm --dir admin exec biome check --write ...` nos arquivos Admin da task.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Browser local/headless em `http://localhost:3002` retornou HTTP 200 para `/psicologos`, `/pacientes`, `/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` e `/pacientes/cmrqsrab5001f1guh2ve5oy90?tab=estatisticas`. A sessao headless sem credenciais exibiu login do Admin, entao a validacao visual autenticada foi limitada ao build/check e aos screenshots/protos de referencia.
- Refinamento pós-feedback executado em 2026-07-25:
  - `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/app/(admin)/pacientes/client.tsx"`.
  - `pnpm --dir backend exec biome check --write ...` nos DTOs/services de dashboard alterados.
  - `pnpm --dir admin check`.
  - `pnpm --dir admin build`.
  - `pnpm --dir backend check`.
  - `pnpm --dir backend build`.
  - `pnpm check`.
  - Smoke local em `http://localhost:3002/psicologos` e `http://localhost:3002/pacientes` retornou HTTP 200.
  - Refinamento de omissão do OS no device **Não identificado** validado com `pnpm --dir admin check`, `pnpm --dir admin build` e smoke local em `/psicologos` e `/pacientes` retornando HTTP 200.

## Notas de execução

- A agregação é por sessão autenticada no período, não por “device principal” do usuário.
- A contagem de usuários ativos por sistema operacional deduplica `user_id` dentro de cada categoria, mas o mesmo usuário pode aparecer em mais de uma categoria se usou mais de um OS no período.
- iPadOS é categoria de relatório para preservar tablet separado quando navegadores iPad-like reportam `ios` ou `macos`.
- Refinamento visual pós-feedback em 2026-07-25: nos dashboards, a legenda de cada device mostra somente o percentual principal e uma linha discreta com OS (`Android 75% · iOS 25%`); a contagem textual de sessões/usuários foi removida para reduzir ruído.
- Refinamento visual adicional em 2026-07-25: quando o próprio device é **Não identificado**, a linha textual de OS é omitida para evitar repetir `Não identificado 100%`.
- Ajuste visual pós-feedback em 2026-07-25: no dashboard `/pacientes`, os blocos agregados ficaram em duas linhas no desktop: **Gênero / Forma de cadastro / Devices e sistemas** e **Localização / Uso da plataforma**; no mobile, todos seguem empilhados para preservar o comportamento mobile-first.
