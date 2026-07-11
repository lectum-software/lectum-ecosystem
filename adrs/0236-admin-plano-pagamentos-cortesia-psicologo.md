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
- Exibir assinatura paga como nome do plano e preco mensal (`R$ 9,90/mês`) sem etiquetas redundantes.
- Exibir cortesia ativa como `Plano de cortesia`, preservando dados de vigencia e operador em `Concedida por`.
- Mover o botao `Revogar cortesia` para a base do proprio card `Plano atual`, abaixo de `Concedida por`.

Consequencia: a tela reduz ruido visual e deixa a revogacao proxima do contexto do plano atual, sem alterar endpoint, regra de dominio ou registro de auditoria da cortesia.

Validacao complementar:

- Browser local headless Chrome/CDP no Admin, viewport mobile-first 390px, confirmou o botao `Revogar cortesia` no card `Plano atual`, abaixo de `Concedida por`, sem o card separado de revogacao e sem o formulario `Conceder cortesia` quando o plano exibido e cortesia.
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`
