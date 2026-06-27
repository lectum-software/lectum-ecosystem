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
- O dropdown originalmente exibia `Selecione`, a opcao segmentada por papel (`Somente profissionais` para pacientes ou
  `Somente pacientes` para psicologos) e `Todos`, mantendo a regra de dominio de segmentacao de novas
  postagens; essa opcao vazia foi removida em complemento posterior para simplificar o MVP.
- Nao houve mudanca de contrato, backend, Prisma, persistencia de preferencias, endpoints ou packages.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP local em
  mobile 390px confirmando borda azul-clara, fundo branco, sombra leve, item selecionado em azul claro,
  largura alinhada ao card e ausencia de overflow horizontal.

## Complemento 2026-06-17: Rotulos compactos do seletor de novas postagens

- O dropdown customizado de `novo_post__post_author_scope` passa a separar rotulo visual curto de valor de dominio persistido.
- `professionals_only` e exibido como `Profissionais` para pacientes; `patients_only` e exibido como `Pacientes` para psicologos; `all` continua `Todos`.
- A decisao evita alargamento do controle no mobile sem alterar payload, backend, preferencias existentes ou a segmentacao implementada em 29B.

## Complemento 2026-06-17 - iconografia de novas postagens

- O item `Novas postagens` em `/app/settings/notifications` passa a usar `Newspaper` como icone visual de publicacao/artigo.
- A decisao evita reutilizar icone de mensagem/chat para novos posts e deixa `MessageSquare` reservado para respostas/comentarios.
- A mudanca e exclusivamente visual no frontend: preserva o circulo azul-claro, `text-primary`, dimensoes da linha, contrato `novo_post`, persistencia e regras de segmentacao.
- Validacoes executadas: Biome no arquivo alterado, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390px confirmando o SVG `lucide-newspaper` sem overflow horizontal.

## Complemento 2026-06-17 - seção Perfil restrita a psicólogos

- A seção `Perfil` da tela `/app/settings/notifications` passa a ser renderizada somente quando `user.role` é `psicologo`.
- Pacientes veem apenas preferências de comunidade, porque eventos como avaliação recebida, perfil favoritado, visualização de perfil e clique em WhatsApp são ações do contexto profissional.
- A decisão preserva o contrato `notification_preference.prefs` e evita regra nova no backend: é um ajuste de UX/papel na apresentação da tela.
- Validacoes executadas: Biome no arquivo alterado, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390px para paciente e psicologo.


## Complemento 2026-06-17 - Preferencias sem estado vazio em novas postagens

### Contexto

A configuracao de notificacoes para pacientes ja ocultava a secao profissional `Perfil`, mas ainda mantinha o cabecalho `COMUNIDADE` como unica secao visivel. O seletor `Novas postagens` tambem exibia uma opcao vazia `Selecione`, embora o dominio sempre tenha um default valido por papel.

### Decisao

- Para pacientes, omitir o cabecalho visual `COMUNIDADE` e renderizar diretamente a lista de preferencias comunitarias.
- Para psicologos, manter `PERFIL` e `COMUNIDADE`, pois ha duas familias de preferencia na tela.
- Remover a opcao vazia do dropdown customizado usando `hideEmptyOption` no `SelectController`.
- Manter apenas opcoes validas: `Profissionais`/`Todos` para pacientes e `Pacientes`/`Todos` para psicologos.
- Preservar `getDefaultNewPostScope` e `resolveNewPostScope` como garantia de valor selecionado por padrao e normalizacao de preferencias antigas/invalidas.

### Consequencias

- A tela de paciente fica mais direta e sem titulo de secao redundante.
- O filtro de novas postagens deixa de ter estado vazio visual ou selecionavel.
- Nao ha mudanca no payload persistido, backend, schema Prisma, endpoints ou segmentacao de notificacoes.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Chrome/CDP mobile 390px confirmou paciente sem heading `COMUNIDADE`, psicologo com os dois headings, opcoes corretas por papel e ausencia de `Selecione`.

## Complemento 2026-06-18 - Desativado em novas postagens

### Contexto

O seletor `Novas postagens` ja tinha opcoes compactas por papel (`Profissionais`/`Pacientes`) e `Todos`, mas ainda nao permitia desligar apenas essa categoria sem afetar respostas, votos, salvamentos ou compartilhamentos.

### Decisao

- Adicionar a opcao visual `Desativado` como ultimo item do dropdown customizado.
- Manter os rotulos curtos por papel: pacientes veem `Profissionais`, `Todos`, `Desativado`; psicologos veem `Pacientes`, `Todos`, `Desativado`.
- Persistir `Desativado` como `novo_post.enabled = false`, preservando `post_author_scope` com um valor valido por papel em vez de criar novo escopo de autor.
- Ao carregar preferencias com `novo_post.enabled = false`, selecionar `Desativado` no formulario.

### Consequencias

- O usuario pode desligar apenas alertas de novas postagens.
- As demais categorias continuam independentes e habilitadas/desabilitadas pelos seus proprios switches.
- O contrato JSON permanece compativel com o modelo de preferencias ja usado no MVP web.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir backend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend build`
- `pnpm check`
- Chrome/CDP mobile 390px confirmou opcoes por papel, `Desativado` como ultimo item, ausencia de overflow horizontal e persistencia do valor apos reload.

## Complemento 2026-06-18 - Dropdown sem profundidade visual

- O seletor customizado `Novas postagens` deixa de usar sombra no trigger e na lista aberta.
- O estado de foco passa a ser comunicado por borda/cor, sem ring/halo azul, alinhado a diretriz recente de reduzir elementos flutuantes na Lectum.
- Estados de hover, item selecionado, opcoes por papel e contrato `novo_post` permanecem inalterados.

Validacao: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390px confirmando `box-shadow: none` no botao e no dropdown aberto.

## Complemento 2026-06-26 - Copy de novo post por papel

### Contexto

A descricao `Responda agora e seja visto primeiro.` em notificacoes `novo_post` foi criada para psicologos, pois comunica oportunidade de visibilidade profissional. Para pacientes, a mesma frase soava transacional e desalinhada com o valor de participar da comunidade e aprender com contribuicoes profissionais.

### Decisao

- Manter a copy atual para psicologos.
- Para pacientes, renderizar a descricao `Participe da conversa e acompanhe contribuições de psicólogos e da comunidade.` na central de notificacoes.
- Resolver a variacao no frontend a partir de `user.role`, sem alterar `message_key`, payload, schema ou produtor de eventos.

### Consequencias

- A mesma notificacao `novo_post` preserva semantica tecnica unica, mas ganha mensagem adequada ao papel do usuario.
- Nao ha migracao, endpoint novo, preferencia nova nem pacote adicional.

## Complemento 2026-06-26 - Iconografia de novo post na central

- A central de notificacoes passa a usar `Newspaper` para `novo_post`, representando publicacao/conteudo novo.
- `nova_resposta` permanece com `MessageSquare`, reservado para conversa, comentario e resposta.
- A decisao reaproveita a mesma iconografia ja adotada em `Novas postagens` na tela de preferencias, sem alterar dados, APIs ou regras de entrega.

## Complemento 2026-06-26 - Identidade do autor em novo post/resposta

### Contexto

As notificacoes in-app da Lectum sao exibidas individualmente, diferentemente dos digests/push agrupados. Em `novo_post` e `nova_resposta`, mostrar quem publicou ou respondeu ajuda o usuario a reconhecer o contexto da conversa. Para sinais passivos como upvote, salvamento e compartilhamento, a identificacao acrescentaria exposicao desnecessaria e ruido visual.

Tambem foi decidido que o sufixo profissional tem valor de credencial, enquanto `· Membro` nao agrega informacao suficiente e polui a leitura.

### Decisao

- A listagem `/api/private/notification/index` hidrata um campo derivado `actor` apenas para `novo_post` e `nova_resposta`, a partir de `message_props.post_id` ou `message_props.reply_id`.
- O campo `actor` nao altera o schema Prisma; ele e derivado em tempo de leitura e contem nome, avatar, papel, label profissional, flags de anonimato/delecao e id publico quando seguro.
- Posts anonimos de pacientes usam o alias estavel `Membro Anônimo #1234` derivado de `author_id`, com `id=null` e `avatar=null`.
- Psicologos recebem label no titulo (`· Psicóloga`, `· Psicólogo` ou `· Psicólogo(a)`). Membros identificados e membros anonimos nao recebem `· Membro`.
- A UI substitui o icone principal por avatar/iniciais quando `actor` existe e mantém um pequeno badge do tipo de evento sobreposto ao avatar.
- `nova_resposta` usa `message_props.parent_reply_id` para escolher entre `respondeu ao seu post` e `respondeu ao seu comentário`.
- Upvotes, salvamentos, compartilhamentos, favoritos, views e cliques permanecem sem identidade de autor na central.

### Consequencias

- A central ganha contexto humano em interacoes conversacionais sem abrir mais dados pessoais do que as telas de comunidade ja exibem.
- O anonimato continua preservado, inclusive sem expor o `user.id` real no payload derivado.
- Como `actor` e derivado no index, notificacoes antigas tambem podem aparecer com identidade quando seus `message_props` ainda apontam para post/resposta ativos.
- Notificacoes em tempo real continuam apenas invalidando/refazendo a query, entao a hidratacao ocorre pelo mesmo contrato de listagem.

### Validacao

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `/app/notifications`.
