# TASK-29A: Notificações — fundação e recebimento

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-29A |
| Prioridade | P1 |
| Esforço | L |
| Fase | Conta |
| Status | Completed |
| Dependências | TASK-02, TASK-03, TASK-12 |
| ADR alvo | ADR de notificações e preferências |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Notificações.jpg` | `figma-design-frame-17-Notifica--es.html` |
| `_product/proto/Configurações de Notificações.jpg` | `figma-design-frame-24-Configura--es-de-Notifica--es.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Divisão da TASK-29

A TASK-29 foi dividida em duas:

- **29A (esta)**: o terreno — deixar tudo pronto para que notificações sejam **recebidas e exibidas** (models, CRUD in-app, subscription/VAPID, push, realtime, telas de central e preferências, montagem do manager). Não dispara notificações a partir de eventos de domínio.
- **29B**: liga os **eventos reais** de domínio (PRD §12) ao dispatch, respeitando preferências.

## Contexto

Notificações precisam refletir eventos reais e respeitar preferências. Esta task entrega o canal de recebimento (in-app + push + tempo real) sem ainda produzir eventos — quem produz é a 29B. Push/e-mail/WhatsApp dependem de decisões da TASK-03 / ADR-0006.

## Estado já scaffoldado nesta base (ponto de partida)

Já existe no repositório (trazido do sample e adaptado ao Lectum; revisar antes de concluir):

- Backend models/migração: `notification`, `notification_subscription` (migração `..._notifications`). **`notification_preference` ainda NÃO foi criado.**
- Backend CRUD in-app (registrado em `write.ts`): `GET /api/private/notification/index` (paginado `{data,page,pages,count}`), `PUT /api/private/notification/update/:id` (`{read}`), `POST /api/private/notification/clean`.
- Backend subscription (registrado): `GET /api/private/notification_subscription/key` (VAPID public key), `POST /api/private/notification_subscription/store` (`{subscription, force?}`).
- Backend infra de entrega: `backend/src/main/notification` (dispatcher) + `backend/src/main/socket/events/notification.ts` + `backend/src/config/webPush.ts`.
- Frontend: `api/req/notification`, `api/callers/notification` (CRUD), `api/req/notification-subscription`, `api/callers/notification_subscription`, `hooks/notification` (`NotificationManager`: registra service worker e inscreve push após e-mail confirmado), `utils/urlToBase64`, tipo `notification` e key `notification.index`.

## Objetivo

Entregar o recebimento de notificações ponta a ponta: persistência, listagem/leitura/limpeza in-app, preferências por canal, inscrição push real e atualização em tempo real — sem produzir eventos de domínio.

## Pré-requisitos e bloqueios

- Push web (`web-push`/VAPID) decidido na TASK-03 / ADR-0006. Sem `VAPID_EMAIL`/`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` no ambiente, a `key` retorna vazio e a inscrição é abortada silenciosamente — persistir preferência mas **não prometer entrega push**. Registrar a pendência de env.
- E-mail (Resend/Nodemailer) e WhatsApp/SMS (Twilio) só entram como canais de preferência aqui; envio efetivo por esses canais é responsabilidade da 29B/integração.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo backend (restante para concluir 29A)

- Adicionar o model `notification_preference` (1:1 por `user_id`, `prefs Json`) conforme `DATA-MODEL.md` › "Notificações", com migração aditiva.
- Endpoints de preferências em módulos separados (padrão do projeto): `GET /api/private/notification_preference/show` (cria default na primeira leitura) e `PUT /api/private/notification_preference/update`. Não aninhar sob `notification/`.
- Revisar/adequar o dispatcher `main/notification` aos padrões do Lectum: criar a notificação (`notification`), emitir via Socket.IO ao usuário conectado e enviar push **apenas** se houver `notification_subscription` e VAPID configurado; respeitar `notification_preference`.
- Garantir que toda rota privada de notificação passe por `_auth` (já passam). Não há `requireRole`: notificação é por usuário autenticado, escopada por `req.auth.id` (ownership).
- Service worker `public/sw.js` para receber push e exibir (criar se ausente).
- Traduções PT-BR para mensagens visíveis.

Modelos/tabelas (ver `DATA-MODEL.md` › "Notificações"; sem inventar):

- `notification` (in-app, já migrado): o evento do PRD §12 vai em **`message_key`**, payload em `message_props`, deep-link em `redirect`, flag de leitura em `read` (ver `DATA-MODEL.md` › "Notificações", já reconciliado).
- `notification_preference` (`prefs Json`, 1:1 por `user_id`) — a criar.
- `notification_subscription` (já existe; web-push). Não confundir com `notification`.

Endpoints (reais já existentes + a criar):

- GET `/api/private/notification/index` — lista paginada (existe).
- PUT `/api/private/notification/update/:id` — marca lida (existe).
- POST `/api/private/notification/clean` — limpa/marca todas (existe).
- GET `/api/private/notification_subscription/key` — VAPID (existe).
- POST `/api/private/notification_subscription/store` — salva subscription (existe).
- GET `/api/private/notification_preference/show` e PUT `/api/private/notification_preference/update` — preferências.

## Escopo frontend (restante para concluir 29A)

Rotas esperadas (mobile-first):

- `/app/notifications` — Central de Notificações.
- `/app/settings/notifications` — Preferências.

Implementação esperada:

- Montar o `NotificationManager` (`hooks/notification`) no shell privado (TASK-12) ou layout privado, para registrar SW e inscrever push.
- Central de Notificações consumindo `useNotification` (lista lida/não lida, marcar lida, limpar, scroll infinito via `useInfiniteQuery` já pronto), com estado vazio real.
- Tela de preferências usando a fundação da TASK-02 (toggles por categoria), consumindo o endpoint de preferências.
- Atualização em tempo real via Socket.IO (provider de socket já existe no frontend) — receber nova notificação e refletir na central/badge.
- `<img>` proibido; usar `next/image`. UI mobile-first.

## Contrato técnico detalhado

Arquitetura frontend/backend conforme `ARCHITECTURE.md` e `DATA-MODEL.md`. Callers/req de notificação já seguem o padrão (`callEndpoint`/`handleReq`, `useQueryClient`, keys em `cache/keys.ts`). Não criar client HTTP, store, auth ou design system paralelo; não usar `sample/` como fonte direta (o que foi portado deve ser adequado ao Lectum).

Packages permitidos: `socket.io`, `socket.io-client`, `web-push`, TanStack Query, Prisma (já instalados). Sem package novo sem ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio real (sem notificações).
- Sucesso com feedback discreto.
- Responsividade mobile-first.

## Fora do escopo

- **Disparar notificações a partir de eventos de domínio (é a 29B).**
- Criar dados fake, seed artificial ou mock para preencher a central.
- Envio efetivo por e-mail/WhatsApp (canais de integração ficam para 29B/integração).
- Refatorar módulos não relacionados.

## Critérios de aceite

- [x] As referências visuais foram consultadas via imagens locais citadas (`_product/proto/Notificações.jpg` e `_product/proto/Configurações de Notificações.jpg`); Builder/Quick Copy não estava acessível neste ambiente, então a UI foi refinada contra os protótipos locais.
- [x] `notification_preference` criado conforme `DATA-MODEL.md` (migração SQL adicionada) e endpoints de preferências (`notification_preference/show|update`) implementados.
- [x] CRUD in-app (`index/update/clean`) e subscription (`key/store`) revisados, registrados e compilando.
- [x] `NotificationManager` montado no shell privado; SW (`public/sw.js`) registrado; inscrição push degrada sem prometer push quando VAPID ausente.
- [x] Central de Notificações lista/marca/limpa notificações reais, com estado vazio real (sem mock).
- [x] Preferências por categoria persistem em `notification_preference`.
- [x] Recebimento em tempo real via Socket.IO ligado no provider (`socket.on("notification")`).
- [x] Modelos e endpoints seguem `DATA-MODEL.md`; módulo `notification_preference` separado conforme padrão.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado; nenhum `<img>` cru; UI mobile-first.
- [x] Pendência de VAPID env registrada (`_product/decisions.md` / ADR-0007).
- [x] ADR criado em `adrs/0007-notificacoes-fundacao.md`.
- [x] `pnpm --dir backend check`, `pnpm --dir frontend check` e `pnpm --dir frontend build` verdes.
- [x] Validação local executada: `pnpm --dir backend db:migrate` retornou banco em sincronia; smoke HTTP em `/app/notifications` (200) e `/app/settings/notifications` (307 esperado sem sessão autenticada).
- [x] Commit criado com mensagem convencional.
- [x] Ajuste fino 2026-06-16: o ícone de configurações no header de `/app/notifications` foi ampliado sem adicionar fundo, borda ou alterar a estrutura do header.
- [x] Ajuste 2026-06-16: `/app/settings/notifications` foi simplificada para uma chave por tipo de notificação, seletor segmentado em `novo_post`, header com voltar e rodapé limpo; preferências são normalizadas em `notification_preference.prefs`.
- [x] Ajuste fino 2026-06-17: itens de `/app/settings/notifications` ficaram compactos em uma linha, sem descrições, sem rótulo visual `Receber`, com controles alinhados à direita e ícone de WhatsApp azul no item `Cliques no WhatsApp`.
- [x] Ajuste fino 2026-06-17: `/app/notifications` usa card branco também no mobile, sem fundo azulado nos itens, e a ação `Marcar todas como lidas` ficou alinhada no header ao lado das configurações.
- [x] Ajuste fino 2026-06-17: o seletor `Novas postagens` em `/app/settings/notifications` abandonou o select nativo visivel e passou a usar dropdown customizado premium, com opcoes segmentadas por papel e `Todos`, sem vazar do card no mobile.

## Validação mínima

- `pnpm --dir backend check` e `pnpm --dir backend build` (schema/migração).
- `pnpm --dir frontend check` e `pnpm --dir frontend build`.
- `pnpm check`.
- Browser local em `/app/notifications` e `/app/settings/notifications`.

## Pendências

- VAPID env (TASK-03 / `_product/decisions.md`) para push efetivo.

## Complemento 2026-06-17 - preferências compactas

- Referências anexadas pelo usuário consultadas: `Configurações de Notificações.pdf` e `Container (2).svg`. Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- A tela `/app/settings/notifications` removeu as descrições abaixo das opções e o texto visual `Receber` acima dos switches.
- Cada item passou a usar uma linha compacta com ícone à esquerda, título centralizado verticalmente e switch/seletor à direita.
- O item `Cliques no WhatsApp` passou a usar o componente `WhatsAppIcon`, cujo path SVG corresponde ao anexo, mantendo a cor azul `text-primary` dos demais ícones.
- Persistência, payload de preferências, seletor `novo_post`, validações e endpoints não foram alterados.

## Complemento 2026-06-17 - header e lista da central de notificações

- A tela `/app/notifications` manteve a referência local `_product/proto/Notificações.jpg` como norte auditável; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- No mobile, a lista passou a seguir a mesma família visual do desktop: card branco com borda suave, padding interno e sombra discreta.
- O destaque azulado nos itens não lidos foi removido; o estado não lido continua indicado pela bolinha azul.
- A ação `Marcar todas como lidas` foi movida para o header, à esquerda do ícone de configurações.
- No mobile, o header exibe apenas o ícone de check; ao tocar, abre um menu de confirmação com o texto `Marcar todas como lidas`.
- No desktop, o botão textual `Marcar todas como lidas` permanece visível no header, alinhado à esquerda do ícone de configurações.
- Não houve alteração de backend, Prisma, persistência, endpoints ou regras de leitura/limpeza de notificações.

## Complemento 2026-06-17 - dropdown customizado de novas postagens

- A tela `/app/settings/notifications` manteve a referência local `_product/proto/Configurações de Notificações.jpg` como norte auditável; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- O campo `Novas postagens` passou a usar o modo customizado do `SelectController`, preservando React Hook Form/Zod e removendo o visual nativo do navegador.
- O dropdown recebeu botão branco com borda azul-clara, radius refinado, sombra muito leve, seta alinhada à direita e lista com item selecionado em azul muito claro.
- As opcoes visiveis no perfil de paciente sao `Profissionais` e `Todos`; a regra de dominio para psicologos continua preservada com `Pacientes` e `Todos`.
- A validação local via Chrome/CDP em viewport mobile 390px confirmou que a lista não vaza do card, tem largura alinhada ao botão, mostra as três opções esperadas para paciente e destaca a opção selecionada.
- Não houve alteração de backend, Prisma, persistência, endpoints ou packages.

## Notas para executor

Esta task deixa o canal de recebimento pronto. **Não** ligue eventos de domínio aqui — isso é a 29B. O que foi portado do sample deve ser revisado e adequado ao Lectum antes de marcar concluído. Commit próprio.

## Complemento 2026-06-17 - labels compactas em Novas postagens

- O seletor `Novas postagens` em `/app/settings/notifications` manteve o dropdown customizado premium, mas encurtou os rotulos visiveis para reduzir largura no mobile.
- Para pacientes, `professionals_only` passa a aparecer como `Profissionais`; para psicologos, `patients_only` aparece como `Pacientes`; `Todos` permanece inalterado.
- Os valores persistidos (`professionals_only`, `patients_only`, `all`) e a regra de segmentacao de notificacoes nao mudaram.
- A largura do controle foi reduzida para permanecer contida na coluna direita, sem sobrepor o titulo `Novas postagens`.

## Complemento 2026-06-17 - icone de novas postagens

- O item `Novas postagens` em `/app/settings/notifications` passou a usar o icone `Newspaper` do `lucide-react`, representando publicacao/artigo em vez de conversa.
- A troca diferencia visualmente notificacoes de novos posts das notificacoes de respostas, que continuam usando `MessageSquare`.
- O circulo de fundo, cor azul, tamanho, peso visual e alinhamento permanecem herdados do componente de linha existente.
- Nao houve alteracao de backend, Prisma, payload de preferencias, endpoints, validacoes ou packages.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/app/app/settings/notifications/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390px confirmando `lucide-newspaper` no item `Novas postagens`, wrapper `bg-primary-soft text-primary` e ausencia de overflow horizontal.

## Complemento 2026-06-17 - visibilidade por papel na seção Perfil

- A tela `/app/settings/notifications` passou a exibir a seção `Perfil` somente para usuários com papel `psicologo`.
- Para pacientes, a seção `Perfil` é omitida integralmente, incluindo `Novas avaliações`, `Perfil favoritado`, `Visualizações de perfil` e `Cliques no WhatsApp`.
- A tela de paciente comeca diretamente pelos itens de comunidade, sem o cabecalho visual `COMUNIDADE`, sem espaco vazio, divisoria orfa ou alteracao de contrato de preferencias.
- A mudança é apenas de apresentação no frontend; persistência, schema, endpoints e segmentação de notificações permanecem inalterados.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/app/app/settings/notifications/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390px validando paciente com apenas `Comunidade` e psicologo com `Perfil` + `Comunidade`, ambos sem overflow horizontal.


## Complemento 2026-06-17 - simplificacao de comunidade e novas postagens

- Na tela `/app/settings/notifications`, pacientes deixam de ver o cabecalho visual `COMUNIDADE`; a primeira linha de preferencia aparece imediatamente apos o header da pagina.
- Psicologos mantem os cabecalhos `PERFIL` e `COMUNIDADE`, preservando a separacao visual entre categorias profissionais e comunitarias.
- O dropdown `Novas postagens` removeu a opcao vazia `Selecione` com `hideEmptyOption` no `SelectController` e passa a expor somente opcoes validas: `Profissionais`/`Todos` para pacientes e `Pacientes`/`Todos` para psicologos.
- O valor padrao continua derivado do papel do usuario: pacientes iniciam em `professionals_only` e psicologos em `patients_only`; registros persistidos invalidos continuam normalizados para um valor valido.
- Nao houve alteracao de schema Prisma, backend, endpoint, payload persistido, pacote ou regra de segmentacao.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/settings/notifications` mobile `390x844`, validando paciente sem `COMUNIDADE`, psicologo com `PERFIL` + `COMUNIDADE`, dropdown sem `Selecione`, opcoes corretas por papel e ausencia de overflow horizontal.
- ADR atualizado: `adrs/0007-notificacoes-fundacao.md`.

## Complemento 2026-06-18 - Desativado em Novas postagens

- O dropdown customizado `Novas postagens` passou a exibir uma terceira opcao final `Desativado`.
- Pacientes veem `Profissionais`, `Todos` e `Desativado`; psicologos veem `Pacientes`, `Todos` e `Desativado`.
- A opcao visual `Desativado` nao e persistida como novo escopo de autor: o payload segue usando `post_author_scope` valido por papel e salva `novo_post.enabled = false`.
- Ao recarregar a tela, `novo_post.enabled = false` volta a selecionar `Desativado`, mantendo as demais preferencias independentes.
- O layout premium do seletor foi preservado e a largura continua contida na coluna direita no mobile.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke de dominio via `tsx` confirmou que `novo_post.enabled = false` bloqueia apenas notificacoes de novas postagens e mantem outras chaves habilitadas.
- Browser local via Chrome/CDP em `/app/settings/notifications` mobile `390x844`, validando as opcoes `Profissionais/Todos/Desativado` para paciente, `Pacientes/Todos/Desativado` para psicologo, ausencia de overflow horizontal e persistencia de `Desativado` apos reload.
- ADR atualizado: `adrs/0007-notificacoes-fundacao.md`.

## Complemento 2026-06-18 - seletor sem sombra

- O dropdown customizado `Novas postagens` removeu `box-shadow`/glow tanto no botao fechado quanto na lista aberta.
- O seletor manteve fundo branco, borda azul-clara, texto, seta e estados existentes por cor/borda, sem halo de foco ou profundidade visual.
- O ajuste vale para pacientes e psicologos, sem alterar opcoes, payload, persistencia ou segmentacao.

### Validacao do ajuste

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome/CDP em `/app/settings/notifications` mobile `390x844`, validando `box-shadow: none` no botao fechado, `box-shadow: none` na lista aberta e ausencia de overflow horizontal.
- ADR atualizado: `adrs/0007-notificacoes-fundacao.md`.
