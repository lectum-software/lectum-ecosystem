# ADR-0041: Centralização do card de psicólogo e dot de disponibilidade pulsante

## Status

Accepted

## Task relacionada

Ajuste visual de listagem de psicólogos (pós TASK-13).

## Contexto

Após refinamentos recentes do card, o solicitante reportou dois pontos visuais:
- o card do psicólogo precisa manter posicionamento central na tela;
- o indicador visual de disponibilidade deveria ter pulse para destacar o estado.

## Decisão

- Ajustei o `<article>` raiz do card para aplicar centralização horizontal via `left: 50%` + `transform: translateX(-50%)` em vez de depender apenas de `mx-auto`.
- Mantive todas as dimensões/relacionamentos do card existentes (incluindo `width`, `maxWidth`, `aspectRatio` e offsets do overlay), evitando alterar o contrato visual principal.
- Tornei o ponto verde de disponibilidade pulsante ao aplicar `motion-safe:animate-pulse` no `span` interno da bolinha.

## Consequências

- O card passa a ficar alinhado ao centro horizontal do contêiner imediatamente disponível em telas e layouts onde é renderizado, reduzindo desvios de posicionamento em variações de largura.
- A bolinha de disponibilidade ganha feedback visual de estado em execução de animação, com suavidade padrão da utility `motion-safe:animate-pulse`.
- Não há impacto em dados, API ou regras de negócio.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação manual no browser local da listagem/rota de favoritos para verificar centralização e animação de ponta a ponta.

## Pendências

- Nenhuma.
