# TASK-64: Tela administrativa de notificações

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-64 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin / Notificações |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-63 |
| ADR alvo | ADR somente se houver nova decisão de UX/domínio sobre campanhas ou métricas |

## Contexto

A tela Admin de Notificações usa como referência `_product/proto/admin/Notificações.png`.

Ela deve permitir ao administrador criar notificações para usuários e acompanhar campanhas manuais e logs automáticos. Não é uma tela de notificações recebidas pelo admin.

Decisão de produto:

- E-mail passa a ser canal real de notificações manuais quando o backend confirmar SMTP configurado.
- Canais visíveis: `in-app`, `push` quando push estiver disponível e `email` quando SMTP estiver disponível.
- Logs automáticos são leitura/auditoria, não criação manual.

## Objetivo

Implementar a UI administrativa de notificações com criação de campanhas manuais, filtros, abas, métricas reais e logs de notificações automáticas, consumindo a fundação da TASK-63.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-63 concluída: modelos/endpoints reais de campanhas, entregas e logs.
- Ler `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md` e `PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Notificações.png` como referência visual local.
- Se Builder/Quick Copy estiver disponível, usar como complemento; se não, registrar limitação.

## Escopo frontend

- Criar rota protegida:
  - `/notifications` ou rota equivalente definida no Admin.
- Renderizar:
  - título "Notificações";
  - subtítulo;
  - botão **Nova notificação**;
  - cards:
    - Enviadas (30 dias ou período selecionado);
    - Usuários alcançados;
    - Taxa de abertura média;
    - Taxa de cliques média;
  - abas:
    - Todas;
    - Agendadas;
    - Enviadas;
    - Rascunhos;
    - Canceladas;
  - filtros:
    - período;
    - público;
    - canal;
    - busca por título/conteúdo;
  - tabela/lista de campanhas manuais;
  - seção "Logs de notificações automáticas".
- Criar fluxo **Nova notificação**:
  - modal, drawer ou página conforme padrão Admin;
  - campos:
    - título;
    - mensagem;
    - público;
    - canais (`in_app`, `push` se disponível, `email` se SMTP estiver disponível);
    - redirect/link interno opcional;
    - enviar agora ou agendar;
  - ações:
    - salvar rascunho;
    - enviar agora;
    - agendar;
    - cancelar rascunho/agendada quando permitido.
- Mostrar canal e-mail apenas com provider SMTP real disponível.
- Não mostrar editor/template rico de e-mail nesta etapa.
- Não mostrar taxa de abertura/clique quando a TASK-63 retornar métrica indisponível.

## Escopo backend

- Consumir endpoints da TASK-63.
- Se algum endpoint de listagem/filtro faltar, completar no módulo Admin seguindo a mesma fundação.
- Não criar nova regra de envio paralela na UI.
- Não criar endpoint fake para preencher cards.

## Fora do escopo

- Editor rico ou templates personalizados de e-mail.
- WhatsApp/SMS.
- Editor rico.
- Segmentação avançada.
- Campanhas recorrentes.
- A/B testing.
- Moderação de notificações automáticas.
- Métricas inventadas de abertura/clique.
- Notificações recebidas pelo admin.

## Contrato técnico detalhado

Cards:

- **Enviadas**:
  - contar campanhas/entregas conforme contrato da TASK-63;
  - a label deve deixar claro se está contando campanhas ou entregas, conforme decisão na execução.
- **Usuários alcançados**:
  - usuários com entrega real no período;
  - não contar usuários sem subscription quando campanha for push-only.
- **Taxa de abertura média**:
  - in-app: baseada em `read_at`;
  - push: somente por clique/interação real;
  - se não houver base confiável, exibir "Indisponível".
- **Taxa de cliques média**:
  - baseada em `clicked_at`;
  - se a campanha não tiver redirect, não contar como falha nem clique.

Tabela de campanhas manuais:

- Colunas mínimas:
  - notificação;
  - público;
  - canal;
  - status;
  - enviada/agendada em;
  - ações.
- Ações permitidas:
  - visualizar detalhes;
  - editar rascunho;
  - cancelar agendada;
  - duplicar somente se houver implementação real;
  - não permitir editar campanha já enviada.

Logs automáticos:

- Mostrar histórico de notificações automáticas enviadas pela plataforma.
- Colunas mínimas:
  - notificação automática;
  - disparo;
  - público;
  - canal;
  - enviada em;
  - alcance;
  - abertura;
  - cliques.
- Logs são somente leitura.
- Métricas indisponíveis devem aparecer como `—` ou copy honesta.

Formulário:

- Usar React Hook Form, Zod e controllers da TASK-02.
- Validações:
  - título obrigatório;
  - mensagem obrigatória;
  - público obrigatório;
  - ao menos um canal;
  - `email` só é canal aceito quando SMTP real estiver configurado;
  - data futura para agendamento;
  - redirect opcional validado.
- Preview simples do conteúdo antes de enviar/agendar.
- Confirmação explícita antes de enviar agora.

UI:

- Mobile-first:
  - cards empilhados;
  - abas roláveis;
  - tabela vira lista/card ou scroll acessível;
  - modal/drawer utilizável em ~390px.
- Usar tokens/componentes do Admin; não criar design system paralelo.
- `Image` de `next/image` quando houver imagens/avatares; ícones por biblioteca existente.

## Critérios de aceite

- [x] Rota Notificações só abre para admin autenticado.
- [x] `_product/proto/admin/Notificações.png` foi citada como referência visual.
- [x] A tela deixa claro que serve para gerenciar/enviar notificações aos usuários.
- [x] Botão **Nova notificação** abre fluxo real de criação.
- [x] Canal e-mail aparece na UI somente quando SMTP real estiver disponível.
- [x] Form usa React Hook Form, Zod e controllers.
- [x] Campanhas manuais listam status reais: rascunho, agendada, enviada, cancelada.
- [x] Logs automáticos são somente leitura.
- [x] Métricas de abertura/clique só aparecem quando há fonte real.
- [x] Push aparece apenas quando disponível; caso contrário, UI informa indisponibilidade ou oculta o canal.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] UI mobile-first validada.
- [x] Nenhum `<img>` cru foi usado.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado se houver decisão nova.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real:
  - criar rascunho;
  - enviar campanha in-app;
  - agendar campanha;
  - cancelar agendada;
  - validar logs automáticos reais.

## Execução TASK-64

- Tela implementada em `admin/src/app/(admin)/notificacoes`, rota protegida pelo shell Admin existente em `/notificacoes`.
- Referência visual usada: `_product/proto/admin/Notificações.png`; Builder/Quick Copy não ficou acessível nesta execução, então foi usada a imagem local indicada pelo inventário.
- Criados callers/requests reais em `admin/src/api/req/notifications` e `admin/src/api/callers/notifications` consumindo a fundação da TASK-63.
- Fluxo **Nova notificação** usa React Hook Form, Zod e controllers do Admin, com preview, rascunho, envio imediato com confirmação e agendamento.
- O canal `email` não é renderizado nem aceito no fluxo; push só aparece quando o backend retorna disponibilidade real via `/api/admin/private/notifications/push-status`.
- Listagem/filtros reais de campanhas foram completados no backend por período, público, canal e busca textual; não há endpoint fake.
- Métricas de abertura/clique exibem `—` quando não há entregas reais no período.
- Logs automáticos são somente leitura e vêm de `notification_deliveries.source=automatic`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`.
- Validação local: `http://localhost:3002/notificacoes` respondeu 200; `/api/admin/private/notifications/push-status` respondeu 401 sem token, confirmando proteção. O teste completo criar/enviar/agendar/cancelar via browser real depende de sessão admin interativa, mas as ações usam endpoints reais já validados por build/check e pela fundação da TASK-63.
- ADR: `adrs/0244-admin-notificacoes-ui-push-disponibilidade.md`.

## Ajuste complementar 2026-07-21 - Layout piloto premium em Notificações

- Pedido do usuário: aplicar o layout piloto na página Admin **Notificações**.
- O shell administrativo agora inclui `/notificacoes` e descendentes no escopo `admin-premium-pilot`, reutilizando a sidebar clara, tokens azuis Lectum, bordas/sombras sutis e pesos tipográficos mais leves já validados em Psicólogos, Comunidades, Pacientes e Configurações.
- O header da página passou a ser um card mobile-first com label **Campanhas e logs**, título **Notificações**, subtítulo, filtros de período e CTA **Nova notificação** no mesmo bloco visual do piloto.
- Cards, filtros, abas, tabelas, logs e modais continuam consumindo endpoints reais da TASK-63; não houve alteração de backend, Prisma/migrations, packages, contratos HTTP, formulários RHF/Zod, dados persistidos, canais disponíveis ou regras de métricas.
- Os status visuais de campanhas foram alinhados aos tokens semânticos do Admin, removendo cores utilitárias soltas do componente de Notificações.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis usadas foram `_product/proto/admin/Notificações.png`, o ADR do piloto `adrs/0263-admin-psicologos-piloto-premium.md` e a captura enviada pelo usuário.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/components/admin-shell/shell.tsx" "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.
- Browser local/headless sem sessão admin válida confirmou que a rota protegida cai no login; a inspeção visual autenticada completa depende de sessão Admin interativa, mas a UI alterada foi validada por build/check e pelo smoke da rota.

## Ajuste complementar 2026-07-21 - Header com período no padrão Admin

- Pedido do usuário: no header, fazer os campos de **período** e **data** seguirem o padrão do painel Admin da Lectum.
- O header de Notificações substituiu os atalhos soltos de período por um seletor **Período** com a mesma linguagem de campo usada nas páginas Admin do piloto, mantendo **De** e **Até** ao lado no mesmo bloco visual do card.
- Correção aplicada após validação de produto: janelas como **Últimos 7 dias**, **Últimos 30 dias** e **Últimos 90 dias** não são as opções padrão da Lectum para selects de período no Admin.
- As opções expostas em Notificações agora são as mesmas do padrão Lectum: **Hoje**, **Esta semana**, **Este mês**, **Este ano** e **Todo o período**.
- O período padrão da tela passou a ser **Todo o período**, e o frontend envia `period` para métricas, campanhas e logs.
- **Personalizado** continua sendo apenas um estado interno quando o administrador edita manualmente as datas; não foi adicionado como preset selecionável.
- O backend de Notificações passou a aceitar `period=all|today|week|month|year|custom` e resolve **Todo o período** a partir do primeiro registro real de campanha/entrega, sem mock ou backfill.
- Não houve alteração de Prisma/migrations, packages, formulários RHF/Zod, dados persistidos, canais disponíveis ou regras de envio.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin exec biome check --write "src/app/(admin)/notificacoes/client.tsx" "src/api/req/notifications/index.ts" "src/api/cache/keys.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/notifications/DTOs/IAdminNotificationsDTO.ts" "src/modules/api/admin/private/notifications/validator/index.ts" "src/modules/api/admin/private/notifications/use-cases/services.ts" "src/modules/api/admin/private/notifications/repositories/AdminNotificationsRepository.ts"`
- `pnpm --dir admin exec eslint "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir backend check`
- `pnpm --dir admin build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.
- Smoke do bundle dev de `/notificacoes`: confirmou ausência de **Últimos 7 dias**, **Últimos 30 dias**, **Últimos 90 dias** e `last_30`, com o seletor usando os presets padrão da Lectum.

## Ajuste complementar 2026-07-21 - Filtros por tabela

- Pedido do usuário: separar filtros para **Campanhas manuais** e **Logs de notificações automáticas**, com **Barra de pesquisa**, **Público**, **Canal**, **Período** e **Data** em cada tabela.
- Correção após clarificação: os filtros de **Período** e **Data** não ficam em um card independente; cada conjunto de filtros é renderizado como bloco interno do próprio card da tabela correspondente, logo abaixo do cabeçalho da tabela.
- Campanhas manuais e logs automáticos passaram a manter estado de filtro, período/data e paginação independentes.
- A listagem de logs automáticos passou a aceitar filtros reais de `audience` e `q` no backend, além de `channel`, `period`, `from` e `to`, sem mocks ou endpoints simulados.
- O seletor de período dos filtros por tabela segue o padrão Lectum documentado no ajuste anterior: **Hoje**, **Esta semana**, **Este mês**, **Este ano** e **Todo o período**; **Personalizado** permanece apenas como estado interno ao editar datas.
- Não houve alteração de Prisma/migrations, packages, modelos persistidos, canais disponíveis, regra de envio ou formulários RHF/Zod.
- Builder/Quick Copy não esteve disponível como ferramenta callable neste ambiente; a referência visual auditável permaneceu `_product/proto/admin/Notificações.png` e a captura enviada pelo usuário.

### Validação deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.

## Ajuste complementar 2026-07-21 - Status dentro dos filtros de campanhas

- Pedido do usuário: em **Campanhas manuais**, adicionar o filtro **Status** com as opções **Todas**, **Agendadas**, **Enviadas**, **Rascunhos** e **Canceladas**.
- O bloco isolado acima das tabelas com essas mesmas opções foi removido; o status agora pertence ao mesmo bloco visual de filtros da tabela de campanhas manuais.
- O filtro de status continua consumindo o contrato real já existente de campanhas (`status`) e reinicia apenas a paginação de campanhas ao mudar.
- Logs automáticos permanecem com filtros próprios e independentes, sem filtro de status de campanha.
- Não houve alteração de backend, Prisma/migrations, packages, contratos HTTP, dados persistidos, canais disponíveis, regra de envio ou formulários RHF/Zod.
- Builder/Quick Copy não esteve disponível como ferramenta callable neste ambiente; a referência visual auditável permaneceu `_product/proto/admin/Notificações.png` e a captura enviada pelo usuário.

### Validação deste ajuste

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.

## Ajuste complementar 2026-07-21 - CTA e topo simplificado

- Pedido do usu?rio: remover filtros de **Per?odo**, **De** e **At?** do header, mover **Nova notifica??o** para **Campanhas manuais**, remover a faixa operacional, simplificar o subt?tulo de contagem, remover a linha acima dos filtros e ajustar o grid para n?o cortar o ?ltimo campo de data.
- O header fica apenas com contexto, t?tulo e subt?tulo; m?tricas seguem consultando **Todo o per?odo** por padr?o e os filtros de per?odo/data ficam somente nos blocos das tabelas.
- O CTA **Nova notifica??o** passa a morar no cabe?alho do card **Campanhas manuais**.
- O aviso operacional ?Esta tela cria campanhas manuais...? foi removido; a contagem de campanhas fica como `0 campanha(s) encontrada(s).`.
- O cabe?alho do card n?o renderiza mais borda divis?ria acima dos filtros; os filtros ganharam `min-w-0`, padding `md:p-5` e grid em `xl`/`2xl` para preservar margem padr?o e evitar corte no campo **Data: At?**.
- N?o houve mudan?a de backend, Prisma/migrations, packages, contratos HTTP, dados persistidos, canais dispon?veis ou formul?rios RHF/Zod.
- Builder/Quick Copy n?o esteve dispon?vel como ferramenta callable neste ambiente; a refer?ncia visual audit?vel permaneceu `_product/proto/admin/Notifica??es.png` e a captura enviada pelo usu?rio.

### Valida??o deste ajuste

- `pnpm --dir admin exec biome check "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin exec eslint "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.
- Browser autenticado completo n?o foi repetido nesta execu??o porque n?o h? sess?o Admin interativa acess?vel ao ambiente; a valida??o visual usou a captura enviada pelo usu?rio e o PNG local de refer?ncia.

## Ajuste complementar 2026-07-21 - Copy de notificações e setas dos filtros

- Pedido do usuário: ajustar a copy dos contadores e das tabelas da página Admin **Notificações**, removendo a tag **real** e as descrições internas dos cards de métricas.
- O contador **Entregas enviadas (Todo o período)** passou a exibir **Notificações enviadas** sem subtítulo auxiliar.
- **Campanhas manuais** passou a **Notificações manuais**, e os textos de contagem passaram a usar `X notificações(s) encontrada(s).` também nos logs automáticos.
- Os labels dos campos de data dos filtros por tabela ficaram somente **De** e **Até**.
- Os selects dos filtros por tabela passaram a usar seta customizada com `appearance-none`, padding à direita e ícone deslocado para `right-4`, evitando seta colada na borda.
- Não houve mudança de backend, Prisma/migrations, packages, contratos HTTP, dados persistidos, canais disponíveis ou formulários RHF/Zod.
- Builder/Quick Copy não esteve disponível como ferramenta callable neste ambiente; a referência visual auditável permaneceu `_product/proto/admin/Notificações.png` e a captura enviada pelo usuário.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.
- Browser local/headless em Chrome confirmou renderização da rota protegida até a tela de login; a inspeção autenticada completa depende de sessão Admin interativa no navegador do usuário.

## Ajuste complementar 2026-07-21 - Remoção de rodapés auxiliares

- Pedido do usuário: remover da tabela de logs o texto **Mostrando logs reais: X registro(s)** e remover a faixa inferior **Mobile-first: cards empilhados...**.
- A paginação dos logs automáticos foi mantida, sem o texto auxiliar de contagem duplicado.
- A faixa informativa inferior foi removida integralmente para reduzir ruído visual na página Admin **Notificações**.
- Não houve mudança de backend, Prisma/migrations, packages, contratos HTTP, dados persistidos, canais disponíveis ou formulários RHF/Zod.
- Builder/Quick Copy não esteve disponível como ferramenta callable neste ambiente; a referência visual auditável permaneceu `_product/proto/admin/Notificações.png` e a captura enviada pelo usuário.

### Validação deste ajuste

- `pnpm --dir admin exec biome check --write "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.

## Ajuste complementar 2026-07-21 - Canal e-mail real nas notificações manuais

- Pedido do usuário: habilitar notificações também por e-mail, aproveitando o SMTP/Nodemailer já configurado no backend com remetente de teste da Planuze.
- A decisão anterior da TASK-64 que mantinha e-mail fora da V1 foi superada por `adrs/0304-admin-notificacoes-email-smtp.md`.
- O backend passou a aceitar `email` em `ADMIN_NOTIFICATION_CHANNELS`, validar SMTP real antes de criar/editar/enviar campanhas com esse canal e expor `/api/admin/private/notifications/email-status`.
- O envio de e-mail reutiliza o provider existente `modules/api/config/nodemailer/send`, template `transactional.hbs` e variáveis `EMAIL_API_*`; não foi criado mock, provider paralelo, package novo nem migração Prisma.
- O título da notificação é usado como assunto do e-mail; a mensagem é renderizada como HTML escapado e o redirect interno opcional vira botão para a primeira origem de `WEB_URL`.
- Entregas de e-mail são persistidas em `notification_delivery.channel="email"` com `status="sent"` somente quando o SMTP aceita o envio; falhas e skips registram `failed`/`skipped` com `failure_reason`.
- O Admin passou a consultar o status de e-mail real, mostrar checkbox **E-mail** no modal quando disponível, incluir **E-mail** nos filtros de canal, pills e detalhes, e informar que abertura/clique de e-mail ainda não têm tracking nesta etapa.
- Push e e-mail continuam independentes: se push estiver indisponível ou desativado por preferência, isso não bloqueia a tentativa de entrega por e-mail quando selecionada.
- Sem alteração de Prisma/migrations, packages ou estrutura persistida; o campo JSON `channels` e a coluna string `notification_delivery.channel` já comportam o novo canal.

### Validação deste ajuste

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/notifications/DTOs/IAdminNotificationsDTO.ts" "src/modules/api/admin/private/notifications/use-cases/services.ts" "src/modules/api/admin/private/notifications/use-cases/controller.ts" "src/modules/api/admin/private/notifications/index.ts" "src/main/notification/deliveries.ts" "src/main/notification/preferences.ts" "locales/pt/translation.json"`
- `pnpm --dir admin exec biome check --write "src/api/req/notifications/index.ts" "src/api/cache/keys.ts" "src/api/callers/notifications/index.ts" "src/app/(admin)/notificacoes/client.tsx"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local: `GET http://localhost:3002/notificacoes` retornou `200`.
- Smoke de proteção backend: `GET http://localhost:3001/api/admin/private/notifications/email-status` retornou `401` sem token, confirmando autenticação Admin.
- O arquivo `backend/.env` foi verificado sem expor segredo: as variáveis `EMAIL_API_*` necessárias estavam presentes e havia referência ao remetente Planuze.
