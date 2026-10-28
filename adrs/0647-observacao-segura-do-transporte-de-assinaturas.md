# ADR-0647 — Observação segura do transporte de assinaturas

## Status

Aceito; implementado e validado localmente em 0.1.734 — 2026-10-28.

## Task e contexto

TASK-32 — Checkout de assinatura. O suporte confirmou `cc_rejected_high_risk`
nas duas tentativas do incidente de 27/10. Sessão presente no serviço não comprova
que o SDK a encaminhou. A solicitação atual autoriza diagnóstico, validação local
e commit, não nova cobrança, push ou deploy. Não mudar Assinaturas para Payments.

## Decisão

- Observar passivamente o `fetch` nativo usado pelo SDK existente por canais
  `node:diagnostics_channel`, sem novo cliente HTTP, monkeypatch, interceptor que
  consuma streams, alteração de payload, retry ou endpoint financeiro de teste.
- Escopo fixo de produção: POST `/preapproval/` em `https://api.mercadopago.com`.
  AsyncLocalStorage vincula a tentativa em `request:create`; eventos subsequentes
  usam a identidade do request em WeakMap, não a conexão reutilizada nem o contexto
  assíncrono de outra tentativa. No máximo oito requests observados por operação.
- Comparar `X-Meli-Session-Id` no evento `client:sendHeaders`, imediatamente antes
  da escrita HTTP/1.1. Registrar somente presença e igualdade exata; cabeçalho
  duplicado não comprova igualdade. Evento ausente significa desconhecido.
- Comparar `payer_email` do payload do adapter com o e-mail autenticado, recebido
  apenas no contrato interno do gateway. Não modificar o e-mail enviado, inclusive
  no sandbox. Nome/documento continuam sob tokenização do Brick, fora deste escopo.
- Diferenciar essa comparação do corpo observado no transporte. Node 22 (imagem
  produtiva, Undici 6) não publica `request:bodyChunkSent`; nesse runtime a
  comparação do corpo transmitido fica desconhecida. Onde disponível, copiar no
  máximo 16 KiB dos chunks, analisar JSON só após `bodySent`, reter apenas booleanos
  e zerar o buffer. Nunca ler/consumir `request.body` para suprir a falta do canal.
- Limitar leitura de headers a 64 KiB. Nenhum header bruto, Authorization, sessão,
  e-mail, card token, documento, identificador financeiro, resposta ou exceção bruta
  pode alcançar o logger. Referência de tentativa usa o hash já existente.
- Subscribers com proteção total contra exceções; logger executado apenas no
  finally da operação e falhas dele ignoradas. Preservar resultado/erro originais.
  Limpar buffers e referências sensíveis ao encerrar, sem tarefas em background.

## Limites da evidência

`headers_observed` descreve a preparação final da escrita; `body_sent` indica
conclusão reportada pelo transporte, não ingestão ou uso do sinal pelo Mercado Pago.
HTTP de resposta também não prova aprovação. Ausência de canal/suporte (inclusive
HTTP/2), corpo excedido/inválido, operação sem request e falha parcial têm estados
explícitos; não registrar falso positivo. A mudança não resolve uma decisão de risco.

## Deploy e validação

Somente backend, sem pacote, env, schema ou migration nova. Contrato HTTP e frontend
inalterados, rollout independente/aditivo. Rollback por revert sem migração de dados.
Sem alteração visual; Builder/proto e browser de UI não se aplicam a este escopo.

Validar transporte real com receptor loopback 204 que apenas drena o corpo, nos
runtimes Node 22 e 24. Não é gateway simulado nem aprovação fictícia; não usar
credenciais/cartão/dados reais. Cobrir concorrência, igualdade byte-exata, ausência,
limites, falhas e privacidade. Executar checks, build backend e smoke local isolado.
Nenhuma chamada financeira ou acesso ao banco produtivo durante esta task.

## Fontes primárias

- [Canais Undici](https://undici.nodejs.org/api/DiagnosticsChannel)
- [Canais no Node 22/Undici 6](https://github.com/nodejs/node/blob/v22.x/deps/undici/src/lib/core/diagnostics.js)
- [Escrita HTTP/1.1 no Node 22](https://github.com/nodejs/node/blob/v22.x/deps/undici/src/lib/dispatcher/client-h1.js)
- [Diagnostics Channel](https://nodejs.org/docs/latest-v22.x/api/diagnostics_channel.html)
- [Recomendações para Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/how-tos/improve-payment-approval/recommendations)

## Resultado local

Check integral aprovado (1.023 testes backend), build backend e smoke isolado
ping/health/ready 200. Suite focal: 20/20 em Node 24.21.0/Undici 7.29.1 e 20/20 em
Node 22.23.4/Undici 6.29.1; Node 22 executado em container sem rede externa, com
artefatos JS somente leitura. Um teste de evento malformado é unitário e separado
da evidência HTTP real. Cobertura de corpo observável somente no runtime que
publica os chunks; Node 22 mantém campos de transporte desconhecidos. Revisão
independente sem bloqueantes. Versão 0.1.734, commit local em homolog; sem push,
deploy, cobrança ou consulta a dados produtivos.

## Integração para publicação — 28/10/2026

Autorização produtiva recebida. Integrar origin/homolog 9843f3206, já promovido
pelo time no PR #136 (0.1.735), sem remover mudanças de analytics/vídeo. ADR
renumerado de 0644 para 0647 por colisão com ADR publicado pelo outro trabalho.
Nova versão de integração 0.1.736; repetir checks, builds e smoke local antes
do push. Nenhuma alteração funcional adicional em billing. Frontend/admin de
produção estavam 0.1.735, backend 0.1.733, ping/health/ready 200 no preflight.

Publicação via PR homolog → main; backend primeiro, sem builds simultâneos na
VPS. Sem env/migration nova, sem teste financeiro pelo agente. Verificar logs
de deploy e versões após promoção. Evidências operacionais finais no PR para
não criar outro commit/bump somente para registrar a publicação.

Gates locais da integração 0.1.736 aprovados: check integral, builds backend,
frontend, admin e video, 20/20 testes focais novamente no Node 22 e smoke
local ping/health/ready 200. Diff contra main preserva integralmente fontes
frontend/admin/video e migrations/lockfiles; alteração funcional apenas backend.
Dokploy homolog backend/video revalidados off, sem schedules; preview backend
off. Vercel frontend/admin conectados ao repo, sem deploy hooks, homolog false
na configuração versionada efetivamente usada pelos projetos. Produção backend
exige Deploy manual (autodeploy off); manter rollout serial na VPS.
