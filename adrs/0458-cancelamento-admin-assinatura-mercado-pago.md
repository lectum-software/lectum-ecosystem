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
