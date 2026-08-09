# ADR-0062: Comunidades reais e feed paginado

## Status

Accepted

## Task relacionada

TASK-22, TASK-23

## Contexto

TASK-22 exige explorar comunidades persistidas e registrar sugestoes como pendentes, sem publicar temas automaticamente. TASK-23 exige feed real por comunidade com posts publicados, contadores denormalizados e sem exposicao de dados privados do autor.

As referencias visuais consultadas foram `_product/proto/Explorar Comunidades.jpg`, `_product/proto/Sugerir Comunidade.jpg`, `_product/proto/Confirmacao de Sugestao de Comunidade.jpg` e `_product/proto/Feed Comunidade.jpg`. O Builder Quick Copy foi tentado via CLI com o VCP ativo em 2026-06-12, mas a execucao encerrou por timeout/EPIPE antes de retornar artefatos; por isso a implementacao usou as imagens locais como fonte auditavel.

O banco de desenvolvimento tinha drift em migration ja aplicada (`20260611140000_add_specialty_catalog_options`). O usuario autorizou explicitamente resetar o banco de desenvolvimento para concluir a TASK-22 e executar a TASK-23.

## Decisao

- Criar `community_suggestion` com os campos definidos em `DATA-MODEL.md`: `user_id`, `theme`, `status` inicial `pendente` e indice por `status`.
- Montar um modulo privado compartilhado em `/api/private/community`, autenticado por `_auth` no mount, com:
  - `GET /api/private/community` para lista paginada de comunidades reais e categorias derivadas das comunidades persistidas;
  - `POST /api/private/community/suggestions` para registrar sugestoes pendentes;
  - `GET /api/private/community/:slug/posts` para feed paginado de posts publicados.
- Manter paginacao por `page`/`limit` (default 20, max 50 no backend; limite visual menor no frontend) em vez de cursor/virtualizacao nesta etapa. O feed ainda nao tem volume real nem requisito de scroll infinito, e `@tanstack/react-virtual` permanece apenas candidato em `PACKAGES.md`.
- Expor no feed somente dados publicos do autor (`id`, `name`, `avatar`, `role`) e contadores agregados denormalizados de `community_post`; nenhum voto individual e nenhum dado privado do usuario e retornado.
- Na execucao original da TASK-22/TASK-23, nao criar seeds de comunidades nem posts. Quando o banco nao possui comunidades/posts reais, a UI mostra estado vazio honesto e CTA para sugestao.
- Em 2026-06-13, por decisao explicita de produto, criar um catalogo inicial persistido de comunidades: `Ansiedade em equilibrio`, `Relacionamentos com Proposito`, `Mulheres em Foco`, `Autocuidado em Pratica` e `Luto e Ressignificacao`. Esses registros sao comunidades reais do ambiente, com `members_count=0` e sem posts artificiais.
- Direcionar a navegacao principal do item `Comunidade` para o feed canonico `/app/community/ansiedade-em-equilibrio`, mantendo `/app/community` como rota de exploracao/lista e cada card abrindo `/app/community/[slug]`.

## Consequencias

- A TASK-22 deixa de depender de dados locais ou mocks: lista e sugestao usam API real.
- A TASK-23 fica preparada para os posts que serao criados na TASK-24 e para a tela de post detalhado da TASK-26.
- O clique em `Comunidade` no bottom nav/sidebar entra diretamente no feed de uma comunidade inicial, em vez de abrir a tela de exploracao.
- A UI mobile-first segue a base dos prototipos, mas sem imagens decorativas fake de comunidades porque o schema atual nao possui campo de imagem.
- O CTA `Abrir post` aponta para a rota canonica futura `/app/community/[slug]/post/[id]`, que sera implementada em task posterior.

## Validacao

- `pnpm --dir backend db:migrate --name add_community_suggestions` falhou inicialmente por drift em migration ja aplicada.
- `pnpm --dir backend exec prisma migrate reset --force` executado com autorizacao explicita do usuario.
- `pnpm --dir backend db:migrate --name add_community_suggestions` executado com sucesso e criou `20260612233414_add_community_suggestions`.
- `pnpm --dir backend check`: sucesso.
- `pnpm --dir frontend check`: sucesso apos formatacao.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Browser/local HTTP no dev server:
  - `GET http://localhost:3000/app/community` retornou `200`;
  - com cookie local de validacao, `GET /app/community/suggest`, `/app/community/suggest/success` e `/app/community/test-slug` retornaram `200`;
  - `GET http://localhost:3001/api/private/community` sem token retornou `401`, confirmando guard privado.
- Validacao complementar de 2026-06-13:
  - `pnpm --dir backend db:migrate` aplicou `20260613003000_add_initial_community_catalog`;
  - `pnpm --dir backend check`: sucesso;
  - `pnpm --dir frontend check`: sucesso;
  - `pnpm --dir backend build`: sucesso;
  - `pnpm --dir frontend build`: sucesso;
  - `pnpm check`: sucesso;
  - `GET /api/private/community/ansiedade-em-equilibrio/posts?page=1&limit=5` com token de validacao local retornou `200`, comunidade `Ansiedade em equilíbrio`, `0` posts;
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio` e `GET http://localhost:3000/app/community` retornaram `200`.

## Pendencias

- O catalogo inicial de comunidades foi definido por produto em 2026-06-13; novas comunidades futuras devem continuar passando por curadoria/operacao ou task especifica.
- Criacao de posts, votos, salvamentos, respostas e detalhe do post continuam nas tasks 24, 26 e 28.
- Se o feed crescer muito, reavaliar cursor por `createdAt` + `id` e `@tanstack/react-virtual` com ADR proprio.


## Atualizacao 2026-06-17 - texto do post como area de navegacao

- O feed passa a tratar o resumo/conteudo textual do post como area de navegacao para o detalhe, alem do titulo ja clicavel.
- A area clicavel continua limitada ao conteudo textual: o card inteiro nao vira link e botoes de upvote, downvote, comentarios, salvar e compartilhar mantem suas acoes proprias.
- Quando o texto e truncado, o trecho inline `... ver mais` faz parte do mesmo link para o detalhe do post, alinhando a expectativa de abrir a publicacao completa.
- A decisao e exclusivamente frontend e nao altera contratos de API, persistencia, votos, salvos, compartilhamentos ou paginacao.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em 390px validando texto clicavel no feed e upvote sem navegacao.
