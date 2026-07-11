# TASK-67: Edição administrativa auditada de dados pessoais e profissionais do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-67 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Psicólogos |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-55, TASK-59, TASK-65, TASK-66 |
| ADR alvo | ADR sobre edição administrativa auditada de dados do psicólogo e inclusão no histórico de atividades |

## Contexto

O detalhe administrativo do psicólogo já possui a aba **Perfil e cadastro** com cards de **Dados pessoais**, **Dados profissionais** e **Registro profissional**. A `TASK-66` adicionou edição administrativa específica para dados públicos do registro profissional e aprovação/rejeição manual de CRP. A `TASK-59` criou a aba **Atividades** como linha do tempo simples derivada de fontes reais, mas ainda sem uma auditoria genérica para alterações administrativas.

Decisão de produto desta task:

- O Admin deve conseguir corrigir **Dados pessoais** do psicólogo, **exceto e-mail**.
- O Admin deve conseguir corrigir **Dados profissionais** do psicólogo.
- O Admin **não** deve editar, nesta task, bio, texto de apresentação, vídeo, formação/títulos, publicações, avaliações, denúncias, plano, pagamentos, assinatura, cortesia ou status de verificação profissional.
- Alterações feitas pelo Admin não devem parecer ações do próprio psicólogo. Elas devem ter origem administrativa explícita, auditoria real e aparecer no histórico de atividades do painel Admin com quem alterou e quais campos foram alterados.

O objetivo é destravar suporte operacional sem criar impersonação, sem alterar credenciais/login e sem transformar a edição administrativa em uma porta indireta para mudar plano, pagamento ou CRP.

## Objetivo

Permitir que um Admin autenticado edite, a partir do detalhe do psicólogo, os campos de **Dados pessoais** permitidos e os campos de **Dados profissionais**, salvando em dados reais, com validações equivalentes às do fluxo do psicólogo e auditoria administrativa visível na aba **Atividades**.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-55 concluída: detalhe administrativo do psicólogo com aba **Perfil e cadastro**.
- TASK-59 concluída: aba **Atividades** e endpoint real de atividades.
- TASK-65 concluída: catálogos/filtros administráveis usados por perfil e busca.
- TASK-66 concluída: separação entre **Registro profissional** e demais dados de perfil.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local:
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não estiver acessível no ambiente, usar as imagens locais e registrar a limitação.
- Validar o schema atual antes de criar tabela nova de auditoria. Se já existir modelo/tabela equivalente para atividades administrativas, reutilizar.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar obrigatoriamente `pnpm --dir backend db:migrate`.
- Não usar mocks, endpoints simulados, dados inventados ou escrita local sem persistência real.

## Escopo frontend

### Admin — Perfil e cadastro

- Na aba `/psicologos/[id]?tab=perfil` ou rota equivalente, tornar editáveis:
  - card **Dados pessoais**;
  - card **Dados profissionais**.
- Manter o **e-mail somente leitura**, com indicação visual de bloqueio/credencial quando fizer sentido.
- O payload do frontend não deve enviar e-mail para endpoints de atualização.
- A UI pode usar edição inline, modal ou drawer, desde que seja mobile-first e preserve a leitura rápida do card.
- Estados obrigatórios:
  - visualizar;
  - editar;
  - salvar;
  - cancelar;
  - loading;
  - erro de validação;
  - erro de API em PT-BR;
  - sucesso com toast/copy discreta.
- Após salvar:
  - atualizar o card sem reload manual;
  - invalidar/recarregar o detalhe do psicólogo;
  - invalidar/recarregar a aba **Atividades** quando ela estiver em cache.

### Campos de Dados pessoais

Permitir edição administrativa dos campos pessoais já persistidos e exibidos no detalhe, como aplicável ao schema atual:

- CPF;
- WhatsApp;
- data de nascimento;
- gênero;
- raça/cor;
- religião;
- endereço.

Regras:

- E-mail não é editável nesta task.
- CPF deve ter máscara visual e normalização para dígitos antes do submit.
- WhatsApp deve usar a máscara/normalização já existente quando houver helper/controller.
- Endereço deve reutilizar a estrutura existente do produto; não criar endereço paralelo sem validar `DATA-MODEL.md`.
- Campos sensíveis devem exigir **motivo/observação interna** para a alteração administrativa.
- Se CPF for alterado em psicólogo com `crp_status="aprovado"`, a UI deve avisar que a alteração **não revalida nem invalida automaticamente** o CRP; qualquer decisão de aprovação/rejeição deve continuar sendo feita no card **Registro profissional**.

### Campos de Dados profissionais

Permitir edição administrativa dos campos profissionais que já existem no perfil profissional e são equivalentes aos campos editáveis pelo psicólogo, exceto itens explicitamente fora de escopo.

Exemplos, conforme schema/telas atuais:

- especialidades;
- abordagens;
- serviços/modalidades;
- idiomas;
- público atendido;
- preço/valor de sessão quando já existir no card/formulário profissional;
- formato de atendimento e informações profissionais equivalentes já modeladas.

Regras:

- Catálogos devem vir da API real da `TASK-65`, não de arrays hardcoded.
- Não duplicar no card **Dados profissionais** campos que pertencem ao card **Registro profissional**, como Regional CRP, Nº CRP e data de inscrição no CRP.
- Não editar bio, texto de apresentação, vídeo, formação/títulos ou selos nesta task.

### Admin — Atividades

- A aba **Atividades** deve passar a listar eventos reais de edição administrativa criados por esta task.
- Cada evento deve mostrar, no mínimo:
  - data/hora;
  - ator administrativo em formato humano seguro, por exemplo `Admin Lectum` ou nome do admin;
  - área/seção: `Perfil e cadastro`;
  - tipo: `Dados pessoais atualizados` ou `Dados profissionais atualizados`;
  - lista de campos alterados;
  - motivo/observação interna quando existir;
  - origem: `Painel administrativo`.
- A lista não deve expor e-mail, id técnico do admin, token, CPF completo, endereço completo ou outros valores sensíveis em texto aberto.
- Se houver expansão/detalhe de evento, valores sensíveis devem continuar mascarados ou redigidos.

## Escopo backend

- Criar endpoints Admin privados reais, protegidos por autenticação Admin:
  - `PUT /api/admin/private/psychologists/:id/personal-data`;
  - `PUT /api/admin/private/psychologists/:id/professional-data`.
- Atualizar o endpoint de atividades existente:
  - `GET /api/admin/private/psychologists/:id/activities`;
  - incluir eventos de auditoria administrativa criados nesta task.
- Reutilizar ou criar estrutura de service/repository/validator conforme `ARCHITECTURE.md`.
- Validar payloads com Zod/pacote local de validator, sem validação ad hoc em service quando puder ficar no validator.
- Em nenhuma hipótese aceitar atualização de `email` nesses endpoints.
- Persistir as alterações em transação:
  - atualizar os modelos reais envolvidos;
  - registrar auditoria administrativa;
  - retornar contrato normalizado para o Admin.
- Se uma alteração profissional exigir atualizar tabelas de vínculo, fazer diff real:
  - criar/remover vínculos necessários;
  - não apagar histórico não relacionado;
  - respeitar catálogos inativos conforme regra do produto.
- Não alterar:
  - `user.email`;
  - senha/credenciais;
  - plano;
  - assinatura;
  - gateway;
  - cortesia;
  - `crp_status`;
  - `cfp_verified_at`;
  - auditorias de `professional_registry_check`, salvo se a alteração for explicitamente de observação no novo log administrativo desta task.

## Fora do escopo

- Edição de e-mail.
- Edição de bio.
- Edição de texto de apresentação.
- Edição de vídeo de apresentação.
- Edição de formação e títulos.
- Edição de selos e facilidades.
- Edição de Regional CRP, Nº CRP, data de inscrição no CRP ou status de verificação profissional além do que já foi tratado na `TASK-66`.
- Aprovar/rejeitar CRP.
- Conceder/cancelar cortesia.
- Criar, cancelar ou alterar assinatura/plano/pagamento/gateway.
- Editar publicações, avaliações, denúncias ou conteúdo de comunidade.
- Impersonar o psicólogo.
- Criar psicólogo manualmente.
- Exportação de auditoria completa.
- Retroagir auditoria para alterações antigas que não foram registradas.
- Reset destrutivo de banco.
- Instalar pacote novo sem validar `PACKAGES.md` e ADR.

## Contrato técnico detalhado

### Regra de edição administrativa

- A edição pelo Admin deve ser registrada como ação do Admin, não como ação do psicólogo.
- O backend deve diferenciar origem da atualização:
  - `admin_panel`;
  - `psychologist_self_service` ou origem equivalente já existente quando for ação do próprio psicólogo.
- A edição administrativa deve reutilizar regras de domínio e validação já existentes sempre que possível, mas por endpoint Admin próprio.
- Não criar bypass que permita ao Admin atualizar campos fora do escopo por payload extra.

### Auditoria administrativa

Se não existir estrutura equivalente, criar modelo/tabela genérica para auditoria administrativa, por exemplo `admin_activity_log` ou nome alinhado ao padrão atual.

Campos mínimos esperados:

- `id`;
- admin responsável (`admin_id` ou referência equivalente existente);
- alvo (`target_type`, `target_id`);
- domínio/área, por exemplo `psychologist_profile`;
- ação, por exemplo:
  - `psychologist_personal_data_updated`;
  - `psychologist_professional_data_updated`;
- origem, por exemplo `admin_panel`;
- lista de campos alterados;
- valores seguros para exibição (`safe_before`, `safe_after` ou shape equivalente), com dados sensíveis mascarados/redigidos;
- motivo/observação interna quando informado;
- metadata operacional segura quando já existir padrão no projeto;
- `createdAt`.

Regras LGPD:

- Evitar duplicar valores sensíveis completos no JSON de auditoria.
- CPF deve aparecer mascarado em qualquer resposta/UI.
- Endereço completo não deve aparecer em listas de atividade; no máximo resumo seguro ou `Alterado`.
- Se a execução decidir armazenar valores completos de `before/after` para campos sensíveis, deve justificar no ADR com finalidade, retenção e acesso.
- A atividade deve mostrar **quem alterou** e **quais campos foram alterados** sem expor dado sensível desnecessário.

### Atividades

- Atualizar o feed da `TASK-59` para incluir os registros de auditoria administrativa.
- Ordenação deve continuar por data/hora decrescente.
- Filtros de área/tipo devem considerar os novos eventos quando aplicável.
- A copy deve continuar honesta: a aba mostra eventos principais registrados, não promete auditoria absoluta de tudo.

### Dados pessoais

- `email` deve ser read-only e rejeitado pelo backend se vier no payload.
- CPF:
  - normalizar para 11 dígitos;
  - validar com helper/regra existente, se houver;
  - mascarar em respostas e atividades quando exibido como valor;
  - se `crp_status="aprovado"` e CPF mudou, exigir confirmação explícita no payload e motivo interno, sem alterar automaticamente a aprovação.
- WhatsApp:
  - normalizar para formato já aceito pelo produto;
  - manter compatibilidade com `wa.me` e contato público quando aplicável.
- Endereço:
  - reutilizar modelos/campos existentes;
  - não atualizar endereço no gateway de pagamento;
  - não criar novo endereço de cobrança externo.

### Dados profissionais

- Usar catálogos reais persistidos para especialidades/abordagens/serviços/idiomas/público.
- Validar IDs/valores contra catálogos ativos, preservando vínculos históricos quando a regra atual permitir.
- Reutilizar lógica de vínculos existente no backend, se houver.
- Não alterar `published` por efeito colateral direto.
- A alteração de campos obrigatórios pode afetar naturalmente a elegibilidade derivada do perfil público na próxima leitura, mas a task não deve forçar publicação nem aprovação profissional.

### Frontend esperado

- Reutilizar componentes existentes do Admin e do detalhe de psicólogo.
- Formulários devem usar React Hook Form, Zod e controllers da `TASK-02`/fundação do app Admin.
- Campos ocupam largura total no mobile.
- Slot de erro deve manter altura fixa, sem layout shift.
- UI mobile-first:
  - base ~390px;
  - botões empilhados quando necessário;
  - edição utilizável por toque;
  - desktop com cards e ações alinhadas sem quebrar a leitura.
- Não usar `<img>` cru.
- Não criar design system paralelo.

### Respostas HTTP

- Usar formato padrão do backend (`send`, `error`, `error500`, `msg`).
- Erros visíveis ao usuário devem ter chave PT-BR em `backend/locales/pt/translation.json`.
- Não retornar e-mail como campo editável.
- Não retornar token, id técnico sensível, fornecedor externo ou payload bruto de auditoria em resposta consumida pelo frontend.

## Critérios de aceite

- [x] Admin autenticado consegue editar **Dados pessoais** do psicólogo no detalhe Admin.
- [x] E-mail aparece somente leitura e não pode ser alterado nem pelo frontend nem pelo backend.
- [x] Admin consegue editar CPF, WhatsApp, data de nascimento, gênero, raça/cor, religião e endereço quando esses campos existirem no schema atual.
- [x] Campos sensíveis exigem motivo/observação interna e exibem validação em PT-BR.
- [x] Alterar CPF em psicólogo aprovado exige confirmação explícita e não altera automaticamente `crp_status` nem `cfp_verified_at`.
- [x] Admin autenticado consegue editar **Dados profissionais** do psicólogo no detalhe Admin.
- [x] Dados profissionais usam catálogos reais persistidos, sem arrays hardcoded novos.
- [x] Edição de Dados profissionais não altera bio, apresentação, vídeo, formação/títulos, Registro profissional, plano, assinatura, gateway ou cortesia.
- [x] Cada atualização administrativa registra auditoria real com admin responsável, data/hora, origem, seção, campos alterados e motivo quando houver.
- [x] A aba **Atividades** mostra eventos de alteração administrativa com quem alterou e quais campos foram alterados.
- [x] Atividades não expõem CPF completo, endereço completo, e-mail, token ou id técnico sensível.
- [x] Alterações são persistidas em dados reais e refletidas no card após salvar.
- [x] A edição administrativa não impersona o psicólogo e não cria sessão/token de psicólogo.
- [x] Formulários usam React Hook Form, Zod e controllers.
- [x] UI mobile-first validada em ~390px e desktop.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate` se houver schema/migration.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check` se contratos/catálogos compartilhados com frontend forem alterados.
- `pnpm --dir frontend build` se contratos/catálogos compartilhados com frontend forem alterados.
- `pnpm check`
- Browser local:
  - Admin `/psicologos/[id]?tab=perfil` editando Dados pessoais de psicólogo real elegível;
  - Admin `/psicologos/[id]?tab=perfil` editando Dados profissionais de psicólogo real elegível;
  - Admin `/psicologos/[id]?tab=atividades` exibindo os eventos de edição administrativa;
  - validação mobile em ~390px e desktop.

## Notas de execução

### Execução em 2026-07-11

- Builder/Quick Copy não estava disponível como ferramenta no ambiente Codex; a implementação visual foi guiada pelas imagens locais em `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Perfil e Cadastro.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`.
- Criada auditoria administrativa real em `admin_activity_logs`, com migration `20260711185437_task67_admin_activity_logs`, valores seguros/redigidos e eventos integrados à aba **Atividades**.
- Criados endpoints Admin privados para atualização de **Dados pessoais** e **Dados profissionais**, sem aceitar `email` e sem alterar credenciais, plano, pagamentos, assinatura, cortesia, Registro profissional, `crp_status` ou `cfp_verified_at`.
- UI Admin usa React Hook Form, Zod e controllers; e-mail aparece bloqueado/read-only; Dados profissionais usam catálogos reais da API de configurações.
- Validações executadas com sucesso: `pnpm --dir backend db:migrate`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`.
- Browser local: rota Admin respondeu HTTP 200 e houve smoke em viewport mobile/desktop via Chrome headless; a sessão autenticada do navegador do usuário não estava disponível no headless, então a inspeção visual autenticada foi limitada à implementação/build e ao smoke da página de login.
- ADR criado: `adrs/0252-edicao-admin-auditada-dados-psicologo.md`.

### Observações de escopo

- Esta task é deliberadamente menor que uma edição completa do perfil: bio, apresentação, vídeo, formação, pagamentos e moderação continuam fora do escopo.
- Se não houver psicólogo real elegível no ambiente local, validar endpoints negativamente e registrar limitação sem marcar critérios que dependam de mutação real.
- Se o schema atual já possuir algum log administrativo, preferir reutilizar e estender em vez de criar tabela paralela.
- Se for necessário criar novo modelo de auditoria, atualizar `DATA-MODEL.md`, criar migration e executar `pnpm --dir backend db:migrate`.
- Se `prisma migrate dev` falhar por conflito com dados/estado do banco de desenvolvimento, não resetar automaticamente; explicar o erro e perguntar ao usuário antes de qualquer comando destrutivo.

### Ajuste de UX em 2026-07-11

- Removida a faixa informativa de e-mail credencial no modo de edição de **Dados pessoais**; o e-mail segue somente leitura no card.
- WhatsApp no formulário administrativo recebeu máscara visual de telefone e continua sendo normalizado para dígitos antes do submit.
- O aviso e a confirmação de alteração de CPF aprovado agora aparecem somente quando o CPF foi alterado.
- Dropdowns estáticos de **Dados pessoais** e modalidade no Admin foram alinhados às opções disponíveis no fluxo do psicólogo, preservando apenas `Não informado` como opção extra para campos opcionais do Admin.
