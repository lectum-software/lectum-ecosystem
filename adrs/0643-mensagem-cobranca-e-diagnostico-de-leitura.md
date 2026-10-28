# ADR-0643 — Mensagem cautelosa de cobrança e diagnóstico de leitura

## Status

Aceito; implementado e validado localmente em 0.1.733 — 2026-10-27.

## Task

TASK-32 — Checkout de assinatura.

## Evidência e limites

A tentativa real executada pelo usuário em 27/10/2026 às 16:53:24 BRT
(19:53:24 UTC), release 0.1.732, registrou sessão antifraude presente no backend,
HTTP 400 do gateway e hints genéricos `card_validation/rejected`. Esses hints não
identificam a causa. A leitura diagnóstica automática registrou apenas indisponível.

Consultas posteriores somente leitura, correlacionadas à tentativa local, confirmaram
pagamento `rejected/cc_rejected_high_risk`, `live_mode=true` e preapproval `cancelled`.
A fatura estava `scheduled`, o que não significa pagamento aprovado ou assinatura
ativa. Ausência de `three_ds_info` não prova incompatibilidade com 3DS. A confirmação
da sessão no backend e os testes de transporte não comprovam processamento do sinal
pelo provider. A causa específica da indisponibilidade inicial não foi recuperada.

O toast de conexão não tem correlação HTTP comprovada com o 400: o handler global
usa essa cópia quando falta resposta/mensagem segura; o caminho 502 conhecido pode
ser sanitizado para indisponibilidade. Corrigir a comunicação sem afirmar uma causa
que o cliente não conhece. Não registrar IDs financeiros crus, payload, sessão, cartão,
documento, e-mail, segredo, stack, SQL ou mensagem bruta do provider.

## Decisão

1. Suprimir o toast global apenas nas duas mutations checkout/cartão e tratá-las nos
   catches já existentes. Helper de domínio usa somente códigos públicos conhecidos
   e mensagens locais controladas. Preservar modo administrativo somente leitura e
   erros classificados; não converter hints genéricos em recusa. Fallback orienta
   conferir o status e eventual cobrança antes de tentar novamente, sem garantir que
   a operação não aconteceu. Nenhuma mudança geral no interceptor/contrato de erros.
   Manter o mapa de cópia do frontend e os códigos/locale backend alinhados quando
   evoluírem; nenhum app importa arquivos do outro. Código desconhecido degrada
   para a mensagem cautelosa, inclusive durante rollout com versões diferentes.
2. No GET diagnóstico existente, classificar apenas fases e motivos fechados:
   validação do recurso, transporte/HTTP/JSON e lookup local. Incluir HTTP inteiro
   validado quando conhecido e duração monotônica limitada. A exceção tipada não
   conserva cause/body; o logger não copia campos arbitrários de exceções.
3. Preservar host fixo, identificador validado, um GET, timeout de 3s, sem redirects,
   sem retry, replay de webhook ou efeitos financeiros. O limite de 3s é do GET,
   não do observer inteiro com consulta ao banco. Não alterar a confirmação
   do webhook, entitlement ou transições da assinatura.
4. Preparar chamado privado sanitizado, sem enviá-lo. Referências necessárias à
   investigação do provider ficam como placeholders para preenchimento apenas em
   canal autenticado. Não anexar prints de cartão ou payloads integrais.

## Payments versus Assinaturas

O código atual cria assinatura por `/preapproval`; Card Payment Brick é documentado
para gerar o token desse fluxo. Trocar a opção Payments/Orders no painel não troca
o endpoint usado pelo código, embora habilitações da conta continuem relevantes.

Um POST avulso em `/v1/payments` não substitui sozinho ciclos, notificações e estados
de `/preapproval`. Existem produtos de Pagamentos Automáticos via Payments e via
Orders, com requisitos comerciais/habilitações e integração própria. Migrar é decisão
de produto/arquitetura, não correção demonstrada para esta recusa. Outro fluxo pode
produzir resultado diferente; não há evidência de que resolveria este incidente.

Payments e Orders têm fluxos documentados de 3DS/challenge; não foi confirmado
contrato equivalente para o `/preapproval` atual. Solicitar o caminho oficial ao
provider antes de adicionar campos não documentados. Não implementar fallback entre
APIs para a mesma tentativa: operações e idempotências independentes podem duplicar
cobrança/ativação. Não repetir cobranças em produção para testar hipóteses de risco.

## Rollout e validação

Sem novo pacote, env, migration ou schema. Backend/frontend separados e compatíveis
com versão anterior. Rollback por revert, sem limpeza de dados. Layout e controllers
inalterados; mobile-first preservado. Builder indisponível; referência exportada da
TASK-32 permanece ativa. Não modificar configuração de API, credenciais ou produção.

Check integral da raiz, builds backend/frontend, regressões focais e duas revisões
independentes aprovados. Smoke local isolado: backend ping/health/ready 200, billing
privado sem sessão 401; frontend version 200 em 0.1.733 com no-store. Browser das
rotas pagamento/cartão redirecionou ao login com callback preservado. Sem conta
profissional autenticada local: o toast pós-submit não foi reproduzido visualmente;
sua seleção, cópia e uso pelos dois catches têm cobertura unitária. Não confundir
esse limite com QA de aprovação financeira ou checkout ponta a ponta.

Testes executados sem credenciais reais, com URLs isoladas em loopback; valores
sintéticos são apenas entradas unitárias, não endpoints ou aprovação simulada. Sem
acesso ao banco remoto no QA, migration, cobrança ou alteração de produção nesta task.
Rascunho privado preparado fora do repositório, sem PII/segredos e não enviado. Backend
e frontend novos precisam ser publicados para melhorar logs e toast em produção;
este ajuste não corrige nem promete alterar uma decisão de risco do Mercado Pago.

## Fontes primárias consultadas em 27/10/2026

- [Tokenização para Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/additional-content/cardtoken)
- [Pré-requisitos de Pagamentos Automáticos via Payments](https://www.mercadopago.com.br/developers/pt/docs/automatic-payments/prerequisites)
- [Pagamentos Automáticos via Orders](https://www.mercadopago.com.br/developers/pt/docs/automatic-payments-orders/overview)
- [3DS com Payments](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-payments/how-tos/integrate-3ds)
- [Migração Payments para Orders](https://www.mercadopago.com.br/developers/pt/docs/checkout-api-orders/resources/migrate-payments-to-orders)
- [Recusas em Assinaturas](https://www.mercadopago.com.br/developers/pt/docs/subscriptions/how-tos/improve-payment-approval/reasons-for-rejection)
