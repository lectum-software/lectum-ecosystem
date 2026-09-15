# TASK-139 - Meta de conversão no dashboard e matriz Admin de psicólogos

## Status

Completed

## Contexto

O dashboard Admin de Psicólogos em `/psicologos` já possui o indicador **Conversão**, que compara
cliques reais de WhatsApp contra o padrão relativo da plataforma. Em TASK-95/ADR-0353 também foi
definida uma meta absoluta de qualidade individual: cliques WhatsApp normalizados para 30 dias, com
**Conversão Boa** a partir de `5` e **Conversão Excelente** a partir de `10`.

Produto pediu que essa meta fique visível no bloco de gráficos logo após **Conversão** e que também
entre como opção nos seletores da **Matriz de cruzamento de dados**.

Referências visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como fallback local auditável.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução,
não há ferramenta Builder/Quick Copy callable no cliente Codex; a implementação usa imagem local e
browser local, registrando a limitação.

## Objetivo

- Adicionar o bloco **Meta de conversão** no carrossel de indicadores, imediatamente após
  **Conversão**.
- Expor a opção **Meta de conversão** nos seletores Linha/Coluna da matriz de cruzamento.
- Reutilizar os cortes absolutos de TASK-95/ADR-0353, com nomenclatura operacional simplificada:
  - `< 5` conversões equivalentes em 30 dias, incluindo `0` cliques reais: **Abaixo da meta**;
  - `>= 5` e `< 10` conversões equivalentes em 30 dias: **Na Meta**;
  - `>= 10` conversões equivalentes em 30 dias: **Acima da meta**;
  - primeiros 30 dias de adaptação: **Dados insuficientes**.

## Dependências

- TASK-53: dashboard Admin de psicólogos.
- TASK-95: qualidade absoluta da conversão no perfil Admin.
- TASK-129: eixos independentes na matriz de cruzamento.
- TASK-137: carrossel refinado de indicadores.

Todas as dependências acima estão concluídas.

## Escopo

### Backend

- Criar `profile_conversion_goal` agregado por segmento de plano no contrato real do dashboard.
- Classificar psicólogos pela meta absoluta usando cliques WhatsApp reais normalizados para 30 dias.
- Preservar período de adaptação de 30 dias como **Dados insuficientes**, conforme TASK-95.
- Adicionar eixo `conversion_goal` em `profile_cross_matrix`.
- Não alterar schema Prisma, migrations, tracking, ranking, seeds ou backfill.

### Admin frontend

- Tipar o novo contrato.
- Renderizar o bloco **Meta de conversão** após **Conversão** no carrossel de indicadores.
- Exibir tooltip apenas com o texto descritivo da métrica.
- Permitir selecionar **Meta de conversão** como Linha ou Coluna na matriz.

## Fora do escopo

- Alterar o cálculo do indicador relativo **Conversão**.
- Alterar o padrão P25/P75 da plataforma.
- Criar endpoint paralelo, mock, seed, backfill ou dado fake.
- Instalar package novo.
- Alterar banco, Prisma schema ou migrations.

## Critérios de aceite

- [x] O bloco **Meta de conversão** aparece imediatamente após **Conversão** no carrossel de
      indicadores.
- [x] O bloco usa cliques WhatsApp reais normalizados para 30 dias.
- [x] O gráfico e a matriz usam as opções **Na Meta**, **Acima da meta**, **Abaixo da meta** e
      **Dados insuficientes**.
- [x] O padrão visível da meta exibe **Entre 5 e 9 em 30 dias**.
- [x] **Na Meta** começa em `5` conversões equivalentes em 30 dias.
- [x] **Acima da meta** começa em `10` conversões equivalentes em 30 dias.
- [x] Tooltips dos indicadores exibem apenas o texto descritivo da métrica.
- [x] Hover dos cards de gráfico preserva a borda superior visível.
- [x] Tooltips dos cards nas extremidades do carrossel não ficam escondidas/cortadas.
- [x] A matriz de cruzamento oferece **Meta de conversão** nos seletores Linha e Coluna.
- [x] O eixo `conversion_goal` cruza com os demais eixos usando dados reais agregados.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy não estava callable; imagem local foi usada como referência.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou a rota Admin.
- [x] ADR criado em `adrs/0403-meta-conversao-dashboard-matriz-admin.md`.
- [x] Commit próprio criado e push executado.

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

## Observações

- A meta é uma leitura absoluta e operacional; ela complementa, mas não substitui, o padrão relativo
  da plataforma usado no indicador **Conversão**.
- O layout dos donuts foi simplificado apos revisao visual: removidos painel interno, destaque
  "Maior grupo" e barras por legenda, mantendo o padrao limpo dos demais graficos do Admin.
