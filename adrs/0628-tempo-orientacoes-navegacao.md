# ADR-0628: Coordenacao temporal das orientacoes de navegacao

## Status

Accepted

## Task relacionada

TASK-265

## Contexto

Orientacao imediata do botao de publicacao e varios gatilhos de cadastro
interrompiam a exploracao. Usuario aprovou 30 segundos, 3 minutos e intervalo
de 2 minutos. Sao parametros de produto, nao tempos universais de pesquisa UX.

## Decisao

Reutilizar as duas interfaces existentes. Um helper compartilhado acumula tempo
apenas com document.visibilityState visible, persiste progresso em sessionStorage
e faz fallback em memoria. A orientacao conta tempo nas superficies em que ja
e elegivel (feed/comunidades), por identidade; conserva localStorage e flag
remota de exibicao unica. Abrir criacao continua marcando a orientacao como vista.
O cadastro conta paginas publicas de descoberta, incluindo raiz do feed, e
aguarda 180 segundos. Remover os outros gatilhos automaticos, incluindo
contagem de WhatsApp, pois esse contato publico nao exige autenticacao.
Registrar fechamento/desmontagem/pagehide da orientacao e aguardar 120 segundos
de relogio desde esse instante, alem do requisito de navegacao ativa. A modal
aberta bloqueia o convite. Modais visiveis tambem adiam ambas as exibicoes.
Pedidos explicitos de acoes que exigem conta nao usam esses tempos.

## Consequencias

Navegar entre telas ou recarregar nao reinicia progresso na mesma aba.
Nao sincronizar segundos entre dispositivos ou abas. Historico existente
permanece respeitado. A contagem de aba visivel nao comprova leitura ou atencao.
Sessao sem storage conserva apenas o progresso deste documento.

## Producao e rollout

Somente frontend; sem migration, env ou contrato novo. Backend/admin/video
continuam compativeis. Sem push/deploy; publicacao depende de autorizacao.
Rollback de codigo nao altera dados persistentes da conta.

## Validacao

52 testes focais e check completo do frontend aprovados. Cobertura de limites,
pausa em aba oculta, acumulacao entre superficies, cooldown e bypass explicito.
QA com API local real em 393px/1440px confirmou os tempos, ausencia de
sobreposicao dos avisos, limite por sessao e publicacao imediata/repetivel.
Sem novo build de producao, aparelho fisico ou publicacao remota nesta tarefa.
Source-safety permite somente controles t.mock.timers enable/tick/reset em
arquivos de teste, sem liberar substituicao de dados ou endpoints no produto.
