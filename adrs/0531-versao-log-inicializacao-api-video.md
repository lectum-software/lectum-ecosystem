# ADR-0531 - Versao no log de inicializacao da API de video

## Status

Aceita em 2026-09-24.

## Contexto e decisao

O operador precisa identificar a release pelo log de startup, mesmo sem acesso externo a /version. Adicionar version ao evento existente video_api_started, emitido apos listen, usando VIDEO_SERVICE_VERSION (mesma fonte da rota). Estender somente o tipo de detalhes seguros do logger; manter JSON estruturado, sem URLs, segredos, PII ou dump de env. Nao criar outra fonte de versao nem biblioteca de logging. O runtime combinado tambem chama esse startup.

## Impacto e validacao

Campo aditivo, sem alteracao de banco/env/pacote/contrato HTTP. Check/build video e subprocesso real do logger, comparando JSON completo e wiring no callback de listen. Rollback por reversao revisada em homolog. Promover por PR e verificar endpoints publicos; inspecao do log em ambiente privado fica limitada pelo acesso operacional.
