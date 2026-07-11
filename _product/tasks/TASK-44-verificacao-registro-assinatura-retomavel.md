# TASK-44: Verificação de registro retomável no fluxo pago

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-44 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Assinatura / Onboarding profissional |
| Status | Completed |
| Dependências | TASK-10, TASK-16, TASK-18A, TASK-31, TASK-32 |
| ADR alvo | ADR-0201 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/proto/Verificação de CPF - Consulta CFP.jpg`
- `_product/proto/Endereço de Faturamento - Layout Ajustado.jpg`

## Contexto

O fluxo pago do psicólogo era: selecionar Plano Profissional, confirmar pagamento real, preencher endereço de faturamento, verificar registro profissional via CFP/InfoSimples, cadastrar WhatsApp e configurar/publicar perfil. Em 2026-07-11, a ordem operacional foi ajustada para reduzir fricção em caso de instabilidade da API automática: pagamento real → endereço de faturamento → cadastro de WhatsApp → verificação profissional → perfil.

A etapa de verificação profissional já existe em `/app/professional/cfp`, mas o produto identificou uma inconsistência: se o psicólogo com assinatura paga ativa sai dessa etapa, ele pode voltar para áreas do app sem conseguir retomar claramente a verificação e ainda pode receber selo de verificado apenas por ter assinatura ativa.

É obrigatório diferenciar esse estado do Plano Gratuito. Psicólogos gratuitos seguem a jornada gratuita por WhatsApp/perfil e não devem ser forçados à consulta CFP do fluxo pago. Psicólogos em cortesia administrativa (`source="admin_grant"`) continuam sendo equivalência operacional de verificação pública enquanto a cortesia estiver ativa.

## Objetivo

Tornar a verificação de registro profissional uma etapa persistente e retomável do fluxo pago: psicólogo com Plano Profissional ativo via assinatura paga, endereço preenchido, WhatsApp cadastrado e `cfp_verified_at=null` deve ser redirecionado para `/app/professional/cfp`, não deve acessar edição do perfil profissional e não deve exibir selo público de verificado até confirmar o registro real.

## Pré-requisitos e bloqueios

- InfoSimples/CFP já decidido na TASK-10 e usado por `/api/private/psychologist/cfp/*`.
- Mercado Pago já implementado na TASK-32; esta task não altera gateway nem webhooks.
- Não há novo requisito externo nem nova migration.
- Builder/Quick Copy não está disponível como ferramenta direta neste ambiente; foram usadas as imagens locais citadas acima.

## Escopo frontend

- Centralizar a seleção de assinatura profissional ativa e a exigência de verificação em `frontend/src/utils/psychologist-onboarding.ts`.
- Fazer o shell privado redirecionar psicólogo pago em onboarding pendente para a etapa obrigatória, sem aplicar o gate ao Plano Gratuito.
- Bloquear acesso à edição de perfil por redirecionamento quando a etapa pendente for CFP.
- Ajustar selo do menu/perfil privado para depender de assinatura profissional ativa + `cfp_verified_at` ou cortesia administrativa ativa.

## Escopo backend

- Reutilizar o contrato existente de `professional_subscription` e `psychologist_profile.cfp_verified_at`; não criar schema novo.
- Expor até 5 assinaturas ativas na hidratação para que o frontend encontre assinatura profissional mesmo quando existir plano gratuito ativo.
- Bloquear o endpoint privado de edição/asset de perfil profissional enquanto assinatura paga não gratuita exigir verificação CFP.
- Corrigir derivações de selo/verified em listagens, perfil público, favoritos/seguindo e avaliações para exigir assinatura profissional ativa + `cfp_verified_at` ou cortesia administrativa ativa.

## Fora do escopo

- Criar novo fluxo de pagamento, cancelar assinatura ou alterar webhook Mercado Pago.
- Criar mock de consulta CFP ou aprovação manual automática.
- Alterar schema Prisma/migrations.
- Recriar telas ou design system.

## Critérios de aceite

- [x] Psicólogo com Plano Profissional pago ativo, endereço e WhatsApp cadastrados e `cfp_verified_at=null` é direcionado para `/app/professional/cfp` ao acessar áreas privadas não permitidas.
- [x] Busca de CPF no CFP para ativação do selo verificado permite no máximo 3 tentativas persistidas por psicólogo e orienta suporte após esgotar.
- [x] Edição/alteração de perfil profissional fica bloqueada no backend enquanto a verificação CFP do fluxo pago estiver pendente.
- [x] Plano Gratuito não cai no gate de CFP do fluxo pago.
- [x] Selo público/privado de verificado não é derivado apenas de assinatura paga ativa; exige `cfp_verified_at` ou cortesia administrativa ativa.
- [x] Formulários/campos existentes permanecem na fundação da TASK-02; nenhum formulário novo foi criado.
- [x] UI permanece mobile-first e não usa `<img>` cru.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhuma migration foi necessária.
- [x] Packages usados conferem com `PACKAGES.md`; nenhum package novo foi instalado.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local ou validação equivalente da rota privada quando houver interface.

## Execução em 2026-07-04

- Builder/Quick Copy não esteve disponível como ferramenta direta neste ambiente; as referências locais `_product/proto/Verificação de CPF - Consulta CFP.jpg` e `_product/proto/Endereço de Faturamento - Layout Ajustado.jpg` foram consultadas.
- `frontend/src/utils/psychologist-onboarding.ts` passou a diferenciar assinatura ativa gratuita de assinatura profissional ativa e a calcular a etapa obrigatória do onboarding pago.
- `PrivateTemplate` passou a redirecionar psicólogos pagos com etapa obrigatória pendente para o próximo passo, preservando rotas mínimas de gestão de assinatura/conta.
- `backend/src/modules/api/private/psychologist/free-profile` passou a recusar leitura/edição/upload/remoção de assets do perfil profissional quando a assinatura paga exige CFP pendente.
- `backend/src/utils/subscription-entitlement.ts` passou a expor helpers para perfil profissional verificado: assinatura profissional ativa + `cfp_verified_at` ou `admin_grant` ativo.
- Listagem/perfil público, favoritos/seguindo, avaliações de paciente e menu privado deixaram de tratar assinatura paga ativa sem CFP como selo verificado.

## Pendências

- A validação visual autenticada em browser local pode depender de sessão real de psicólogo com assinatura paga ativa e CFP pendente; quando indisponível, registrar a limitação na resposta final.

## Validação executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check` (primeira tentativa expirou; segunda apontou ajuste de type guard em `psychologist-onboarding.ts`; terceira executou sem erros)
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local com `next start --port 3100` e `curl -I http://127.0.0.1:3100/app/professional/cfp`: rota privada retornou `307` para login sem sessão, confirmando proteção/noindex. A validação autenticada de redirecionamento client-side para usuário pago pendente de CFP ficou limitada pela ausência de sessão real/browser autenticado neste ambiente.

## Ajuste de fluxo em 2026-07-11 - WhatsApp antes da verificação profissional

- Decisão de produto: no fluxo pago, o cadastro de WhatsApp deve ocorrer antes da verificação profissional para reduzir fricção quando a API automática estiver instável.
- Nova ordem do fluxo pago: Plano Profissional → checkout/pagamento real → endereço de faturamento → WhatsApp → verificação profissional → perfil.
- O cadastro do WhatsApp não libera edição/publicação completa do perfil profissional pago; o gate de perfil continua exigindo verificação profissional concluída.
- `cfp_verified_at` continua sendo evidência de verificação automática, e a TASK-66 define a evolução para `crp_status="aprovado"` como aprovação canônica de produto também em aprovações manuais.

## Correção de limite de tentativas CFP em 2026-07-04

- A busca de CPF em `/api/private/psychologist/cfp/search` passou a contar tentativas persistidas em `professional_registry_check` por psicólogo, limitando novas chamadas reais ao provedor a 3 tentativas com CPF válido.
- Erros retornados pelo provedor depois da chamada real também passam a ser registrados no log de consulta, com `attempt_status` em `raw`, para que falhas/indisponibilidade não permitam tentativas ilimitadas.
- Ao esgotar o limite, o backend retorna `cfp_search_attempts_exceeded` com status `429` e mensagem de suporte; não há fallback, mock, aprovação automática ou nova migration.
- Os tipos frontend de CFP foram atualizados com o campo opcional `attempts` do contrato de resposta, sem alterar a fundação de formulário ou recriar UI.
- ADR atualizado: `adrs/0201-verificacao-cfp-retomavel-fluxo-pago.md`.
- Validação desta correção: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm --dir frontend check` e `pnpm check`. A primeira tentativa de `pnpm --dir frontend check` falhou por tipos stale em `.next/types`; a primeira tentativa de `pnpm --dir frontend build` encontrou outro build Next em andamento. Após o build finalizar/regenerar `.next`, `frontend build`, `frontend check` e `pnpm check` executaram sem erros.
