# ADR-0236: Plano, pagamentos e cortesia do psicólogo no Admin

## Status

Accepted

## Data

2026-07-10

## Task relacionada

TASK-56: Detalhe administrativo do psicólogo — Plano, pagamentos e cortesia.

## Contexto

A aba administrativa **Plano e pagamentos** precisa exibir dados financeiros reais do psicólogo e permitir concessão de cortesia sem criar atalhos de pagamento. A Lectum já possuía o comando operacional `subscription:grant`, além das tabelas reais `professional_subscription`, `payment_method` e `payment_event`.

Também existe o risco de uma concessão administrativa substituir indevidamente uma cobrança real em gateway. Por isso, a UI não pode simular pagamento, não pode manipular cartão do usuário e não deve permitir cortesia quando houver assinatura externa não cancelada a reconciliar.

## Decisão

- Extrair a regra de concessão administrativa para `grantProfessionalSubscription`, serviço compartilhado entre o comando `subscription:grant` e o novo endpoint Admin.
- Criar os endpoints privados:
  - `GET /api/admin/private/psychologists/:id/billing`;
  - `POST /api/admin/private/psychologists/:id/billing/grant-courtesy`.
- O endpoint de billing agrega dados reais de `professional_subscription`, resumo seguro de `payment_method` e histórico financeiro por `payment_event`; quando não há evento confirmado, retorna indisponibilidade honesta em vez de estimar receita.
- A resposta Admin nunca expõe credenciais do gateway, token de pagamento, PAN, CVV ou identificadores sensíveis de assinatura.
- `admin_grant` segue sem contar como receita e cria assinatura `profissional`, `ativa`, com `current_period_end` futuro e campos de auditoria (`grant_notes`, `granted_by`, `grant_started_at`). O campo `grant_reason` é legado e não é mais coletado no Admin.
- A concessão Admin fica bloqueada quando existe qualquer assinatura externa/gateway não cancelada para o psicólogo. O operador deve reconciliar ou cancelar a cobrança real antes de conceder cortesia.
- Cancelamento de assinatura e alteração de cartão pelo Admin permanecem fora da V1; cartão continua sendo tokenizado pelo usuário no gateway.
- A tela Admin usa React Hook Form, Zod e controllers, preservando a fundação de formulários já adotada no produto.

## Consequências

- O comando operacional e a UI Admin passam a usar uma única regra de domínio para cortesia.
- A aba é segura para administradores autenticados e não cria fluxo paralelo de pagamento.
- Perfis com histórico/gateway incompleto mostram o motivo da indisponibilidade ou bloqueio, sem uso de mock.
- Um teste positivo de gravação de cortesia exige psicólogo real elegível, sem assinatura gateway não cancelada; no banco local validado nesta task, o único perfil real disponível estava corretamente bloqueado por assinatura Mercado Pago a reconciliar.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- API local com admin real:
  - `GET /api/admin/private/psychologists/:id/billing` retornou `200` com plano real de `professional_subscription`, sem token de gateway;
  - chamada sem autenticação retornou `401`;
  - `POST /api/admin/private/psychologists/:id/billing/grant-courtesy` em psicólogo real retornou `409 external_billing_subscription_blocks_admin_grant`, confirmando o bloqueio real por assinatura gateway não cancelada e sem simular pagamento.
- Browser local via Edge/CDP em `http://localhost:3002/psicologos/<id>?tab=plano`, desktop e viewport mobile de 390px, confirmou render da aba, estado mobile-first, bloqueio de cortesia e ausência de botões de cancelamento/troca de cartão pelo Admin.

## Limitações da execução

- Builder/Quick Copy não estava disponível como ferramenta no ambiente; a implementação visual foi guiada pelo PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png`.
- Não foi criado nem alterado dado fake para obter sucesso artificial na concessão; o fluxo positivo fica dependente de um psicólogo real elegível.

## Complemento 2026-07-10 - remoção do motivo no Admin

Produto decidiu remover o motivo da cortesia do painel administrativo. A UI de concessão não exibe campo de motivo, o endpoint Admin não exige `reason` no body e o serviço compartilhado grava `grant_reason=null` para novas concessões. Notas internas opcionais continuam disponíveis para auditoria operacional quando necessário.

## Complemento 2026-07-10 - CPF, Regional e CRP editáveis na cortesia

Produto decidiu que a operação de cortesia também pode corrigir CPF, Regional e CRP antes de conceder o benefício. Esses campos deixam de ser cards somente leitura e passam a fazer parte do formulário Admin.

Decisão:

- `POST /api/admin/private/psychologists/:id/billing/grant-courtesy` aceita `cpf`, `regional_crp` e `crp` opcionais.
- A regra fica no serviço compartilhado `grantProfessionalSubscription`, que normaliza CPF para dígitos, monta `psychologist_profile.crp` como `regional/registro` quando ambos existirem e persiste a sobrescrita na mesma transação da concessão.
- O comando `subscription:grant` expõe `--cpf`, `--crp-region` e `--crp-number` para manter paridade operacional.
- A sobrescrita manual não preenche `cfp_verified_at`; esse timestamp permanece exclusivo da consulta real CFP/InfoSimples.

Consequência: dados corrigidos pelo Admin se sobrepõem aos dados informados pelo psicólogo no perfil, sem criar novo schema nem simular validação documental.

Validação complementar:

- Browser local headless Chrome/CDP em viewport mobile 390x844 confirmou a aba `?tab=plano` com `cpf`, `regional_crp` e `crp` renderizados como inputs editáveis.
- `pnpm --dir backend subscription:grant -- --help` exibiu as novas flags.
- Validação negativa sem mutação com CPF inválido retornou `cpf_invalid`.

## Complemento 2026-07-10 - Regional em lista e máscara de CPF

Produto definiu que o campo Regional da cortesia no Admin deve ter a mesma experiência da edição de perfil do psicólogo, e que o CPF deve ter máscara visual durante a digitação.

Decisão:

- A lista do Admin replica as 24 opções `CRP_REGION_OPTIONS` usadas no perfil profissional (`1ª Região - DF` a `24ª Região - AC/RO`) e adiciona apenas o placeholder "Selecione a regional".
- Caso um valor legado de regional não esteja na lista, a UI preserva esse valor como "valor atual" para evitar perda silenciosa de dados antes de o administrador escolher uma opção padronizada.
- O controller de input do Admin aceita máscara por captura de mudança (`maskValue`) e o CPF da cortesia usa máscara progressiva `000.000.000-00`, `inputMode=numeric` e `maxLength=14`.
- O submit continua enviando CPF normalizado para dígitos e Regional/CRP opcionais ao mesmo endpoint de cortesia; não houve alteração de backend, banco ou pacote.

Consequência: a operação administrativa fica consistente com o perfil do psicólogo e reduz erro de digitação de CPF, preservando a regra de domínio existente de sobrescrita de identidade sem preencher `cfp_verified_at`.

Validação complementar:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`
- Browser local headless Chrome/CDP, viewport 390x844, confirmou `regional_crp` como `select`, placeholder, 24 regionais + placeholder e máscara de CPF aplicada ao digitar valor de teste.

## Complemento 2026-07-10 - revogação de cortesia ativa

Produto definiu que, após uma cortesia administrativa estar ativa, a mesma área operacional do Admin deve mudar de concessão para revogação.

Decisão:

- `GET /api/admin/private/psychologists/:id/billing` passa a retornar `courtesy.can_revoke` e `courtesy.active_grant_id` quando a assinatura atual é `source="admin_grant"`, `status="ativa"` e ainda vigente.
- Enquanto houver cortesia ativa, `courtesy.can_grant=false`; a UI renderiza o card "Revogar cortesia" no lugar do formulário "Conceder cortesia".
- `POST /api/admin/private/psychologists/:id/billing/revoke-courtesy` cancela somente a assinatura administrativa ativa, marcando `professional_subscription.status="cancelada"` e `current_period_end` com a data/hora da operação.
- A revogação registra uma linha em `grant_notes` com data/hora e ator admin, usando campo existente para auditoria sem migration.
- A ação não cancela gateway, não altera cartão e não apaga CPF/Regional/CRP; se houver assinatura Mercado Pago, ela continua exigindo reconciliação/cancelamento no fluxo próprio.

Consequência: o Admin não oferece nova concessão duplicada sobre uma cortesia ativa e passa a ter um caminho reversível e auditável para remover o entitlement manual `admin_grant`.

Validação complementar:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`
- API local com admin real confirmou `can_revoke=true`, `can_grant=false` e `active_grant_id` presente em cortesia ativa; chamada de revogação com id inexistente retornou `404` sem mutação.
- Browser local headless Chrome/CDP em viewport 390x844 confirmou o card "Revogar cortesia" substituindo "Conceder cortesia" para psicólogo com cortesia ativa.

## Complemento 2026-07-11 - cortesia bloqueia edição de identidade pelo psicólogo

Produto definiu que, depois que a cortesia administrativa for concedida, CPF, Regional do CRP e Nº de registro CRP deixam de ser editáveis na tela do próprio psicólogo. A equipe operacional passa a ser a fonte desses dados durante a vigência da cortesia, especialmente porque o Admin pode corrigi-los antes da concessão.

Decisão:

- `profile.identity_fields_locked` no endpoint privado `/api/private/psychologist/free-profile` também fica `true` quando a assinatura ativa é `source="admin_grant"` e o plano não é gratuito.
- Essa trava não preenche `psychologist_profile.cfp_verified_at`; validação CFP/InfoSimples continua sendo a única fonte desse timestamp.
- O frontend do perfil já respeita a flag do backend e renderiza `cpf`, `crp_region` e `crp_number` como desabilitados.
- O update do perfil continua ignorando `cpf`/`crp` quando a flag está ativa, impedindo sobrescrita por payload manipulado.

Consequência: dados corrigidos no Admin se sobrepõem aos dados informados pelo psicólogo e ficam protegidos durante a cortesia ativa, sem migration, novo endpoint ou package novo.

Validação complementar:

- API local real de `GET /api/private/psychologist/free-profile` retornou `identity_fields_locked=true` para psicólogo com `source="admin_grant"` e `cfp_verified_at=null`.
- Browser local headless Chrome/CDP em `/app/professional/profile/setup`, viewport mobile 390x844, confirmou `cpf`, `crp_region` e `crp_number` desabilitados e `scrollWidth=390`.

## Complemento 2026-07-11 - copy enxuta em Revogar cortesia

A tela Admin de detalhe do psicologo passou por refinamento de copy no card `Revogar cortesia` para reduzir ruido operacional.

Decisao:

- Remover o bloco explicativo sobre `source=admin_grant` do card de revogacao, sem alterar a regra de dominio ou o endpoint real.
- Exibir `Este psicologo possui uma cortesia ativa.` em vez de enfatizar `administrativa` na frase de contexto.
- Usar `Até` com acento no resumo de vigencia.
- Mostrar apenas o nome do admin em `Concedida por`, no resumo do plano e no card de revogacao, ocultando e-mail e identificador interno nessa UI.

Consequencia: a regra real de revogacao permanece documentada e aplicada no backend, mas a interface operacional fica mais limpa e nao expõe dado interno desnecessario no card principal.

Validacao complementar:

- Browser local headless Chrome/CDP no Admin, viewport mobile-first 390px, confirmou a copy simplificada, o prefixo `Até`, a remocao do bloco operacional e a exibicao de `Admin Lectum` sem e-mail/id interno.
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`

## Complemento 2026-07-11 - Plano atual como superficie principal da cortesia

O card `Plano atual` passou a concentrar a leitura e a acao de cortesia ativa. A UI anterior repetia informacoes operacionais em etiquetas e em um card separado de revogacao.

Decisao:

- Remover do card `Plano atual` a frase tecnica sobre `professional_subscription`, as etiquetas de status/source e o bloco `Acoes financeiras pelo Admin`.
- Exibir assinatura paga como nome do plano e preco mensal (`R$ 29,90/mês`) sem etiquetas redundantes.
- Exibir cortesia ativa como `Plano de cortesia`, preservando dados de vigencia e operador em `Concedida por`.
- Mover o botao `Revogar cortesia` para a base do proprio card `Plano atual`, abaixo de `Concedida por`.

Consequencia: a tela reduz ruido visual e deixa a revogacao proxima do contexto do plano atual, sem alterar endpoint, regra de dominio ou registro de auditoria da cortesia.

Validacao complementar:

- Browser local headless Chrome/CDP no Admin, viewport mobile-first 390px, confirmou o botao `Revogar cortesia` no card `Plano atual`, abaixo de `Concedida por`, sem o card separado de revogacao e sem o formulario `Conceder cortesia` quando o plano exibido e cortesia.
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`

## Complemento 2026-07-11 - Plano atual sem metadados operacionais

O refinamento visual do card `Plano atual` continuou removendo metadados operacionais que nao precisam aparecer para o Admin nessa leitura principal.

Decisao:

- Remover as linhas `Gateway` e `Cortesia` do card `Plano atual`.
- Manter apenas dados relevantes para a leitura do plano/cortesia: nome do plano, datas de vigencia, operador em `Concedida por` quando houver cortesia e a acao `Revogar cortesia`.

Consequencia: o card fica mais curto e focado na decisao operacional sem alterar a resposta do endpoint de billing nem a regra de dominio.

Validacao complementar:

- Browser local headless Chrome/CDP no Admin, viewport mobile-first 390px, confirmou o card `Plano atual` sem as linhas `Gateway` e `Cortesia`, mantendo `Concedida por` e `Revogar cortesia`.
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`


## Complemento 2026-07-11 - retorno ao plano anterior apos revogacao

Produto definiu que revogar uma cortesia administrativa deve remover apenas o entitlement manual e devolver o psicologo ao plano real anterior, sem deixar a cortesia cancelada como plano vigente.

Decisao:

- `POST /api/admin/private/psychologists/:id/billing/revoke-courtesy` passa a executar a revogacao em transacao: cancela o `professional_subscription.source="admin_grant"` ativo e reativa a assinatura anterior real sem gateway quando encontrada.
- A assinatura anterior e localizada primeiro pela janela operacional da concessao, porque o servico de concessao cancela o plano substituido na mesma transacao; como fallback para historico local ja existente, usa-se o ultimo plano nao-admin anterior a cortesia.
- `findCurrentSubscription` nao retorna mais assinatura cancelada como plano atual. Se nao houver plano ativo, o endpoint deve informar ausencia de plano vigente em vez de promover historico cancelado.

Consequencia: depois da revogacao, o Admin e os demais consumidores do endpoint veem novamente o plano gratuito ou assinante real do psicologo. A regra continua sem cancelar gateway, sem criar cobranca manual e sem alterar schema.

Validacao complementar:

- API local com admin real: concessao seguida de revogacao em psicologo real retornou `admin_grant/profissional` durante a cortesia e, apos a revogacao, `free_signup/gratuito`, `status=ativa`, `is_courtesy=false`.
- Browser local headless Chrome/CDP confirmou o card `Plano atual` exibindo `Plano Gratuito`, sem `Plano de cortesia` nem botao `Revogar cortesia` apos a revogacao.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- `git diff --check`


## Complemento 2026-07-11 - formulario de concessao enxuto

Produto decidiu reduzir a carga operacional visivel no card `Conceder cortesia`.

Decisao:

- Remover a frase de apoio sobre o comando `subscription:grant` e o bloco visual `Regra de cobranca`, mantendo essa regra documentada no ADR e aplicada no backend.
- Reordenar os campos para priorizar dados de registro profissional (`Regional CRP`, `CRP`, `Data de inscricao no CRP`) antes de `CPF` e `Periodo de cortesia`.
- Usar seta customizada somente no select de periodo para garantir margem visual a direita, sem instalar pacote novo.

Consequencia: a tela fica mais direta para o administrador e preserva a mesma chamada real de concessao de cortesia.

Validacao complementar:

- Browser local headless Chrome/CDP, viewport mobile-first 390px, confirmou a nova ordem dos campos, ausencia da frase operacional e ausencia do bloco `Regra de cobranca`.
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`

## Complemento 2026-07-11 - nota interna no Plano atual de cortesia

Produto decidiu que o resumo principal da cortesia ativa deve expor a nota interna da concessao no proprio card `Plano atual`, sem criar nova fonte de dados.

Decisao:

- Renderizar `professional_subscription.grant_notes` como linha `Nota interna` somente quando o plano atual for `source="admin_grant"`/cortesia ativa.
- Trocar o rotulo `Proxima renovacao` por `Fim` nesse mesmo estado de cortesia, mantendo `current_period_end` como data de encerramento.
- Manter o rotulo `Proxima renovacao` para planos pagos/nao cortesia.
- Considerar a cortesia ativa na UI quando `plan.is_courtesy`, `plan.source="admin_grant"` ou `courtesy.can_revoke=true`, tornando o resumo resiliente a respostas de billing que ainda carreguem campos derivados desatualizados.
- Corrigir os labels do formulario de concessao para `Data de inscrição no CRP` e `Período de cortesia`.

Consequencia: o Admin consegue ler a observacao operacional da concessao junto da vigencia e da acao de revogar, sem alterar endpoint, schema, auditoria ou regra de dominio.

Validacao complementar:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `git diff --check`
- Browser local headless Chrome/CDP em viewport 390px confirmou `Fim`, ausencia de `Proxima renovacao`, `Nota interna`, texto real da nota e `scrollWidth=390`.
- `pnpm check` foi acionado, mas bloqueou em formatacao de arquivo local nao relacionado (`frontend/src/app/app/professional/whatsapp/verify/logic.tsx`).

## Complemento 2026-07-11 - LTV e mensalidades pagas no Plano atual

Produto decidiu que o card `Plano atual` no Admin deve mostrar a quantidade de mensalidades pagas e o Lifetime Value (LTV) do psicólogo quando houver assinatura vigente.

Decisão:

- Ampliar o contrato de `GET /api/admin/private/psychologists/:id/billing` com `paid_installments_count`, `lifetime_value_cents`, `lifetime_value_available` e `lifetime_value_unavailable_reason` dentro de `plan`.
- Calcular esses campos somente a partir de `payment_event` real do gateway, vinculando eventos ao psicólogo por referências presentes no payload bruto: `professional_subscription.id` e `gateway_subscription_id`.
- Contar mensalidades apenas para eventos de pagamento com status confirmado; cortesia e plano gratuito não geram receita nem mensalidade paga.
- Não estimar LTV pelo preço do plano. Se existir pagamento confirmado sem valor monetário extraível no payload, o LTV retorna indisponível com motivo, evitando somatório parcial.
- Renderizar as duas novas linhas no card `Plano atual` apenas quando existir assinatura (`plan.id`), mantendo a composição mobile-first e o fluxo de cortesia/revogação existentes.

Consequência: o Admin passa a ver valor financeiro acumulado por psicólogo sem criar schema novo nem simular cobrança, mas a qualidade do LTV continua limitada à presença e completude dos webhooks Mercado Pago gravados em `payment_event`.

Validação complementar:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação API local sem mutação em psicólogo real `cmrglzdds000ajkuhqedavedb`: retorno 200 com `Plano Profissional`, `paid_installments_count=0`, `lifetime_value_cents=0` e `lifetime_value_available=true`.
- Browser local/headless acessou a rota Admin `/psicologos/cmrglzdds000ajkuhqedavedb?tab=plano` com HTTP 200; a sessão Admin autenticada do navegador do usuário não estava exposta para automação visual.

## Complemento 2026-07-11 - reconciliação de LTV pelo resumo real do Mercado Pago

Após a inclusão de mensalidades pagas e LTV no card `Plano atual`, foi identificado um caso real em que a assinatura Mercado Pago estava ativa e já tinha a primeira cobrança confirmada em 11/07/2026, mas nenhum webhook havia sido persistido em `payment_event`. A UI, corretamente limitada aos eventos locais naquele momento, mostrava 0 mensalidades e LTV R$ 0,00.

Decisão:

- Estender a porta `PaymentGateway` com `getSubscriptionPaymentSummary(gatewaySubscriptionId)` para obter o agregado financeiro real da assinatura no gateway.
- Implementar no `MercadoPagoAdapter` a leitura do `GET /preapproval/{id}`, usando `summarized.charged_quantity` como quantidade de mensalidades pagas e `summarized.charged_amount` como LTV em centavos.
- No Admin, preferir esse agregado real do gateway para assinaturas Mercado Pago com `gateway_subscription_id`; se a reconciliação online não estiver disponível, manter fallback para `payment_event` local.
- Não estimar receita pelo preço do plano e não criar `payment_event` artificial. O histórico individual de cobranças continua dependendo de eventos reais de webhook/pagamento persistidos.

Consequência: o card `Plano atual` deixa de zerar mensalidades/LTV quando o webhook falha ou ainda não chegou, mas preserva a regra de não inventar pagamento. O dado vem do próprio gateway e continua segregado da listagem individual de histórico financeiro.

Validação complementar:

- Consulta real ao Mercado Pago para `gateway_subscription_id=8fc3a14ea54542e2a08a0be45869df51` retornou `summarized.charged_quantity=1` e `summarized.charged_amount=9.9`.
- Repositório Admin para o psicólogo real `cmrglzdds000ajkuhqedavedb` passou a retornar `paidInstallmentsCount=1`, `lifetimeValueCents=990`, `lifetimeValueAvailable=true`.

## Complemento 2026-07-11 - histórico via resumo real do gateway quando o webhook local estiver ausente

A tela Admin de Plano e pagamentos precisa exibir o pagamento real quando a assinatura Mercado Pago já possui cobrança confirmada, mesmo que o webhook local ainda não tenha sido persistido em `payment_event`.

Decisão:

- Manter `payment_event` como fonte preferencial para histórico individual quando houver eventos reconciliados.
- Quando não houver evento local e a assinatura for Mercado Pago com `gateway_subscription_id`, consultar o resumo real do gateway e gerar uma linha segura de histórico somente se `summarized.charged_quantity > 0`.
- Ler `summarized.last_charged_amount` e `summarized.last_charged_date` no adapter Mercado Pago para preencher valor e data da cobrança exibida; `summarized.charged_amount` continua representando o agregado usado no LTV.
- Não criar nem persistir `payment_event` artificial a partir do resumo, para evitar misturar reconciliação online com trilha de webhook.
- Remover da UI Admin o texto operacional sobre `payment_event` e a badge de disponibilidade do card, deixando o histórico focado no dado exibido ao operador.

Consequência: para assinaturas com uma cobrança real confirmada e sem webhook local, o Admin passa a ver a mensalidade paga no histórico sem mock e sem mutação de dados. Quando houver múltiplas cobranças sem eventos individuais, a linha de fallback representa a última cobrança confirmada pelo gateway; a trilha detalhada continua dependendo dos eventos reais persistidos.

Validação complementar:

- `showAdminPsychologistBilling` para o psicólogo real `cmrglzdds000ajkuhqedavedb` retornou `payment_history.available=true`, item `Mensalidade`, `amount_cents=990`, `status=pago` e `occurred_at=2026-07-11T18:03:17.796Z`.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`


## Complemento 2026-07-11 - persistência e fallback seguro de forma de pagamento

Foi identificado que o checkout normal de assinatura Mercado Pago criava a assinatura e a cobrança, mas não persistia a máscara do cartão em `payment_methods`. Como o Admin exibe somente dados seguros locais, o card `Forma de pagamento` ficava vazio mesmo com uma assinatura paga.

Decisão:

- Persistir `payment_methods` também no checkout normal, usando apenas dados seguros enviados pelo frontend/SDK: bandeira e final quando existirem, vinculados ao `gateway_subscription_id` da assinatura.
- Manter o fluxo existente de troca de cartão/cortesia salvando a mesma entidade, sem criar tabela ou contrato paralelo.
- Para assinaturas antigas sem registro local de `payment_methods`, permitir fallback somente de leitura no Admin: consultar a assinatura real no gateway e mapear `preapproval.payment_method_id` para uma bandeira humana segura.
- Não exibir nem persistir `card_id`, token, credencial do gateway ou qualquer dado sensível; se o gateway não retornar final/validade pelo endpoint seguro, esses campos permanecem nulos.

Consequência: novos checkouts passam a alimentar o card `Forma de pagamento` com a máscara local, e assinaturas antigas podem exibir pelo menos a bandeira real do cartão quando o gateway informar esse dado seguro. A correção não cria mocks, seeds, migrações ou dados artificiais.

Validação complementar:

- `showAdminPsychologistBilling` para o psicólogo real `cmrglzdds000ajkuhqedavedb` retornou `payment_method.brand=Visa`, `gateway=mercadopago`, `last4=null`, `exp_month=null` e `exp_year=null` com `payment_methods_count=0` local.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check` nos arquivos alterados

## Complemento 2026-07-11 - confirmação forte na concessão de cortesia

A concessão de cortesia administrativa é uma ação sensível porque cria acesso profissional gratuito, atualiza dados de identidade usados na concessão e altera o plano vigente do psicólogo. A confirmação nativa do navegador não oferecia uma barreira operacional suficientemente explícita nem era validada no backend.

Decisão:

- Exigir que o Admin digite `CONCEDER CORTESIA` no formulário antes do submit.
- Validar a frase no frontend com React Hook Form/Zod para feedback inline e também no endpoint Admin privado `POST /api/admin/private/psychologists/:id/billing/grant-courtesy`.
- Rejeitar a mutação no backend com `courtesy_grant_confirmation_invalid` quando a confirmação estiver ausente ou divergente.
- Remover o `window.confirm`, preservando a ação real, auditoria existente via `grant_notes/granted_by`, bloqueio por gateway e reutilização do serviço compartilhado de concessão.

Consequência: a operação fica menos propensa a clique acidental e não depende apenas da UI para proteger a mutação. Não há alteração de schema Prisma, migrations, packages, gateway ou política de receita.

Validação complementar:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check` nos arquivos alterados
- Browser local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=plano` retornou 200; a conferência visual autenticada ficou limitada pela sessão Admin não exposta ao ambiente de automação.

## Complemento 2026-07-11 - modal de revisão antes da confirmação forte

Após a adoção da confirmação forte `CONCEDER CORTESIA`, Produto refinou a experiência para que a palavra-chave não fique exposta no formulário principal. A revisão deve ocorrer em uma etapa explícita antes da mutação real.

Decisão:

- O formulário `Conceder cortesia` coleta os dados obrigatórios e, no submit válido, abre uma modal de revisão.
- A modal mostra os dados inseridos de CRP (`Regional CRP`, `CRP` e `Data inscrição CRP`) e também resume `CPF` e `Período de cortesia` para reduzir erro operacional.
- O campo `Confirmação forte` fica somente na modal e continua exigindo `CONCEDER CORTESIA` por React Hook Form/Zod.
- O backend permanece exigindo `confirmation="CONCEDER CORTESIA"`; a modal altera apenas a superfície de UX e não enfraquece o contrato real.

Consequência: o Admin revisa os dados críticos antes de confirmar e a ação continua protegida contra clique acidental e contra chamada sem confirmação no backend. Não há alteração de schema Prisma, migrations, packages, gateway ou cálculo financeiro.

Validação complementar:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check` nos arquivos alterados
- Browser local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=plano` retornou 200; a conferência visual autenticada ficou limitada pela sessão Admin não exposta ao ambiente de automação.

## Complemento 2026-07-11 - cortesia ativa ocupa o slot da forma de pagamento

Produto definiu que a cortesia ativa deve permanecer na mesma região operacional usada para concessão de cortesia em plano gratuito, em vez de manter o card de forma de pagamento vazio ao lado do `Plano atual`.

Decisão:

- Quando a assinatura vigente for cortesia (`plan.is_courtesy`, `plan.source="admin_grant"` ou `courtesy.can_revoke`), a UI Admin renderiza um card `Cortesia ativa` no slot lateral ao `Plano atual`.
- O card lateral exibe os dados reais já retornados pelo contrato de billing: `Regional CRP`, `CRP`, `Data inscrição CRP`, `plan.granted_by` como `Concedida por`, `plan.grant_notes` como `Nota interna` e a ação real `Revogar cortesia`.
- O `Plano atual` continua exibindo nome, vigência, mensalidades e LTV, mas passa a mostrar `R$ 0,00/mês` abaixo de `Plano de cortesia` e deixa os metadados de operação da cortesia no card lateral.
- Não foi criado novo endpoint, tabela, mock, dado fake ou regra paralela; a revogação segue usando o endpoint existente.

Consequência: a tela evita mostrar `Forma de pagamento` vazia para cortesia, preserva o contexto operacional da concessão/revogação e mantém o resumo do plano mais simples.

Validação complementar:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check` foi reexecutado e ficou bloqueado por erros preexistentes fora deste ajuste em `frontend/src/utils/psychologist-onboarding.ts` e `frontend/src/app/app/professional/billing/checkout/logic.tsx`
- `git diff --check` nos arquivos alterados
- Browser local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=plano` retornou 200; a conferência visual autenticada ficou limitada pela sessão Admin não exposta ao ambiente de automação.

## Complemento 2026-07-13 - renovação não aplicável para plano gratuito

Produto decidiu que a leitura administrativa do card `Plano atual` não deve tratar ausência de `current_period_end` do plano gratuito como dado faltante.

Decisão:

- Para plano gratuito vigente, exibir `Não se aplica` na linha `Próxima renovação`.
- Para assinatura paga, manter a data real de renovação quando existir.
- Para cortesia ativa, manter o rótulo `Fim` e a data real de encerramento da concessão, pois esse campo representa término da cortesia, não renovação.

Consequência: o Admin diferencia ausência legítima de renovação em plano gratuito de indisponibilidade de dado financeiro, sem alterar contrato de API ou persistência.

Validação complementar:

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `git diff --check` nos arquivos alterados
- Verificação estática do `CurrentPlanCard`
- Smoke HTTP local `GET /psicologos/cmrgrztri7000tn0uh1q4n8vxf?tab=plano` com status 200
- `pnpm check` foi executado e ficou bloqueado por formatação em alterações locais não relacionadas da TASK-72 nos módulos backend de métricas/engajamento e em `backend/src/utils/admin-psychologist-analytics.ts`


## Complemento 2026-08-13 - historico de pagamento sem eventos duplicados nem IDs como valor

Foi identificado em homologacao que a aba Admin `Plano e pagamentos` podia exibir multiplos eventos no mesmo dia para uma unica assinatura, valores absurdos e status `Processado` em cinza. O problema vinha de webhooks locais brutos e de um parser legado que podia retornar primitivos aninhados, como `data.id`, quando buscava campos monetarios.

Decisao:

- Para assinaturas Mercado Pago com `gateway_subscription_id`, o detalhe Admin passa a usar `getSubscriptionPaymentSummary` como reconciliacao da ultima cobranca confirmada quando `charged_quantity > 0`, substituindo linhas locais do mesmo dia e preservando historico local valido de outros dias.
- O item reconciliado usa `subscription.plan.name` como titulo da coluna de descricao, e status aprovado retorna `status=pago`/`status_label=Sucesso`, mantendo a badge verde da UI.
- O fallback local por `payment_event` continua existindo para indisponibilidade do gateway, mas fica limitado a eventos de pagamento, deduplica sucessos do mesmo dia por data/valor/plano e extrai valor apenas de chaves monetarias explicitas (`transaction_amount`, `total_paid_amount`, `paid_amount`, `amount`/`amount.value`).
- IDs do provedor, como `data.id`, deixam de ser elegiveis como valor monetario; quando o provedor nao informa valor, o item nao inventa receita.
- Nao ha mutation de dados, migration, pacote novo ou variavel de ambiente nova.

Consequencia: a tela passa a mostrar o pagamento real reconciliado quando o gateway confirma a cobranca, evita linhas duplicadas de webhook e falha de forma honesta quando o valor monetario nao esta disponivel.

Validacao complementar:

- Teste unitario novo cobre deduplicacao de cobrancas aprovadas no mesmo dia, uso do nome do plano e protecao contra IDs do Mercado Pago como valor. Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check`.
