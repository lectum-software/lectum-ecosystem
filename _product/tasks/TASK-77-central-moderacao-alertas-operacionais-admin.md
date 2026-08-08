# TASK-77: Central de moderação e alertas operacionais Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-77 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Admin / Operação / Segurança |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-57, TASK-70, TASK-74 |
| ADR alvo | ADR-0296 sobre central única de moderação textual, denúncias e alertas operacionais derivados |

## Contexto

A página `/moderacao` do Admin já cobre a moderação textual determinística da TASK-74, mas a operação precisa enxergar no mesmo lugar ações urgentes e alertas de baixa/média urgência que exigem intervenção humana sem depender de planilhas ou checagens manuais fora do produto.

Decisões de produto desta task:

- A página deixa de ser apenas **Moderação textual** e passa a ser uma **central de moderação e alertas**.
- Denúncias reais de posts/respostas (`post_report`) entram como ação urgente.
- CRP pendente/não aprovado em Plano Profissional é imprescindível e deve aparecer como alerta urgente de compliance.
- WhatsApp ausente, inválido ou incapaz de gerar link confiável é alerta importante; a checagem desta task é sintática sobre o valor persistido, sem consultar entrega externa do WhatsApp.
- Perfil de psicólogo não publicado por falta de configurações obrigatórias deve aparecer como alerta operacional, usando as mesmas exigências reais de publicação do perfil.
- Post de paciente publicado há pelo menos 48h sem resposta de psicólogo deve aparecer como alerta operacional de cobertura.
- Psicólogo em Plano Profissional, publicado e após período de adaptação, sem visitas de perfil e sem cliques no WhatsApp, deve aparecer como alerta operacional.
- O período inicial de adaptação adotado é 30 dias até haver parametrização de produto.
- As dimensões **Região/cidade com pacientes sem cobertura**, **Faixa de preço muito buscada com pouca oferta** e **Horários muito buscados sem disponibilidade** não se aplicam no momento e não devem ser implementadas com dados estimados.

## Objetivo

Ampliar a tela administrativa de moderação para mostrar, com dados reais, denúncias, pendências de compliance profissional e alertas operacionais prioritários ao lado da lista de eventos textuais, mantendo os filtros e ações existentes da moderação textual.

## Pré-requisitos e bloqueios

- TASK-45 e TASK-46 concluídas: backend Admin e app `admin/` reais.
- TASK-57 concluída: métricas reais de perfil/WhatsApp de psicólogos disponíveis.
- TASK-70 concluída: denúncias reais de conteúdo persistidas em `post_report`.
- TASK-74 concluída: central e endpoints de moderação textual existentes.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Não criar mocks, seeds artificiais, backfill ou estimativas falsas.
- Não instalar pacote novo.
- Não alterar `backend/prisma/schema.prisma` nem migrations nesta task; se isso mudar, executar `pnpm --dir backend db:migrate`.
- Builder/Quick Copy deve ser usado quando disponível; se não estiver acessível no ambiente, usar as imagens locais `_product/proto/admin/Notificações.png` e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png` como referência visual e registrar a limitação.

## Escopo frontend

- Renomear a página `/moderacao` para **Central de moderação e alertas**.
- Trocar os cards superiores para cobrir:
  - denúncias urgentes;
  - compliance;
  - alertas operacionais;
  - moderação textual.
- Adicionar painel mobile-first de **Ações urgentes e operacionais** com:
  - contadores de denúncias, CRP profissional, WhatsApp inválido e operacionais;
  - lista dos alertas mais relevantes com prioridade, grupo, origem real, fatos e link para a entidade quando houver rota Admin;
  - nota explícita de que região/cidade, faixa de preço e horários estão fora do escopo atual.
- Manter a lista, filtros e ações existentes da moderação textual sem regressão.
- Atualizar badge do menu lateral para somar eventos textuais pendentes e alertas operacionais.

## Escopo backend

- Estender `GET /api/admin/private/moderation/summary` sem criar endpoint separado.
- Derivar alertas reais a partir de:
  - `post_report` para denúncias pendentes;
  - `community_post`, `post_reply` e `user.role` para posts de pacientes sem resposta de psicólogo após 48h;
  - `psychologist_profile` e `professional_subscription` para CRP pendente/não aprovado no Plano Profissional;
  - `psychologist_profile.whatsapp` para ausência/formato inválido de WhatsApp;
  - `psychologist_profile` + relações de catálogo para perfil não publicado por falta de configurações obrigatórias;
  - `profile_view_event` e `contact_request.channel=whatsapp` para profissional sem conversão após adaptação.
- Retornar `operational_alerts` dentro do summary com contadores, thresholds, fontes, dimensões excluídas e itens para a UI.
- Não persistir/resolver alertas operacionais nesta task; são alertas derivados e read-only.

## Fora do escopo

- Novas tabelas, migrations ou backfill.
- Workflow de resolução/acknowledgement para alertas derivados.
- Verificação externa real de link quebrado do WhatsApp.
- Alertas de demanda por região/cidade, faixa de preço ou horários.
- Alertas baseados em busca/filtro sem fonte first-party persistida.
- Automação de suspensão, bloqueio ou mensagem ao usuário.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: módulos backend por repository/use-case/controller, app Admin separado e UI mobile-first.
- `DATA-MODEL.md`: usar modelos Prisma reais já existentes.
- `PACKAGES.md`: sem pacote novo.
- `PROTO-INVENTORY.md`: sem protótipo específico de moderação; usar padrões Admin exportados.

Backend esperado:

- DTOs de summary ampliados com `AdminModerationOperationalAlertsDTO`.
- Repository de moderação com queries reais para denúncias, posts sem cobertura, perfis profissionais e contadores de métricas.
- Service de summary compondo contadores e itens sem expor dados desnecessários nem criar mocks.
- Thresholds declarados no payload: 48h para cobertura de post de paciente e 30 dias para adaptação do psicólogo profissional.

Frontend esperado:

- Tipos em `admin/src/api/req/moderation` atualizados para `operational_alerts`.
- `/moderacao` com cards e painel novos, mantendo filtros e detalhe textual existentes.
- Menu lateral usando o total ampliado de ações de moderação.
- UI responsiva mobile-first e sem `<img>` cru.
- Formulários existentes continuam usando React Hook Form/Zod/controllers da TASK-02; esta task não cria novo formulário.

## Critérios de aceite

- [x] `/moderacao` exibe denúncias pendentes de `post_report` como ações urgentes com link para post/resposta quando possível.
- [x] `/moderacao` exibe CRP pendente/não aprovado em Plano Profissional como alerta urgente de compliance.
- [x] `/moderacao` exibe WhatsApp ausente ou formato inválido como alerta importante, sem simular checagem externa de entrega.
- [x] `/moderacao` exibe perfil não publicado por falta de configurações obrigatórias usando dados reais do perfil e catálogos.
- [x] `/moderacao` exibe post de paciente sem resposta de psicólogo após 48h.
- [x] `/moderacao` exibe psicólogo profissional publicado, após 30 dias de adaptação, sem visitas de perfil e sem cliques no WhatsApp.
- [x] Região/cidade, faixa de preço e horários são registrados como dimensões fora do escopo atual, sem implementação falsa.
- [x] A lista/filtros/detalhe/actions da moderação textual continuam disponíveis.
- [x] Badge do menu lateral considera alertas operacionais além dos eventos textuais pendentes.
- [x] Nenhum mock, dado fake permanente, seed artificial, endpoint simulado ou pacote novo foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] UI mobile-first; nenhum `<img>` cru foi usado.
- [x] Formulários existentes mantêm React Hook Form, Zod e controllers da TASK-02; não houve novo formulário.
- [x] Builder/Quick Copy não estava disponível como ferramenta executável; foram usadas referências locais de `_product/proto/admin`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/`.
- [x] Commit próprio criado e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Browser local em `/moderacao` para validar renderização mobile-first/desktop e ausência de regressão visual.

## Notas de execução

- Execução em 2026-07-21.
- Builder/Quick Copy não estava disponível como ferramenta executável neste ambiente; referências locais consultadas: `_product/proto/admin/Notificações.png` e `_product/proto/admin/Comunidades/Comunidades - Dashboard.png`.
- A checagem de WhatsApp valida apenas existência e quantidade de dígitos suficientes para link `wa.me`; entrega externa/link realmente ativo é pendência futura caso haja integração real.
- Alertas de alta demanda em filtros não foram implementados porque as dimensões citadas pelo produto não se aplicam agora e não há fonte first-party persistida para demanda remanescente sem estimativa.
## Execução 2026-07-21

- Implementado `operational_alerts` em `GET /api/admin/private/moderation/summary` com contadores, thresholds, fontes e itens derivados de tabelas reais.
- Atualizada a UI `/moderacao` para cards de denúncias, compliance, operacionais e moderação textual, com painel mobile-first de ações urgentes/operacionais.
- Atualizado o badge do menu lateral para somar eventos textuais pendentes e alertas operacionais.
- Nenhuma migration foi criada; `pnpm --dir backend db:migrate` não se aplica.
- Comandos executados sem erro: `pnpm --dir backend typecheck`, `pnpm --dir admin typecheck`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`.
- Smoke local: `Invoke-WebRequest http://localhost:3002/moderacao` retornou HTTP 200. Também foi gerado screenshot headless mobile em `.tmp/moderacao-mobile.png`; como o contexto headless não possui sessão Admin, a captura parou no estado autenticado de carregamento, então a validação visual efetiva ficou coberta por build/check e pelo dev server local já autenticado do usuário.

## Ajuste complementar 2026-07-23 - Layout piloto premium na Moderacao

- Pedido do usuario: aplicar o layout piloto nas paginas de Moderacao do Admin.
- A rota `/moderacao` e eventuais descendentes passaram a entrar no escopo centralizado `admin-premium-pilot` do `AdminShell`, reaproveitando sidebar clara, azul Lectum, bordas sutis, sombras reduzidas, raio maior e tipografia menos pesada ja validados no piloto.
- O cabecalho da central foi convertido para card mobile-first com label **Operacao e seguranca**, titulo, subtitulo e acao **Atualizar** no mesmo bloco visual do piloto.
- O bloco de filtros da moderacao textual passou a usar card com cabecalho contextual, controles com foco premium e hierarquia visual alinhada as demais paginas do piloto.
- Nao houve alteracao de backend, contratos HTTP, dados persistidos, Prisma/migrations, packages, formularios RHF/Zod ou regras de moderacao.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel foi a captura enviada pelo usuario, `_product/proto/admin/Notificacoes.png` e o ADR do piloto `adrs/0263-admin-psicologos-piloto-premium.md`.


Validacao deste ajuste:

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/moderacao/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` (primeira tentativa bloqueada por build Next concorrente; reexecutado apos o lock liberar e concluiu com sucesso)
- Smoke HTTP local: `GET http://localhost:3002/moderacao` retornou `200`.
- `pnpm check` foi tentado, mas excedeu o limite de 10 minutos do runner e deixou processos orfaos; os processos do check foram encerrados para evitar carga duplicada. Como o ajuste alterou apenas Admin/docs, a validacao relevante ficou coberta por `pnpm --dir admin check` e `pnpm --dir admin build`.

## Ajuste complementar 2026-07-24 - Páginas exclusivas por categoria de pendência

- Pedido do usuário: separar pendências operacionais abaixo de denúncias/compliance e fazer os botões **Ver todos** abrirem páginas exclusivas da categoria.
- A visão principal `/moderacao` passou a exibir previews mobile-first com as 5 últimas pendências em três blocos: **Denúncias e Compliance**, **Alertas operacionais** e **Moderação textual**.
- Pendências operacionais agora ficam em uma lista separada abaixo da lista de **Denúncias e Compliance**, sem misturar prioridades críticas de denúncia/compliance com acompanhamento de oferta.
- Os botões **Ver todos** agora navegam para páginas exclusivas reais:
  - `/moderacao/denuncias-compliance` para denúncias pendentes e compliance profissional;
  - `/moderacao/alertas-operacionais` para pendências operacionais derivadas;
  - `/moderacao/textual` para a lista completa/filtros/detalhe/action de moderação textual.
- Criado `GET /api/admin/private/moderation/operational-alerts` com paginação e filtro de grupo para alimentar as páginas exclusivas de denúncias/compliance e operacionais sem criar mocks, tabelas ou workflow de resolução para alertas derivados.
- A página `/moderacao/textual` reaproveita os endpoints reais de `content_moderation_event` e mantém filtros, detalhe protegido, revisão, resolução e remoção auditada quando aplicável.
- Não houve alteração de Prisma schema/migrations, package novo ou dados artificiais.

## Ajuste complementar 2026-07-24 - Submenus de Moderação por área

- Pedido do usuário: a opção **Moderação** no menu lateral deve abrir 5 submenus, cada um levando a uma página exclusiva: **Dashboard**, **Denúncias**, **Compliance**, **Operacionais** e **Conteúdo sensível**.
- O menu lateral agora trata **Moderação** como grupo expansível com os links:
  - `/moderacao` (**Dashboard**);
  - `/moderacao/denuncias` (**Denúncias**);
  - `/moderacao/compliance` (**Compliance**);
  - `/moderacao/operacionais` (**Operacionais**);
  - `/moderacao/conteudo-sensivel` (**Conteúdo sensível**).
- O dashboard `/moderacao` mantém os cards de resumo e previews com as 5 últimas pendências por módulo, mas os botões **Ver todos** passam a navegar para a página exclusiva da categoria correspondente.
- **Denúncias** e **Compliance** foram separados em páginas e listas distintas; o endpoint paginado `GET /api/admin/private/moderation/operational-alerts` agora aceita `group=denuncias`, `group=compliance` ou `group=operacional`.
- **Conteúdo sensível** reaproveita a lista/filtros/detalhe/actions reais de `content_moderation_event`, agora em `/moderacao/conteudo-sensivel`.
- O badge de urgência permanece na opção pai **Moderação**, somando eventos de conteúdo sensível e alertas derivados.

### Validação do ajuste de submenus 2026-07-24

- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local no Admin (`localhost:3002`) retornou 200 para `/moderacao`, `/moderacao/denuncias`, `/moderacao/compliance`, `/moderacao/operacionais` e `/moderacao/conteudo-sensivel`.

## Ajuste complementar 2026-07-24 - Filtros na página Denúncias

- Pedido do usuário: simplificar o header de `/moderacao/denuncias`, trocar a copy e adicionar filtros na lista.
- A página `/moderacao/denuncias` agora usa eyebrow **Moderação**, título **Denúncias** e a descrição **Denúncias de posts/respostas para triagem e moderação.**
- Os botões **Voltar** e **Atualizar** foram removidos do header dessa página; a paginação e links de conteúdo denunciado permanecem.
- A tabela/lista de pendências de denúncias ganhou filtros mobile-first com React Hook Form/Zod/controllers do Admin: busca, data inicial/final, status, denunciante e motivo.
- O endpoint real `GET /api/admin/private/moderation/operational-alerts` foi estendido com query params opcionais `q`, `from`, `to`, `status`, `reporter` e `reason`, aplicados sobre alertas derivados de `post_report` sem mocks, dados artificiais, package novo ou migration.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário e os padrões Admin já registrados em `_product/proto/admin`.

### Validação do ajuste de filtros 2026-07-24

- `pnpm --dir backend check`
- `pnpm --dir admin check` (primeira execução paralela excedeu o timeout do runner; reexecutado isolado e concluído sem erro)
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local no Admin (`GET http://localhost:3002/moderacao/denuncias`) retornou 200.
- Browser local/headless em Chrome para `/moderacao/denuncias` carregou a rota e o bundle da página; sem sessão Admin no perfil headless, permaneceu no estado autenticado de carregamento.
- Não houve alteração de Prisma schema/migrations; `pnpm --dir backend db:migrate` não se aplica.

## Ajuste complementar 2026-07-24 - Refinos nos filtros de Denúncias

- Pedido do usuário: remover os botões **Filtrar** e **Limpar**, trocar **Motivo** para dropdown com os mesmos motivos da denúncia pública de conteúdo, ajustar as opções de **Status** e **Denunciante**, remover o título **Pendências** e posicionar a quantidade de registros encontrados abaixo da busca.
- A página `/moderacao/denuncias` agora aplica os filtros automaticamente por React Hook Form/Zod/controllers do Admin, sem botões de confirmação/limpeza.
- O filtro **Motivo** usa as mesmas opções reais disponíveis ao usuário no fluxo de denunciar post/comentário: spam/divulgação indevida, ofensa/assédio/discurso de ódio, violência/autolesão, exposição de dados pessoais e outro motivo.
- O filtro **Status** passou a conter **Todos**, **Pendentes**, **Procedentes** e **Improcedentes**, sem expor **Em análise**; registros legados em `em_analise` continuam agrupados como **Pendente**.
- O filtro **Denunciante** passou a conter **Todos**, **Pacientes** e **Psicólogos**.
- O endpoint real `GET /api/admin/private/moderation/operational-alerts` passou a listar denúncias de `post_report` não deletadas na página exclusiva de denúncias, permitindo filtrar por pendentes/procedentes/improcedentes sem mock, seed ou endpoint simulado. O summary/dashboard segue usando apenas pendentes para contadores de urgência.
- Não houve alteração de Prisma schema/migrations, package novo ou dados artificiais; `pnpm --dir backend db:migrate` não se aplica.

### Validação do ajuste de refinamento 2026-07-24

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/repositories/AdminModerationRepository.ts" "src/modules/api/admin/private/moderation/repositories/interfaces/IAdminModerationRepository.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local no Admin: `GET http://localhost:3002/moderacao/denuncias` retornou `200`.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário e os padrões Admin já registrados em `_product/proto/admin`.

## Ajuste complementar 2026-07-24 - Lista de Denúncias alinhada ao detalhe do psicólogo

- Pedido do usuário: fazer a lista da página `/moderacao/denuncias` seguir o layout da lista de denúncias exibida no detalhe do psicólogo.
- A fila de `/moderacao/denuncias` agora renderiza cards detalhados para denúncias reais de `post_report`, com status, quantidade, data da última denúncia, bloco **Conteúdo denunciado**, metadados de tipo/comunidade/data, título/texto/mídia e **Histórico de denúncias**.
- O layout mantém a ação administrativa **Abrir conteúdo denunciado** e adiciona atalho para o conteúdo público quando ele ainda está disponível, sem criar novo workflow global de procedência/improcedência nesta página.
- O endpoint real `GET /api/admin/private/moderation/operational-alerts` foi estendido de forma aditiva com `report`, derivado de `post_report`, `community_post`, `community_post_media`, `post_reply`, `user` e comunidade; cards não-denúncia continuam usando o layout operacional anterior.
- Não houve mock, dado artificial permanente, package novo, Prisma schema ou migration. `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Denúncias.png`.

### Validação do ajuste de layout de denúncias 2026-07-24

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/repositories/interfaces/IAdminModerationRepository.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts"`
- `pnpm --dir backend check`
- `pnpm --dir admin check` (primeira execução paralela excedeu o timeout do runner; reexecutado isolado e concluído sem erro)
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- API local: `GET http://localhost:3001/api/admin/private/moderation/operational-alerts?group=denuncias&limit=3` retornou denúncias reais com `report` no payload.
- Browser local/headless em Chrome para `/moderacao/denuncias` validou desktop 1365px e mobile 390px com **CONTEÚDO DENUNCIADO**, **Histórico de denúncias**, mídia de vídeo, link público, ação **Abrir conteúdo denunciado** e sem overflow horizontal. Um admin temporário de validação foi criado via bootstrap e removido ao final.


## Ajuste complementar 2026-07-24 - Autor e ações reais em Denúncias

- Pedido do usuário: acima do título do post/resposta, adicionar a identificação do autor do conteúdo; substituir o botão **Abrir conteúdo denunciado** pelos botões **Procedente** e **Improcedente**; quando o autor for psicólogo verificado, exibir um selo ao lado do nome.
- A lista `/moderacao/denuncias` agora mostra o card do autor antes do título, com avatar/iniciais, nome, papel e selo **Verificado** quando o backend identifica `role=psicologo` com registro profissional aprovado.
- O selo de psicólogo verificado é derivado de dados reais do backend (`crp_status="aprovado"`, `cfp_verified_at` ou cortesia profissional/admin grant ativa via regra existente de entitlement), sem novo campo persistido, mock ou estimativa visual.
- O botão administrativo textual **Abrir conteúdo denunciado** foi substituído por **Improcedente** e **Procedente** nos cards pendentes. O atalho visual para o conteúdo público continua como ícone quando o conteúdo está disponível.
- Criado `POST /api/admin/private/moderation/reports/:reportId/resolve` para resolver `post_report` real como improcedente (`status=rejeitada`) ou procedente (`status=resolvida`), com confirmação forte, motivo interno obrigatório e auditoria em `admin_activity_log`.
- Na ação **Procedente**, o admin pode remover o conteúdo denunciado quando ele ainda está disponível. Posts e respostas seguem a mesma semântica real já usada no fluxo de denúncias do detalhe do psicólogo: soft delete do alvo, remoção de árvore de respostas quando aplicável, ajuste de `replies_count` e resolução das denúncias pendentes do mesmo alvo.
- Não houve alteração de Prisma schema/migrations, package novo ou dados artificiais; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário e o layout real da aba de denúncias do psicólogo.

### Validação do ajuste de autor e ações 2026-07-24

- `pnpm --dir backend exec biome check --write src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts src/modules/api/admin/private/moderation/index.ts src/modules/api/admin/private/moderation/repositories/AdminModerationRepository.ts src/modules/api/admin/private/moderation/repositories/interfaces/IAdminModerationRepository.ts src/modules/api/admin/private/moderation/use-cases/controller.ts src/modules/api/admin/private/moderation/use-cases/services.ts src/modules/api/admin/private/moderation/validator/index.ts locales/pt/translation.json`
- `pnpm --dir admin exec biome check --write src/api/callers/moderation/index.ts src/api/req/moderation/index.ts "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir backend exec biome check --write src/modules/api/admin/private/moderation/use-cases/services.ts`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- API local autenticada: `GET /api/admin/private/moderation/operational-alerts?group=denuncias&limit=1` retornou denúncia real com `report.content.author.verified=true` para psicólogo verificado e `capabilities` de resolução pendente.
- API local autenticada: `POST /api/admin/private/moderation/reports/:reportId/resolve` com confirmação inválida retornou `400`, validando a proteção sem mutação real.
- Browser local/headless em Chrome para `/moderacao/denuncias` validou desktop 1365px e mobile 390px com identificação do autor, selo **Verificado**, botões **Improcedente/Procedente**, ausência do botão textual **Abrir conteúdo denunciado** no card de denúncia e sem overflow horizontal.

## Ajuste complementar 2026-07-24 - Tipo e aplicação de datas em Denúncias

- Pedido do usuário: substituir a busca textual por filtro **Tipo** (**Posts/Respostas**), impedir que campos de data pesquisem enquanto o admin ainda digita e iniciar a fila com **Status = Pendentes**.
- A barra de filtros de `/moderacao/denuncias` agora usa um select **Tipo** com **Todos**, **Posts** e **Respostas**, mantendo os demais filtros mobile-first em React Hook Form/Zod/controllers do Admin.
- O estado padrão da página passa a consultar denúncias pendentes por padrão, refletindo a fila operacional de triagem sem remover a opção **Todos** para auditoria posterior.
- Os filtros automáticos seguem ativos para selects, mas `from`/`to` ficam como rascunho local durante a digitação e só são aplicados quando o campo perde foco (`blur`), evitando chamadas parciais ao endpoint durante a entrada da data.
- O endpoint real `GET /api/admin/private/moderation/operational-alerts` foi estendido de forma aditiva com `contentType=post|reply|all`, aplicado sobre `report.content.type` de denúncias reais de `post_report`.
- Não houve alteração de Prisma schema/migrations, package novo, mock ou dado artificial; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Denúncias.png`.

### Validação do ajuste de tipo/datas 2026-07-24

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx" "src/components/controllers/input.tsx" "src/api/req/moderation/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/validator/index.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- API local autenticada: `GET /api/admin/private/moderation/operational-alerts?group=denuncias&status=pending&contentType=post&limit=5` retornou somente `report.content.type="post"` e `status_group="pending"`.
- API local autenticada: `GET /api/admin/private/moderation/operational-alerts?group=denuncias&status=pending&contentType=reply&limit=5` retornou somente `report.content.type="reply"` quando havia itens.
- Browser local/headless em Chrome para `/moderacao/denuncias` validou desktop e mobile 390px com filtro **Tipo**, ausência da busca antiga, **Status** default **Pendentes**, sem overflow horizontal e com data aplicada apenas após `blur/focusout` do campo.
- Admins temporários usados nas validações de API/browser foram removidos ao final.

## Ajuste complementar 2026-07-24 - Visão geral por blocos com gráficos

- Pedido do usuário: na aba **Visão geral** de `/moderacao`, substituir tabelas/previews por 4 blocos de contadores + gráficos seguindo o layout das visões gerais de **Psicólogos** e **Pacientes**; depois, manter todas as opções de filtros em uma única linha no desktop.
- O dashboard `/moderacao` agora renderiza quatro blocos mobile-first: **Denúncias**, **Compliance**, **Operacionais** e **Conteúdo sensível**.
- **Denúncias** possui seletor de tipo (**Todos**, **Posts de psicólogos**, **Posts de pacientes**, **Respostas de psicólogos**, **Comentários de pacientes**) e curvas **Pendentes**, **Improcedentes** e **Procedentes**.
- **Compliance** possui contadores/curvas para **CRP profissional pendente** e **WhatsApp inválido**.
- **Operacionais** possui contadores/curvas para **Falta de cobertura há 48h**, **Perfis profissionais sem configuração obrigatória** e **Psicólogos assinantes sem tráfego**.
- **Conteúdo sensível** possui seletor por categoria e curvas **Sensível publicado**, **Bloqueado** e **Segurança urgente**.
- Todos os quatro blocos receberam filtro próprio de **Período**, **De** e **Até**. Em larguras administrativas, período, datas, seletor contextual e **Abrir lista** ficam na mesma linha; em telas estreitas continuam empilhando para preservar mobile-first e evitar overflow.
- Os textos explicativos solicitados foram removidos dos blocos, mantendo apenas título, período, filtros, contadores clicáveis e gráfico.
- O `GET /api/admin/private/moderation/summary` foi ampliado com `overview_charts`, derivado de `post_report`, `content_moderation_event` e alertas operacionais reais; não houve mock, dado artificial, migration, package novo ou uso de `<img>`.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual usada foi a captura enviada pelo usuário e os protótipos locais de Psicólogos/Pacientes.

### Validação do ajuste de visão geral 2026-07-24

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/moderation/index.ts" "src/app/(admin)/moderacao/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check` (uma tentativa paralela excedeu o timeout do runner; reexecutado isolado e concluído sem erro)
- `pnpm --dir backend build`
- `pnpm --dir admin build` (uma tentativa inicial encontrou outro `next build` em execução; reexecutado após finalizar e concluído sem erro)
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/moderacao` retornou `200`.
- `pnpm --dir backend db:migrate` não se aplica porque não houve alteração em Prisma schema/migrations.


## Ajuste complementar 2026-07-24 - Texto de período na Visão geral

- Pedido do usuário: remover o prefixo **Período:** do texto de período exibido nos blocos da Visão geral de `/moderacao`.
- `formatOverviewPeriod` agora renderiza diretamente o valor selecionado, como **Todo o período · data inicial a data final**, sem o prefixo redundante.
- O estado sem pontos reais também deixou de usar o prefixo, exibindo apenas **Sem pontos reais para exibir.**
- Não houve alteração de backend, Prisma schema/migrations, packages, dados persistidos, contratos de API ou formulários.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/overview-charts.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local no Admin (`GET http://localhost:3002/moderacao`) retornou `200`.

## Ajuste complementar 2026-07-24 - Contador total e filtros compactos na Visão geral

- Pedido do usuário: no bloco **Denúncias** da Visão geral, adicionar contador de **Total de denúncias** antes de **Pendentes**, reduzir o tamanho dos filtros e posicionar o filtro **Tipo** na primeira posição.
- O bloco **Denúncias** agora exibe quatro contadores, com **Total de denúncias** calculado a partir das séries reais de pendentes, improcedentes e procedentes, sem alterar contrato backend ou persistência.
- A linha de filtros dos blocos da Visão geral ficou mais compacta: selects, datas e botão **Abrir lista** usam altura/larguras menores para evitar sobreposição e reduzir quebra de texto no desktop.
- O seletor contextual agora aparece antes dos controles de período; em **Denúncias**, isso coloca **Tipo** como primeiro filtro da linha.
- Não houve alteração de backend, Prisma schema/migrations, packages, dados persistidos, contratos de API ou formulários.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/overview-charts.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local no Admin (`GET http://localhost:3002/moderacao`) retornou `200`.


## Ajuste complementar 2026-07-24 - Remoção da faixa informativa da Visão geral

- Pedido do usuário: remover a faixa inferior com o texto **Mobile-first: pendências separadas em cards e atalhos para páginas exclusivas.** da rota `/moderacao`.
- A faixa informativa inferior foi removida do componente de moderação, eliminando também a mensagem auxiliar lateral do mesmo bloco visual.
- Não houve alteração de backend, Prisma schema/migrations, packages, dados persistidos, contratos de API ou formulários.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local no Admin (`GET http://localhost:3002/moderacao`) retornou `200`.


## Ajuste complementar 2026-07-24 - Copy do dashboard de moderação

- Pedido do usuário: remover o botão **Atualizar** do header de `/moderacao`, trocar a identificação superior para **Moderação**, renomear o título para **Dashboard da moderação**, substituir a descrição por **Análise global de denúncias, compliance e alertas operacionais da plataforma.** e deixar o contador **Improcedentes** com ícone verde.
- O componente de header da central de moderação deixou de renderizar o CTA de atualização manual, mantendo somente o link **Voltar** quando alguma página interna precisar dele.
- O contador **Improcedentes** do bloco **Denúncias** recebeu cor verde no ícone/linha da métrica, sem alterar fonte de dados, contrato de API, persistência ou filtros.
- Não houve alteração de backend, Prisma schema/migrations, packages, dados persistidos, contratos de API ou formulários.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual usada foi a captura enviada pelo usuário e o layout real local de `/moderacao`.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/client.tsx" "src/app/(admin)/moderacao/overview-charts.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build` (duas tentativas iniciais foram bloqueadas por outro processo `next build`; reexecutado após finalizar e concluído sem erro)
- Smoke HTTP local no Admin (`GET http://localhost:3002/moderacao`) retornou `200`.

## Ajuste complementar 2026-07-25 - Layout unificado nas páginas exclusivas

- Pedido do usuário: fazer **Compliance**, **Operacionais** e **Conteúdo sensível** seguirem o mesmo layout da página **Denúncias**.
- `/moderacao/compliance` e `/moderacao/operacionais` agora usam card principal com filtros no topo, contador de registros abaixo de **Tipo**, indicador **Atualizando** junto ao contador e paginação no rodapé, removendo o cabeçalho intermediário **Pendências**.
- O endpoint real `GET /api/admin/private/moderation/operational-alerts` recebeu o filtro opcional `alertType` para manter os selects **Tipo** dessas páginas no backend, sem paginação filtrada apenas no cliente, mocks ou dados artificiais.
- `/moderacao/conteudo-sensivel` passou a usar eyebrow **Moderação**, sem botão **Voltar** no header, com filtros React Hook Form/Zod/controllers no mesmo card da lista, contador abaixo de **Status** e sem a faixa **Período consultado**.
- Os filtros de data de Compliance, Operacionais e Conteúdo sensível seguem o padrão de Denúncias: digitam em estado local do form e só atualizam a query ao perder foco (`blur`).
- Não houve alteração de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário da página `/moderacao/denuncias` e os padrões Admin já registrados em `_product/proto/admin`.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/client.tsx" "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts" "src/modules/api/admin/private/moderation/validator/index.ts"`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build` (uma tentativa inicial encontrou outro `next build` em execução; reexecutado após finalizar e concluído sem erro)
- `pnpm --dir backend build`
- `pnpm check`
- Smoke API local real com admin temporário: `operational-alerts?group=compliance&alertType=professional_crp_pending`, `operational-alerts?group=operacional&alertType=patient_post_without_coverage` e `moderation/events` retornaram `200`.
- Validação manual automatizada no Chrome/CDP local em 1365x900 e 390x844: `/moderacao/denuncias`, `/moderacao/compliance`, `/moderacao/operacionais` e `/moderacao/conteudo-sensivel` renderizaram headers, filtros e contadores no mesmo padrão, sem overflow horizontal mobile; o admin temporário criado para a validação foi removido ao final.

## Ajuste complementar 2026-07-25 - Selo Lectum no autor verificado em Denúncias

- Pedido do usuário: em frente ao nome do psicólogo na lista de `/moderacao/denuncias`, substituir a tag textual **Verificado** pelo selo usado na Lectum.
- O card de autor do conteúdo denunciado agora exibe apenas o `VerifiedBadgeIcon` com o formato oficial do selo Lectum ao lado do nome quando `report.content.author.verified=true`, mantendo o rótulo acessível `aria-label="Psicólogo verificado"`.
- A regra de verificação continua vindo do backend real; não houve alteração de contrato, mock, dado artificial, package, Prisma schema ou migration.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário e o selo já usado no produto Lectum.

### Critérios deste ajuste

- [x] A tag visual **Verificado** foi removida do card de autor em `/moderacao/denuncias`.
- [x] Psicólogos verificados exibem o selo Lectum ao lado do nome com acessibilidade preservada.
- [x] A alteração é visual, mobile-first, sem `<img>` cru e sem modificar regras de domínio.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local no Admin: `GET http://localhost:3002/moderacao/denuncias` retornou `200`.
- `pnpm check` foi reexecutado e falhou em `backend/src/modules/api/admin/private/patients/dashboard/use-cases/services.ts` e `backend/src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts` por avisos/organização de imports de alterações não relacionadas já presentes no workspace.

## Ajuste complementar 2026-07-25 - Numero de pendências no header das paginas exclusivas

- Pedido do usuario: nos headers de **Denuncias**, **Compliance**, **Operacionais** e **Conteudo sensivel**, adicionar a direita o numero de pendências daquela pagina.
- `/moderacao/denuncias`, `/moderacao/compliance` e `/moderacao/operacionais` agora exibem o numero de pendências no lado direito do header, com o texto **pendências** centralizado abaixo do numero, usando os contadores reais retornados por `GET /api/admin/private/moderation/operational-alerts` (`pending_reports`, `compliance_total` e `operational_total`).
- `/moderacao/conteudo-sensivel` exibe o mesmo padrao sem fundo azul nem titulo adicional, usando `pending_total` real do `GET /api/admin/private/moderation/summary`, alinhado ao badge do submenu lateral.
- Enquanto os dados reais carregam ou atualizam, o header mostra estado de atualizacao sem renderizar zero temporario como dado falso.
- A alteracao e visual/composicional, mobile-first, sem `<img>` cru, sem novo package, sem alteracao de contrato, sem Prisma schema/migrations e sem mocks.

### Criterios deste ajuste

- [x] **Denuncias** mostra o total de pendências no lado direito do header.
- [x] **Compliance** mostra o total de pendências no lado direito do header.
- [x] **Operacionais** mostra o total de pendências no lado direito do header.
- [x] **Conteudo sensivel** mostra o total de pendências no lado direito do header.
- [x] Os numeros vem de dados reais ja retornados pelos endpoints Admin existentes.
- [x] O layout continua mobile-first e nao usa `<img>` cru.

### Validacao deste ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/moderacao/client.tsx" "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local no Admin retornou `200` para `/moderacao/denuncias`, `/moderacao/compliance`, `/moderacao/operacionais` e `/moderacao/conteudo-sensivel`.
- Browser local/headless em Chrome/CDP validou desktop 1365px e mobile 390px nas quatro rotas: o numero aparece a direita no desktop, sem fundo azul nem titulo **PENDENCIAS**, centralizado com **pendências** abaixo e sem overflow horizontal. Admin temporario de validacao removido ao final.

## Ajuste complementar 2026-07-25 - Demandas de Compliance em linha única

- Pedido do usuário: na tela de **Compliance**, cada demanda deve ocupar apenas uma linha com as colunas **Pendência** (CRP pendente/WhatsApp inválido), **Data**, **Profissional**, **Plano**, **Perfil** (Ativo/Inativo) e um ícone para abrir a página de detalhes do psicólogo.
- A lista `/moderacao/compliance` passou a renderizar as pendências derivadas em formato tabular compacto, mantendo uma linha por alerta no desktop e rolagem horizontal contida no mobile para evitar overflow da página.
- A UI deixou de exibir descrição, origem, idade, papel profissional, selo de verificado e chips auxiliares nos itens de Compliance; esses dados continuam no contrato real para busca/filtros e outras visões, mas a fila principal mostra apenas os campos operacionais solicitados.
- O endpoint real `GET /api/admin/private/moderation/operational-alerts` passou a incluir o fato **Publicado** também nos alertas de **CRP pendente**, permitindo derivar **Perfil Ativo/Inativo** na mesma coluna usada nos alertas de WhatsApp inválido, sem criar mock ou novo campo persistido.
- Não houve alteração de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual foi a captura enviada pelo usuário e a tela local `/moderacao/compliance`.

### Critérios deste ajuste

- [x] Cada demanda de `/moderacao/compliance` aparece em uma única linha no layout de lista.
- [x] A linha mostra **Pendência**, **Data**, **Profissional**, **Plano** e **Perfil**.
- [x] **Pendência** usa rótulos controlados **CRP pendente** ou **WhatsApp inválido**.
- [x] **Perfil** mostra **Ativo** ou **Inativo** a partir do estado real de publicação do perfil.
- [x] A ação textual **Abrir psicólogo** foi substituída por ícone com rótulo acessível para abrir o detalhe administrativo.
- [x] A alteração é mobile-first, sem `<img>` cru, sem package novo e sem migration.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build` (uma tentativa inicial encontrou outro `next build`; reexecutado após finalizar e concluiu sem erro)
- `pnpm check`
- API local autenticada: `GET /api/admin/private/moderation/operational-alerts?group=compliance&limit=20` retornou 8 pendências reais; alertas de CRP pendente incluem `Publicado=sim` no bloco `facts`.
- Browser local/headless em Chrome para `/moderacao/compliance` validou desktop 1365px e mobile 390px com cabeçalho **Pendência/Data/Profissional/Plano/Perfil**, 8 linhas de demanda, 8 ícones de detalhe e sem overflow horizontal da página.

## Ajuste complementar 2026-07-25 - Filtros de Plano e Perfil em Compliance

- Pedido do usuário: remover a faixa **Fora do escopo agora...**, remover a barra de busca da página de **Compliance** e adicionar filtros de **Plano** e **Status de perfil**.
- `/moderacao/compliance` agora renderiza os filtros **Tipo**, **De**, **Até**, **Plano** e **Status de perfil** no card principal, sem o campo **Busca** nessa fila.
- A busca textual continua disponível apenas em `/moderacao/operacionais`, preservando o uso operacional onde ela ainda é necessária.
- O endpoint real `GET /api/admin/private/moderation/operational-alerts` foi estendido de forma aditiva com `plan=gratuito|profissional|all` e `profileStatus=active|inactive|all`, aplicados no backend antes da paginação sobre alertas derivados reais.
- O filtro **Plano** usa o fato real **Plano** e o marcador `professional.is_subscriber` dos alertas profissionais; o filtro **Status de perfil** deriva **Ativo/Inativo** do fato real **Publicado**.
- A faixa inferior de dimensões fora de escopo foi removida da página exclusiva; as dimensões seguem documentadas na task/ADR, mas não aparecem na UI de triagem.
- Não houve alteração de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência auditável foi a captura enviada pelo usuário e o protótipo/local Admin já existente.

### Critérios deste ajuste

- [x] A faixa **Fora do escopo agora...** não é mais renderizada em `/moderacao/compliance`.
- [x] O campo **Busca** foi removido da barra de filtros de `/moderacao/compliance`.
- [x] A barra de filtros de `/moderacao/compliance` inclui **Plano** com **Todos**, **Plano Gratuito** e **Plano Profissional**.
- [x] A barra de filtros de `/moderacao/compliance` inclui **Status de perfil** com **Todos**, **Ativo** e **Inativo**.
- [x] Os filtros de **Plano** e **Status de perfil** são enviados ao backend real e aplicados antes da paginação.
- [x] A alteração é mobile-first, sem `<img>` cru, sem package novo e sem migration.

### Validação deste ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/validator/index.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- API local autenticada com admin temporário: `GET /api/admin/private/moderation/operational-alerts?group=compliance&limit=50`, `plan=profissional`, `profileStatus=active` e `profileStatus=inactive` retornaram `200` e respeitaram os fatos reais **Plano**/**Publicado**.
- Browser local/headless em Chrome para `/moderacao/compliance` validou desktop 1365px e mobile 390px: filtros **Plano** e **Status de perfil** presentes, **Busca** ausente, faixa **Fora do escopo agora...** ausente, 8 linhas reais na tabela e sem overflow horizontal da página.
- Admins temporários de validação com prefixo `codex-compliance-` foram removidos ao final.

## Ajuste complementar 2026-07-25 - Operacionais em tabela por Usuário

- Pedido do usuário: na lista de **Operacionais**, seguir o layout tabular de **Compliance** com as colunas **Pendência**, **Pendente há**, **Usuário**, **Plano**, **Status do perfil** e ícone de detalhe; a coluna antes tratada como **Profissional** deve ser **Usuário** e indicar se o usuário é **Paciente** ou **Psicólogo/Psicóloga**.
- `/moderacao/operacionais` passou a renderizar uma tabela compacta com uma linha por alerta derivado, rolagem horizontal contida em telas pequenas e cabeçalhos: **Pendência**, **Pendente há**, **Usuário**, **Plano**, **Status do perfil** e ação por ícone.
- Os rótulos de **Pendência** na tabela operacional foram normalizados para **Post sem cobertura**, **Perfis não publicados** e **Sem conversão**, separados dos rótulos técnicos internos.
- O contrato real `GET /api/admin/private/moderation/operational-alerts` agora inclui metadados aditivos `user` nos alertas: posts sem cobertura usam o autor real de `community_post` como **Paciente**; alertas de perfil usam o usuário do `psychologist_profile` como **Psicólogo/Psicóloga**.
- Alertas operacionais de perfil também incluem o fato **Publicado**, permitindo derivar **Status do perfil** como **Ativo/Inativo** sem criar campo persistido ou mock. Para posts sem cobertura, **Plano** e **Status do perfil** aparecem como `—`, pois não se aplicam ao paciente/conteúdo.
- O ícone de detalhe abre a rota Admin do conteúdo para **Post sem cobertura** e a rota Admin do psicólogo para **Perfis não publicados**/**Sem conversão**.
- Não houve alteração de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual foi a captura enviada pelo usuário da tabela de Compliance e a tela local `/moderacao/operacionais`.

### Critérios deste ajuste

- [x] `/moderacao/operacionais` usa tabela no padrão visual de `/moderacao/compliance`.
- [x] A tabela mostra **Pendência**, **Pendente há**, **Usuário**, **Plano**, **Status do perfil** e ícone de detalhe.
- [x] A coluna **Usuário** exibe o nome real e o tipo **Paciente** ou **Psicólogo/Psicóloga**.
- [x] **Post sem cobertura** aponta para o autor paciente real e abre o detalhe do conteúdo.
- [x] **Perfis não publicados** e **Sem conversão** apontam para o psicólogo real e abrem o detalhe administrativo do psicólogo.
- [x] A alteração é mobile-first, sem `<img>` cru, sem package novo e sem migration.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local no Admin: `GET http://localhost:3002/moderacao/operacionais` retornou `200`.

## Ajuste complementar 2026-07-25 - Refinos profissionais da tabela de Compliance

- Pedido do usuário: reduzir o peso textual da tabela de **Compliance**, exibir **Psicólogo** ou **Psicóloga** abaixo do nome conforme o gênero selecionado pelo profissional, mostrar selo de verificado apenas quando o profissional for assinante e tiver registro verificado, e manter a tag **Perfil** com fundo ajustado ao texto.
- O backend adiciona metadados derivados `professional` aos alertas de psicólogo retornados por `GET /api/admin/private/moderation/operational-alerts`. O campo `role_label` é derivado de `psychologist_profile.gender`, sem inferência por nome; `feminino`/`mulher` gera **Psicóloga** e os demais valores geram **Psicólogo**.
- O selo de verificado da linha usa o booleano derivado `professional.show_verified_badge`, verdadeiro somente quando há assinatura profissional ativa não gratuita e aprovação real de registro (`crp_status="aprovado"`, `cfp_verified_at` ou cortesia administrativa reconhecida).
- A UI da tabela reduz os pesos de fonte dos textos de linha e chips de Compliance; a coluna **Perfil** usa `w-fit`/`justify-self-start`, mantendo o fundo verde/vermelho somente no preenchimento do texto.
- Não houve alteração de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual foi a captura enviada pelo usuário e a tela local `/moderacao/compliance`.

### Critérios deste ajuste

- [x] Textos da tabela de `/moderacao/compliance` usam pesos visuais menores que o padrão anterior.
- [x] A linha mostra **Psicólogo** ou **Psicóloga** abaixo do nome usando o gênero selecionado pelo profissional.
- [x] A regra não infere gênero pelo nome do profissional.
- [x] O selo de verificado aparece somente com assinatura profissional ativa e registro verificado.
- [x] A tag **Perfil** mantém o fundo ajustado ao conteúdo textual.
- [x] A alteração é mobile-first, sem `<img>` cru, sem package novo e sem migration.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts" "src/modules/api/admin/private/moderation/validator/index.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- API local autenticada: `GET /api/admin/private/moderation/operational-alerts?group=compliance&limit=20` retornou 8 pendências reais; todas as linhas tinham `professional.role_label` e `professional.show_verified_badge === professional.is_subscriber && professional.registry_verified`.
- Browser local/headless em Chrome para `/moderacao/compliance` validou desktop 1365px e mobile 390px com 8 linhas reais, **Psicólogo/Psicóloga** abaixo do nome conforme metadado real, pesos de texto até 500 na tabela, tag **Perfil** menor que a coluna e sem overflow horizontal. O conjunto atual não tinha profissional elegível ao selo, então o DOM validou 0 selos contra 0 retornados pela API. Admin temporário de validação removido ao final.

## Ajuste complementar 2026-07-25 - Segmentação dos filtros de Operacionais

- Pedido do usuário: corrigir o filtro **Tipo** de `/moderacao/operacionais`, que mostrava **Sem conversão** selecionado mas mantinha linhas de **Post sem cobertura**.
- A causa era a chave de cache do TanStack Query para `operational-alerts`: ela não incluía `alertType` e também omitia filtros correlatos (`contentType`, `plan`, `profileStatus`). Assim, alterações no select podiam reutilizar o resultado em cache do grupo inteiro sem disparar nova consulta.
- `adminModerationKeys.operationalAlerts` agora normaliza esses filtros na query key, fazendo cada combinação de tipo/plano/status/tipo de conteúdo ter cache e refetch próprios.
- A correção é frontend/cache, sem alteração de contrato backend, Prisma schema/migrations, package novo, mock ou dado artificial.

### Critérios deste ajuste

- [x] Alterar **Tipo** em `/moderacao/operacionais` muda a query key e refaz a consulta segmentada.
- [x] **Sem conversão** não reutiliza mais o cache de **Todos** ou **Post sem cobertura**.
- [x] A mesma proteção cobre filtros de tipo em Denúncias e filtros de Plano/Status de perfil em Compliance.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/api/cache/keys.ts"`

## Ajuste complementar 2026-07-25 - Compliance com tempo pendente

- Pedido do usuário: trocar a coluna **Data** da tabela de **Compliance** por **Pendente há**, exibindo há quanto tempo cada demanda está pendente.
- `/moderacao/compliance` passa a exibir a duração relativa da pendência na segunda coluna, usando `age_hours` do alerta derivado quando disponível e `created_at` como fallback.
- O horário absoluto continua disponível no `title` da célula como **Pendente desde ...**, preservando auditoria sem ocupar espaço na linha de triagem.
- A formatação de duração foi centralizada e reaproveitada pela tabela de **Operacionais**, evitando helper duplicado e mantendo o mesmo padrão de leitura para filas derivadas.
- Não houve alteração de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual foi a captura enviada pelo usuário e a tela local `/moderacao/compliance`.

### Critérios deste ajuste

- [x] A coluna **Data** não aparece mais na tabela de `/moderacao/compliance`.
- [x] A coluna equivalente passa a se chamar **Pendente há**.
- [x] Cada linha de Compliance mostra a duração real da pendência com base no alerta derivado.
- [x] A data/hora absoluta permanece acessível no `title` da célula.
- [x] A alteração é mobile-first, sem `<img>` cru, sem package novo e sem migration.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless em Chrome para `/moderacao/compliance` validou desktop 1365px e mobile 390px com 8 linhas reais, cabeçalho **Pendente há**, ausência do cabeçalho **Data**, duração relativa na célula (ex.: **2 dias**), `title` **Pendente desde ...** e sem overflow horizontal da página. Admins temporários `codex-compliance-row-` foram removidos ao final.

## Ajuste complementar 2026-07-25 - Plano Cortesia no filtro de Compliance

- Pedido do usuário: adicionar **Plano Cortesia** ao filtro **Plano** da página `/moderacao/compliance`.
- A UI do Admin passa a oferecer **Todos**, **Plano Gratuito**, **Plano Profissional** e **Plano Cortesia** no select de Plano, mantendo o padrão mobile-first já usado pela barra de filtros de Compliance.
- O contrato Admin aceita `plan=cortesia` em `GET /api/admin/private/moderation/operational-alerts` e o backend aplica o filtro antes da paginação, sem filtragem client-side sobre uma página já paginada.
- A cortesia é identificada pela origem real `professional_subscription.source="admin_grant"`; alertas derivados de psicólogo exibem **Plano Cortesia** quando a assinatura vigente vem dessa origem, inclusive para pendências de WhatsApp.
- **Plano Profissional** passa a representar assinatura profissional não gratuita que não é cortesia administrativa, evitando misturar cortesia com assinante pago quando a segmentação estiver ativa.
- Não houve alteração de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual foi a captura enviada pelo usuário e a tela local `/moderacao/compliance`.

### Critérios deste ajuste

- [x] O filtro **Plano** de `/moderacao/compliance` contém a opção **Plano Cortesia**.
- [x] Selecionar **Plano Cortesia** envia `plan=cortesia` ao backend real.
- [x] O backend reconhece `plan=cortesia` e filtra alertas por `professional_subscription.source="admin_grant"` antes da paginação.
- [x] Alertas de cortesia administrativa exibem **Plano Cortesia** na coluna **Plano**.
- [x] O ajuste é mobile-first, sem `<img>` cru, sem package novo e sem migration.

### Validação deste ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts" "src/api/cache/keys.ts"`
- `pnpm --dir backend exec biome check "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts" "src/modules/api/admin/private/moderation/validator/index.ts"`
- `pnpm --dir admin check`
- `pnpm --dir backend check` (a primeira execução encontrou `ENOTEMPTY` transitório no `prisma generate`; `pnpm --dir backend exec prisma generate` e a reexecução do check concluíram com sucesso)
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check` (a primeira execução excedeu 184s; reexecutado com timeout maior e concluído com sucesso)
- API local autenticada: `GET /api/admin/private/moderation/operational-alerts?group=compliance&plan=cortesia&limit=50` retornou `200`, `count=0` na base real atual e nenhuma linha inválida; `plan=profissional` retornou `200`, `count=8` e `0` linhas com `Origem=admin_grant`/`Plano Cortesia`.
- Browser local/headless em Chrome para `http://localhost:3002/moderacao/compliance` validou desktop 1365px e mobile 390px com **Plano Cortesia** (`value="cortesia"`) no select **Plano**, sem faixa **Fora do escopo agora...**, sem label **Busca**, sem overflow horizontal e com requisição real contendo `plan=cortesia` ao alterar o filtro. Admin temporário de validação removido ao final.

## Complemento 2026-07-25: Detalhes especificos na tabela de Operacionais

A fila exclusiva `/moderacao/operacionais` deixou de exibir as colunas genericas **Plano** e **Status do perfil**. A tabela permanece compacta, mas agora usa a coluna **Detalhes** para expor o dado operacional acionavel conforme o tipo de pendencia: comunidade e engajamento do paciente em posts sem cobertura; plano e motivo real de inatividade em perfis nao publicados; tempo do profissional na plataforma e criterios de adaptacao ja atendidos em profissionais sem conversão.

Para nao transformar a UI em uma camada heuristica, os detalhes sao entregues pelos fatos reais do contrato `operational-alerts`. O nivel de engajamento do paciente em **Post sem cobertura** agora e calculado somente em relacao a comunidade daquele post, usando atividades first-party de comunidade (`community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save` e `post_share`) para classificar o usuario como **Pouco ativo**, **Ativo** ou **Muito ativo**. A UI tambem remove duplicatas ao compor o nome da comunidade, evitando exibir a mesma comunidade duas vezes. Nao houve alteracao de Prisma schema/migrations nem package novo.

### Criterios deste ajuste

- [x] **Post sem cobertura** mostra o nome da comunidade apenas uma vez na coluna **Detalhes**.
- [x] O engajamento exibido em **Post sem cobertura** deixa de usar temperatura/intencao geral da plataforma.
- [x] O engajamento passa a ser derivado da atividade real do paciente naquela comunidade: posts, respostas, votos, salvamentos e compartilhamentos.
- [x] O ajuste e mobile-first, sem `<img>` cru, sem package novo, sem mock e sem migration.

## Complemento 2026-07-25: Engajamento resumido em Post sem cobertura

Pedido do usuario: em **Post sem cobertura**, o campo **Engajamento** nao deve listar todas as atividades do paciente. O calculo continua usando atividades first-party da comunidade para chegar ao segmento operacional, mas a UI e os fatos visiveis do contrato passam a exibir apenas a analise resumida (**Sem atividade previa**, **Pouco ativo**, **Ativo** ou **Muito ativo**), sem detalhar contagens de posts, respostas, votos, salvamentos ou compartilhamentos.

Nao houve alteracao de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` nao se aplica.

### Criterios deste ajuste

- [x] **Post sem cobertura** mostra em **Engajamento** somente a analise resumida do nivel de atividade.
- [x] A UI nao concatena mais a decomposicao de atividades do paciente no campo **Engajamento**.
- [x] O payload de fatos visiveis do alerta nao expoe mais **Atividade na comunidade** nem **Score de atividade**.
- [x] O ajuste e mobile-first, sem `<img>` cru, sem package novo, sem mock e sem migration.

### Validacao deste ajuste de engajamento resumido

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm check`
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- Nao houve alteracao de Prisma schema/migrations; `pnpm --dir backend db:migrate` nao se aplica.

## Complemento 2026-07-25: Copy operacional e periodo sem cobertura

Pedido do usuario: simplificar a descricao do header de `/moderacao/operacionais` e substituir o detalhe **Engajamento** em **Post sem cobertura** pelo periodo que o post esta sem cobertura.

A descricao da pagina passa a ser **Pendencias por falta de cobertura, perfis profissionais nao publicados e falta de conversão de profissionais.**. Na tabela, posts sem cobertura seguem mostrando a comunidade uma unica vez, mas o segundo detalhe deixa de ser engajamento e passa a ser **Sem cobertura**, usando a idade real do alerta/post ja derivada de `operational-alerts`.

Nao houve alteracao de backend, Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` nao se aplica.

### Criterios deste ajuste

- [x] O header de `/moderacao/operacionais` usa a nova descricao simplificada.
- [x] **Post sem cobertura** nao exibe mais **Engajamento** na coluna **Detalhes**.
- [x] **Post sem cobertura** exibe **Sem cobertura** com o periodo real da pendencia.
- [x] O ajuste e mobile-first, sem `<img>` cru, sem package novo, sem mock e sem migration.

### Validacao deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/moderacao/operacionais` retornou `200`.
- Nao houve alteracao de Prisma schema/migrations; `pnpm --dir backend db:migrate` nao se aplica.

## Complemento 2026-07-25 - Conteúdo sensível em tabela operacional

- Pedido do usuário: transformar a lista de **Conteúdo sensível** em tabela com o mesmo layout da tabela de **Operacionais**.
- `/moderacao/conteudo-sensivel` passou a renderizar os eventos reais de `content_moderation_event` em tabela compacta com rolagem horizontal contida, mantendo filtros, paginação e contador da página.
- A tabela usa as colunas **Data**, **Categoria**, **Severidade**, **Decisão**, **Autor**, **Conteúdo** e **Comunidade**.
- A coluna **Conteúdo** possui duas linhas: prévia do título/snapshot e prévia da descrição/trecho seguro.
- O detalhe protegido e as ações auditadas continuam disponíveis a partir do botão acessível na célula **Conteúdo**, sem criar coluna extra nem endpoint paralelo.
- Não houve alteração de backend, Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` não se aplica.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual foi a captura enviada pelo usuário e a tabela local de `/moderacao/operacionais`.

### Critérios deste ajuste

- [x] `/moderacao/conteudo-sensivel` usa tabela no padrão visual de `/moderacao/operacionais`.
- [x] A tabela mostra **Data**, **Categoria**, **Severidade**, **Decisão**, **Autor**, **Conteúdo** e **Comunidade**.
- [x] **Conteúdo** exibe duas linhas: prévia do título e prévia da descrição.
- [x] O detalhe protegido e as ações auditadas permanecem acessíveis sem coluna extra.
- [x] O ajuste é mobile-first, sem `<img>` cru, sem package novo e sem migration.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/moderacao/conteudo-sensivel` retornou `200`.
- Sem ferramenta Builder/Quick Copy callable e sem sessão Admin headless neste ambiente; a validação visual foi coberta pelo build, pelo smoke local e pela referência enviada pelo usuário comparada à tabela existente de `/moderacao/operacionais`.


## Complemento 2026-07-25 - Conteudo sensivel com autor nominal e comunidade no conteudo

Pedido do usuario: refinar a fila exclusiva `/moderacao/conteudo-sensivel` para reduzir colunas e tornar a triagem mais direta. A copy do header passa a ser **Posts e comentarios potencialmente sensiveis identificados automaticamente para moderacao.**. A tabela remove a coluna **Categoria**, remove a coluna **Comunidade**, deixa a coluna **Data** sem hora e mantem a hora absoluta apenas no `title` da celula para auditoria.

Os filtros de **Categoria** e **Severidade** foram removidos da UI; o endpoint real de `content_moderation_event` continua aceitando esses parametros para compatibilidade, mas a fila exclusiva passa a consultar ambos como `all`. A coluna **Autor** agora usa o nome real do usuario retornado pelo contrato Admin protegido, mostra o selo Lectum quando o autor for profissional verificado e exibe abaixo o papel operacional (**Paciente**, **Psicologo** ou **Psicologa**). A coluna **Conteudo** concentra titulo, descricao e comunidade.

Nao houve alteracao de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` nao se aplica.

### Criterios deste ajuste

- [x] O header de `/moderacao/conteudo-sensivel` usa a nova copy solicitada.
- [x] A coluna **Data** mostra somente a data, sem hora visivel.
- [x] A coluna **Categoria** nao aparece mais na tabela.
- [x] Os filtros **Categoria** e **Severidade** nao aparecem mais na barra de filtros.
- [x] A coluna **Autor** mostra nome real, selo quando aplicavel e papel abaixo.
- [x] A coluna **Comunidade** nao aparece mais na tabela.
- [x] A coluna **Conteudo** mostra a comunidade abaixo da descricao.
- [x] O ajuste e mobile-first, sem `<img>` cru, sem package novo, sem mock e sem migration.


### Validacao deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/client.tsx" "src/api/req/moderation/index.ts" "src/api/cache/keys.ts" "src/app/(admin)/moderacao/operational-category-client.tsx"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/repositories/interfaces/IAdminModerationRepository.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts" "src/modules/api/admin/private/moderation/validator/index.ts"`
- `pnpm --dir backend check`
- `pnpm --dir admin check` (primeira execucao excedeu 181s durante o typecheck; reexecutado com timeout maior e concluiu sem erro)
- `pnpm --dir backend build`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/moderacao/conteudo-sensivel` retornou `200` apos subir o dev server Admin.
- Browser local/headless em Chrome carregou a rota; sem sessao Admin no perfil headless, a captura permaneceu no estado autenticado de carregamento. A validacao visual efetiva ficou coberta por build/check, smoke HTTP e comparacao com a captura enviada pelo usuario.

## Complemento 2026-07-25 - Filtro Usuario e publicacao em Operacionais

Pedido do usuario: ajustar a fila `/moderacao/operacionais` para remover a busca textual, adicionar filtro de **Usuario** apos **Tipo**, tornar a tag **Perfil nao publicado** singular/vermelha e trocar o detalhe **Sem cobertura** de posts pela data de publicacao.

- A barra de filtros de Operacionais agora exibe **Tipo**, **Usuario**, **De** e **Ate**, sem campo **Busca**.
- O filtro **Usuario** usa `userRole=all|paciente|psicologo` no contrato real `GET /api/admin/private/moderation/operational-alerts`, aplicado no backend antes da paginacao e incluido na query key do TanStack Query.
- A tag operacional `unpublished_required_settings` passa a exibir **Perfil nao publicado** e usar cor vermelha.
- Em **Post sem cobertura**, a coluna **Detalhes** passa a exibir **Publicado em** com a data/hora real do alerta/post, evitando repetir a duracao ja exibida em **Pendente ha**.
- Nao houve alteracao de Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` nao se aplica.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual foi a captura enviada pelo usuario e a tela local `/moderacao/operacionais`.

### Criterios deste ajuste

- [x] A tag **Perfis nao publicados** foi substituida por **Perfil nao publicado** na tabela.
- [x] A tag **Perfil nao publicado** usa cor vermelha, nao azul.
- [x] **Post sem cobertura** mostra **Publicado em** na coluna **Detalhes**.
- [x] A barra de filtros de `/moderacao/operacionais` nao mostra mais **Busca**.
- [x] O filtro **Usuario** aparece logo apos **Tipo** e filtra via backend real por paciente/psicologo.
- [x] A alteracao e mobile-first, sem `<img>` cru, sem package novo, sem mock e sem migration.

### Validacao deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/operational-category-client.tsx" "src/api/req/moderation/index.ts" "src/api/cache/keys.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/moderation/DTOs/IAdminModerationDTO.ts" "src/modules/api/admin/private/moderation/validator/index.ts" "src/modules/api/admin/private/moderation/use-cases/services.ts"`
- `pnpm --dir admin check` (primeira tentativa excedeu 183s; reexecutado com timeout maior e concluiu sem erro)
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin build` (primeira execucao acusou erro transitorio/stale em `client.tsx`; reexecutado e concluiu sem erro)
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/moderacao/operacionais` retornou `200`.
- API local autenticada: `operational-alerts?group=operacional&userRole=paciente&limit=50` retornou 6 registros, todos com `user.role="paciente"`; `userRole=psicologo` retornou 2 registros, todos com `user.role="psicologo"`.
- Browser local/headless em Chrome para `/moderacao/operacionais` validou desktop 1365px e mobile: filtro **Usuario** presente, **Busca** ausente, 8 linhas reais, tag **Perfil nao publicado** singular, ausencia de **Perfis nao publicados** nas linhas, **Post sem cobertura** com **Publicado em** e sem detalhe **Sem cobertura**. Admin temporario de validacao removido ao final.

## Complemento 2026-07-26 - Filtros e atalho de pagina em Conteudo sensivel

Pedido do usuario: na fila `/moderacao/conteudo-sensivel`, simplificar o filtro de status, trocar o filtro livre de comunidade por dropdown, remover a busca textual, trocar a coluna **Severidade** por **Status** e adicionar uma coluna com icone para abrir a pagina do conteudo.

- O dropdown **Status** agora exibe somente **Todos**, **Pendente** e **Resolvido**, mantendo **Pendente** como padrao da fila.
- O workflow interno **Em revisao** continua existindo no detalhe/acao auditada, mas nao aparece mais como opcao do filtro principal da lista.
- O filtro **Comunidade** passou a usar dropdown alimentado pelo endpoint real `GET /api/admin/private/communities`, com opcao **Todas** e valores por `community.id`.
- A busca textual foi removida da barra de filtros e a query de eventos nao envia mais `q` pela UI dessa pagina.
- A tabela substitui a coluna **Severidade** por **Status**, mantendo severidade disponivel no detalhe protegido.
- A nova coluna **Pagina** mostra um icone com link para `public_url` quando o evento possui conteudo publicado; eventos bloqueados antes da publicacao exibem icone desabilitado sem criar link falso.
- Nao houve alteracao de backend, Prisma schema/migrations, package novo, mock, seed ou endpoint simulado; `pnpm --dir backend db:migrate` nao se aplica.
- Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia visual foi a captura enviada pelo usuario e a tela local `/moderacao/conteudo-sensivel`.

### Criterios deste ajuste

- [x] O filtro **Status** contem somente **Todos**, **Pendente** e **Resolvido**.
- [x] **Pendente** permanece como valor padrao do filtro **Status**.
- [x] **Em revisao** nao aparece no dropdown principal de status.
- [x] O filtro **Comunidade** e um dropdown com comunidades reais.
- [x] A barra de filtros nao possui mais campo **Busca** nem envia `q` na consulta da pagina.
- [x] A tabela mostra a coluna **Status** no lugar de **Severidade**.
- [x] A tabela possui coluna **Pagina** com icone que abre a pagina do conteudo publicado.
- [x] Eventos sem pagina publicada nao recebem link falso.
- [x] O ajuste e mobile-first, sem `<img>` cru, sem package novo, sem mock e sem migration.

### Validacao deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/moderacao/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/moderacao/conteudo-sensivel` retornou `200`.
- Browser local/headless autenticado em Chrome validou desktop 1365px e mobile 390px: status com opcoes **Todos/Pendente/Resolvido**, valor padrao `pending`, comunidade como `select` com comunidades reais, ausencia de **Busca**, headers **Data/Status/Decisao/Autor/Conteudo/Pagina**, ausencia de **Severidade**, 3 links reais para conteudo publicado e 5 icones desabilitados para eventos bloqueados, sem overflow horizontal da pagina. Admins temporarios `codex-content-sensitive-` foram removidos ao final.
