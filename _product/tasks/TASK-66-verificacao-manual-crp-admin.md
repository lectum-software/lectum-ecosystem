# TASK-66: Verificação manual de CRP e origem genérica de verificação profissional

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-66 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Admin / Onboarding profissional |
| Status | Pending |
| Dependências | TASK-10, TASK-44, TASK-45, TASK-46, TASK-54, TASK-55 |
| ADR alvo | ADR sobre `crp_status` como aprovação canônica de registro profissional e origem genérica de verificação (`api_automatica`/`manual_admin`) |

## Contexto

A consulta automática de registro profissional pode ficar indisponível, lenta, sem autorização operacional ou retornar limite/tentativas excedidas. No fluxo pago vigente, o psicólogo já deve conseguir cadastrar o WhatsApp antes dessa etapa, mas fica bloqueado na verificação profissional e não consegue configurar/editar/publicar o perfil enquanto a aprovação não for concluída.

A decisão de produto desta task é separar **evidência técnica da API automática** de **aprovação profissional de produto**:

- `psychologist_profile.cfp_verified_at` continua existindo e só deve ser preenchido quando a verificação for concluída pela API automática real.
- `psychologist_profile.crp_status="aprovado"` passa a ser o critério canônico de aprovação profissional para liberar o fluxo e os recursos, independentemente da origem da aprovação.
- Aprovação manual pelo Admin deve conceder **100% dos mesmos acessos** do psicólogo aprovado automaticamente pela API.
- O nome do fornecedor externo não deve aparecer no sistema voltado a usuários/admins. A nomenclatura de produto é **API automática**, **Verificação automática** e **Aprovação manual**. Qualquer detalhe de fornecedor deve ficar restrito a adapter técnico/ADR interno quando inevitável, nunca em UI, copy, respostas consumidas pelo frontend ou logs operacionais comuns.

Estado atual relevante:

- TASK-10 implementou a consulta automática em `/api/private/psychologist/cfp/*` e persiste auditoria em `professional_registry_check`.
- TASK-44 tornou a verificação de registro retomável no fluxo pago, mas ainda existem pontos que usam `cfp_verified_at` como sinal de conclusão.
- TASK-54/TASK-55 criaram lista e detalhe administrativo de psicólogos.
- TASK-56 usa cortesia administrativa como equivalência operacional de plano/verificação, mas cortesia **não** deve ser usada como workaround para psicólogo pagante que apenas precisa de validação manual do CRP.

## Objetivo

Permitir que o Admin aprove ou rejeite manualmente o CRP de um psicólogo quando a API automática estiver instável/indisponível/ambígua, com auditoria real, nomenclatura genérica e liberação integral do fluxo pago após WhatsApp: edição/publicação do perfil e recursos/verificação pública equivalentes à aprovação automática.

## Pré-requisitos e bloqueios

- TASK-10 concluída: existe provider de consulta automática e `professional_registry_check`.
- TASK-44 concluída: existe gate retomável do fluxo pago.
- TASK-45/TASK-46 concluídas: autenticação e app Admin reais.
- TASK-54/TASK-55 concluídas: lista e detalhe Admin de psicólogos.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local, quando houver UI:
  - `_product/proto/admin/Psicólogos/Psicólogos- Lista.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png`;
  - `_product/proto/Verificação de CPF - Consulta CFP.jpg` e estados relacionados somente como referência de fluxo do psicólogo.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar a limitação.
- Validar o schema atual antes de criar campo/tabela nova. Preferir reaproveitar `psychologist_profile.crp_status`, `cfp_verified_at`, `crp`, `cpf`, `crp_registration_date` e `professional_registry_check`.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.

## Escopo frontend

### Admin

- Atualizar a lista/detalhe de psicólogos para expor status de verificação profissional com nomenclatura genérica:
  - `Pendente`;
  - `Aprovado via API automática`;
  - `Aprovado manualmente`;
  - `Rejeitado`;
  - `API automática indisponível`/`Limite de tentativas atingido`, quando derivável das auditorias reais.
- No detalhe do psicólogo, preferencialmente na aba **Perfil e cadastro**, criar uma seção/card **Verificação profissional** com:
  - CPF mascarado;
  - Regional CRP;
  - Nº CRP;
  - Data de inscrição no CRP;
  - status atual (`crp_status`);
  - origem da aprovação (`api_automatica`, `manual_admin`, `admin_grant` quando aplicável), exibida como texto humano;
  - últimas tentativas da API automática, sem nome de fornecedor;
  - responsável e data quando a aprovação/rejeição for manual;
  - observações/evidências internas quando existirem.
- Criar ação **Aprovar CRP manualmente**:
  - abrir modal/drawer mobile-first;
  - campos: Regional CRP, Nº CRP, CPF, Data de inscrição no CRP, situação confirmada e observação/evidência interna;
  - Regional CRP deve usar a mesma lista do perfil/cortesia Admin quando possível;
  - CPF deve usar máscara visual e normalização para dígitos;
  - exigir confirmação forte, por exemplo `APROVAR CRP`.
- Criar ação **Rejeitar verificação**:
  - exigir motivo em PT-BR;
  - não apagar histórico nem dados profissionais;
  - permitir que o psicólogo tente novamente quando a regra de tentativas permitir ou procure suporte.
- Não exibir o nome do fornecedor externo em telas, badges, tooltips, toasts, filtros, tabelas ou cards.

### Frontend do psicólogo

- Atualizar `/app/professional/cfp` e o fluxo retomável para reconhecer `crp_status="aprovado"` como verificação profissional concluída, mesmo com `cfp_verified_at=null`.
- Quando a aprovação for manual, exibir mensagem honesta:
  - “Seu CRP foi aprovado pela equipe Lectum.”
  - CTA para continuar para configuração do perfil.
- Atualizar guards/helpers de onboarding para seguir:
  - pago + endereço + sem WhatsApp → WhatsApp;
  - pago + endereço + WhatsApp + `crp_status!="aprovado"` → continuar em verificação profissional;
  - pago + endereço + WhatsApp + `crp_status="aprovado"` → perfil.
- Atualizar selo/labels privados e públicos para dependerem da aprovação profissional canônica, não apenas de `cfp_verified_at`.
- Substituir qualquer copy visível que cite o fornecedor por **API automática** ou **verificação automática**.

## Escopo backend

- Criar endpoints Admin privados reais, protegidos por autenticação Admin:
  - `GET /api/admin/private/psychologists/:id/registry-verification`;
  - `POST /api/admin/private/psychologists/:id/registry-verification/approve`;
  - `POST /api/admin/private/psychologists/:id/registry-verification/reject`.
- Reutilizar ou estender o endpoint de detalhe/lista de psicólogos para retornar o resumo de verificação sem criar endpoint fake.
- Implementar service/repository/validator conforme `ARCHITECTURE.md` em módulo Admin privado.
- Aprovação manual deve ocorrer em transação:
  - atualizar `psychologist_profile.crp_status="aprovado"`;
  - atualizar `cpf`, `crp` e `crp_registration_date` com os dados conferidos;
  - manter `psychologist_profile.cfp_verified_at` inalterado/nulo se a origem for manual;
  - registrar auditoria em `professional_registry_check` com origem manual (`provider="manual_admin"` ou convenção documentada), `found=true`, `checked_at`, admin responsável e payload mínimo em `raw`;
  - não criar, alterar, cancelar nem conceder assinatura.
- Rejeição manual deve ocorrer em transação:
  - atualizar `psychologist_profile.crp_status="rejeitado"`;
  - registrar auditoria em `professional_registry_check` com origem manual, `found=false`, motivo e admin responsável;
  - não apagar `cpf`, `crp`, `crp_registration_date` nem auditorias anteriores sem decisão explícita.
- Atualizar a confirmação automática da API, se necessário, para garantir:
  - `crp_status="aprovado"`;
  - `cfp_verified_at=now()`;
  - origem exibida como `api_automatica` / “API automática”.
- Atualizar helpers e queries de entitlement/verificação:
  - acesso profissional verificado = assinatura profissional ativa + (`crp_status="aprovado"` ou cortesia administrativa ativa, preservando regra atual de `admin_grant`);
  - `cfp_verified_at` não deve mais ser critério único para liberar perfil, selo, busca pública ou recursos Pro;
  - manter Plano Gratuito fora do gate de CRP pago.
- Atualizar listagens públicas/privadas, favoritos, avaliações, menus e detalhe Admin que hoje derivem verificado apenas de `cfp_verified_at`.
- Atualizar traduções PT-BR em `backend/locales/pt/translation.json`.
- Não expor token/documento/fornecedor externo em respostas HTTP, logs ou frontend.

## Fora do escopo

- Upload de documento CRP ou storage privado da TASK-11.
- Aprovação automática quando a API falhar.
- Mock de consulta, endpoint simulado ou dado inventado.
- Alterar gateway Mercado Pago, cobrança, assinatura ou cortesia.
- Usar cortesia como solução para psicólogo pagante já assinante.
- Criar psicólogo manualmente pelo Admin.
- Reset destrutivo de banco.
- Instalar pacote novo sem validar `PACKAGES.md` e registrar ADR.

## Contrato técnico detalhado

### Regra canônica

- `psychologist_profile.crp_status` é o status de aprovação profissional de produto:
  - `pendente`;
  - `em_analise`;
  - `aprovado`;
  - `rejeitado`.
- `psychologist_profile.cfp_verified_at` é evidência técnica de aprovação pela API automática e permanece nulo em aprovação manual.
- `professional_registry_check` registra auditorias de tentativas e decisões:
  - origem automática deve ser exibida como `api_automatica` / “API automática”;
  - origem manual deve ser `manual_admin` / “Aprovação manual”;
  - registros legados com nome de fornecedor devem ser mapeados para “API automática” em qualquer resposta/UI.

### Regra de acesso

- Psicólogo aprovado manualmente (`crp_status="aprovado"`, `cfp_verified_at=null`) deve ter os mesmos recursos do psicólogo aprovado automaticamente (`crp_status="aprovado"`, `cfp_verified_at!=null`).
- Recursos que dependem de plano continuam exigindo assinatura profissional ativa real.
- A aprovação manual **não** concede plano, não cria receita e não substitui pagamento.
- Cortesia administrativa ativa deve continuar funcionando como equivalência operacional já existente, sem regressão.

### Nomenclatura proibida em superfície de produto

Não usar o nome do fornecedor externo em:

- Admin UI;
- frontend do psicólogo;
- toasts/copies;
- labels de filtro/status;
- respostas de API consumidas pelo frontend;
- traduções user-facing;
- logs operacionais comuns que possam ser compartilhados com suporte.

Nomenclaturas permitidas:

- `API automática`;
- `Verificação automática`;
- `Aprovação manual`;
- `Consulta automática indisponível`;
- `Limite de tentativas da API automática`.

### Formulários

- Admin deve usar a fundação equivalente já existente no app Admin com React Hook Form, Zod e controllers.
- Campos ocupam largura total no mobile.
- Erros em PT-BR e sem layout shift.
- Confirmação forte antes de aprovar/rejeitar.

### Auditoria

A auditoria manual deve registrar, no mínimo:

- `psychologist_id`;
- `provider/source` manual;
- `checked_at`;
- `found`;
- CPF normalizado;
- regional/UF ou nome da regional quando aplicável;
- registro CRP;
- data de inscrição no CRP;
- admin responsável (`admin.id`, nome/e-mail ou identificador seguro disponível);
- motivo/observação interna;
- status anterior e novo.

Se o schema atual não suportar auditoria mínima sem `raw`, usar `raw` com shape documentado nesta task/ADR. Se optar por campo novo, atualizar primeiro `DATA-MODEL.md`, criar migration e executar `db:migrate`.

## Critérios de aceite

- [ ] Admin autenticado consegue visualizar o status de verificação profissional no detalhe do psicólogo.
- [ ] Admin consegue aprovar CRP manualmente com CPF, Regional, CRP, data de inscrição e observação/evidência interna.
- [ ] Admin consegue rejeitar verificação com motivo obrigatório.
- [ ] Aprovação manual atualiza `crp_status="aprovado"` e mantém `cfp_verified_at` nulo/inalterado.
- [ ] Aprovação automática continua atualizando `crp_status="aprovado"` e `cfp_verified_at`.
- [ ] Psicólogo aprovado manualmente possui 100% dos mesmos acessos do aprovado pela API automática, respeitando o plano ativo.
- [ ] Gate do fluxo pago redireciona aprovado manualmente para perfil, não para nova consulta.
- [ ] Selo/verificação pública e privada usam aprovação profissional canônica e não dependem somente de `cfp_verified_at`.
- [ ] Registros legados do fornecedor externo aparecem como “API automática” em qualquer UI/resposta frontend.
- [ ] O nome do fornecedor externo não aparece em UI Admin, UI do psicólogo, toasts, mensagens user-facing ou contratos consumidos pelo frontend.
- [ ] `professional_registry_check` registra auditoria real da aprovação/rejeição manual com admin responsável.
- [ ] A aprovação manual não cria/cancela assinatura, não altera gateway e não concede cortesia.
- [ ] Plano Gratuito não passa a exigir CRP por regressão.
- [ ] Formulários usam React Hook Form, Zod e controllers.
- [ ] UI mobile-first validada em ~390px e desktop.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] ADR criado/atualizado.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm --dir backend db:migrate` se houver schema/migration.
- Browser local:
  - Admin `/psicologos/lista` com filtro/status de verificação;
  - Admin `/psicologos/[id]` aprovando e rejeitando em psicólogo real elegível;
  - frontend psicólogo pago pendente retomando após aprovação manual;
  - busca/perfil público exibindo verificação sem depender de `cfp_verified_at`.

## Notas de execução

- Esta task deve ser executada antes de depender de storage privado da TASK-11 para resolver o bloqueio operacional de psicólogos pagantes travados por instabilidade da API automática.
- A ordem vigente do onboarding pago é: Plano Profissional → checkout/pagamento real → endereço de faturamento → WhatsApp → verificação profissional → perfil.
- Não usar dados demo para provar aprovação manual. Se não houver psicólogo real elegível no ambiente, validar endpoints negativamente e registrar limitação sem marcar critérios de aceite que dependam de mutação real.
- Antes de alterar qualquer helper de verificação, procurar usos existentes de `cfp_verified_at`, `crp_status`, `admin_grant`, `verifiedProfessionalProfileWhere`, `isVerifiedProfessionalEntitlement` e `getPsychologistPaidOnboardingRequirementPath`.
- Preservar compatibilidade com auditorias históricas já gravadas; qualquer valor antigo de fornecedor deve ser normalizado para nomenclatura genérica no contrato apresentado ao frontend.
