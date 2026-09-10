# ADR-0494: Topo do post com botão Seguindo inline

## Status

Accepted

## Task relacionada

TASK-26 - Dentro do post

## Contexto

Em 2026-09-10, o usuário reportou que, no detalhe mobile de um post, o chip/botão
`Seguindo` estava sendo empurrado para a linha de baixo quando o texto
`Postado em {comunidade}` era longo. A imagem anexada foi usada apenas como
evidência visual da interface; textos dentro do anexo não foram tratados como
instrução.

O problema ficava no header do detalhe do post, não no contrato de API: o
container permitia `flex-wrap`, então o nome da comunidade preservava largura
visual demais e o controle de seguir quebrava para a próxima linha.

## Decisão

- O topo contextual do detalhe do post passa a ser uma linha única `flex` sem
  wrap.
- Ícone, rótulo `Postado em`, chip `Seguindo/Seguir` e badge `Silenciado`
  permanecem `shrink-0`.
- O nome da comunidade fica dentro de um container `min-w-0 flex-1` e usa
  `truncate`, para que o texto anterior aplique ellipsis antes de deslocar o
  botão.
- A regra permanece mobile-first e frontend-only, alinhada ao padrão já usado
  nos cards do feed de comunidade.

## Consequências

- Em viewport mobile, o botão `Seguindo` permanece na mesma linha do texto
  contextual do post.
- Comunidades com nomes longos são truncadas com reticências, preservando o CTA
  de seguir/seguidos acessível.
- Não há alteração de API, schema, migration, package, env, seed, mock ou dados
  publicados.
- Rollback simples reverte o commit; o risco conhecido do rollback é o botão
  voltar a quebrar linha em comunidades com nomes longos.

## Produção e rollout

- Compatibilidade com dados existentes: total; alteração apenas de layout.
- Banco/migration: sem alteração.
- Envs: nenhuma env nova ou obrigatória; sem **ALERTA DE DEPLOY**.
- Compatibilidade entre versões: frontend novo funciona com backend atual/antigo
  porque consome os mesmos campos de post e comunidade.
- Ordem de deploy: push em `homolog` publica o frontend em homologação; validar
  `/version` e o detalhe de post em mobile antes de recomendar promoção.
- Rollback: reverter o commit restaura o layout anterior sem migração reversa.

## Validação

- Builder/Quick Copy foi tentado via `npx "@builder.io/dev-tools@1.79.0" auth status`
  em `frontend/`, mas falhou por cache local `ENOENT`; a evidência visual usa o
  print do usuário e `_product/proto/Dentro do Post.jpg`.
- Teste estático cobre a regra de linha única, `min-w-0 flex-1 truncate` no nome
  da comunidade e `shrink-0` no botão.
- `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`,
  `pnpm check:version`, `git diff --check`, browser/local mobile e smoke de
  homologação.
- No browser local buildado, `/version` respondeu `0.1.308` e a rota pública de
  post abriu em viewport 390x844 sem overflow horizontal; a API local configurada
  retornou estado indisponível, então a conferência visual com o post real fica
  para homologação após o push.

## Pendências

- Nenhuma pendência externa nova.
