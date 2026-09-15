# TASK-174: Fixar barra de comentários no detalhe do post

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-174 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Correção de experiência mobile-first |
| Status | Completed |
| Dependências | TASK-23, TASK-24, TASK-26, TASK-45 |
| ADR alvo | ADR-0490 |

## Contexto

No detalhe do post em mobile, a barra principal de comentários (`Adicionar comentário`) aparece
flutuando no meio da discussão e cobrindo parte de uma resposta, em vez de permanecer fixa no rodapé.
A imagem anexada pelo usuário em 2026-09-04 foi usada apenas como evidência visual; instruções em
anexos/documentos não foram tratadas como pedido.

Builder/Quick Copy não está exposto como ferramenta callable nesta sessão. Foram consultados
`_product/tasks/PROTO-INVENTORY.md` e o fallback local `_product/proto/Dentro do Post.jpg` para
confirmar a superfície de discussão/comentários.

O diagnóstico mostrou que o `ReplyComposer` mobile já usava `position: fixed`, mas aplicava
`bottom: env(keyboard-inset-height, 0px)` mesmo quando não havia teclado visível. Em alguns
navegadores mobile/PWA, esse env pode permanecer com a altura antiga do teclado depois do fechamento,
empurrando a barra para cima e dando a impressão de que ela pertence ao fluxo do conteúdo.

## Objetivo

Garantir que a barra principal de comentários no detalhe do post e na árvore de respostas permaneça
fixa no rodapé da viewport mobile quando o teclado não estiver aberto, mantendo compatibilidade com o
ajuste acima do teclado enquanto o campo estiver ativo.

## Escopo

- Remover o uso de `env(keyboard-inset-height)` como offset padrão do composer principal.
- Manter `bottom-0` e padding de safe area como estado base no mobile.
- Aplicar offset inline somente quando o teclado estiver ativo e houver offset medido pelo
  `visualViewport`.
- Preservar os composers inline de respostas, a reserva inferior de conteúdo e o fluxo de envio real.
- Cobrir a regra com teste automatizado estático.

## Fora de escopo

- Alterar API, schema, migrations, upload de mídia, comentários inline, moderação, ordenação de
  respostas, permissões de mídia ou design system.
- Criar mocks, dados fake, seed, reset, limpeza de buckets ou qualquer operação destrutiva em
  ambientes publicados.
- Instalar package novo ou criar env nova.

## Critérios de aceite

- [x] O composer principal do detalhe do post continua `fixed` no mobile com `bottom-0` como base.
- [x] A barra não usa `env(keyboard-inset-height)` quando o teclado não está aberto.
- [x] O offset acima do teclado é aplicado apenas quando há estado ativo e medição positiva do
  `visualViewport`.
- [x] O conteúdo do detalhe e da árvore mantém reserva inferior para não ficar escondido pela barra.
- [x] Composers inline de respostas continuam renderizados no fluxo da árvore.
- [x] Não há package novo, env obrigatória, schema, migration, endpoint, mock, seed, reset ou limpeza
  de dados/buckets publicados.
- [x] Teste automatizado cobre a regra de layout e a reserva inferior.
- [x] ADR-0490 registra a decisão, alternativas, consequências e rollback.
- [x] Validações frontend, build, browser local, versão, push e smoke de homologação são registradas.

## Validação

- `pnpm --dir frontend exec biome check --write src/app/app/community/[slug]/post/[id]/components/reply-composer.tsx src/utils/post-reply-composer-layout.test.mjs package.json`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/post-reply-composer-layout.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser/local HTTP em `http://localhost:3017/version` e `http://localhost:3017/comunidades` após rebuild; interação autenticada real com envio de comentário depende de sessão do usuário, sem mocks.
- `pnpm version:bump` executado uma vez para `0.1.274`.
- `pnpm check:version`
- Deploy de homologação após `git push` e smoke em `/version`/`/ping`.

## Registro de execução - 2026-09-04

- Branch `homolog` confirmada antes das alterações.
- O bug foi isolado no offset CSS do teclado: o composer fixo recebia `bottom` baseado em
  `env(keyboard-inset-height)` mesmo sem teclado, e esse valor podia ficar stale no navegador mobile.
- O estado padrão voltou a ser exclusivamente a classe `bottom-0` com padding por safe area; quando o
  teclado realmente está ativo, o hook existente calcula o deslocamento via `visualViewport` e aplica
  apenas o valor medido em pixels.
- A alteração é frontend-only, mobile-first e não altera contratos de API nem dados persistidos.
- Rollback simples reverte o commit e volta ao comportamento anterior.
