# TASK-170: Retorno instantâneo ao vídeo anterior de psicólogos

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-170 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Correção de experiência mobile-first |
| Status | Completed |
| Dependências | TASK-13, TASK-15, TASK-168 |
| ADR alvo | ADR-0486 |

## Contexto

No commit `65cf0758`, a página de psicólogos passou a memorizar o vídeo/slide ativo antes de abrir
o perfil público e a restaurar esse ponto ao retornar. O feedback de homologação mostrou que, embora
o slide final fosse correto, o retorno ainda exibia uma rolagem pelos vídeos anteriores até chegar ao
vídeo de origem. Isso acontecia porque a restauração era executada após o paint e o container do feed
tem `scroll-behavior: smooth` para interações normais.

O comportamento desejado é retornar diretamente ao vídeo de origem, como se a posição de scroll do
feed tivesse sido preservada, sem animar a travessia pelos slides anteriores. A mudança é
frontend-only, mobile-first e não altera backend, banco, contratos de API, pacote, provider, env,
seed, reset ou dados publicados.

Builder/Quick Copy não está exposto como ferramenta callable nesta sessão. Foram consultados o
inventário `_product/tasks/PROTO-INVENTORY.md` e a imagem local `_product/proto/Psicólogos.jpg` como
fallback visual auditável.

## Objetivo

Ao voltar de um perfil aberto a partir do feed de vídeos de psicólogos, posicionar o container
diretamente no slide salvo antes da primeira pintura do feed restaurado, sem rolagem suave visível.

## Escopo

- Reaproveitar o snapshot efêmero da `TASK-168` em `sessionStorage`.
- Trocar a restauração tardia por restauração de layout antes do paint.
- Durante a restauração, neutralizar temporariamente `scroll-behavior: smooth` e `scroll-snap-type`
  no container para que a atribuição de `scrollTop` seja instantânea.
- Preservar a rolagem suave e o snap nas interações normais do usuário, como próximo/anterior e
  swipe manual.
- Manter reconciliação por `psychologistId` quando a ordem/lista tiver mudado.

## Critérios de aceite

- [x] O retorno do perfil para `/psicologos` não anima a lista passando pelos vídeos anteriores.
- [x] A restauração usa `useLayoutEffect`/equivalente para aplicar a posição antes do primeiro paint
  do feed restaurado.
- [x] O container desliga temporariamente `scroll-behavior: smooth` e `scroll-snap-type` somente
  durante a restauração automática.
- [x] O comportamento normal de swipe/scroll do feed continua com snap e rolagem suave quando
  acionado pelo usuário.
- [x] A memória por `sessionStorage`, expiração, validação de URL e fallback por `psychologistId`
  continuam iguais à `TASK-168`.
- [x] Não há package novo, env obrigatória, schema, migration, endpoint, mock, seed, reset ou
  limpeza de dados/buckets publicados.
- [x] Testes automatizados cobrem o posicionamento instantâneo sem animação suave.
- [x] ADR registra a decisão de restauração instantânea pré-paint.
- [x] Validações frontend, build, browser local, versão e push em `homolog` são registradas.

## Validação

- `pnpm --dir frontend exec biome check --write ...`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/persisted-origin-navigation.test.mjs src/app/app/psychologists/modules/feed-loop.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- browser local mobile em `/psicologos`: navegar para um slide posterior, abrir perfil e voltar sem
  rolagem visível pelos vídeos anteriores;
- `pnpm version:bump`
- `pnpm check:version`
- deploy de homologação após `git push` e smoke em `/version` e `/psicologos`.

## Registro de execução — 2026-09-04

- Branch `homolog` confirmada antes das alterações.
- A investigação do commit `65cf0758` mostrou que o snapshot era correto, mas a restauração usava
  `useEffect` com duplo `requestAnimationFrame` e chamava `scrollTo({ behavior: "auto" })` em um
  container cujo CSS definia `scroll-behavior: smooth`.
- Foi criado o módulo `feed-restore-scroll` para calcular o alvo e posicionar o container por
  `scrollTop` com `scroll-behavior: auto` e `scroll-snap-type: none` apenas durante a restauração.
- O hook `usePsychologistsFeedNavigation` passou a restaurar com `useLayoutEffect`, antes do paint,
  e a limpar o snapshot imediatamente após aplicar a posição.
- Testes focados passaram com 15 cenários, incluindo a nova garantia de que a restauração força
  `scroll-behavior: auto`/`scroll-snap-type: none` e usa fallback quando o slide ainda não existe.
- `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check` passaram.
- Browser local mobile em `http://localhost:3013/psicologos`, usando dados reais da API de
  homologação com Chrome headless e CORS desabilitado apenas localmente, confirmou retorno ao slide
  4 (`scrollTop=3376`, `targetTop=3376`, `activeIndexByScroll=4`) sem amostras intermediárias de
  scroll; o feed preservou `scroll-behavior` computado `smooth` após a restauração.
- `pnpm version:bump` sincronizou os cinco manifests em `0.1.270` e `pnpm check:version` aprovou.
- A task é frontend-only e compatível com versões independentes das aplicações durante rollout.
