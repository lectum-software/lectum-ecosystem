# ADR-0540 - Centralizacao vertical do texto na caixinha social

## Status

Aceita em 2026-09-30.

## Contexto

Uma captura de MP4 social mostrou que, em perguntas quebradas em tres linhas, a margem superior da area branca da caixinha ficava visualmente maior que a inferior. O renderer do `video/` usava um offset minimo fixo para posicionar o primeiro `drawtext`, o que protegia perguntas curtas mas impedia a centralizacao optica no caso reportado.

## Decisao

- Calcular a posicao vertical inicial da pergunta pelo centro da area branca considerando a altura visual do bloco de texto: `fontSize + (linhas - 1) * lineHeight`.
- Remover o offset minimo fixo `bodyTextTopMinOffset` do layout do card.
- Preservar fonte compacta em perguntas com mais de duas linhas, quebra maxima de tres linhas, dimensoes do card, cabecalho azul, nome/selo profissional e demais filtros do MP4.

## Consequencias

A mudanca afeta apenas novas geracoes de MP4 social no servico `video/`; arquivos ja gerados ou cacheados nao sao reprocessados. Nao altera upload de video, filas, endpoints, contratos HTTP, dados, envs, pacotes ou apps frontend/admin/backend. Rollback e simples por reversao do calculo de `y` e da constante removida.

## Task relacionada

TASK-42 - Layout de compartilhamento social para video-resposta.

## Validacao

- `pnpm --dir video exec biome check --write src/infra/ffmpeg/social-share.ts src/infra/ffmpeg/social-share.test.ts src/infra/ffmpeg/social-share-layout.ts`
- `pnpm --dir video exec tsx --test src/infra/ffmpeg/social-share.test.ts`
- `pnpm --dir video check`
- `pnpm --dir video build`
- `pnpm check:encoding`
- `pnpm check:adrs`
- `pnpm check:tasks`
- `pnpm check:version`
