# TASK-103 - Funil comportamental por conversao no Admin de psicologos

## Status

Completed

## Contexto

As matrizes **Conversao x Engajamentos e Favoritos** e **Conversao x Visibilidade** permitem
investigar 64 cruzamentos por categoria de conversao, mas a leitura exige interpretar duas grades
largas. O usuario solicitou um bloco sintetico com uma ilustracao de funil: ao selecionar uma
categoria como **Psicologos de alta conversao**, o topo deve mostrar o padrao predominante de
Visibilidade Comunidade x Video e o meio deve mostrar o padrao predominante de Engajamento x
Favoritos, deixando a saida como a categoria de conversao escolhida.

A leitura deve ser observacional, interna ao Admin e derivada dos contratos reais existentes; nao
pode afirmar causalidade, criar ranking publico ou alterar algoritmos.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`;
- screenshots enviados pelo usuario em 2026-07-30 mostrando `/psicologos` com as matrizes atuais.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao,
nao ha ferramenta Builder/Quick Copy callable no ambiente; a implementacao usa as referencias locais
e os screenshots enviados, registrando esta limitacao.

## Escopo

- Adicionar em `/psicologos`, entre os donuts executivos e as matrizes, o bloco **Funil
  comportamental por conversao**.
- Criar dropdown local para selecionar a categoria de conversao:
  - Psicologos de alta conversao;
  - Psicologos de conversao padrao;
  - Psicologos de baixa conversao;
  - Psicologos sem conversao.
- Reutilizar o filtro por plano ja existente no dashboard para Todos, Assinantes, Gratuitos e
  Cortesia.
- Para a categoria selecionada, derivar do contrato real:
  - topo do funil: coluna predominante em `profile_conversion_visibility` dentro da linha de
    conversao;
  - meio do funil: coluna predominante em `profile_conversion_engagement_favorites` dentro da linha
    de conversao;
  - saida: propria linha/categoria de conversao escolhida.
- Exibir base, percentual e leitura sugerida, com aviso de amostra pequena e nota sobre Dados
  Insuficientes quando aplicavel.
- Manter UI mobile-first: funil em largura total no mobile (~390px), estreitando camadas apenas a
  partir de `md`, e progressao para layout com resumo lateral no desktop.

## Fora do escopo

- Alterar backend, contratos de API, percentis, pesos, labels tecnicos, tracking, schema Prisma,
  migrations ou query keys.
- Criar endpoint, mock, seed, dado fake permanente, ranking individual ou navegacao de drill-down.
- Instalar package novo ou biblioteca de grafico.
- Usar Figma como fonte ativa.

## Criterios de aceite

- [x] O dashboard `/psicologos` exibe o bloco **Funil comportamental por conversao** entre os donuts
      executivos e as matrizes.
- [x] O dropdown permite selecionar as quatro categorias de conversao operacionais e inicia em
      **Psicologos de alta conversao**.
- [x] O topo do funil usa a coluna predominante real de `profile_conversion_visibility` dentro da
      categoria selecionada.
- [x] O meio do funil usa a coluna predominante real de
      `profile_conversion_engagement_favorites` dentro da categoria selecionada.
- [x] A saida do funil mostra a categoria de conversao, base e cliques WhatsApp reais da linha.
- [x] A leitura sugerida deixa explicito que o padrao e observacional e nao causal.
- [x] Estados sem profissionais na categoria e bases pequenas sao tratados de forma honesta, sem
      simular dados.
- [x] O filtro por plano funciona para Todos, Assinantes, Gratuitos e Cortesia sem novo endpoint.
- [x] UI mobile-first preservada; nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo, schema Prisma ou migration foi
      criado.
- [x] Builder/Quick Copy nao estava callable; referencias locais/screenshot foram usadas e a
      limitacao foi registrada.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0364-funil-comportamental-conversao-admin-psicologos.md`.
- [x] Commit proprio criado e push executado.

## Validacao

- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`
  e os screenshots enviados pelo usuario como referencia visual.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin typecheck`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- Browser local autenticado validou `/psicologos` em desktop e mobile 390px, selecionando
  **Psicologos sem conversao** para confirmar as tres camadas do funil com dados reais disponiveis
  no periodo. Screenshots locais: `.tmp/task103-funnel-desktop.png` e
  `.tmp/task103-funnel-mobile.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao
  final junto com seus tokens.

## Observacoes

- A task e frontend-only na aplicacao `admin/`.
- Nao ha alteracao em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`; portanto
  `pnpm --dir backend db:migrate` nao se aplica.
