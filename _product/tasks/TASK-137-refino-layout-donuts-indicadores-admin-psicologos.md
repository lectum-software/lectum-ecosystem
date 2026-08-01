# TASK-137 - Refino de layout dos donuts de indicadores Admin

## Status

Completed

## Contexto

O dashboard Admin de Psicólogos em `/psicologos` exibe um carrossel de donuts para leitura de Conversão, Atividade, Cobertura, Engajamento, Visibilidade, Vídeo e Favoritados. Após os refinamentos recentes de métricas e tabela comportamental, o produto pediu ajustes visuais no bloco de gráficos: copy mais curta no título, nova ordem dos gráficos, padronização da largura dos dois primeiros blocos e melhoria estética geral dos cards.

Referências visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como fallback local auditável;
- screenshot enviado pelo usuário em 2026-08-01 mostrando `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução, o Builder CLI respondeu `Not Authenticated to Builder.io` e não havia ferramenta Builder/Quick Copy callable no cliente; a implementação usou a imagem local e o screenshot do usuário, registrando esta limitação.

## Objetivo

Deixar o bloco de donuts do dashboard Admin de Psicólogos mais objetivo e visualmente consistente, com:

- título curto e direto;
- ordem de leitura iniciando por Conversão;
- cards com larguras iguais no carrossel;
- layout interno mais refinado para padrão, donut e legenda.

## Dependências

- TASK-53: dashboard Admin de psicólogos.
- TASK-87: padronização de gráficos donut no Admin.
- TASK-122: quantidade considerada e carrossel dos donuts.
- TASK-123: donut de Atividade no dashboard Admin de psicólogos.
- TASK-134: Cobertura no dashboard e matriz Admin de psicólogos.

Todas as dependências acima estão concluídas.

## Escopo executado

### Admin frontend

- Trocar o título `Atividade, cobertura, visibilidade, engajamento, favoritos e conversão dos psicólogos` por `Indicadores dos psicólogos`.
- Reordenar os cards do carrossel para: Conversão, Atividade, Cobertura, Engajamento, Visibilidade na comunidade, Vídeo de apresentação, Favoritados.
- Padronizar todos os wrappers dos cards com uma classe única de largura e altura mínima.
- Fazer o card interno ocupar `w-full`, eliminando a diferença visual de largura dos primeiros blocos.
- Refinar os cards com fundo `bg-surface`, borda, sombra leve, hover sutil, caixa de padrão destacada, donut em base circular e legenda em linhas arredondadas.
- Encurtar os títulos visíveis `Engajamento recebido` e `Favoritados recebidos` para `Engajamento` e `Favoritados`.

## Fora do escopo

- Alterar backend, Prisma schema, migrations ou contratos de API.
- Alterar cálculos, thresholds, eventos, tracking ou dados retornados.
- Criar mocks, seeds, backfills ou endpoints simulados.
- Instalar packages novos.

## Critérios de aceite

- [x] O título do bloco aparece como `Indicadores dos psicólogos`.
- [x] A ordem dos gráficos é Conversão, Atividade, Cobertura, Engajamento, Visibilidade na comunidade, Vídeo de apresentação, Favoritados.
- [x] Os dois primeiros blocos ficam com a mesma largura dos demais cards do carrossel.
- [x] O layout dos gráficos foi refinado visualmente sem criar design system paralelo.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy não estava callable/autenticado; imagem local e screenshot do usuário foram usados como referência.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Browser local validou a rota Admin em desktop e mobile.
- [x] ADR criado em `adrs/0401-layout-donuts-indicadores-admin-psicologos.md`.
- [x] Commit próprio criado e push executado.

## Validação executada

- `npx "@builder.io/dev-tools@latest" auth status` (retornou `Not Authenticated to Builder.io`; usado fallback local).
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local em `http://localhost:3002/psicologos` via Chrome/CDP:
  - desktop `1440x1000`, validando ordem dos títulos e larguras iguais (`316.65625px`) para todos os cards visíveis no carrossel;
  - mobile `390x900`, validando título, primeiro card `Conversão` e layout mobile-first.

## Observações

- A mudança é apenas de apresentação do Admin frontend; os dados reais continuam vindo dos endpoints já existentes.
- Para validação local autenticada, foi criado um admin temporário `codex-task137-layout-20260801@lectum.local` via bootstrap oficial e removido após a captura, junto aos tokens, para não manter dado de teste permanente.
