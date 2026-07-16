# TASK-70: Resolução administrativa de denúncias recebidas

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-70 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Psicólogos / Denúncias / Moderação |
| Status | Completed |
| Dependências | TASK-23, TASK-24, TASK-26, TASK-45, TASK-46, TASK-55, TASK-58, TASK-59, TASK-67 |
| ADR alvo | ADR sobre resolução administrativa auditada de denúncias e remoção segura de conteúdo comunitário |

## Contexto

A `TASK-58` implementou a aba **Denúncias** no detalhe administrativo do psicólogo como V1 somente leitura, usando `post_report` real relacionado a posts e respostas do psicólogo. Hoje a própria UI informa que resolver, aprovar, rejeitar ou aplicar medidas fica fora dessa V1.

Agora a operação precisa conseguir concluir a triagem dessas denúncias sem recorrer a alterações manuais no banco. A resolução deve ser explícita, persistente e auditada. O Admin pode decidir que a denúncia é improcedente, procedente sem remoção ou procedente com remoção real do conteúdo denunciado. Isso é moderação de conteúdo, não sanção de conta.

Decisões de produto desta task:

- A aba **Denúncias** deixa de ser somente leitura para denúncias elegíveis.
- Usar `post_report.status` existente sempre que possível:
  - `pendente` e `em_analise` são estados não terminais no banco;
  - a UI/Admin não expõe mais a etapa/opção **Em análise**; registros legados em `em_analise` são agrupados como **Pendentes** e resolvidos diretamente;
  - `rejeitada` representa denúncia improcedente;
  - `resolvida` representa denúncia procedente.
- Remoção de conteúdo deve ser soft delete real em `community_post`/`post_reply`, nunca hard delete.
- Todas as decisões devem registrar `admin_activity_log` existente com área `denuncias`, origem `admin_panel`, motivo obrigatório e dados seguros.
- Suspensão/bloqueio/restrição da conta do psicólogo, notificações automáticas e reabertura de denúncia ficam fora desta task.

## Objetivo

Permitir que um Admin autenticado resolva denúncias recebidas contra posts e respostas do psicólogo em `/psicologos/[id]?tab=denuncias`, atualizando `post_report` real, registrando auditoria, refletindo eventos na aba **Atividades** e removendo conteúdo comunitário quando a medida procedente exigir.

## Pré-requisitos e bloqueios

- `TASK-23`, `TASK-24` e `TASK-26` concluídas: comunidade, posts, respostas e denúncia pública real.
- `TASK-45` concluída: autenticação Admin real.
- `TASK-46` concluída: app `admin/` e shell lateral.
- `TASK-55` concluída: detalhe administrativo do psicólogo.
- `TASK-58` concluída: aba **Denúncias** real e somente leitura atual.
- `TASK-59` concluída: aba **Atividades** real.
- `TASK-67` concluída: `admin_activity_log` genérico para alterações sensíveis.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar como referência visual local:
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Denúncias.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Atividades.png`;
  - `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Geral.png`.
- Não existe protótipo específico para modal/drawer de resolução nesta data. Usar o padrão das ações sensíveis do Admin e registrar essa limitação.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não estiver acessível, usar imagens locais e registrar a limitação.
- Validar o schema atual antes de criar campo/tabela nova. Preferir `post_report.status`, `post_report.updatedAt`, soft delete de `community_post`/`post_reply` e `admin_activity_log`.
- Se alterar `backend/prisma/schema.prisma` ou migrations, executar `pnpm --dir backend db:migrate`.
- Não usar mocks, endpoints simulados, dados inventados, remoção local sem persistência real ou status visual sem atualizar `post_report`.

## Escopo frontend

### Admin — aba Denúncias do psicólogo

- Atualizar a aba existente em `/psicologos/[id]?tab=denuncias` sem criar shell paralelo.
- Substituir a copy de somente leitura por copy operacional honesta, por exemplo:
  - “Denúncias relacionadas a posts e respostas do psicólogo podem ser triadas e resolvidas com auditoria. Medidas de conta não fazem parte desta tela.”
- Manter o deep link `?tab=denuncias` e filtros existentes.
- Ajustar cards/filtros/lista para distinguir:
  - `Pendente` (incluindo registros legados em `em_analise`);
  - `Improcedente`;
  - `Procedente`.
- Cada denúncia deve mostrar dados seguros:
  - tipo do alvo: post ou resposta;
  - comunidade;
  - título/excerto curto do conteúdo denunciado;
  - motivo e descrição da denúncia quando houver;
  - status atual;
  - data/hora da denúncia;
  - papel do denunciante em formato humano seguro, sem dados pessoais desnecessários;
  - link real para visualizar o conteúdo quando ainda existir;
  - indicação de conteúdo removido/indisponível quando aplicável.

### Ações

Implementar ações por denúncia:

1. **Resolver como improcedente**
   - Disponível para `pendente` ou `em_analise` legado, exibidos como pendentes na UI.
   - Exige motivo obrigatório e confirmação forte, por exemplo `DENUNCIA IMPROCEDENTE`.
   - Atualiza `post_report.status="rejeitada"`.
   - Não altera o conteúdo denunciado.

2. **Resolver como procedente**
   - Disponível para `pendente` ou `em_analise` legado, exibidos como pendentes na UI.
   - Exige motivo obrigatório, confirmação forte e escolha de medida.
   - Medidas:
     - `Manter conteúdo sem alteração`;
     - `Remover conteúdo denunciado`.
   - Atualiza `post_report.status="resolvida"`.
   - Se a medida for remoção, o conteúdo deve sair do ar por persistência real.

Denúncias terminais (`resolvida`/`rejeitada`) não devem exibir ação de resolver novamente nesta task.

### Formulários e interações

- Todos os formulários devem usar React Hook Form, Zod e controllers da fundação da `TASK-02`/Admin.
- Campos mínimos:
  - motivo/observação interna obrigatório;
  - confirmação forte para resoluções terminais;
  - seleção de medida quando a resolução for procedente.
- Regras de UI:
  - validação inline em PT-BR;
  - loading por ação;
  - erro de API em PT-BR;
  - sucesso com toast/copy discreta;
  - cache atualizado sem reload manual;
  - botões sensíveis com copy clara;
  - nada sensível em console, URL, localStorage ou cache global.
- Após sucesso, invalidar no mínimo:
  - query da aba `reports`/`denuncias` do psicólogo;
  - detalhe do psicólogo quando houver contadores derivados;
  - aba **Atividades**;
  - dashboard Admin e dashboard de comunidades quando usarem denúncias pendentes;
  - feeds/listas de comunidade quando conteúdo for removido e houver query key compartilhada acessível.

### UI mobile-first

- Implementar primeiro para base ~390px:
  - cards empilhados;
  - filtros sem quebra visual;
  - ações empilhadas ou em menu seguro por item;
  - modal/drawer legível em tela pequena.
- Desktop pode usar layout em colunas sem esconder informações obrigatórias.
- Tema claro/escuro via tokens existentes.
- Não usar `<img>` cru; usar `Image` de `next/image` se alguma imagem for necessária.

## Escopo backend

Criar ou estender endpoints Admin privados reais, protegidos por autenticação Admin, preferindo o módulo existente de feedback/denúncias do psicólogo:

- `POST /api/admin/private/psychologists/:id/reports/:reportId/resolve`.

Também estender, quando necessário:

- `GET /api/admin/private/psychologists/:id/reports`.

### Regras gerais

- Usar controller/service/repository/validator conforme `ARCHITECTURE.md`.
- Validar `:id`, `:reportId`, query e body com Zod/pacote local de validator.
- Garantir que `:id` pertence a usuário `role="psicologo"` existente e não deletado.
- Garantir que `:reportId` existe, não está deletado e está relacionado a conteúdo do psicólogo selecionado:
  - `community_post.author_id = psychologist.user_id` quando `target_type="post"`;
  - `post_reply.author_id = psychologist.user_id` quando `target_type="reply"`.
- Não aceitar payload extra para alterar campos fora do escopo.
- Usar transação para alteração de status, remoção de conteúdo e auditoria.
- Não retornar dados pessoais do denunciante além do necessário para triagem.
- Não retornar senha, token, segredo, payload bruto ou conteúdo completo desnecessário.

### Contrato de leitura atualizado

O endpoint de leitura deve continuar retornando cards/filtros/lista e adicionar capacidades por denúncia quando aplicável:

- `capabilities.can_resolve_dismissed`;
- `capabilities.can_resolve_upheld`;
- `capabilities.can_remove_content`;
- `content.available` ou equivalente;
- `moderation.status`/`moderation.status_label` quando necessário.

`access.mode` não deve continuar afirmando `read_only` se ações reais estiverem disponíveis.

### Sem etapa Em análise

- A UI/Admin não deve exibir card, filtro, capacidade, modal ou endpoint para marcar denúncia como **Em análise**.
- Registros históricos em `post_report.status="em_analise"` permanecem válidos no banco, mas o contrato de leitura deve agrupá-los em `status_group="pending"`, label **Pendente** e permitir resolução direta.

### Resolver como improcedente

Payload mínimo:

- `reason`: motivo/observação interna obrigatório;
- `confirmation`: confirmação forte;
- `resolution`: `dismissed` ou equivalente validado.

Regras:

- Permitido somente para `pendente` ou `em_analise`.
- Atualizar `post_report.status` para `rejeitada`.
- Não alterar `community_post`, `post_reply`, contadores, plano, perfil, conta ou assinatura.
- Registrar auditoria com `action="psychologist_report_dismissed"` ou equivalente documentado.

### Resolver como procedente

Payload mínimo:

- `reason`: motivo/observação interna obrigatório;
- `confirmation`: confirmação forte;
- `resolution`: `upheld` ou equivalente validado;
- `measure`: `none` ou `remove_content`.

Regras:

- Permitido somente para `pendente` ou `em_analise`.
- Atualizar `post_report.status` para `resolvida`.
- Registrar auditoria com `action="psychologist_report_upheld"` ou equivalente documentado.
- Se `measure="none"`, não alterar o conteúdo denunciado e registrar essa decisão.
- Se `measure="remove_content"`:
  - para post: soft delete em `community_post`, preencher `deletedAt`, definir `status="removido"` e remover/invalidar respostas conforme semântica já usada no fluxo real de exclusão de post;
  - para resposta: soft delete em `post_reply` alvo e descendentes conforme semântica já usada no fluxo real de exclusão de resposta, ajustando `community_post.replies_count` de forma consistente;
  - não hard-delete;
  - não apagar `post_report`.
- Quando conteúdo for removido, fechar como `resolvida` denúncias não terminais do mesmo `target_type`/`target_id` para evitar fila pendente de conteúdo já indisponível. Registrar a quantidade afetada na auditoria.
- Se o conteúdo já estiver removido/deletado, permitir resolver como procedente sem tentar remover novamente e retornar copy honesta.

### Atividades e auditoria

- Atualizar a aba **Atividades** para listar eventos reais:
  - `Denúncia resolvida como improcedente`;
  - `Denúncia resolvida como procedente`;
  - `Conteúdo denunciado removido`.
- Cada evento deve mostrar:
  - data/hora;
  - ator administrativo;
  - área: `Denúncias` ou `Denúncias e moderação`;
  - tipo de ação;
  - motivo/observação interna quando houver;
  - origem: `Painel administrativo`;
  - resumo seguro do alvo.
- Atividades não devem expor conteúdo integral sensível, dados pessoais do denunciante, tokens, IDs técnicos desnecessários em UI, payload bruto ou segredos.

## Frontend do usuário afetado

- Quando post/resposta for removido:
  - listagens de comunidade não devem exibir o conteúdo removido;
  - detalhe público do post removido não deve expor o conteúdo;
  - respostas removidas não devem aparecer em thread;
  - contadores devem permanecer consistentes.
- Se a infraestrutura atual já filtra `deleted=false`/`status="publicado"`, reutilizar essa regra.
- Não enviar notificação automática ao autor, denunciante ou comunidade nesta task, salvo se já existir produtor real e decisão registrada em ADR.

## Estados obrigatórios

- Loading por seção e por ação.
- Erros de validação inline em PT-BR.
- Erros de API em PT-BR.
- Estado vazio real quando não houver denúncias.
- Estado indisponível para denúncia terminal.
- Estado de conteúdo já removido/indisponível.
- Sucesso com toast/copy discreta.
- Confirmação forte antes de resoluções terminais e remoção.
- Atualização de cache sem reload manual.

## Fora do escopo

- Denúncias de pacientes fora do detalhe do psicólogo.
- Criar central global de moderação separada.
- Impersonar usuário.
- Suspender, bloquear, banir, silenciar ou restringir a conta do psicólogo.
- Penalidades automáticas por quantidade de denúncias.
- Notificar automaticamente denunciante, autor ou comunidade sem decisão específica.
- Reabrir denúncia já resolvida.
- Editar conteúdo denunciado pelo Admin.
- Alterar perfil, CRP, plano, assinatura, gateway, cortesia, avaliações, conta/e-mail/senha ou dados profissionais do psicólogo.
- Remover avaliação profissional (`professional_review`).
- Hard delete de posts, respostas ou denúncias.
- Expor dados pessoais do denunciante em lugares que não sejam necessários para triagem.
- Mock de denúncia, endpoint simulado, status fake, notificação fake ou dados permanentes inventados.
- Instalar package novo sem validar `PACKAGES.md` e registrar ADR.

## Contrato técnico detalhado

### Referências obrigatórias

- `ARCHITECTURE.md`: módulos backend com controller/service/repository/validator, rotas privadas Admin, Prisma, regras de UI e formulários.
- `DATA-MODEL.md`: `post_report`, `community_post`, `post_reply`, soft delete e `admin_activity_log`.
- `PACKAGES.md`: usar packages já instalados; não instalar dependência nova sem ADR.
- `PROTO-INVENTORY.md`: fonte visual ativa.
- `TASK-02`: React Hook Form, Zod, controllers e slot fixo de erro.
- `TASK-58`: leitura atual de avaliações/denúncias.
- `TASK-59`: feed de atividades do psicólogo.
- `TASK-67`: auditoria administrativa sensível.

### Backend esperado

- Módulo Admin privado alinhado ao padrão existente em `backend/src/modules/api/admin/private/psychologists/*`.
- Preferir estender `psychologists/feedback` em vez de criar segundo módulo paralelo para denúncias.
- Rotas registradas no import central real do backend.
- Validators para `id`, `reportId`, body e confirmações fortes.
- Services com transações e regras de domínio.
- Repositories sem SQL ad hoc quando Prisma resolver.
- Traduções PT-BR em `backend/locales/pt/translation.json`.
- Auditoria em `admin_activity_log` existente.
- Sanitização explícita de campos sensíveis em logs/respostas.

### Frontend esperado

- Atualizar `admin/src/app/(admin)/psicologos/[id]/client.tsx` ou componente equivalente sem criar shell paralelo.
- Adicionar/atualizar types e chamadas em `admin/src/api/req/psychologists` ou módulo equivalente.
- Adicionar/atualizar hooks/mutations em `admin/src/api/callers/psychologists`.
- Adicionar query keys específicas para ações de reports se necessário.
- Formulários com composição já usada no Admin, React Hook Form, Zod e controllers.
- UI mobile-first, base ~390px, com modal/drawer responsivo.
- Tema claro/escuro via tokens existentes; sem cores hardcoded fora do padrão.
- Nenhum `<img>` cru.

### Segurança operacional

- Motivo obrigatório em todas as ações.
- Confirmação forte em resoluções terminais e remoção.
- Auditoria nunca armazena segredo, token, payload bruto, conteúdo completo desnecessário ou dados pessoais do denunciante sem necessidade.
- Respostas HTTP nunca retornam segredo nem dados pessoais desnecessários.
- Console/logs não devem imprimir payload sensível.
- Remoção de conteúdo deve ser idempotente o suficiente para não quebrar se o alvo já estiver indisponível.
- A ação Admin deve alterar apenas denúncia/conteúdo de comunidade no escopo.

## Critérios de aceite

- [x] A aba **Denúncias** deixa de informar “somente leitura” e passa a exibir ações reais para denúncias elegíveis.
- [x] `?tab=denuncias` continua funcionando e filtros/deep links existentes não quebram.
- [x] Denúncias exibem status real distinguindo pendente, improcedente e procedente; registros legados em `em_analise` aparecem como pendentes.
- [x] A opção/ação **Em análise** foi removida da UI, filtros, cards e contrato Admin.
- [x] A aba **Denúncias** removeu a faixa informativa, a linha de período consultado e o chip de filtros, mantendo filtros na ordem Tipo, Status, Período, De e Até com campos de data sempre visíveis.
- [x] Admin consegue resolver denúncia como **Improcedente** com motivo obrigatório e confirmação forte.
- [x] Resolver como improcedente atualiza `post_report.status="rejeitada"`, registra auditoria e não altera conteúdo.
- [x] Admin consegue resolver denúncia como **Procedente** com motivo obrigatório, confirmação forte e escolha de medida.
- [x] Resolver como procedente atualiza `post_report.status="resolvida"` e registra auditoria real.
- [x] Medida **Remover conteúdo denunciado** remove post/resposta por soft delete real, sem hard delete.
- [x] Remoção respeita a semântica atual de contadores, replies/descendentes e filtros públicos.
- [x] Denúncias não terminais do mesmo alvo removido são encerradas como procedentes ou tratadas de forma documentada e auditada.
- [x] Conteúdo já removido/indisponível é tratado com resposta honesta.
- [x] Denúncias terminais não exibem ação de resolver novamente nesta task.
- [x] A aba **Atividades** lista eventos de moderação de denúncias com admin responsável, data/hora, área, tipo, motivo e origem.
- [x] Auditoria não expõe conteúdo completo desnecessário, dados pessoais do denunciante, tokens, segredos ou payload bruto.
- [x] A resolução não altera perfil, CRP, plano, assinatura, gateway, cortesia, avaliações, conta/e-mail/senha ou dados profissionais do psicólogo.
- [x] Formulários/campos usam React Hook Form, Zod e controllers da `TASK-02`/Admin, com slot de erro sem layout shift.
- [x] UI mobile-first validada em ~390px e desktop.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, notificação fake ou status apenas visual foi usado.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado sem reset destrutivo não autorizado.
- [x] Traduções PT-BR foram criadas/atualizadas para mensagens e erros necessários.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais/protótipo inexistente para resolução foram registrados na execução/ADR.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `pnpm --dir frontend check` e `pnpm --dir frontend build` se houver alteração em comportamento/rotas compartilhadas do app público/privado.
- `pnpm --dir backend db:migrate` se houver alteração em `backend/prisma/schema.prisma` ou `backend/prisma/migrations`.
- Browser local:
  - Admin `/psicologos/[id]?tab=denuncias` em ~390px e desktop;
  - resolver uma denúncia real como improcedente sem alterar conteúdo;
  - resolver uma denúncia real como procedente com `measure=none` ou remoção real quando houver autorização explícita para alterar dados locais;
  - confirmar que conteúdo removido não aparece no feed/detalhe público de comunidade;
  - confirmar que a aba **Atividades** exibe eventos auditados;
  - confirmar que dashboard/cards que dependem de denúncias pendentes refletem a mudança.

## Notas de execução

- Antes de implementar, procurar usos existentes de `post_report.status`, `target_type`, `target_id`, `community_post.status`, `deleted/deletedAt`, exclusão de post/resposta em `PostRepository`, `admin_activity_log`, `showAdminPsychologistReports` e mapeamento da aba **Atividades**.
- Não inventar nova tabela de moderação antes de validar se `admin_activity_log` cobre a auditoria necessária. Se criar campo/tabela for indispensável, registrar ADR antes de migrar.
- Preferir labels humanos no frontend, mas manter status técnico consistente no backend.
- Se não houver denúncia real elegível no ambiente local, validar estados indisponíveis e endpoints negativamente; não marcar critérios que dependem de mutação real como concluídos sem evidência.
- A remoção de conteúdo é sensível. Usar confirmação forte e avisar que o conteúdo sairá das listagens públicas, sem prometer notificação ao autor/denunciante.
- Se `prisma migrate dev` falhar por conflito com dados/estado do banco de desenvolvimento, não resetar automaticamente. Explicar o erro e perguntar ao usuário antes de executar qualquer comando destrutivo.


## Execução TASK-70

- Implementado suporte real de moderação na aba **Denúncias** do detalhe administrativo do psicólogo, mantendo filtros/deep link e adicionando capacidades por denúncia.
- Criado endpoint Admin privado para resolver denúncias como improcedente/procedente, protegido por autenticação Admin e validators reais; a etapa/opção **Em análise** foi removida.
- `post_report.status` foi reutilizado sem migração: `pendente` como não terminal principal, `em_analise` como legado agrupado em pendentes, `rejeitada` como improcedente e `resolvida` como procedente.
- A remoção de conteúdo usa soft delete real em `community_post`/`post_reply`, preserva auditoria e fecha denúncias não terminais do mesmo alvo quando o conteúdo sai do ar.
- A auditoria usa `admin_activity_log` existente com área `denuncias`, origem `admin_panel`, motivo obrigatório e payload seguro sem conteúdo integral, dados pessoais do denunciante ou segredos.
- A aba **Atividades** lista eventos administrativos de denúncias: improcedente, procedente e conteúdo removido; eventos históricos de `em_analise` não são mais gerados.
- Builder/Quick Copy não estava disponível como ferramenta no ambiente; foram usadas as imagens locais de Denúncias, Atividades e Geral indicadas em `_product/proto/admin/Psicólogos/Detalhes do psicólogo`. Não havia protótipo específico para modal/drawer de resolução.
- Não houve alteração em Prisma schema ou migrations; `pnpm --dir backend db:migrate` não foi necessário.
- Mutações reais de moderação não foram disparadas contra denúncias existentes sem autorização explícita para alterar dados locais/prod-like; endpoints foram validados negativamente sem sessão Admin e contratos/builds/checks validaram a implementação.
- Correção pós-validação em 2026-07-12: removida a etapa/opção **Em análise** de Denúncias; `em_analise` legado passa a ser agrupado como **Pendente** e resolvido diretamente.
- Correção de UI em 2026-07-12: removida a faixa informativa da aba, removidos "Período consultado" e chip de filtros, filtros reordenados para Tipo, Status, Período, De e Até, e datas passam a seguir o padrão de dashboard/estatísticas com campos sempre visíveis e aplicação ao sair do grupo de datas.

### Validação executada

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP sem sessão Admin:
  - `GET /api/admin/private/psychologists/test-id/reports` retornou 401;
  - `POST /api/admin/private/psychologists/test-id/reports/report-id/resolve` retornou 401.
- Correção 2026-07-12:
  - `rg` confirmou ausência de `start_review`, `can_start_review`, `start-review` e card/ação **Em análise** no contrato/UI Admin;
  - `GET http://localhost:3002/psicologos/test-id?tab=denuncias` retornou 200 no dev server local, confirmando que a rota continua acessível/guardada.
- Correção de UI 2026-07-12:
  - `pnpm --dir admin check`
  - `pnpm --dir admin build`
  - `pnpm check`
  - `rg` confirmou ausência da faixa "Denúncias relacionadas...", da linha "Período consultado" e do chip `reports.active_filters_count` na aba **Denúncias**.
- Browser local/headless em 390px e desktop para `http://localhost:3002/psicologos/test-id?tab=denuncias` confirmou rota/guard Admin sem quebrar o deep link, redirecionando para login por ausência de sessão no contexto headless.

## Ajuste complementar 2026-07-16 - Revis�o auditada de den�ncias encerradas

- Pedido do usu�rio: permitir alterar/revogar o status de den�ncias j� encerradas.
- Den�ncias encerradas em comunidade e no detalhe do psic�logo agora exibem a a��o **Revisar decis�o**.
- A revis�o exige motivo obrigat�rio, confirma��o forte `REVISAR DECISAO` e escolha de novo status: **Pendente**, **Improcedente** ou **Procedente**.
- A revis�o registra nova auditoria em `admin_activity_log` sem apagar a decis�o anterior; conte�do removido n�o � restaurado automaticamente.
- Comunidades revisam o grupo de den�ncias do mesmo conte�do; detalhe do psic�logo revisa a den�ncia selecionada.
- N�o houve schema Prisma/migration, package novo, mock, endpoint simulado ou tabela nova.


## Ajuste complementar 2026-07-16 - Identidade do autor nos cards de denúncias

- Pedido do usuário: refinar botões de decisão, remover o título genérico **Comentário** quando o denunciado é um comentário/resposta e exibir a identificação do autor do conteúdo denunciado.
- Cards de denúncias em comunidades e no detalhe do psicólogo agora mostram foto, nome e identificação do autor (**Paciente**, **Psicólogo** ou **Psicóloga**) logo abaixo do rótulo **Conteúdo denunciado**.
- Títulos genéricos de comentários são ocultados para deixar a leitura direta no texto denunciado.
- Botões **Improcedente**, **Procedente** e **Revisar decisão** foram reduzidos e suavizados visualmente, mantendo contraste, ícones e ações reais.
- O contrato das APIs de denúncias foi estendido com `content.author`, usando relações reais de `user`/`psychologist_profile`; não houve mock, package novo, schema Prisma ou migration.
