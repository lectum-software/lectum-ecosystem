# ADR-0046: Header fixo e barra de navegação com comportamento por rolagem no fluxo de psicólogos

## Status

Accepted

## Task relacionada

Ajuste visual da página de psicólogos para melhorar ergonomia durante rolagem.

## Contexto

Na página de listagem de psicólogos, os usuários precisavam manter o cabeçalho de acesso aos
filtros sempre visível durante a rolagem da lista, e reduzir distração visual no scroll vertical.

## Decisão

- Mantive o cabeçalho da listagem (`<header>`) com `position: sticky` (`sticky top-0`) apenas na
  tela de psicólogos, com camada acima do conteúdo (`z-30`) e leve `backdrop-blur`.
- Adicionei controle de visibilidade da navegação global do `PrivateTemplate` acionável por prop:
  `autoHideNavigation`.
- Quando `autoHideNavigation` está ativo (somente em `/app/psychologists`), o comportamento passa a:
  - mostrar nav ao scroll para cima;
  - esconder nav ao scroll para baixo;
  - mostrar nav automaticamente no topo (`scrollY <= 12`) para garantir retorno.
- A mudança foi feita com `transform` na barra de navegação e atualização por eventos de scroll com
  `requestAnimationFrame`, com limiar de 8px para reduzir jitter.

## Consequências

- A experiência de navegação em `/app/psychologists` fica mais focada durante deslocamento para baixo.
- Outros fluxos de tela permanecem com comportamento atual (barra fixa) por padrão, preservando compatibilidade.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Verificação visual na rota `/app/psychologists` com rolagem para cima/baixo e navegação no rodapé.

