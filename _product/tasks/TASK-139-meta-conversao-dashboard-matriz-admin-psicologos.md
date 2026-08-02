# TASK-139 - Meta de conversÃ£o no dashboard e matriz Admin de psicÃ³logos

## Status

Completed

## Contexto

O dashboard Admin de PsicÃ³logos em `/psicologos` jÃ¡ possui o indicador **ConversÃ£o**, que compara
cliques reais de WhatsApp contra o padrÃ£o relativo da plataforma. Em TASK-95/ADR-0353 tambÃ©m foi
definida uma meta absoluta de qualidade individual: cliques WhatsApp normalizados para 30 dias, com
**ConversÃ£o Boa** a partir de `5` e **ConversÃ£o Excelente** a partir de `10`.

Produto pediu que essa meta fique visÃ­vel no bloco de grÃ¡ficos logo apÃ³s **ConversÃ£o** e que tambÃ©m
entre como opÃ§Ã£o nos seletores da **Matriz de cruzamento de dados**.

ReferÃªncias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/PsicÃ³logos/PsicÃ³logos - Dashboard.png` como fallback local auditÃ¡vel.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execuÃ§Ã£o,
nÃ£o hÃ¡ ferramenta Builder/Quick Copy callable no cliente Codex; a implementaÃ§Ã£o usa imagem local e
browser local, registrando a limitaÃ§Ã£o.

## Objetivo

- Adicionar o bloco **Meta de conversÃ£o** no carrossel de indicadores, imediatamente apÃ³s
  **ConversÃ£o**.
- Expor a opÃ§Ã£o **Meta de conversÃ£o** nos seletores Linha/Coluna da matriz de cruzamento.
- Reutilizar os cortes absolutos de TASK-95/ADR-0353, com nomenclatura operacional simplificada:
  - `< 5` conversÃµes equivalentes em 30 dias, incluindo `0` cliques reais: **Abaixo da meta**;
  - `>= 5` e `< 10` conversÃµes equivalentes em 30 dias: **Na Meta**;
  - `>= 10` conversÃµes equivalentes em 30 dias: **Acima da meta**;
  - primeiros 30 dias de adaptaÃ§Ã£o: **Dados insuficientes**.

## DependÃªncias

- TASK-53: dashboard Admin de psicÃ³logos.
- TASK-95: qualidade absoluta da conversÃ£o no perfil Admin.
- TASK-129: eixos independentes na matriz de cruzamento.
- TASK-137: carrossel refinado de indicadores.

Todas as dependÃªncias acima estÃ£o concluÃ­das.

## Escopo

### Backend

- Criar `profile_conversion_goal` agregado por segmento de plano no contrato real do dashboard.
- Classificar psicÃ³logos pela meta absoluta usando cliques WhatsApp reais normalizados para 30 dias.
- Preservar perÃ­odo de adaptaÃ§Ã£o de 30 dias como **Dados insuficientes**, conforme TASK-95.
- Adicionar eixo `conversion_goal` em `profile_cross_matrix`.
- NÃ£o alterar schema Prisma, migrations, tracking, ranking, seeds ou backfill.

### Admin frontend

- Tipar o novo contrato.
- Renderizar o bloco **Meta de conversÃ£o** apÃ³s **ConversÃ£o** no carrossel de indicadores.
- Exibir tooltip apenas com o texto descritivo da mÃ©trica.
- Permitir selecionar **Meta de conversÃ£o** como Linha ou Coluna na matriz.

## Fora do escopo

- Alterar o cÃ¡lculo do indicador relativo **ConversÃ£o**.
- Alterar o padrÃ£o P25/P75 da plataforma.
- Criar endpoint paralelo, mock, seed, backfill ou dado fake.
- Instalar package novo.
- Alterar banco, Prisma schema ou migrations.

## CritÃ©rios de aceite

- [x] O bloco **Meta de conversÃ£o** aparece imediatamente apÃ³s **ConversÃ£o** no carrossel de
      indicadores.
- [x] O bloco usa cliques WhatsApp reais normalizados para 30 dias.
- [x] O grÃ¡fico e a matriz usam as opÃ§Ãµes **Na Meta**, **Acima da meta**, **Abaixo da meta** e
      **Dados insuficientes**.
- [x] O padrÃ£o visÃ­vel da meta exibe **Entre 5 e 9 em 30 dias**.
- [x] **Na Meta** comeÃ§a em `5` conversÃµes equivalentes em 30 dias.
- [x] **Acima da meta** comeÃ§a em `10` conversÃµes equivalentes em 30 dias.
- [x] Tooltips dos indicadores exibem apenas o texto descritivo da mÃ©trica.
- [x] Hover dos cards de grÃ¡fico preserva a borda superior visÃ­vel.
- [x] Tooltips dos cards nas extremidades do carrossel nÃ£o ficam escondidas/cortadas.
- [x] A matriz de cruzamento oferece **Meta de conversÃ£o** nos seletores Linha e Coluna.
- [x] O eixo `conversion_goal` cruza com os demais eixos usando dados reais agregados.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy nÃ£o estava callable; imagem local foi usada como referÃªncia.
- [x] NÃ£o houve alteraÃ§Ã£o de banco/schema/migrations; `db:migrate` nÃ£o se aplica.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou a rota Admin.
- [x] ADR criado em `adrs/0403-meta-conversao-dashboard-matriz-admin.md`.
- [x] Commit prÃ³prio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`.
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir backend typecheck`.
- `pnpm --dir backend check`.
- `pnpm --dir admin check`.
- `pnpm --dir backend build`.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`.
- `pnpm check`.
- `node .tmp/validate-task139.mjs`.
- `node .tmp/validate-task139-tooltip-position.mjs`.

## Evidencia browser

- Chrome headless local em `http://localhost:3002/psicologos`, com admin temporario real criado por `admin:bootstrap` e removido do banco ao final, confirmou:
  - `profile_conversion_goal` na API com **Na Meta** em `5` a `9` e **Acima da meta** a partir de `10`;
  - card **Meta de conversao** imediatamente apos **Conversao** e antes de **Atividade**;
  - tooltip somente com texto descritivo;
  - opcao **Meta de conversao** nos selects **Linha** e **Coluna**;
  - matriz **Meta de conversao x Conversao** renderizada sem overflow em desktop e 390px.
- Screenshots locais gerados:
  - `.tmp/task139-meta-conversao-dashboard-desktop.png`;
  - `.tmp/task139-meta-conversao-dashboard-mobile-390.png`.

## ObservaÃ§Ãµes

- A meta Ã© uma leitura absoluta e operacional; ela complementa, mas nÃ£o substitui, o padrÃ£o relativo
  da plataforma usado no indicador **ConversÃ£o**.
- O layout dos donuts foi simplificado apos revisao visual: removidos painel interno, destaque
  "Maior grupo" e barras por legenda, mantendo o padrao limpo dos demais graficos do Admin.
