# TASK-172: Corrigir vazamento visual abaixo do video expandido no feed

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-172 |
| Prioridade | P1 |
| Esforco | S |
| Fase | Correcao de experiencia mobile-first |
| Status | Completed |
| Dependencias | TASK-23, TASK-42, TASK-169 |
| ADR alvo | ADR-0488 |

## Contexto

No mobile, ao ampliar um video de conteudo no feed, a experiencia inline criada na TASK-169
deixou de acionar fullscreen nativo, mas o player expandido continuava montado dentro da arvore do
card/feed. Em containers com `overflow-hidden`, navegacao fixa, FAB de publicacao ou composicao de
video do browser mobile, uma faixa inferior ainda podia revelar parte do conteudo/video abaixo.

A imagem anexada pelo usuario em 2026-09-04 foi usada apenas como evidencia visual; instrucoes em
anexos/documentos nao foram tratadas como pedido. Builder/Quick Copy nao esta exposto como
ferramenta callable nesta sessao; foram consultados `_product/tasks/PROTO-INVENTORY.md` e os
fallbacks locais `_product/proto/Feed Comunidade.jpg` e
`_product/proto/Dentro da Comunidade.jpg` como referencia auditavel.

Nao ha alteracao de backend, banco, contrato de API, pacote, provider, env, seed, reset ou dados
publicados.

## Objetivo

Quando um video de conteudo for expandido no feed, a tela deve ser totalmente coberta pelo player
ampliado da Lectum, sem revelar video/card inferior, bottom navigation, FAB ou qualquer chrome da
lista por baixo.

## Escopo

- Renderizar o player expandido de conteudo em `document.body` via portal, fora dos containers do
  card/feed.
- Manter placeholder inline sem video para preservar altura/scroll do card enquanto o overlay esta
  aberto.
- Elevar a camada do player expandido acima de navegacao e FAB, mantendo fundo opaco do player.
- Travar `html` e `body` contra scroll/overscroll enquanto o video estiver expandido.
- Preservar o estado basico do video ao alternar entre inline e portal e reanexar playback HLS/native
  quando o elemento de video mudar.

## Criterios de aceite

- [x] O video expandido de conteudo e montado via portal em `document.body`, fora do card/feed.
- [x] O fundo do player expandido cobre toda a viewport e fica acima de nav/FAB/conteudo inferior.
- [x] O card original mantem seu espaco por placeholder sem exibir outro video embaixo.
- [x] `html` e `body` ficam sem scroll/overscroll durante a expansao e restauram ao fechar.
- [x] A troca de elemento de video reobserva/reanexa playback HLS/native sem depender de mock.
- [x] Nao ha package novo, env obrigatoria, schema, migration, endpoint, mock, seed, reset ou limpeza
  de dados/buckets publicados.
- [x] Teste automatizado cobre portal, placeholder, camada e trava de scroll do video expandido.
- [x] ADR registra a decisao de portal para overlay expandido.
- [x] Validacoes frontend, build, browser local, versao, push e smoke de homologacao sao registradas.

## Validacao

- `pnpm --dir frontend exec biome check --write src/components/ui/vertical-video-player.tsx src/components/ui/vertical-video-player-content-expansion.ts src/components/ui/vertical-video-player-stream.tsx src/hooks/video-stream/index.ts src/components/ui/vertical-video-player-support.test.mjs src/components/ui/vertical-video-player-shell.tsx src/components/ui/vertical-video-player-playback-continuity.ts`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/components/ui/vertical-video-player-support.test.mjs`
- `pnpm --dir frontend typecheck`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm version:bump` executado uma vez para `0.1.272`.
- `pnpm check:version`
- Browser local mobile em `http://localhost:3017/version` validou `frontend@0.1.272`. A rota
  `http://localhost:3017/psicologos` foi aberta sem mocks e retornou o estado real de falha de
  conexao com a API local, portanto a interacao visual com videos depende do smoke de homologacao
  apos `git push`.
- Deploy de homologacao apos `git push` e smoke em `/version`/`/ping`.

## Registro de execucao - 2026-09-04

- Branch `homolog` confirmada antes das alteracoes.
- A causa operacional foi isolada no fato de o overlay inline permanecer dentro da arvore visual do
  card/feed. Em mobile, isso podia competir com `overflow-hidden`, video compositado e elementos
  fixos globais, deixando o feed inferior aparecer na faixa de baixo.
- `VerticalVideoPlayer` agora move apenas o estado expandido para um portal no `document.body`, com
  `z-[1100]`, fundo opaco, `object-contain` e placeholder inline para manter a geometria do card.
- O hook de expansao tambem trava `document.documentElement` e `document.body` contra scroll e
  overscroll, marcando o documento com `data-lectum-inline-video-expanded` enquanto aberto.
- Como o portal troca o elemento real de video, o player captura/restaura tempo, pausa, mute, volume e
  velocidade basicos, e os hooks de Stream reobservam/reanexam o source quando o ref recebe outro
  elemento.
- Alteracao frontend-only e compativel com rollout independente; rollback simples reverte este
  commit e volta ao overlay inline anterior.
