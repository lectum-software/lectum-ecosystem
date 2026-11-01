# TASK-304 - Concorrencia de sessoes de analytics

## Contexto

Durante a promocao autorizada da TASK-303, o QA real repetiu HTTP 500 em page-view-tracking e visitor-location-capture. Instrumentacao local revelou conflitos P2034 na gravacao compartilhada de visitor_session; a disputa pode esgotar as tres tentativas serializaveis. A rotina era identica a main 0.1.762. Nenhum dado produtivo foi alterado pelo diagnostico.

## Decisao

Usar transacao ReadCommitted, criacao com chave unica e skipDuplicates, seguida de UPDATE com predicado de autoria (sem dono ou mesmo usuario). O PostgreSQL verifica novamente esse predicado depois da espera pelo lock da linha. Ler o resultado dentro da mesma transacao. Preservar campos opcionais, a primeira visita e recusa de sessao pertencente a outro usuario, inclusive para chamadas anonimas. Nao alterar o helper serializavel de outros dominios. ADR-0667.

## Aceite

- [x] Vinte criacoes concorrentes produzem uma unica sessao sem falha.
- [x] Disputa entre dois usuarios tem apenas um dono e nao permite roubo por login ou chamada anonima.
- [x] Atualizacao do mesmo dono preserva identidade e aplica metadados opcionais.
- [x] Corrida com vinculacao anonima preserva a autoria final.
- [x] Repeticao do QA de navegador sem HTTP 500 de telemetria.
- [x] Checks locais e builds backend/frontend aprovados; hooks obrigatorios repetidos antes do push.

Teste de integracao real: ANALYTICS_SESSION_INTEGRATION=1, somente banco local com nome de desenvolvimento/teste. Fixtures UUID exclusivas removidas ao final; nenhuma simulacao HTTP ou banco.

QA final: Chrome real, API e PostgreSQL locais, 320/390/1440 px, ocultar/restaurar persistido, zero pageerror e zero HTTP >=500 da API/app. Fixtures removidas. O QA funcional usou servidor de desenvolvimento limpo; os builds de producao foram validados separadamente. O frontend de producao recusa API localhost por politica existente, preservada. Log final: .tmp/task304-browser-final.log; resultado: .tmp/task303-browser-results.json. Teste real de concorrencia executado duas vezes com sucesso.

## Publicacao

Complemento 0.1.765: o pre-push da 0.1.764 bloqueou o envio porque a flag opt-in nao estava classificada na cobertura do template production. ANALYTICS_SESSION_INTEGRATION foi adicionada a lista de exclusoes justificadas, junto das configuracoes exclusivamente locais. Os cinco testes do template passaram. Nenhum hook foi ignorado; a tentativa reprovada foi encerrada e a validacao integral sera repetida. Sem alteracao adicional de runtime.

Sem migration, dependencia ou env de runtime nova. Backend antes do frontend. Nao mudar flags de convites, cron, autodeploys ou segredos. Rollback de codigo para a versao anterior, sem desfazer dados. Gates de homologacao confirmados desligados pelo usuario durante a publicacao. iPhone fisico continua fora da validacao automatizada.
