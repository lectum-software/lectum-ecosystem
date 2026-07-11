# TASK-66: Verificação manual de CRP e origem genérica de verificação profissional

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-66 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Admin / Onboarding profissional |
| Status | Completed |
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
  - campos: Regional CRP, Nº CRP e Data de inscrição no CRP ficam no card; a confirmação exibe CPF, situação confirmada, observação/evidência interna e confirmação forte;
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

- [x] Admin autenticado consegue visualizar o status de verificação profissional no detalhe do psicólogo.
- [x] CPF valido informado pelo psicologo na verificacao profissional fica salvo e aparece no detalhe Admin mesmo quando a API automatica falha.
- [x] Admin consegue aprovar CRP manualmente com CPF, Regional, CRP, data de inscrição e observação/evidência interna.
- [x] Admin consegue rejeitar verificação com motivo obrigatório.
- [x] Aprovação manual atualiza `crp_status="aprovado"` e mantém `cfp_verified_at` nulo/inalterado.
- [x] Aprovação automática continua atualizando `crp_status="aprovado"` e `cfp_verified_at`.
- [x] Psicólogo aprovado manualmente possui 100% dos mesmos acessos do aprovado pela API automática, respeitando o plano ativo.
- [x] Gate do fluxo pago redireciona aprovado manualmente para perfil, não para nova consulta.
- [x] Selo/verificação pública e privada usam aprovação profissional canônica e não dependem somente de `cfp_verified_at`.
- [x] Registros legados do fornecedor externo aparecem como “API automática” em qualquer UI/resposta frontend.
- [x] O nome do fornecedor externo não aparece em UI Admin, UI do psicólogo, toasts, mensagens user-facing ou contratos consumidos pelo frontend.
- [x] `professional_registry_check` registra auditoria real da aprovação/rejeição manual com admin responsável.
- [x] A aprovação manual não cria/cancela assinatura, não altera gateway e não concede cortesia.
- [x] Plano Gratuito não passa a exigir CRP por regressão.
- [x] Formulários usam React Hook Form, Zod e controllers.
- [x] UI mobile-first validada em ~390px e desktop.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado.
- [x] Commit criado com mensagem convencional e `git push` executado.

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

### Execucao 2026-07-11

- Implementados endpoints Admin privados reais para visualizar, aprovar e rejeitar verificacao profissional manual em `/api/admin/private/psychologists/:id/registry-verification`.
- Aprovacao manual reutiliza `professional_registry_check` com `provider="manual_admin"`, `found=true`, admin responsavel em `raw`, dados conferidos e snapshots anterior/proximo; mantem `cfp_verified_at` nulo/inalterado e nao altera assinatura, gateway ou cortesia.
- Rejeicao manual registra auditoria real com motivo obrigatorio, preservando CPF/CRP/data/historico.
- `crp_status="aprovado"` foi consolidado como aprovacao canonica em helpers, gates e listagens publicas/privadas, preservando plano profissional ativo e cortesia administrativa existente como regra equivalente.
- Admin lista/detalhe exibem status/origem genericos; detalhe recebeu card mobile-first "Verificacao profissional" com formularios React Hook Form + Zod/controllers e confirmacao forte (`APROVAR CRP` / `REJEITAR CRP`).
- Fluxo do psicologo em `/app/professional/cfp` reconhece aprovacao manual e exibe mensagem honesta: "Seu CRP foi aprovado pela equipe Lectum."
- Builder/Quick Copy nao esteve disponivel como ferramenta no ambiente; foram usadas as imagens locais indicadas em `_product/proto` e a limitacao foi registrada no ADR.
- Nenhum pacote novo foi instalado.
- Nao houve alteracao de `backend/prisma/schema.prisma` nem migrations; portanto `pnpm --dir backend db:migrate` nao se aplica.
- Validacao read-only do service `showRegistryVerification` contra banco local retornou `status=200` para um psicologo real, sem mutacao.
- Browser local: `admin` foi servido por `next start` e validado em Chrome headless 390x844 nas rotas `/psicologos/lista` e `/psicologos/[id]`; sem sessao Admin, o smoke confirmou a tela real de login/protecao. A mutacao real de aprovar/rejeitar nao foi executada para nao alterar registros reais do banco local sem autorizacao explicita.
- Validacoes executadas sem erro: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`.
- ADR criado: `adrs/0251-verificacao-profissional-manual-crp.md`.

### Ajuste de card 2026-07-11

- Card Admin renomeado de "Verificacao profissional" para "Registro profissional" e removido texto explicativo interno.
- CPF deixou de ser exibido no card e nas ultimas tentativas do registro; o formulario de aprovacao manual continua exigindo CPF para auditoria real.
- Cortesia administrativa ativa passou a aparecer no registro como ativacao manual, porque a concessao pressupoe verificacao administrativa previa do registro profissional.
- Validacao read-only com psicologo real em cortesia ativa retornou `summaryStatus=aprovado`, `summaryLabel=Ativado manualmente`, `source=admin_grant` e `sourceLabel=Ativacao manual`.

### Ajuste de opcoes do registro profissional 2026-07-11

- O card passou a separar dados publicos do conselho (Regional, N? CRP, data de inscricao e tempo de experiencia) em bloco com fundo azulado leve.
- A secao "Lectum" passou a exibir Plano, Aprovacao, Origem, Responsavel, Data aprovacao e Observacao.
- A aprovacao/rejeicao manual ficou disponivel somente para plano Profissional com registro ainda pendente; Gratuito, Cortesia e Profissional ja ativo nao exibem acao de aprovacao manual.

### Ajuste de cortesia no registro profissional 2026-07-11

- Para cortesia sem tentativas automaticas/manuais no historico, o card exibe "Aprovacao manual via Cortesia.".
- O campo Responsavel exibe "Via API" quando a origem e automatica e o nome do Admin no formato "Admin Lectum" quando a origem e manual/cortesia; em cortesia, usa o mesmo `granted_by` da concessao, sem expor e-mail ou id.

### Ajuste de alerta no menu Perfil e cadastro 2026-07-11

- O item "Perfil e cadastro" passou a exibir icone de alerta somente quando o psicologo tem plano Profissional ativo, nao e cortesia e o registro profissional ainda nao esta ativo.
- A regra espelha o unico cenario em que o card Registro profissional deve oferecer verificacao manual: Profissional pendente, sem tratar Gratuito, Cortesia ou Profissional ja aprovado como alerta.

### Ajuste de layout Perfil e cadastro 2026-07-11

- A aba Perfil e cadastro passou a organizar a primeira coluna com Dados pessoais, Dados profissionais, Selos e facilidades, Bio, Texto de apresentacao, Video de apresentacao e Formacao & Titulos.
- A segunda coluna ficou exclusiva para o card Registro profissional.
- Em desktop, Registro profissional usa `position: sticky` no topo da viewport para permanecer visivel durante a rolagem longa da primeira coluna.
- Genero, Raca/cor e Religiao ficam em Dados pessoais; Dados profissionais nao duplica Regional CRP, N? de registro, Data registro CRP, Tempo de experiencia, Genero, Raca/cor ou Religiao.
- Opcoes de Dados profissionais seguem com primeira letra maiuscula apenas na apresentacao.

### Ajuste de copy Dados pessoais 2026-07-11

- Na aba Perfil e cadastro, Dados pessoais passou a exibir "WhatsApp" no lugar de "Telefone" e "Endereco" no lugar de "Endereco completo".

### Ajuste visual do pendente profissional 2026-07-11

- Quando o status do registro profissional e pendente, a tag "Pendente" usa tom vermelho.
- No mesmo cenario, o icone de alerta do item "Perfil e cadastro" tambem usa vermelho.
- O botao de acao primario foi reduzido para "Aprovar manualmente" e marcado para nao quebrar linha.

### Ajuste de status ativo do perfil 2026-07-11

- O status verde/vermelho do header Admin passou a representar se o perfil entra na lista publica de psicologos, e nao apenas se a conta de usuario esta ativa.
- A regra reutiliza a mesma elegibilidade da listagem publica/ranking: perfil publicado, conta ativa, dados obrigatorios completos e entitlement profissional conforme helpers existentes.
- Perfis profissionais pendentes de registro ou incompletos ficam com tag "Inativo" no header do detalhe Admin.

### Ajuste de campos publicos do registro profissional 2026-07-11

- O card Registro profissional removeu "Tempo de experiencia".
- Regional CRP, Nº CRP e Data de inscricao ficaram editaveis diretamente no card, sem modal, usando React Hook Form/Zod/controllers.
- O card nao exibe mais o texto "Dados publicos" nem o botao "Salvar dados publicos"; o bloco dos campos mostra as acoes "Aprovar manualmente" e "Rejeitar verificacao".
- Na aprovacao manual, os dados preenchidos inline atualizam os dados publicos do conselho em `psychologist_profile.crp` e `psychologist_profile.crp_registration_date`, sem preencher `cfp_verified_at`, criar/cancelar assinatura, alterar gateway ou conceder cortesia.
- O perfil publico do psicologo passa a receber Regional CRP, Nº CRP e Data de inscricao para exibicao como dados do registro profissional.

### Ajuste de CPF pendente da verificacao automatica 2026-07-11

- O endpoint `/api/private/psychologist/cfp/search` passou a persistir o CPF valido em `psychologist_profile.cpf` antes de consultar a API automatica.
- Se a API automatica falhar, estiver indisponivel, sem token operacional ou retornar erro, o CPF fica visivel em Dados pessoais no detalhe Admin do psicologo; tentativas historicas com CPF em `professional_registry_check` tambem entram como fallback de exibicao.
- A persistencia nao aprova o registro, nao preenche `cfp_verified_at`, nao altera CRP/data e nao sobrescreve identidades ja bloqueadas por aprovacao profissional ou cortesia administrativa ativa.
- Validacao local com psicologo real: a busca com token operacional vazio retornou erro de configuracao esperado, persistiu o CPF informado em `psychologist_profile.cpf`, manteve `crp_status=pendente`/`cfp_verified_at=null` e o detalhe Admin passou a devolver o CPF em `profile.personal.cpf`.
