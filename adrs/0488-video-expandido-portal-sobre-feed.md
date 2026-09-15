# ADR-0488: Video expandido em portal acima do feed

## Status

Accepted

## Task relacionada

TASK-172 - Corrigir vazamento visual abaixo do video expandido no feed

## Contexto

A TASK-169 removeu o fullscreen nativo dos videos de conteudo para evitar a faixa do navegador/OS
com dominio e instrucao de saida. A alternativa adotada foi uma expansao inline fixa dentro do DOM
do proprio player.

Em feeds mobile, porem, o player pode estar dentro de cards com `overflow-hidden`, listas com scroll,
bottom navigation, FAB e surfaces de video compositadas pelo browser. Nessa combinacao, mesmo com o
player em `position: fixed`, uma faixa inferior podia revelar parte do video/card abaixo quando o
usuario ampliava o conteudo.

## Decisao

- O estado expandido de `VerticalVideoPlayer` para conteudo passa a ser renderizado com
  `createPortal(playerRoot, document.body)`.
- O local original recebe um placeholder sem video, preservando a altura do card/lista e evitando
  salto de scroll enquanto o overlay esta aberto.
- O player expandido usa camada alta (`z-[1100]`), `isolate`, dimensoes explicitas de viewport,
  fundo opaco e `object-contain`.
- O documento inteiro (`html` e `body`) fica com scroll/overscroll travados durante a expansao e
  recebe `data-lectum-inline-video-expanded` para diagnostico/estilos futuros.
- Como a troca para portal recria o elemento `<video>`, o player captura e restaura tempo, pausa,
  mute, volume e velocidade basicos. Os hooks de playback recebem uma versao do elemento para
  reobservar IntersectionObserver e reanexar source HLS/native quando o ref muda.

## Alternativas consideradas

### Apenas aumentar o z-index

Rejeitada como solucao principal. O problema pode envolver stacking contexts, `overflow-hidden` e
composicao nativa de video; um z-index maior dentro do card nao garante que o player escape da
hierarquia visual do feed.

### Deixar o player no card e adicionar backdrop global

Rejeitada como solucao principal. Um backdrop cobre parte do vazamento, mas nao resolve clipping ou
recomposicao do elemento de video quando o proprio player continua dentro da arvore do card.

### Voltar ao fullscreen nativo

Rejeitada. Resolveria parte da cobertura, mas reintroduziria a faixa do navegador com dominio,
contrariando a decisao da TASK-169/ADR-0485.

## Consequencias

- O video expandido passa a cobrir a viewport acima do feed, bottom navigation e FAB.
- O card original preserva a geometria, reduzindo salto de scroll ao fechar.
- O comportamento permanece frontend-only, sem mudanca de schema, endpoint, provider, env ou pacote.
- Rollback simples reverte este commit e volta ao overlay inline anterior, com o risco conhecido de
  vazamento visual no feed inferior.

## Validacao

- Teste focado do `VerticalVideoPlayer` cobre portal, placeholder, camada e trava de scroll.
- `frontend check`, `frontend build`, `pnpm check`, browser local mobile e smoke de homologacao.
