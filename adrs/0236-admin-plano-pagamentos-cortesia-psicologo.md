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
