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
- O checkout de cortesia também envia os dados de exibição permitidos pelo Brick (`payment_method_id` como bandeira e `lastFourDigits` como últimos quatro dígitos) para persistir apenas `brand`/`last4` junto ao `payment_method`.
- A tela **Minha Assinatura** continua mostrando a assinatura de cortesia como `admin_grant`, mas passa a consultar a assinatura futura `mercadopago` (`inativa`/`inadimplente`) para localizar o cartão cadastrado para cobrança pós-cortesia; quando encontrado, o bloco muda de **Adicionar cartão de cobrança** para **Cartão de cobrança cadastrado** e o CTA muda de **Adicionar** para **Alterar**.
- A UI considera a presença de `payment_method` no contrato de assinatura como evidência suficiente de cartão futuro cadastrado. Ela não depende de `gateway_token`, porque esse identificador é interno/operacional e pode não ser exposto ao frontend mesmo quando `brand`/`last4` estão disponíveis para exibição.
- Nenhum mock, endpoint simulado, package novo ou alteração de schema foi criado.

## Consequências

- Cortesias mantêm benefícios ativos enquanto a assinatura futura do gateway permanece `inativa` localmente.
- Webhooks/sync que receberem assinatura autorizada com `start_date` futura preservam o status local `inativa`; quando a data chegar, a sync pode ativar e calcular o próximo período normalmente.
- A página de endereço só aparece depois da tokenização/cadastro real do cartão e apenas quando os dados de endereço não existem.
- A referência salva em `payment_method` usa o identificador da assinatura gateway e, quando o Brick fornecer, apenas dados seguros de exibição (`brand`/`last4`), nunca PAN/CVV.
- Cartões cadastrados antes desta decisão podem aparecer como **Cartão cadastrado para cobrança futura** sem bandeira/final, porque não houve backfill artificial de dados de cartão.
- Se o endpoint retornar `payment_method` sem `gateway_token`, a tela ainda deve mostrar o cartão cadastrado e permitir **Alterar**, pois o backend já filtrou o método pela assinatura gateway futura antes de expor o objeto.
