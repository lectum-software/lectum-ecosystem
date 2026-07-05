# ADR 0215 - Cartão futuro antes do endereço na cortesia profissional

Data: 2026-07-04
Status: Aceita

## Contexto

No Plano Profissional de Cortesia, o CTA **Adicionar cartão de cobrança** estava abrindo a rota de endereço de faturamento antes de coletar o cartão. O fluxo correto é cadastrar primeiro um cartão de crédito para cobrança futura e, somente após o cartão ser aceito pelo gateway, verificar se o psicólogo já tem endereço cadastrado.

A referência visual ativa continua sendo `_product/proto/Minhas Assinatura - Psicólogo.jpg`. O Builder/Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) não está exposto como ferramenta direta neste ambiente; a limitação foi tratada com a imagem local exportada.

A documentação oficial do Mercado Pago para assinatura associada a plano permite criar uma preapproval autorizada com `card_token_id` e `auto_recurring.start_date`, o que atende ao cenário de cobrança futura ao final da cortesia sem criar cobrança imediata local na Lectum.

Referências consultadas:

- https://www.mercadopago.com.ar/developers/en/docs/subscriptions/integration-configuration/subscription-associated-plan
- https://www.mercadopago.com.co/developers/en/reference/online-payments/subscriptions/create-preapproval/post

## Decisão

- Reutilizar a rota real `/app/professional/billing/checkout` com o parâmetro `intent=courtesy-renewal` para o fluxo de cortesia.
- Para `intent=courtesy_renewal`, o backend aceita o checkout apenas quando existe cortesia administrativa ativa (`source="admin_grant"`) do Plano Profissional com `current_period_end` futura.
- O backend cria ou atualiza uma assinatura real no gateway com cartão tokenizado e `startDate` igual à expiração da cortesia; localmente, essa assinatura futura fica `inativa` até o início efetivo.
- Após o cartão ser cadastrado, o backend retorna `next_path` calculado por dados reais: se houver `billing_address` completo ou endereço profissional completo no perfil, voltar para `/app/professional/billing`; caso contrário, abrir `/app/professional/billing/address?intent=courtesy-renewal`.
- O frontend não redireciona cortesia ativa direto para endereço quando está em `intent=courtesy-renewal`; ele renderiza o CardPayment Brick para inserir o cartão primeiro.
- O CardPayment Brick recebe `customization.visual.texts.formSubmit="Cadastrar cartão"` no fluxo de cortesia, deixando claro que não há cobrança imediata.
- Nenhum mock, endpoint simulado, package novo ou alteração de schema foi criado.

## Consequências

- Cortesias mantêm benefícios ativos enquanto a assinatura futura do gateway permanece `inativa` localmente.
- Webhooks/sync que receberem assinatura autorizada com `start_date` futura preservam o status local `inativa`; quando a data chegar, a sync pode ativar e calcular o próximo período normalmente.
- A página de endereço só aparece depois da tokenização/cadastro real do cartão e apenas quando os dados de endereço não existem.
- Como o gateway não retorna metadados completos do cartão no checkout de assinatura, a referência salva em `payment_method` usa o identificador da assinatura gateway e não PAN/CVV.
