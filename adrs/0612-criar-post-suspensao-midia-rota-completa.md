# ADR-0612: Suspensao de midia em toda entrada de Criar Post

## Status

Accepted

## Task relacionada

TASK-250

## Contexto

O retorno da edicao do nome pode montar a rota completa de criacao, com um feed
atras da folha. A suspensao de midia dependia de asModalSlot, que nessa rota era
false. Assim, o fundo podia reproduzir videos durante Nome atualizado.

## Decisao

Adquirir useModalMediaSuspension incondicionalmente enquanto CreateCommunityPostLogic
estiver montado. A folha e sempre uma modal, independentemente do tipo de rota.
Manter overlayRef como escopo permitido, sem alterar o hook compartilhado.

## Consequencias

O fundo fica bloqueado desde a montagem ate a desmontagem, inclusive na confirmacao,
no formulario e na animacao de fechamento. Previa interna, volume, posicao de video
e contagem de modais aninhadas preservam o comportamento existente.

## Producao e rollout

Apenas frontend. Sem migration, env ou dependencia nova. Compativel com os demais
servicos atuais. Publicacao por PR autorizado; rollback por versao anterior do
frontend. Nao publicar homologacao automaticamente.

## Validacao

Contratos de integracao nas suites de autoplay e navegacao e testes de modal para bloqueio de
play/playing tardios, promessa de play, preview interno e ownership aninhado.
Resultados de checks e QA registrados na TASK-250.
