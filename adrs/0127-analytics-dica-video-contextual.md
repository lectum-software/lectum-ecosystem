# ADR-0127: Dica de video contextual em Analytics

## Status

Aceito em 2026-06-18.

## Contexto

A tela `/app/professional/analytics` tinha uma recomendacao de melhoria do video como bloco isolado no fim da pagina. Com a evolucao da secao `Video de apresentacao`, essa dica passou a competir com outras secoes e ficou separada do dado que deveria contextualizar.

## Decisao

A recomendacao sobre testar videos de apresentacao deve ficar dentro da propria secao `Video de apresentacao`, logo apos o bloco de retencao, com visual discreto e integrado ao card principal.

O texto exibido e:

`Videos de apresentacao com alto engajamento geram mais conversoes para o WhatsApp. Faca testes e descubra o que funciona melhor para voce.`

A dica usa icone de lampada, fundo azul suave, borda leve e altura compacta, sem virar um card independente no fim da pagina.

## Consequencias

- A recomendacao passa a ser interpretada como insight contextual da analise de video.
- A pagina fica mais curta e com melhor hierarquia entre secoes.
- A ordem de secoes permanece: indicadores principais, video de apresentacao, origem do trafego e link da pagina de avaliacoes.
- Nao ha mudanca de contrato, backend, schema, migration, package, mock ou evento.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
