# ADR-0668 - Dicas reutilizam a acao protegida antes de fechar

## Status

Aceita em 2026-11-01.

## Contexto

A dica de publicar replica visualmente o atalho do feed/comunidade. Um listener global em captura fechava a dica e desmontava seu Link antes do handler React, deixando o navegador visitar a rota protegida e redirecionar ao login. O botao normal ja usava a modal de conversao correta.

## Decisao

- Callback de publicacao obrigatorio, compartilhado com a acao normal da superficie.
- Cancelar navegacao nativa, executar callback e somente depois dispensar a dica.
- Observar cliques externos em bubbling, nunca desmontar o link antes do handler delegado do React.
- A modal existente decide entre criar conta, fazer login ou continuar explorando; destino protegido permanece na intencao de retorno.
- Auditar todas as dicas: nao adicionar redirects de autenticacao nos overlays. Acoes publicas (busca, WhatsApp) continuam publicas; dicas exclusivas de profissionais continuam restritas pelo contexto autenticado.

## Consequencias

Sem nova modal ou alteracao visual, API, schema, env ou dependencia. Preserva compositor de autenticados e historico de dicas. Regressao cobre ordem/captura e conexao dos dois consumidores; QA real local verifica clique/teclado, escolhas e navegacao. Rollback apenas do frontend, revertendo o commit por PR se publicado.
