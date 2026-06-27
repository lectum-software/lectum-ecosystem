# ADR-0170: Simbolo Lectum em SVG escalavel

## Status

Accepted

## Task relacionada

Ajuste incremental de identidade visual para futuras telas de boas-vindas do paciente.

## Contexto

O produto passara a adotar um novo simbolo da marca Lectum em telas de onboarding e, posteriormente, no restante da aplicacao. O usuario forneceu uma referencia visual rasterizada do simbolo. Para evitar dependencia de imagem pesada, perda de qualidade em escalas diferentes e uso de `<img>` cru, a primeira versao tecnica deve ser um componente SVG limpo e reutilizavel.

## Decisao

- Criar `LectumSymbolIcon` como componente SVG inline em `frontend/src/components/ui/lectum-symbol-icon.tsx`.
- Usar `currentColor` para permitir aplicar a cor por tokens/classes da aplicacao.
- Manter o componente independente do layout atual, para ser integrado depois nas telas de boas-vindas e futuramente no site inteiro.
- Nao instalar pacote de tracing/vetorizacao e nao adicionar asset rasterizado novo.

## Consequencias

- O simbolo passa a ser escalavel, leve e facil de animar por CSS.
- A versao e uma interpretacao limpa da referencia rasterizada, nao um trace pixel-perfect do arquivo original.
- A integracao nas duas telas de boas-vindas podera reutilizar o mesmo componente com animacoes sutis sem duplicar SVG.

## Validacao

- `pnpm --dir frontend check`

## Pendencias

- Integrar o simbolo ao novo layout das duas telas de boas-vindas do paciente.
- Definir e validar a animacao premium no fluxo completo antes de aplicar ao onboarding.
