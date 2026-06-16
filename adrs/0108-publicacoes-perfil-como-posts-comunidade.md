# ADR 0108 — Publicações do perfil como posts reais da comunidade

## Status

Aceita

## Task relacionada

TASK-15 — Perfil profissional público

## Contexto

A seção `Publicações` do perfil público do psicólogo usava cards resumidos próprios, diferentes dos posts exibidos no feed e dentro das comunidades. Isso criava inconsistência visual e também escondia partes relevantes da contribuição do profissional, principalmente quando a publicação do perfil era uma resposta profissional a um post de paciente com mídia.

O pedido de produto foi alinhar a seção ao comportamento real da comunidade, exibindo comunidade, data, título/conteúdo, mídia e ações completas sem alterar a ordenação geral nem criar um layout paralelo.

## Decisão

O endpoint `GET /api/private/directory/psychologists/:id/posts` passa a retornar contribuições públicas do profissional no formato de `CommunityPostDTO`, com um campo adicional `contribution_type` (`post` ou `reply`).

- Para `post`, o retorno representa um post original do psicólogo.
- Para `reply`, o retorno representa o post original onde a resposta foi feita e injeta essa resposta persistida como `highlighted_professional_reply`.
- A consulta combina posts e respostas reais do profissional, ordena por `createdAt` da contribuição e pagina o resultado combinado.
- Votos/salvos do usuário autenticado continuam sendo resolvidos pelas tabelas persistidas existentes.

No frontend, o perfil reutiliza `CommunityPostCard` tanto na prévia da aba Geral quanto na aba `Publicações`. O componente compartilhado recebeu suporte opcional a ações interativas (`interactiveActions`) para permitir upvote/downvote e salvar no perfil sem mudar os usos existentes em feed/comunidade.

Complemento em 2026-06-16: o mesmo `contribution_type` também é a fonte de verdade visual para o contexto exibido no topo do card. Contribuições do tipo `post` mantêm o ícone de documento e o texto `Postado em {comunidade}`; contribuições do tipo `reply` usam ícone de comentário/resposta e o texto `Respondido em {comunidade}`. Como a aba `Publicações` e a prévia da aba Geral usam o mesmo `CommunityPostCard`, a regra fica centralizada e consistente nos dois locais.

## Consequências

- O perfil deixa de manter um card resumido paralelo para publicações e passa a seguir a mesma família visual de posts da comunidade.
- A seção passa a mostrar respostas profissionais no contexto do post original, preservando conteúdo, mídia e ações do post.
- Posts originais e respostas ficam diferenciados por rótulo e ícone, sem duplicar layout nem criar exceção na prévia da aba Geral.
- O contrato de `DirectoryPsychologistProfilePost` fica intencionalmente mais rico e dependente do DTO público de comunidade.
- Novos ajustes visuais de post devem ser feitos no componente compartilhado quando forem aplicáveis a todos os contextos.
- Não houve alteração de banco, Prisma, migrations ou instalação de packages.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- API local `200` em `GET /api/private/directory/psychologists/demo-psychologist-camila-rocha/posts?limit=2`, retornando posts e respostas com `contribution_type`.
- Chrome/CDP em 390px e 1440px validou no perfil demo o texto `3 publicações deste profissional`, botões `Ver todas` alinhados ao título e card de post real com resposta profissional destacada, vídeo e ações completas.
- Em 2026-06-16, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` validaram o ajuste de rótulo/ícone por `contribution_type`.
- Chrome/CDP mobile 390px validou a prévia da aba Geral com `Respondido em` e a aba `Publicações` com `Respondido em` e `Postado em`.

## Pendências

Nenhuma pendência externa. Builder/Quick Copy não esteve disponível como ferramenta direta no ambiente; a validação visual foi feita pelo browser local e pelos protótipos/consistência já existentes.
