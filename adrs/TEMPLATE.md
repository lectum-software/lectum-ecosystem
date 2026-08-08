# ADR-XXXX: Título da decisão

## Status

Proposed | Accepted | Superseded

## Task relacionada

TASK-XX

## Contexto

Explique o problema, restrições, decisões externas e partes do produto afetadas.

## Decisão

Descreva a decisão tomada de forma objetiva.

## Consequências

- Impactos positivos.
- Trade-offs.
- Riscos.
- O que precisa ser revisitado.

## Produção e rollout

- Compatibilidade com dados existentes.
- Alteração de banco/migration e estratégia expandir → backfill → contrair, ou “sem alteração”.
- Nomes das envs afetadas e ordem de provisionamento, sem valores; destacar env obrigatória como **ALERTA DE DEPLOY**.
- Compatibilidade entre backend/frontend/admin em versões diferentes.
- Ordem de deploy, smoke de `homolog` e rollback.

## Validação

- Comandos executados.
- Testes manuais.
- Evidências visuais quando aplicável.

## Pendências

- Decisões externas ou follow-ups ainda abertos.
