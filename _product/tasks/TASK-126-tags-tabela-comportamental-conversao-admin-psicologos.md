# TASK-126 - Tags na tabela comportamental por conversao do Admin de psicologos

## Status

Completed

## Contexto

A TASK-125 substituiu o bloco **Funil comportamental por conversao** do dashboard Admin `/psicologos` por uma tabela Conversao x comportamento. Depois da primeira validacao visual, o usuario pediu os seguintes refinamentos de produto:

1. as informacoes de cada celula devem aparecer em **tags**, explicando o comportamento predominante da categoria, e nao em blocos/metric cards;
2. **Atividades** e **Engajamento** devem ficar unificados dentro de **Comunidade**, pois representam comportamento comunitario do mesmo segmento.
3. a tabela deve incluir **Perfil** para explicar o comportamento predominante dos usuarios no perfil publico daquela categoria de profissionais.
4. as tags das celulas devem ter peso visual normal, sem bolinha indicadora, sem borda/cartao interno e sem o label auxiliar "Leitura textual do comportamento predominante".
5. a coluna antes chamada **Favoritado** representa, na verdade, a **Tela de favoritos** e deve exibir somente a taxa media de cliques de WhatsApp por psicologo daquela categoria.

A leitura continua observacional, interna ao Admin e baseada exclusivamente em sinais reais agregados ja coletados pela plataforma.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` como referencia local auditavel;
- screenshots enviados pelo usuario em 2026-07-31 e 2026-08-01 mostrando a tabela anterior com metric cards por celula.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente Codex; a implementacao usa imagem local e screenshots do usuario, registrando esta limitacao.

## Objetivo

Transformar a tabela comportamental por conversao em uma leitura em tags, com linhas de conversao e colunas:

- Video de apresentacao;
- Perfil;
- Comunidade;
- Tela de favoritos.

Cada celula deve explicar, em tags curtas, os sinais predominantes do segmento, por exemplo: `Retencao: X%`, `Engajamento: alto` e `Posicao: top 10`.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-100: matrizes Conversao x Engajamentos/Favoritos e Conversao x Visibilidade.
- TASK-103: funil comportamental por conversao.
- TASK-123: donut de Atividade no dashboard Admin de psicologos.
- TASK-124: reposicionamento da matriz no dashboard Admin de psicologos.
- TASK-125: tabela comportamental por conversao no Admin de psicologos.

Todas as dependencias acima estao concluidas.

## Escopo executado

- Manter o eixo vertical com as quatro categorias de conversao:
  - Alta Conversao;
  - Conversao Padrao;
  - Baixa Conversao;
  - Sem Conversao.
- Reduzir as colunas comportamentais para:
  - Video de apresentacao;
  - Perfil;
  - Comunidade;
  - Tela de favoritos.
- Consolidar os sinais de Atividades e Engajamento na coluna Comunidade.
- Gerar no backend e expor no payload o conjunto de metricas reais usado para formar as tags por celula:
  - Video de apresentacao: retencao media, engajamento no video, posicao media na lista publica, consumo medio, views por video, replay e WhatsApp originado pelo video.
  - Perfil: aberturas reais, aberturas por psicologo, permanencia media, navegacao nas abas Publicacoes/Avaliacoes, favoritos recebidos e WhatsApp originado no perfil.
  - Comunidade: conteudos autorais, posts, respostas, profissionais ativos, acoes por psicologo, views por conteudo, permanencia, retencao de video comunitario, interacoes recebidas, score, comentarios, salvamentos, compartilhamentos, votos positivos e WhatsApp de comunidade.
  - Tela de favoritos: somente a media de cliques de WhatsApp por psicologo originados da tela de favoritos.
- Remover da UI os blocos internos de metricas por celula, mantendo tags comportamentais.
- Ajustar o peso visual das celulas para tags de peso visual normal, sem bolinha azul, sem borda/cartao interno e sem label auxiliar abaixo das tags.
- Preservar no payload a lista de metricas como evidência técnica/auditavel, sem exibi-las como cards.
- Tratar categorias vazias e sinais ausentes com comunicacao honesta, sem mock ou estimativa artificial.
- Manter rolagem horizontal interna da tabela em mobile, sem overflow global.

## Fora do escopo

- Alterar pesos, percentis ou algoritmos de Conversao, Atividade, Engajamento/Favoritos ou ranking publico.
- Criar schema Prisma, migration, seed, package novo, endpoint simulado ou dado fake.
- Adicionar drill-down individual ou navegacao para lista filtrada.
- Remover os blocos/matrizes analiticos originais usados em outras leituras do dashboard.

## Criterios de aceite

- [x] A tabela deixa de exibir metric cards/blocos dentro das celulas e passa a exibir tags.
- [x] O eixo vertical lista Alta Conversao, Conversao Padrao, Baixa Conversao e Sem Conversao.
- [x] A tabela exibe apenas as colunas Video de apresentacao, Perfil, Comunidade e Tela de favoritos.
- [x] Os sinais de Atividades e Engajamento ficam consolidados dentro da coluna Comunidade.
- [x] Video de apresentacao explica retencao, engajamento, posicao media, consumo, replay e cliques WhatsApp do video quando houver base real.
- [x] Perfil explica aberturas, permanencia, abas internas, favoritos desses perfis e cliques WhatsApp via perfil quando houver base real.
- [x] Comunidade explica conteudos, atividade autoral, consumo, retencao de videos de comunidade, interacoes, score e cliques WhatsApp de comunidade quando houver base real.
- [x] Tela de favoritos exibe somente a media de cliques de WhatsApp por psicologo daquela categoria, originada da tela de favoritos.
- [x] Estados sem profissionais ou sem base suficiente sao comunicados de forma honesta.
- [x] As tags das celulas usam peso visual normal, sem bolinha indicadora, sem borda/cartao interno e sem o label auxiliar de leitura textual.
- [x] A UI segue mobile-first e nao cria overflow horizontal global em ~390px.
- [x] Nenhum `<img>` cru foi adicionado.
- [x] Nenhum package novo, schema Prisma ou migration foi criado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshots do usuario foram usados como referencia.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou a tabela em desktop e mobile ~390px.
- [x] ADR criado em `adrs/0390-tags-tabela-comportamental-conversao-admin-psicologos.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Endpoint real `/api/admin/private/psychologists/dashboard` validado com `profile_conversion_behavior.columns` retornando quatro colunas: `Video de apresentacao`, `Perfil`, `Comunidade` e `Tela de favoritos`, e celulas com `metrics` reais para tags.
- A coluna `Tela de favoritos` foi revalidada no endpoint com quatro celulas `favorite`, cada uma contendo somente a metrica `favorites_screen_whatsapp_clicks_per_psychologist`.
- Browser local Chrome/CDP autenticado em `/psicologos` validou a renderizacao em tags da tabela em desktop e mobile 390px, sem blocos internos por metrica, sem bolinha/label auxiliar e sem overflow global.
- Browser local tambem validou a presenca do header `Tela de favoritos` e da tag `Cliques WhatsApp/psicologo`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao final junto com seus tokens.

## Observacoes

- A task altera backend e Admin, mas nao altera `backend/prisma/schema.prisma` nem arquivos em `backend/prisma/migrations`; portanto `pnpm --dir backend db:migrate` nao se aplica.
- O payload preserva `headline` por celula para rastreabilidade narrativa, mas a UI usa `metrics` como tags comportamentais.
- A leitura permanece agregada e observacional; nao afirma causalidade entre comportamento e conversao.
