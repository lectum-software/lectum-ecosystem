# ADR 0114 — Resumo de atuação nas publicações do perfil

## Status

Aceita

## Task relacionada

TASK-15 — Perfil profissional público

## Contexto

A aba `Publicações` do perfil do psicólogo já exibia posts e respostas reais do profissional usando o card de comunidade, mas não mostrava um resumo imediato da autoridade do psicólogo nas comunidades antes da listagem.

O pedido de produto foi destacar, logo abaixo da navegação da aba, em quais comunidades o psicólogo é Top Mentor e o volume real de contribuições em comunidades, sem criar mocks nem uma seção pesada.

## Decisão

O endpoint `GET /api/private/directory/psychologists/:id/posts` passa a retornar um objeto `summary` junto da paginação:

- `posts_count`: total real de posts publicados pelo psicólogo em comunidades.
- `replies_count`: total real de respostas do psicólogo em posts de comunidades.
- `top_mentor_communities`: até três comunidades em que o psicólogo está entre Top #1, Top #2 ou Top #3 Mentor.

As posições de mentor não foram materializadas em uma nova tabela. Elas são calculadas sob demanda usando o helper existente `getCommunityMentorRankingSignals`, preservando a fórmula aprovada para ranking e o requisito de considerar somente psicólogos elegíveis ao Top Mentor.

No frontend, a aba `Publicações` renderiza uma seção compacta antes da listagem:

- comunidades Top Mentor em linha horizontal com avatar, nome e badge metálico existente;
- métricas `Posts` e `Respostas` com contagens reais do contrato.

Se não houver comunidade Top 3 e não houver contribuição, a seção não é exibida.

## Consequências

- A aba `Publicações` comunica reputação e participação antes dos cards, sem duplicar a tela de Top Mentores.
- O resumo usa dados persistidos já existentes e o cálculo de ranking oficial, sem seed, mock ou score enviado pelo frontend.
- A consulta do perfil fica mais rica e pode ficar mais custosa em perfis com muitas comunidades candidatas; se necessário, uma task futura pode materializar snapshots de ranking conforme previsto no `DATA-MODEL.md`.
- Não houve alteração de Prisma, migrations ou packages.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP mobile 390px em `/app/psychologist/demo-psychologist-camila-rocha?tab=publicacoes` confirmou seção `data-publications-summary`, três comunidades Top Mentor e métricas `2 Posts` / `1 Respostas`.
- Chrome/CDP desktop 1440px confirmou a mesma seção com largura centralizada no card da aba e três comunidades renderizadas.
- Complemento em 2026-06-17: Chrome/CDP mobile 390px e desktop 1440px confirmou badges `TOP #1 MENTOR` sem corte, em uma linha, com largura de 124px e eixo central único entre avatar, selo e nome (`avatarBadgeDelta=0`, `avatarNameDelta=0`).

## Pendências

Nenhuma pendência externa. Builder/Quick Copy não esteve disponível como ferramenta direta; a referência visual usada foi a imagem anexada pelo usuário e a validação no browser local com dados reais.

## Complemento em 2026-06-17 - limpeza visual de sombras

Foi aplicado um ajuste visual na secao Top Mentores do perfil do psicologo para reduzir a sensacao de camadas flutuando. Os avatares das comunidades e os badges `TOP #1 MENTOR` deixaram de usar sombras projetadas e passaram a depender de borda/contorno sutil. O card de resumo de Publicacoes tambem ficou sem sombra propria.

Os botoes `Ver todas` das secoes Avaliacoes e Publicacoes passaram a seguir o padrao secundario limpo: fundo branco, borda suave, hover por cor/borda e sem `box-shadow`.

A decisao preserva a hierarquia por espacamento, contraste e tipografia, sem alterar ranking, contratos, APIs, dados reais, Prisma, packages ou logica de interacao.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Chrome/CDP mobile 390px e desktop 1440px em `/app/psychologist/demo-psychologist-camila-rocha?tab=publicacoes`, confirmando `box-shadow: none` no resumo Top Mentores e no badge, com anel sutil preservado no avatar.
- Chrome/CDP mobile 390px e desktop 1440px em `/app/psychologist/demo-psychologist-camila-rocha`, confirmando `box-shadow: none` nos dois botoes `Ver todas`.
