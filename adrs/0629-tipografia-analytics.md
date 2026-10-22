# ADR-0629: Rotulos e tipografia dos analytics

## Status

Accepted

## Task relacionada

TASK-266

## Decisao

Padronizar rotulos dos contadores e legendas em text-xs font-semibold
leading-4 text-muted, como as metricas existentes do video de apresentacao.
Preservar a familia tipografica global e a hierarquia dos valores numericos.
Percentual/Novo herdam font-semibold do wrapper, pois o reset global de button
usa font: inherit fora das camadas Tailwind. Nao alterar esse reset global.
No componente de timeline, apresentar a serie favorites como Favoritos,
inclusive em detalhes e descricao acessivel, sem modificar o objeto da API.
Isto funciona com o backend atual, que ainda pode enviar o texto anterior.

## Consequencias e rollout

Somente apresentacao frontend. Sem alteracao de contrato, dados, env, schema
ou dependencias. Nao requer deploy do backend. Publicacao autorizada pelo usuario.
Rollback pelo artefato frontend anterior.

## Validacao

Testes focais e check frontend aprovados. Build bloqueado por ENOSPC no disco
local; QA autenticada bloqueada por HTTP 500 da API local de analytics.
Bloqueios resolvidos em 22/10/2026: build aprovado com o modo existente
LECTUM_LOW_DISK_MODE=1; migration aditiva pendente aplicada apenas localmente.
QA autenticada real com HTTP 200 aprovada em 393px e 1440px, incluindo fontes,
percentual, Favoritos, tooltip e overflow. Capturas inspecionadas e previa
aprovada pelo usuario. Rollout junto da TASK-265, sem deploy funcional backend.
