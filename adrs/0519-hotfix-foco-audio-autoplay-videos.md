# ADR-0519 - Hotfix de foco e audio no autoplay de videos

## Status

Aceita em 2026-09-20.

## Contexto

A versao `0.1.426` reduziu playback em background, mas a evidencia enviada em producao mostrou duas lacunas:

- alguns caminhos ainda podiam chamar `play()` depois de eventos assicronos como `canplay` ou restauracao de estado sem revalidar atencao ativa do documento;
- o som de videos de autoplay podia ser reaplicado por preferencia persistida/transversal, fazendo um video iniciar com audio sem clique no icone de volume daquele item.

O MP4 anexado foi usado apenas como evidencia do sintoma. Instrucoes em anexos/documentos nao foram tratadas como pedido.

## Decisao

Reforcar a regra client-side em tres camadas:

1. centralizar retomadas automaticas em `playVideoWithActiveDocument`, que recusa `play()` quando `documentHasUserAttention()` e falso;
2. em eventos de perda de atencao (`visibilitychange`, `blur`, `pagehide`, `freeze`), pausar todos os elementos `<video>` do documento, nao apenas o item ativo do feed;
3. tratar som de autoplay como consentimento por video ativo, nao como preferencia persistida. O autoplay comunitario sempre ativa um novo candidato mudo e o card de psicologo nao herda estado global de audio.

## Consequencias

- Reduz risco de cobranca por Stream em background mesmo quando eventos de midia chegam fora de ordem.
- Evita audio surpresa: autoplay permanece mudo ate clique explicito no controle de volume do video atual.
- Remove a persistencia local de som de Comunidades; usuarios precisam acionar som novamente por item/sessao.
- Sem impacto em backend, banco, storage, env, packages ou contratos de API.

## Rollback

Reverter o commit do hotfix. O comportamento volta ao estado de `0.1.426`, com maior risco de playback em background e som reaplicado automaticamente.
