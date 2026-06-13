# ADR-0071: Responsividade mobile da tela Top Mentores

## Status

Accepted

## Task relacionada

TASK-27

## Contexto

Na validacao mobile da tela `/app/community/top-mentors`, o viewport iPhone 12 Pro
com 390px expunha corte lateral no header/card de Top Mentores. O caso mais sensivel
era o nome longo da comunidade no hero, combinado com containers sem `min-w-0` e com
componentes de podium/tabs que usavam dimensoes rigidas ou margem negativa.

## Decisao

A tela Top Mentores deve manter o layout mobile-first dentro da largura disponivel:

- o shell da rota bloqueia overflow horizontal da area de conteudo;
- o container principal usa `width: 100%`, `max-width: 100%` no mobile e so amplia em
  breakpoints maiores;
- hero, cards, lista, formula e grupos flex/grid recebem `min-w-0`/`max-w-full` para
  permitir truncamento/quebra de texto;
- nomes longos de comunidade usam quebra defensiva com `overflow-wrap:anywhere`;
- o podium usa avatares menores no mobile para caber no card;
- os filtros de periodo mantem scroll horizontal interno controlado, sem margem
  negativa que desloque a pagina inteira.

## Consequencias

- O conteudo da pagina nao deve gerar scroll horizontal no viewport de 390px.
- Textos longos podem quebrar em mais linhas no hero e na explicacao da formula, em vez
  de serem cortados lateralmente.
- A area de filtros continua rolavel internamente quando necessario, mas nao aumenta a
  largura do documento.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em Chrome headless com device metrics `390x844`: rota autenticada
  redirecionou para login sem overflow (`scrollWidth=390`) e fixture DOM da tela Top
  Mentores com as mesmas classes compiladas ficou sem elementos excedendo a viewport
  (`documentElement.scrollWidth=390`, `body.scrollWidth=390`, `offenders=[]`).
