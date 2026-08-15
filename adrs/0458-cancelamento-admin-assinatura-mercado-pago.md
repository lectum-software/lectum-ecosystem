# ADR-0458: Cancelamento administrativo real de assinatura profissional

Status: Accepted
Data: 2026-08-13

## Contexto

O Admin precisava cancelar uma assinatura profissional diretamente na aba `Assinatura` do detalhe do psicologo. Como homologacao e producao ja podem conter dados reais, o fluxo nao poderia apenas marcar a assinatura local como cancelada: uma assinatura Mercado Pago ativa continuaria recorrente no provedor.

A tela existente da TASK-56 ja exibe plano, forma de pagamento mascarada e historico financeiro. Builder/Quick Copy nao esta exposto como ferramenta neste ambiente, entao a validacao visual usou o PNG local de `Plano e pagamentos` e a captura enviada pelo usuario.

## Decisao

- Criar o endpoint Admin privado `POST /api/admin/private/psychologists/:id/billing/subscription/cancel`.
- Expor `billing.plan.can_cancel` apenas para assinatura `source="mercadopago"`, `gateway="mercadopago"` ou vazio, plano `profissional`, com `gateway_subscription_id` e status ainda nao cancelado.
- Exigir confirmacao forte com a frase `CANCELAR ASSINATURA` e motivo interno de pelo menos 10 caracteres no frontend e no backend.
- Chamar `getPaymentGateway().cancelSubscription(...)` antes de atualizar o banco local. Se o gateway nao retornar status cancelado, a assinatura local permanece inalterada.
- Persistir o cancelamento local em `professional_subscription` com `status="cancelada"`, `current_period_end=null`, `gateway="mercadopago"` e a referencia retornada pelo gateway.
- Registrar auditoria em `admin_activity_log` com `action="psychologist_subscription_cancelled"`, `domain="psychologist_subscription"`, `area="financeiro"`, motivo interno, snapshots seguros e metadata minima.
- Nao expor token de gateway, PAN/CVV, payload bruto, stack, SQL ou detalhes tecnicos do provedor em resposta publica, UI ou logs de auditoria.
- Ajuste de 2026-08-13: o botao visivel no card que abre a modal passa a exibir apenas `Cancelar`, mantendo o titulo `Cancelar assinatura`, a modal com o mesmo titulo, a confirmacao forte `CANCELAR ASSINATURA` e o contrato do endpoint sem alteracao.

## Consequencias

- O botao de cancelamento so aparece quando o backend confirma que ha uma assinatura Mercado Pago cancelavel, evitando acao sem efeito em planos gratuitos, cortesia ou assinaturas ja canceladas.
- O cancelamento e irreversivel no gateway; rollback de codigo nao reativa automaticamente a recorrencia cancelada.
- Em falha de configuracao do gateway, a API retorna erro publico conservador e o plano local nao e alterado.
- O contrato e aditivo: Admin antigo ignora `can_cancel`; backend antigo simplesmente nao oferece a acao nova.
- Nao houve mudanca de schema Prisma, migration, package ou variavel de ambiente.

## Alternativas consideradas

- Cancelar somente no banco: rejeitado porque manteria cobranca recorrente real ativa no Mercado Pago.
- Permitir cancelamento sem frase digitada: rejeitado por risco operacional alto em ambiente com dados reais.
- Delegar apenas ao psicologo o cancelamento: rejeitado porque o Admin precisa de suporte operacional auditavel.


## Atualizacao 2026-08-15: confirmacao forte em portal modal

A confirmacao forte do cancelamento administrativo passa a ser renderizada pelo Admin via `createPortal(document.body)`, mantendo overlay de viewport, foco/scroll gerenciados pelo hook de dialogo existente e o mesmo contrato de backend (`CANCELAR ASSINATURA` + motivo interno). A decisao corrige a percepcao visual de bloco inline na aba de assinatura sem alterar gateway, endpoint, schema, env ou auditoria.

Consequencia operacional: rollback do commit volta ao dialogo renderizado na arvore da aba, mas nao altera a seguranca do backend nem reativa recorrencias ja canceladas no Mercado Pago.
