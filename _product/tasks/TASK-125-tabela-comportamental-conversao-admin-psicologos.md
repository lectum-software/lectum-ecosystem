# TASK-125 - Tabela comportamental por conversao no Admin de psicologos

## Status

Completed

## Contexto

O bloco **Funil comportamental por conversao** do dashboard Admin `/psicologos` apresentava uma leitura sequencial por categoria selecionada. O usuario solicitou substituir esse bloco por uma tabela em que o eixo vertical liste as quatro categorias de conversao e as colunas exibam o comportamento predominante do segmento de psicologos em relacao a video de apresentacao, comunidades, Atividades, Engajamento e Favoritado.

A leitura deve continuar observacional, interna ao Admin e baseada em dados reais ja coletados pela plataforma. A tabela nao deve afirmar causalidade, criar ranking publico, usar mocks ou criar dados artificiais.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshot enviado pelo usuario em 2026-07-31 mostrando o bloco atual do funil comportamental no dashboard Admin de psicologos.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente Codex; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Trocar a apresentacao em funil/dropdown por uma tabela mobile-first, com linhas de conversao e colunas de comportamento predominante por eixo, usando contratos reais do backend.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-100: matrizes Conversao x Engajamentos/Favoritos e Conversao x Visibilidade.
- TASK-103: funil comportamental por conversao.
- TASK-123: donut de Atividade no dashboard Admin de psicologos.
- TASK-124: reposicionamento da matriz no dashboard Admin de psicologos.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Substituir o conteudo do bloco **Funil comportamental por conversao** por uma tabela.
- Remover o dropdown local de categoria do funil, ja que as quatro categorias passam a aparecer simultaneamente como linhas:
  - Alta Conversao;
  - Conversao Padrao;
  - Baixa Conversao;
  - Sem Conversao.
- Exibir as colunas comportamentais solicitadas:
  - Video de apresentacao;
  - Comunidades;
  - Atividades;
  - Engajamento;
  - Favoritado.
- Usar `profile_conversion_visibility` para derivar os comportamentos de Video de apresentacao e Comunidades.
- Usar `profile_conversion_engagement_favorites` para derivar os comportamentos de Engajamento e Favoritado.
- Criar no backend o contrato real `profile_conversion_activity`, cruzando Conversao x Atividade autoral com posts e respostas em comunidades no periodo selecionado.
- Exibir, por celula, comportamento predominante do segmento, quantidade de psicologos e percentual dentro da propria linha de conversao.
- Tratar linhas vazias ou sem base suficiente sem simular dados.
- Manter a UI mobile-first com rolagem horizontal interna da tabela em ~390px, sem overflow global da pagina.

## Fora do escopo

- Alterar pesos, percentis, algoritmo de classificacao de conversao ou classificacao de Atividade ja existentes.
- Criar ranking publico, drill-down individual, navegacao para lista filtrada ou endpoint paralelo de mock.
- Criar schema Prisma, migration, seed artificial, package novo ou componente de design system paralelo.
- Alterar a matriz detalhada do bloco de sinais agregados reposicionada na TASK-124.

## Criterios de aceite

- [x] O bloco **Funil comportamental por conversao** deixa de exibir a visualizacao em funil/dropdown e passa a exibir uma tabela.
- [x] O eixo vertical da tabela lista as quatro categorias: Alta Conversao, Conversao Padrao, Baixa Conversao e Sem Conversao.
- [x] A tabela exibe colunas para Video de apresentacao, Comunidades, Atividades, Engajamento e Favoritado.
- [x] Video de apresentacao e Comunidades sao derivados do contrato real `profile_conversion_visibility`.
- [x] Engajamento e Favoritado sao derivados do contrato real `profile_conversion_engagement_favorites`.
- [x] Atividades e derivada de contrato real novo `profile_conversion_activity`, calculado com posts e respostas reais de psicologos em comunidades no periodo.
- [x] Cada celula apresenta o comportamento predominante, contagem e percentual do segmento sem inventar dados.
- [x] Estados sem profissionais ou sem base suficiente sao comunicados de forma honesta.
- [x] A UI segue mobile-first e nao cria overflow horizontal global em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou desktop e mobile ~390px.
- [x] ADR criado em `adrs/0389-tabela-comportamental-conversao-admin-psicologos.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx" "src/api/req/psychologists/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local Chrome/CDP autenticado em `/psicologos` validou desktop e mobile 390px, confirmando tabela visivel, ausencia do dropdown antigo, ausencia de overflow global e rolagem horizontal apenas dentro da tabela em mobile. Screenshots locais: `.tmp/task125-behavior-table-desktop.png` e `.tmp/task125-behavior-table-mobile-390.png`.
- Endpoint real `/api/admin/private/psychologists/dashboard?period=all` validado com `profile_conversion_activity` contendo linhas e colunas reais.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao final junto com seus tokens.

## Observacoes

- A task altera backend e admin, mas nao altera `backend/prisma/schema.prisma` nem arquivos em `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao se aplica.
- A leitura permanece observacional e usa a base agregada do periodo/plano retornada pelo dashboard, sem prometer causalidade entre comportamento e conversao.