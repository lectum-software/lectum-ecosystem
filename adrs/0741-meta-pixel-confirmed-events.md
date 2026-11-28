# ADR-0741: Pixel com recibos confirmados da API

## Status
Accepted.

## Contexto
O usuario solicitou todos os eventos atuais da API tambem no Pixel e autorizou URLs das comunidades e das rotas adicionais listadas na TASK-377. Hooks assincronos e pagamentos por webhook nao podem virar conversoes apenas por clique ou chegada a uma pagina.

## Decisao
Endpoints aditivos retornam somente nome, eventId, horario e parametros minimos de jobs canonicos recentes. Autenticados usam cookie HttpOnly ja existente e identidade autenticada; visitantes usam token de atribuicao ja existente. Reutilizar validadores de evidencia/consentimento da CAPI e vincular fbp ao navegador atual. Subscribe exige pagamento confirmado pelo servidor. Nenhum segredo CAPI vai ao frontend.

O frontend somente inicia o SDK depois de novo aceite especifico do Pixel, consentimento de campanhas valido e recibo elegivel. Nao herda aceites antigos, nem transmite acoes anteriores ao aceite. Usa trackSingle para eventos padrao e trackSingleCustom para forum_post com eventID igual a event_id. Deduplica na memoria e sessionStorage; a Meta deduplica browser/servidor. Desliga autoConfig, nao fornece advanced matching e reconstroi parametros por allowlist. Revoga na retirada do consentimento e ao sair da rota.

Rotas: /, /app, /psicologos, /comunidades, /comunidades/<slug> e /app/profissional/assinatura/pagamento; somente hosts produtivos Lectum HTTPS. Query permite apenas UTMs e fbclid; hash e demais parametros bloqueiam. Nenhuma captura automatica de PageView ou conteudo.

## Consequencias
Fechar o navegador ou permanecer em rota privada pode deixar a acao somente na API; isso e esperado, especialmente em pagamentos assincronos. Recibos tem janela de dez minutos, no maximo 30 por consulta; polling de cinco segundos apenas em aba visivel. Nao garante atribuicao publicitaria, entrega de SDK bloqueado ou melhora de campanha. A versao anterior do backend e tolerada sem interromper o produto. Sem alteracao de banco.

## Validacao e rollout
TASK-377. Flags opcionais false em ambos os exemplos. Backend antes do frontend, mesmo META_DATASET_ID da API; frontend precisa rebuild para ativar/desativar. Desligar ambas e rollback simples. Testar confirmacao, consentimento, isolamento de navegador e deduplicacao localmente antes da publicacao autorizada.

Referencia: https://developers.facebook.com/documentation/ads-commerce/conversions-api/deduplicate-pixel-and-server-events

## Evolucao
ADR-0742 acrescenta PageView explicito por visita consentida. A exclusao de PageView acima descreve a entrega original 0.1.882; os recibos de conversao e sua deduplicacao permanecem iguais.
