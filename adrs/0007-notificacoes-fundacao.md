# ADR-0007: Notificações — fundação de recebimento (TASK-29A)

## Status

Accepted

## Task relacionada

TASK-29A (fundação/recebimento). A produção de eventos de domínio é a TASK-29B. Modelos em `_product/tasks/DATA-MODEL.md` › "Notificações".

## Contexto

A TASK-29 foi dividida em 29A (canal de recebimento) e 29B (eventos). O código de notificações foi trazido do `sample` e adaptado ao Lectum. Era preciso fixar a arquitetura do canal: modelo de dados, módulos de API, dispatcher, push web e tempo real — sem ainda disparar a partir de eventos de domínio.

A forma do `notification` migrada (derivada do sample) usa `read`, `redirect`, `message_key`, `message_props` — divergente da spec inicial (`type/data/read_at`). Reconciliado: **`message_key` carrega o tipo do evento do PRD §12** (e serve como chave i18n), `message_props` o payload, `redirect` o deep-link. O campo `modal` foi removido do modelo.

## Decisão

- **Modelo**: `notification` (in-app, já migrado) + `notification_preference` (criado nesta task, `prefs Json` 1:1 por usuário) + `notification_subscription` (web-push, já existente).
- **Módulos de API separados por caso** (padrão do projeto, controller/service/repository/validator/DTO/index): `notification/{index,update/:id,clean}`, `notification_preference/{show,update}`, `notification_subscription/{key,store}`. **Não aninhar preferências sob `notification/`** — `notification_preference` é módulo próprio.
- **Dispatcher** (`main/notification.notify(userIds, meta)`): persiste a notificação in-app, emite via Socket.IO e envia push web, respeitando `notification_preference` por canal (`in_app`/`push`, default permitir). Não é ligado a eventos aqui (isso é 29B).
- **Push web**: VAPID via `notification_subscription/key`; subscription persistida via `notification_subscription/store`; service worker em `public/sw.js`. Sem VAPID configurado, a inscrição é abortada silenciosamente — sem prometer push.
- **Frontend**: `NotificationManager` montado no shell privado (registra SW + inscreve push após e-mail confirmado); Central de Notificações (`/app/notifications`) e Preferências (`/app/settings/notifications`); tempo real já ligado no provider de socket (`socket.on("notification")` → refetch).
- **Autorização**: rotas privadas via `_auth`, escopadas por `req.auth.id` (notificação é por usuário; sem `requireRole`).

## Consequências

- Canal de recebimento pronto: in-app (listar/marcar/limpar), push e tempo real, com preferências por categoria.
- Separação por módulo respeita o padrão e evita acoplar preferências ao CRUD de notificação.
- A tela de preferências foi refinada com React Hook Form, Zod, `useFormList` e `SwitchController`, mantendo toggles por categoria e persistência em `notification_preference`.
- A produção de notificações depende da TASK-29B ligar o dispatcher aos eventos do PRD §12.

## Validação

- `pnpm --dir backend check` e `pnpm --dir frontend check` verdes; `pnpm --dir frontend build` verde.
- `prisma generate` reflete `notification_preference`; migração `..._notification_preferences` adicionada.

## Pendências

- **VAPID env** (`VAPID_EMAIL`/`VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`) — TASK-03 / `_product/decisions.md`.
- TASK-29B: ligar os eventos de domínio ao dispatcher.

## Complemento 2026-06-15

- Revalidacao de fechamento da TASK-29A concluida.
- VAPID agora degrada de forma segura: o backend nao chama `setVapidDetails` sem as tres envs, `notification_subscription/key` retorna string vazia e o frontend nao solicita permissao do navegador quando nao ha chave publica.
- Removida a rota de desenvolvimento `/api/private/notification/test`, evitando endpoint simulado no canal de notificacoes.
- Ownership reforcado em `notification/update`: a busca da notificacao inclui `user_id = req.auth.id`.
- UI de `/app/notifications` e `/app/settings/notifications` refinada contra as imagens locais de prototipo; Builder/Quick Copy nao estava disponivel no ambiente.
- `pnpm --dir backend db:migrate` executado em 2026-06-15 e retornou banco em sincronia.

## Complemento 2026-06-16

- O header de `/app/notifications` manteve a composicao limpa de tela secundaria; a acao de configuracoes passou a usar escala visual maior e removeu a compressao causada pelo padding herdado do botao, sem fundo, borda, novo container ou mudanca de alinhamento.
- As preferencias do MVP web passaram a ser apresentadas como uma chave unica por `message_key`, sem colunas `No app`/`Push`. O backend normaliza `notification_preference.prefs` para `{ enabled }`, mantendo compatibilidade de leitura com registros legados `{ in_app, push }`.
- `novo_post` deixou de ser controle binario simples e passou a armazenar `post_author_scope`, com defaults por papel do usuario: psicologos recebem de pacientes por padrao; pacientes recebem de profissionais por padrao; `all` habilita ambos.

## Complemento 2026-06-17

- A tela `/app/settings/notifications` adotou linhas compactas para cada preferencia: icone a esquerda,
  titulo centralizado verticalmente e controle alinhado a direita, seguindo a referencia anexada pelo
  usuario.
- As descricoes textuais por opcao e o rotulo visual `Receber` dos switches foram removidos para reduzir
  altura e ruido visual; a acessibilidade do controle permanece por label oculto via foundation de
  controllers.
- O item `Cliques no WhatsApp` usa o componente compartilhado `WhatsAppIcon`, cujo path corresponde ao
  SVG `Container (2).svg` anexado, com `currentColor` em `text-primary` para manter a mesma cor azul dos
  demais icones da tela.
- Nao houve mudanca de contrato, backend, Prisma, persistencia de preferencias, endpoints ou packages.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP local em
  mobile 390px e desktop 1280px confirmando alinhamento dos controles, ausencia dos textos removidos e
  icone WhatsApp azul no item correto.

## Complemento 2026-06-17 - central de notificacoes

- A central `/app/notifications` passa a usar o mesmo card branco da lista no mobile e no desktop,
  evitando o fundo azulado em itens nao lidos. O estado nao lido continua visivel pela bolinha azul.
- A acao de limpar/marcar tudo como lido foi movida para o header da tela, imediatamente a esquerda do
  atalho de configuracoes.
- Em mobile, a acao aparece como botao icon-only com `CheckCheck`; tocar no icone abre um menu de
  confirmacao com a opcao `Marcar todas como lidas`. Em desktop, a acao permanece textual e alinhada na
  mesma linha do header.
- A decisao preserva o CRUD existente (`notification/clean`) e nao altera backend, Prisma, contratos,
  persistencia ou preferencias.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP local em
  mobile 390px e desktop 1280px confirmando card branco, ausencia de classe azul nos itens, menu de
  confirmacao no mobile e botao textual a esquerda das configuracoes no desktop.

## Complemento 2026-06-17 - dropdown customizado de novas postagens

- O seletor `novo_post__post_author_scope` em `/app/settings/notifications` passa a usar um modo
  customizado do `SelectController` (`useCustomSelect`) em vez do select nativo visivel do navegador.
- A decisao preserva a fundacao de formularios (`useFormList`, React Hook Form, Zod e controllers
  compartilhados) e evita criar um dropdown paralelo especifico da tela.
- O controller ganhou props opt-in para estilizar conteudo, opcoes, item selecionado e chevron; o
  comportamento padrao dos demais selects permanece nativo quando `useCustomSelect` nao e informado.
- O dropdown exibe `Selecione`, a opcao segmentada por papel (`Somente profissionais` para pacientes ou
  `Somente pacientes` para psicologos) e `Todos`, mantendo a regra de dominio de segmentacao de novas
  postagens.
- Nao houve mudanca de contrato, backend, Prisma, persistencia de preferencias, endpoints ou packages.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP local em
  mobile 390px confirmando borda azul-clara, fundo branco, sombra leve, item selecionado em azul claro,
  largura alinhada ao card e ausencia de overflow horizontal.
