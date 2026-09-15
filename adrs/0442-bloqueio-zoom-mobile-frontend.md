# ADR-0442 — Bloqueio de zoom no frontend mobile

## Status

Aceito

## Contexto

Em validação real no iPhone/Safari em `homolog.lectum.com.br`, o usuário conseguiu ampliar a página por pinch zoom e, ao abrir modais como compartilhamento, a interface permaneceu presa no zoom aplicado. Isso torna ações críticas difíceis de concluir porque o modal passa a ocupar uma área ampliada sem controle claro para retornar à escala original.

A aplicação já é mobile-first e deve manter legibilidade própria sem depender de zoom do navegador. O ajuste afeta somente metadados de viewport do frontend, sem alteração de backend, banco, contratos de API, dados publicados, envs ou packages.

## Decisão

Declarar o `viewport` global do Next.js no layout raiz do frontend com:

- `width: "device-width"`;
- `initialScale: 1`;
- `maximumScale: 1`;
- `userScalable: false`.

A decisão prioriza a estabilidade da experiência web-app mobile com modais, drawers e overlays, evitando que a escala do navegador persista e quebre componentes fixos ou centrados na viewport.

## Consequências

- O frontend passa a solicitar ao navegador mobile que mantenha a escala em `1`.
- Modais abertos depois do carregamento tendem a preservar a escala esperada da interface.
- Há trade-off de acessibilidade: usuários não devem depender de pinch zoom para ler a UI; por isso, fluxos mobile devem continuar sendo implementados com tipografia e espaçamentos legíveis.
- A mudança é compatível com rollout independente: versões antigas e novas do frontend/backend continuam convivendo, pois não há contrato compartilhado.

## Task relacionada

Hotfix de UX mobile solicitado pelo usuário em 2026-08-10.

## Validações

- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check:version`.

## Complemento 2026-08-10 — guard client-side para iOS/Safari

### Contexto

Após o deploy da primeira camada, a validação em celular continuou permitindo zoom. O Safari/iOS pode ignorar `maximum-scale=1` e `user-scalable=no` por decisão de acessibilidade, então o `viewport` sozinho não é suficiente para uma experiência web-app com modais.

### Decisão

Adicionar uma segunda camada no frontend:

- CSS global `touch-action: pan-x pan-y` em `html` e `body`;
- componente client-side `MobileZoomGuard`, montado no layout raiz;
- listeners não passivos para `gesturestart`, `gesturechange`, `gestureend`, `touchmove` com mais de um toque e segundo `touchend` rápido fora de controles interativos.

O objetivo é bloquear pinch/double-tap zoom depois que a página carrega, preservando rolagem normal e evitando interceptar cliques em links, botões, campos e players.

### Consequências

- A proteção passa a cobrir browsers que ignoram a meta viewport.
- Uma página já ampliada antes do carregamento do novo bundle precisa ser recarregada/aberta novamente para voltar à escala 1.
- O trade-off de acessibilidade permanece e deve ser compensado por legibilidade própria da UI mobile.

### Validação

- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
