# TASK-56: Detalhe administrativo do psicólogo — Plano, pagamentos e cortesia

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-56 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Financeiro |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-55, TASK-31A, TASK-31C, TASK-32, TASK-33 |
| ADR alvo | ADR se houver nova decisão sobre concessão por UI, cancelamento ou histórico financeiro admin |

## Contexto

A aba "Plano e pagamentos" usa como referência `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png`.

A Lectum já possui concessão administrativa por comando (`TASK-31A`) e data de inscrição CRP para cortesia (`TASK-31C`). Esta task transforma a concessão em fluxo Admin real quando possível.

## Objetivo

Exibir plano, método e histórico financeiro do psicólogo e permitir concessão de cortesia profissional por UI real, sem simular pagamento nem expor dados sensíveis de cartão.

## Pré-requisitos e bloqueios

- TASK-55 concluída.
- Credenciais/contratos de Mercado Pago devem estar configurados para dados de pagamento reais.
- Se histórico de pagamento não puder ser confirmado a partir de `payment_event`/gateway, exibir indisponível/estimado com label honesto.

## Escopo frontend

- Implementar aba "Plano e pagamentos".
- Renderizar:
  - plano atual;
  - próxima cobrança/renovação quando real;
  - forma de pagamento mascarada;
  - histórico de pagamentos;
  - formulário "Conceder cortesia".
- Form de cortesia:
  - período;
  - CPF/CRP/regional já preenchidos quando existirem;
  - data de inscrição no CRP obrigatória quando necessária para concessão;
  - confirmação antes de aplicar.
- O botão "Cancelar assinatura" fica fora da V1 se não houver cancelamento real via gateway com confirmação forte.
- "Alterar forma de pagamento" pelo Admin fica fora da V1; cartão deve continuar sendo tokenizado pelo usuário/gateway.

## Escopo backend

- Criar endpoints admin privados:
  - `GET /api/admin/private/psychologists/:id/billing`;
  - `POST /api/admin/private/psychologists/:id/billing/grant-courtesy`;
- Reutilizar a regra do comando `subscription:grant`, sem duplicar regra de domínio.
- Registrar auditoria real do admin responsável quando a audiência admin estiver disponível.

## Fora do escopo

- Cancelar assinatura paga via Admin.
- Alterar cartão pelo Admin.
- Criar cobrança manual.
- Simular pagamentos Mercado Pago.
- Exibir PAN/CVV ou dado sensível de cartão.

## Contrato técnico detalhado

- Cortesia:
  - `source="admin_grant"`;
  - plano `profissional`;
  - `status="ativa"`;
  - `current_period_end` futuro;
  - `grant_notes`, `granted_by`, `grant_started_at`;
  - atualizar `crp_registration_date` quando requerido.
- Receita:
  - `admin_grant` não conta como receita.
- Forma de pagamento:
  - somente brand/last4/validade se existirem em `payment_method`;
  - nunca expor token do gateway.

## Critérios de aceite

- [x] Aba só abre para admin autenticado.
- [x] Plano atual usa `professional_subscription` real.
- [x] Plano atual exibe quantidade de mensalidades pagas e Lifetime Value (LTV) do psic?logo quando existe assinatura, usando `payment_event` real.
- [x] Histórico financeiro usa dados reais ou exibe indisponível honesto.
- [x] Cortesia pela UI reutiliza regra real do comando operacional.
- [x] CPF, Regional e CRP da cortesia são editáveis no Admin.
- [x] Alterações administrativas de CPF/Regional/CRP se sobrepõem aos dados informados pelo psicólogo no perfil.
- [x] Regional da cortesia usa lista suspensa com as mesmas opções da edição de perfil do psicólogo.
- [x] CPF da cortesia aplica máscara visual `000.000.000-00`.
- [x] Cortesia ativa troca a ação do card para revogação.
- [x] Revogação cancela apenas `source="admin_grant"` ativo, sem cancelar assinatura de gateway.
- [x] Sobrescrita administrativa de identidade não preenche `cfp_verified_at` sem consulta real.
- [x] Data de inscrição CRP é exigida quando necessária.
- [x] Cancelar assinatura e alterar cartão não aparecem/habilitam sem implementação real.
- [x] Não há simulação de pagamento.
- [x] Form usa React Hook Form/Zod/controllers.
- [x] UI mobile-first validada.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado se houver decisão nova.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Teste manual de concessão com psicólogo real.

## Execução 2026-07-10

- Builder/Quick Copy não estava exposto como ferramenta no ambiente desta execução; a referência visual usada foi o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png`.
- Criados os endpoints Admin privados reais:
  - `GET /api/admin/private/psychologists/:id/billing`;
  - `POST /api/admin/private/psychologists/:id/billing/grant-courtesy`.
- A regra de concessão foi extraída para serviço compartilhado e reutilizada pelo comando operacional `subscription:grant` e pela UI Admin.
- O endpoint de billing retorna apenas resumo seguro da forma de pagamento (`brand`, `last4`, validade e gateway), sem token de gateway ou dados sensíveis de cartão.
- A UI da aba `Plano e pagamentos` usa React Hook Form, Zod e controllers, desabilita concessão quando existe assinatura vinculada ao gateway e não oferece cancelamento/troca de cartão pelo Admin.
- Validação manual com admin real:
  - `GET /api/admin/private/psychologists/:id/billing` em psicólogo real retornou `200`, plano real `admin_grant`, histórico financeiro indisponível com label honesto e sem `gateway_token`;
  - chamada sem autenticação retornou `401`;
  - tentativa de `POST .../grant-courtesy` no mesmo psicólogo real retornou `409 external_billing_subscription_blocks_admin_grant`, reutilizando a regra real porque havia assinatura Mercado Pago não cancelada a reconciliar. Nenhum perfil demo foi usado para concluir a task e nenhuma cobrança foi simulada.
- Validação browser local via Edge/CDP em `http://localhost:3002/psicologos/<id>?tab=plano`: desktop e viewport mobile de 390px carregaram a aba, sem botões de cancelar assinatura ou alterar cartão.
- Validações executadas com sucesso:
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir admin check`;
  - `pnpm --dir admin build`;
  - `pnpm check`.
- ADR criado: `adrs/0236-admin-plano-pagamentos-cortesia-psicologo.md`.

## Ajuste complementar 2026-07-10 - sem motivo de cortesia

- Decisão de produto: a concessão de cortesia não deve pedir nem exibir motivo no Admin.
- O formulário de concessão passou a coletar apenas período, data de inscrição no CRP quando exigida e notas internas opcionais.
- O serviço compartilhado `grantProfessionalSubscription` deixou de exigir motivo; novas concessões gravam `grant_reason=null`.
- O campo `grant_reason` permanece no banco apenas por compatibilidade com registros legados.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir backend subscription:grant -- --help`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check`.

## Ajuste complementar 2026-07-10 - identidade editável na cortesia

- Decisão de produto: os campos CPF, Regional e CRP exibidos em "Conceder cortesia" devem ser editáveis.
- O formulário Admin passou a inicializar os campos com os dados atuais do `psychologist_profile` e enviá-los no `POST /api/admin/private/psychologists/:id/billing/grant-courtesy`.
- O serviço compartilhado `grantProfessionalSubscription` ganhou sobrescrita opcional de identidade profissional (`cpf`, `crpRegion`, `crpNumber`) e persiste os valores em `psychologist_profile.cpf` e `psychologist_profile.crp` na mesma transação que concede a cortesia.
- O comando operacional `subscription:grant` recebeu flags opcionais `--cpf`, `--crp-region` e `--crp-number` para manter paridade com a regra usada pela UI.
- A operação não preenche `cfp_verified_at`; validação CFP/InfoSimples continua sendo a única fonte desse timestamp.
- Validação manual em browser local headless Chrome/CDP, viewport mobile 390x844, confirmou a aba `?tab=plano` com os campos `cpf`, `regional_crp` e `crp` renderizados como inputs editáveis antes do período/data/notas.
- Validação negativa sem mutação: `pnpm --dir backend subscription:grant -- --psychologist-user-id <id-real> --days 30 --actor "Validacao Codex" --cpf 111.111.111-11` retornou `cpf_invalid`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir backend subscription:grant -- --help`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.

## Ajuste complementar 2026-07-10 - Regional como select e máscara de CPF

- Decisão de produto: no painel Admin, o campo Regional da cortesia deve ser uma lista suspensa igual ao campo "Regional do CRP" da edição de perfil do psicólogo.
- O formulário Admin passou a usar as 24 regionais do perfil profissional (`1ª Região - DF` a `24ª Região - AC/RO`) com placeholder "Selecione a regional"; valores legados fora da lista são preservados como "valor atual" para não apagar dados existentes.
- O campo CPF passou a aplicar máscara progressiva no controller de input do Admin, mantendo `maxLength=14`, `inputMode=numeric` e envio normalizado para dígitos no submit.
- Não houve alteração de schema Prisma, migrations ou package novo.
- Validação browser local headless Chrome/CDP, viewport mobile 390x844, em `http://localhost:3102/psicologos/<id>?tab=plano`, confirmou:
  - `regional_crp` renderizado como `select`;
  - placeholder "Selecione a regional";
  - opção "4ª Região - MG";
  - 25 opções no total (placeholder + 24 regionais);
  - máscara de CPF aplicada ao digitar um valor de teste.
- Validações executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.

## Ajuste complementar 2026-07-10 - revogação de cortesia ativa

- Decisão de produto: depois que a cortesia for concedida, o card de cortesia no Admin deixa de exibir o formulário "Conceder cortesia" e passa a exibir a ação "Revogar cortesia".
- Criado endpoint Admin privado real `POST /api/admin/private/psychologists/:id/billing/revoke-courtesy`.
- A revogação é restrita à assinatura ativa `source="admin_grant"` e atualiza `professional_subscription.status="cancelada"` com `current_period_end` no momento da operação.
- A ação não cancela assinatura Mercado Pago, não altera cartão e não remove CPF/Regional/CRP do perfil; estes dados permanecem para auditoria e eventual nova concessão.
- O `GET /billing` passou a expor `courtesy.can_revoke`, `courtesy.active_grant_id` e bloqueia nova concessão enquanto houver cortesia ativa.
- Validação API local com admin real:
  - `GET /api/admin/private/psychologists/<id>/billing` retornou `can_revoke=true`, `can_grant=false`, `active_grant_id` presente e plano `admin_grant/ativa`;
  - `POST /api/admin/private/psychologists/nao-existe/billing/revoke-courtesy` retornou `404` sem mutação.
- Validação browser local headless Chrome/CDP, viewport mobile 390x844, confirmou que a aba `?tab=plano` exibe título e botão "Revogar cortesia" e não exibe mais "Conceder cortesia" quando há cortesia ativa.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.

## Ajuste complementar 2026-07-11 - identidade travada no perfil apos cortesia

- Decisao de produto: apos a concessao de cortesia ativa, os dados de identidade corrigidos pelo Admin (`CPF`, `Regional do CRP` e `No Registro CRP`) nao podem ser editados pela tela do proprio psicologo.
- O endpoint privado do perfil do psicologo passou a retornar `profile.identity_fields_locked=true` quando a assinatura atual e `source="admin_grant"`, mantendo `cfp_verified_at` exclusivo da consulta CFP/InfoSimples real.
- A consequencia operacional da sobrescrita Admin fica protegida: o psicologo ve os campos desabilitados e o backend ignora qualquer tentativa de alterar `cpf`/`crp` via payload de perfil enquanto a cortesia estiver ativa.
- Nao houve alteracao no endpoint Admin, schema Prisma, migrations ou packages.
- Validacao complementar: API local real de `free-profile` retornou `identity_fields_locked=true` para `admin_grant` com `cfp_verified_at=null`, e Chrome/CDP headless mobile 390x844 confirmou os tres campos desabilitados na edicao do psicologo.

## Ajuste complementar 2026-07-11 - copy do card Revogar cortesia

- Pedido do usuario: simplificar a area de revogacao de cortesia no Admin.
- O card `Revogar cortesia` removeu o bloco informativo laranja sobre regra operacional, porque a acao principal ja e suficiente nesta superficie.
- A copy passou de `Este psicologo possui uma cortesia administrativa ativa.` para `Este psicologo possui uma cortesia ativa.`.
- A vigencia passou a usar o prefixo acentuado `Até`.
- O campo `Concedida por` passou a exibir somente o nome do admin no card de revogacao e no resumo do plano, ocultando e-mail e id interno do operador nessa superficie.
- Nao houve alteracao de backend, endpoint, regra de revogacao, banco, packages ou dados persistidos.
- Validacao browser local headless Chrome/CDP, viewport mobile-first 390px, confirmou a nova copy, `Até 10/07/2027`, ausencia do bloco operacional, ausencia de e-mail/id do admin e `scrollWidth=390`.
- Validacoes executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.

## Ajuste complementar 2026-07-11 - Plano atual enxuto com revogacao inline

- Pedido do usuario: simplificar o card `Plano atual` na aba `Plano e pagamentos`.
- O card deixou de exibir a frase operacional sobre `professional_subscription`, as tags de status/source e o bloco `Acoes financeiras pelo Admin`.
- Assinaturas pagas ativas exibem o nome do plano e preco no formato mensal visual, por exemplo `Plano Profissional` e `R$ 9,90/mês`.
- Cortesias ativas exibem `Plano de cortesia` no resumo principal, mantendo os dados de vigencia e `Concedida por`.
- A acao `Revogar cortesia` passou para a base do card `Plano atual`, abaixo de `Concedida por`; o card separado de revogacao deixou de aparecer para cortesia ativa.
- Nao houve alteracao de backend, endpoint, schema Prisma, migrations, packages ou regra de dominio.
- Validacao browser local headless Chrome/CDP, viewport mobile-first 390px, confirmou `Plano de cortesia`, ausencia do texto tecnico, ausencia das tags, ausencia do bloco de acoes financeiras, um unico botao `Revogar cortesia` abaixo de `Concedida por`, ausencia do formulario `Conceder cortesia` nesse estado e `scrollWidth=390`.
- Validacoes executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.

## Ajuste complementar 2026-07-11 - Plano atual sem Gateway e Cortesia

- Pedido do usuario: remover as linhas `Gateway` e `Cortesia` do card `Plano atual`.
- O card permanece exibindo nome do plano, `Inicio`, `Proxima renovacao`, `Concedida por` quando houver cortesia e o botao `Revogar cortesia` para cortesia ativa.
- Nao houve alteracao de backend, endpoint, schema Prisma, migrations, packages ou regra de dominio.
- Validacao browser local headless Chrome/CDP, viewport mobile-first 390px, confirmou ausencia das linhas `Gateway` e `Cortesia`, permanencia de `Concedida por`, `Revogar cortesia` e `scrollWidth=390`.
- Validacoes executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.


## Ajuste complementar 2026-07-11 - revogacao retorna plano anterior

- Pedido do usuario: quando uma cortesia for revogada, o card `Plano atual` deve voltar ao plano anterior real do psicologo, seja gratuito ou assinante, em vez de continuar exibindo a cortesia revogada.
- A revogacao Admin agora, na mesma transacao, cancela somente a assinatura `source="admin_grant"` ativa e reativa a assinatura anterior real sem gateway quando ela existir (`free_signup` ou legado/profissional nao-admin).
- A busca do plano atual deixou de usar assinatura cancelada como fallback; se nao houver assinatura ativa, o endpoint retorna plano nulo em vez de tratar uma cortesia cancelada como plano vigente.
- Para preservar historico ja existente, a restauracao prioriza a assinatura cancelada na janela da concessao e, se necessario, o ultimo plano nao-admin anterior a cortesia.
- Nao houve alteracao de schema Prisma, migrations, packages ou gateway.
- Validacao API local com admin real no psicologo `cmrfgznww0014xouh2tmz5dbf`: `POST .../grant-courtesy` retornou cortesia `admin_grant/profissional` ativa e `POST .../revoke-courtesy` retornou o plano anterior `free_signup/gratuito` com `status=ativa`, `is_courtesy=false`, `can_revoke=false` e `can_grant=true`.
- Validacao browser local headless Chrome/CDP em `http://localhost:3002/psicologos/cmrfgznww0014xouh2tmz5dbf?tab=plano` confirmou `Plano Gratuito` no card `Plano atual`, ausencia de `Plano de cortesia`/`Revogar cortesia` e retorno do formulario `Conceder cortesia`.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e `git diff --check`.


## Ajuste complementar 2026-07-11 - formulario de cortesia mais limpo

- Pedido do usuario: simplificar o card `Conceder cortesia` removendo a frase operacional sobre o comando `subscription:grant` e o bloco `Regra de cobranca`.
- A ordem visual dos campos passou a ser: `Regional CRP`, `CRP`, `Data de inscricao no CRP`, depois `CPF` e `Periodo de cortesia`, preservando a composicao mobile-first empilhada.
- O select de `Periodo de cortesia` ganhou seta customizada com afastamento lateral (`right-5` e `pr-12`) para nao ficar colada na borda direita.
- Nao houve alteracao de backend, endpoint, schema Prisma, migrations, packages ou regra de dominio.
- Validacao browser local headless Chrome/CDP, viewport mobile-first 390px, confirmou ausencia da frase operacional, ausencia do bloco `Regra de cobranca`, ordem `Regional CRP` -> `CRP` -> `Data de inscricao no CRP` -> `CPF` -> `Periodo de cortesia` e `scrollWidth=390`.
- Validacoes executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.

## Ajuste complementar 2026-07-11 - nota interna no Plano atual de cortesia

- Pedido do usuario: quando o plano atual for cortesia, exibir a nota interna da concessao e trocar o rotulo `Proxima renovacao` por `Fim`.
- O card `Plano atual` agora usa o campo real `plan.grant_notes` retornado pelo endpoint de billing para renderizar a linha `Nota interna` apenas em cortesia ativa.
- Para cortesia ativa, a data final continua vindo de `current_period_end`, mas o rotulo da linha passa a ser `Fim`; para planos nao cortesia, o rotulo permanece `Proxima renovacao`.
- A deteccao visual de cortesia considera `plan.is_courtesy`, `plan.source="admin_grant"` ou `courtesy.can_revoke=true`, evitando que respostas antigas/parciais escondam a nota interna e mantenham o rotulo incorreto.
- Os labels do formulario `Conceder cortesia` foram corrigidos para `Data de inscrição no CRP` e `Período de cortesia`.
- Nao houve alteracao de backend, endpoint, schema Prisma, migrations, packages ou regra de dominio.
- Validacao browser local headless Chrome/CDP, viewport mobile-first 390px, confirmou `Fim`, ausencia de `Proxima renovacao`, `Nota interna`, a nota `teste de nota interna de cortesia`, `Revogar cortesia` e `scrollWidth=390`.
- Validacoes executadas: `pnpm --dir admin check`, `pnpm --dir admin build` e `git diff --check`.
- `pnpm check` foi acionado, mas ficou bloqueado por formatacao em arquivo local nao relacionado a esta mudanca (`frontend/src/app/app/professional/whatsapp/verify/logic.tsx`).

## Ajuste complementar 2026-07-11 - mensalidades pagas e LTV no Plano atual

- Pedido do usu?rio: quando o psic?logo possuir assinatura, o card `Plano atual` deve exibir `Quantidade de mensalidades pagas` e `Lifetime Value (LTV)` daquele psic?logo.
- O endpoint `GET /api/admin/private/psychologists/:id/billing` passou a retornar os campos `paid_installments_count`, `lifetime_value_cents`, `lifetime_value_available` e `lifetime_value_unavailable_reason` em `plan`.
- A contagem e o LTV s?o derivados exclusivamente de `payment_event` real associado ?s assinaturas Mercado Pago do psic?logo por `professional_subscription.id` ou `gateway_subscription_id`; n?o h? proje??o por pre?o do plano nem dado simulado.
- Quando houver pagamento confirmado sem valor monet?rio extra?vel do payload bruto, o LTV fica indispon?vel com motivo honesto, sem somat?rio parcial.
- A UI mobile-first do Admin exibe as duas linhas no card `Plano atual` somente quando h? assinatura (`plan.id`) e mant?m cortesia/notas/revoga??o no mesmo fluxo existente.
- N?o houve altera??o de schema Prisma, migrations, packages, gateway ou regra de cortesia.
- Valida??o API local com psic?logo real `cmrglzdds000ajkuhqedavedb` retornou `Plano Profissional`, `paid_installments_count=0`, `lifetime_value_cents=0` e `lifetime_value_available=true`, sem muta??o de dados.
- Browser local/headless acessou `http://localhost:3002/psicologos/cmrglzdds000ajkuhqedavedb?tab=plano` com status HTTP 200; a valida??o visual autenticada ficou limitada ? sess?o Admin n?o exposta ao ambiente de automa??o, ent?o a evid?ncia principal de renderiza??o veio de `admin check/build` e da rota compilada.
- Valida??es executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.

## Ajuste complementar 2026-07-11 - reconciliação de LTV pelo resumo real do gateway

- Investigação do psicólogo real `cmrglzdds000ajkuhqedavedb` confirmou que a assinatura Mercado Pago estava `authorized/ativa`, com primeira cobrança em 11/07/2026, mas sem qualquer registro local em `payment_event`; por isso a leitura anterior baseada só em webhook persistido exibia `paid_installments_count=0` e `LTV=R$ 0,00`.
- O endpoint `GET /api/admin/private/psychologists/:id/billing` passou a reconciliar o resumo real da assinatura no Mercado Pago (`preapproval.summarized.charged_quantity` e `charged_amount`) quando houver assinatura `source/gateway="mercadopago"` com `gateway_subscription_id`.
- `payment_event` continua sendo usado como fallback quando a reconciliação online do gateway não estiver disponível; não há projeção por preço do plano, seed, mock ou pagamento inventado.
- Para o psicólogo validado, a reconciliação real retornou `charged_quantity=1` e `charged_amount=9.9`, resultando em `paid_installments_count=1` e `lifetime_value_cents=990`.
- O histórico financeiro individual permanece dependente de `payment_event`/webhook para listar cada cobrança; o resumo do card `Plano atual` pode usar o agregado real do gateway para não zerar LTV quando o webhook não foi persistido.
- Não houve alteração de schema Prisma, migrations ou packages.
- Validação API local sem mutação em psicólogo real `cmrglzdds000ajkuhqedavedb`: `paidInstallmentsCount=1`, `lifetimeValueCents=990`, `lifetimeValueAvailable=true`.

## Ajuste complementar 2026-07-11 - ocultar cortesia para plano profissional vigente

- Pedido do usuário: quando o plano atual for `Plano Profissional`, remover a opção de conceder cortesia.
- A UI Admin passou a não renderizar o card `Conceder cortesia` quando existir plano profissional vigente (`plan.is_paid`, `plan_slug="profissional"` ou nome `Plano Profissional`) e não houver cortesia ativa.
- Plano gratuito ou ausência de plano continuam usando o fluxo de concessão existente; cortesia ativa continua exibindo somente a ação de revogação.
- Não houve alteração de backend, endpoint, schema Prisma, migrations, packages ou gateway.
- Validações executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir backend check`, `pnpm check` e `git diff --check`.
- Browser local em `http://localhost:3002/psicologos/cmrglzdds000ajkuhqedavedb?tab=plano` retornou 200; validação visual autenticada automatizada permaneceu limitada por sessão Admin não exposta.

## Ajuste complementar 2026-07-11 - copy de mensalidades no Plano atual

- Pedido do usuário: trocar o rótulo `Quantidade de mensalidades pagas` por `Mensalidades` no card `Plano atual`.
- A alteração é somente de copy na UI Admin; não muda endpoint, cálculo de LTV, reconciliação com gateway, schema Prisma, packages ou regra de domínio.

## Ajuste complementar 2026-07-11 - histórico de pagamentos por resumo do gateway

- Pedido do usuário: limpar a seção `Histórico de pagamentos`, removendo a frase técnica sobre `payment_event`, removendo a tag `Indisponível`, corrigindo o título com acento e exibindo o pagamento real já existente.
- A UI Admin passou a renderizar apenas o título `Histórico de pagamentos` e a tabela/estado vazio, sem a frase `Fonte real: payment_event reconciliado com a assinatura.` e sem badge de disponibilidade.
- O backend agora usa o resumo real do Mercado Pago como fallback do histórico quando não existe `payment_event` local para uma assinatura `mercadopago` com `gateway_subscription_id` e o gateway confirma cobrança paga.
- O adapter Mercado Pago passou a ler também `summarized.last_charged_amount`, mantendo `summarized.charged_amount` como LTV agregado e usando o valor/data da última cobrança para o item do histórico.
- Não foi criado `payment_event` artificial, seed, mock ou pagamento inventado; a linha exibida vem exclusivamente do resumo real retornado pelo gateway.
- Não houve alteração de schema Prisma, migrations ou packages.
- Validação API local sem mutação no psicólogo real `cmrglzdds000ajkuhqedavedb`: `payment_history.available=true`, item `Mensalidade`, `amount_cents=990`, `status=pago`, `occurred_at=2026-07-11T18:03:17.796Z`, e o card manteve `paid_installments_count=1`/`lifetime_value_cents=990`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check`.


## Ajuste complementar 2026-07-11 - forma de pagamento no checkout normal

- Pedido do usuário: corrigir o card `Forma de pagamento` para exibir o cartão de teste informado no checkout.
- Diagnóstico: a assinatura Mercado Pago do psicólogo real `cmrglzdds000ajkuhqedavedb` estava ativa e paga, mas não havia registro local em `payment_methods`; o checkout normal criava a assinatura, porém só persistia a máscara do cartão em fluxos de cortesia/alterar cartão.
- O checkout normal agora salva `payment_methods` com dados seguros informados pelo frontend/SDK (bandeira e final quando existirem), usando o `gateway_subscription_id` retornado pelo gateway.
- Para assinaturas já existentes sem `payment_methods`, o Admin usa fallback seguro do Mercado Pago e exibe a bandeira retornada em `preapproval.payment_method_id`, sem inventar final/validade e sem persistir dado artificial em leitura.
- Validação API local sem mutação no psicólogo real: `payment_methods_count=0`, mas `GET billing` passou a retornar `payment_method.brand=Visa`, `gateway=mercadopago`, `last4=null`, `exp_month=null`, `exp_year=null`.
- Não houve alteração de schema Prisma, migrations ou packages.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check` e `git diff --check` nos arquivos alterados.

## Ajuste complementar 2026-07-11 - cortesia no lugar da forma de pagamento no plano gratuito

- Pedido do usuário: quando o plano atual for gratuito, remover o card `Forma de pagamento` e exibir `Conceder cortesia` no mesmo slot, ao lado de `Plano atual`.
- A UI Admin agora detecta plano gratuito vigente por `plan_slug="gratuito"`, nome `Plano Gratuito` ou preço zero, desde que não seja cortesia ativa nem plano profissional pago, e substitui o slot da forma de pagamento pelo formulário real de cortesia.
- Plano Profissional e cortesia ativa preservam o comportamento existente: Plano Profissional não exibe concessão de cortesia e cortesia ativa continua com revogação inline no card `Plano atual`.
- Não houve alteração de backend, endpoint, schema Prisma, migrations, packages ou regra de domínio.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png` e a captura enviada pelo usuário.
- Validações executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm check`.
- Browser local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=plano` retornou 200; a conferência visual autenticada ficou limitada pela sessão Admin não exposta ao ambiente de automação.

## Ajuste complementar 2026-07-11 - campos obrigatórios no formulário de cortesia

- Pedido do usuário: no bloco `Conceder cortesia`, todos os campos devem ser obrigatórios e o rótulo `Data de inscrição no CRP` deve virar `Data inscrição CRP`.
- O formulário Admin passou a exigir `Regional CRP`, `CRP`, `Data inscrição CRP`, `CPF`, `Período de cortesia` e `Notas internas` com validação React Hook Form/Zod e indicadores visuais de obrigatório nos controllers.
- A placeholder de `Notas internas` deixou de indicar opcionalidade e passou para `Observações internas para auditoria`.
- O contrato TypeScript do caller Admin passou a tratar os campos do submit de cortesia como obrigatórios; o backend, schema Prisma, migrations, packages e regra de concessão não foram alterados.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png` e a captura enviada pelo usuário.
- Validações executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`.
- Browser local: `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=plano` retornou 200; a conferência visual autenticada ficou limitada pela sessão Admin não exposta ao ambiente de automação.

## Ajuste complementar 2026-07-11 - copy do histórico sem cobrança financeira

- Pedido do usuário: no `Histórico de pagamentos`, trocar `Este plano não possui cobrança financeira confirmada no gateway.` por `Este plano não possui cobrança financeira.`.
- A alteração é somente de copy retornada pelo backend para planos sem cobrança financeira; não muda gateway, cálculo financeiro, histórico real, endpoint, schema Prisma, migrations, packages ou regra de domínio.
- Builder/Quick Copy não está exposto como ferramenta no ambiente; a referência visual usada foi o PNG local `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Plano e pagamentos.png` e a captura enviada pelo usuário.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check`, `git diff --check` nos arquivos alterados e `GET http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=plano` com status 200.
