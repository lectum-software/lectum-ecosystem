# ADR-0056: Exibir bio truncada com ação de detalhamento no modal na tela de Psicólogos

## Status

Accepted

## Task relacionada

Ajustes de UX na tela `/app/psychologists` (continuidade da refatoração imersiva da listagem).

## Contexto

A nova tela de descoberta de psicólogos apresenta texto de apresentação (campo `headline`) abaixo do nome e título.
O comportamento atual exibia esse texto sem limite de duas linhas fixo e sem interação de expansão,
o que dificulta comparar rapidamente perfis com textos longos e conflita com a orientação do layout mobile.

Também havia risco de ambiguidade de interação com o nome do psicólogo, que já possui outras
regras de espaçamento e não deveria ser afetado por truncamento nesse fluxo.

## Decisão

Definimos para a tela `/app/psychologists`:

- limitar o texto da bio a **2 linhas no estado compacto**;
- usar truncamento visual com `ellipsis` apenas no bloco de bio;
- disponibilizar abertura de **modal/bottom sheet simples** com título `"Bio"` e texto completo quando a bio estiver truncada;
- manter o clique limitado à área de texto da bio;
- manter cursor pointer apenas em telas desktop (via breakpoint Tailwind) quando há truncamento.

## Consequências

- Melhora de legibilidade no card imersivo, com previsibilidade de altura do overlay.
- Interação explícita para casos em que a bio ultrapassa 2 linhas, sem impactar
  a navbar, botões laterais ou demais ações de card.
- Regras de não-truncamento do nome permanecem preservadas para esse fluxo.

## Validação

- `pnpm check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir frontend check` seguido de validação manual da interação na tela `/app/psychologists`
  (desktop e mobile), confirmando abertura e fechamento do modal por clique e `Escape`.

## Pendências

- Alinhar com produto se futuras biografias maiores deverão mostrar contagem de caracteres ou CTA textual
  (“Ver mais”) além do comportamento por clique atual.
