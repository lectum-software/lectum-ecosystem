# ADR-0241 - Detalhe Admin de paciente somente leitura e dados pessoais mínimos

Status: Accepted

## Contexto

A TASK-61 cria a tela de detalhe administrativo do paciente. A tela precisa apoiar operação e suporte com dados reais, mas sem criar moderação, bloqueio, silenciamento, exclusão ou tracking novo apenas para preencher métricas.

A referência visual usada foi `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`. O Builder/Quick Copy ativo não ficou acessível como ferramenta neste ambiente, então a implementação usou a imagem local exportada como referência visual.

## Decisão

- O endpoint `GET /api/admin/private/patients/:id` é privado de Admin e usa a audiência admin existente.
- A tela é somente leitura na V1.
- O status exibido é apenas `Ativo` ou `Inativo`, derivado de `user.active`.
- O e-mail do paciente pode ser exibido para Admin autenticado por ser necessário para suporte/identificação operacional.
- A localização exibida é apenas coarse, derivada de `visitor_location.city/state/country` quando houver.
- Não são expostos telefone, data de nascimento, bio, endereço completo, IP, coordenadas, senha, comentários textuais de avaliações ou qualquer campo sensível não necessário para a V1.
- Atividade recente é derivada somente de eventos reais já persistidos: posts, respostas, votos, salvamentos, entrada em comunidades e avaliações publicadas criadas pelo paciente.
- Login não é exibido como atividade porque não há evento de sessão/login confiável para esse propósito na V1.
- Métricas de engajamento usam `community_post`, `post_reply`, `post_vote`, `post_save`, `post_reply_save`, `community_member` e `professional_review` reais.
- O heatmap usa `createdAt` desses eventos reais e agrega no fuso `America/Sao_Paulo`.

## Consequências

- O Admin tem uma visão operacional útil sem ampliar superfície de LGPD além do necessário.
- A tela pode apresentar estados vazios honestos quando não houver interações reais.
- O endpoint não cria auditoria nova, tracking novo, seed ou dados artificiais.
- A V1 não oferece ações administrativas sobre pacientes; qualquer ação futura precisará de task e ADR próprios.
- Não houve alteração de schema Prisma nem migration nesta task.

## Task relacionada

- TASK-61: Detalhe administrativo do paciente

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Validação de service com paciente real existente no banco local.
- Validação HTTP do endpoint sem token retornando `401`.
- Validação local da rota Admin `/pacientes/demo-patient-reviewer-01` retornando `200` no dev server.

## Atualização 2026-07-19: label de forma de cadastro

O detalhe de paciente continua retornando o `provider` bruto para auditoria, mas o label exibido ao Admin passa a seguir a mesma categoria de produto do dashboard: **Google** quando `user.provider="google"` e **E-mail e senha** para os demais valores reais.

Essa decisão evita expor marcadores operacionais/legados como forma de cadastro ao usuário Admin, sem ampliar dados pessoais, criar endpoint novo, schema Prisma, migration, mock, seed ou backfill.

## Atualização 2026-07-19: último acesso no cabeçalho

O cabeçalho do detalhe do paciente passa a exibir **Último acesso** em vez da combinação de data de cadastro e conclusão de onboarding. O valor vem de metadados reais de `user_token.createdAt/updatedAt`, seguindo o padrão já adotado no detalhe administrativo de psicólogos, e retorna `null` quando não existir token confiável.

Essa exposição permanece somente para Admin autenticado, não adiciona tracking, schema Prisma, migration, mock, seed ou backfill e não transforma login em item de atividade recente da V1.


## Atualizacao 2026-07-20: excecao auditada para edicao de genero

A regra de detalhe de paciente somente leitura passa a ter uma excecao explicita apos feedback de produto: o card **Dados pessoais** na aba **Perfil e cadastro** pode editar apenas `patient_profile.gender`, com motivo obrigatorio e auditoria em `admin_activity_log`.

`user.email` e a localizacao coarse derivada de `visitor_location` continuam somente leitura nessa aba. Nao foram adicionadas acoes destrutivas, moderacao, bloqueio, silenciamento, banimento, exclusao, schema Prisma, migration, package, seed, mock ou backfill. A decisao detalhada esta em `adrs/0290-admin-paciente-edicao-dados-pessoais-limitada.md`.

## Atualizacao 2026-07-21: recorte dos contadores da aba Geral

Apos feedback de produto, a aba **Geral** do detalhe administrativo de paciente passa a exibir um recorte mais curto de contadores principais: **Posts**, **Comentarios feitos** e **Respostas de psicologos verificados**.

As metricas de **Upvotes**, **Downvotes**, **Salvamentos** e **Compartilhamentos** continuam calculadas por fontes reais e disponiveis para areas analiticas especificas, mas deixam de aparecer nos contadores principais da aba **Geral** para reduzir ruido operacional. O resumo de **Engajamento** da mesma aba soma apenas esse recorte visivel, evitando apresentar metricas ocultas no total.

Nao houve alteracao de endpoint, contrato HTTP, schema Prisma, migration, package, mock, seed, backfill ou dado artificial. Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; a referencia auditavel foi o screenshot enviado pelo usuario e o PNG local `_product/proto/admin/Pacientes/Pacientes - Detalhes.png`.


## Atualizacao 2026-07-21: simplificacao da aba Geral do paciente

A aba **Geral** do detalhe administrativo de paciente foi simplificada apos feedback de produto. O bloco **Cadastro do paciente** deixou de ser exibido nessa aba para evitar duplicidade com **Perfil e cadastro** e **Conta**. O card **Engajamento** passou a exibir um diagnostico textual (**Muito ativo**, **Ativo**, **Pouco ativo** ou **Sem base**) derivado de dados reais do periodo padrao, usando comunidades ativas, posts e respostas do paciente.

As linhas operacionais antigas do card (**Periodo**, **Comunidade destaque**, **Eventos no heatmap** e **Fuso**) foram substituidas por **Comunidades ativas**, **Posts**, **Respostas** e **Ultima atividade**. O bloco **Privacidade e cobertura dos dados** foi removido da interface da aba Geral, mantendo as regras de privacidade como decisao documentada e preservada no contrato.

**Atividades recentes** passa a seguir o layout do detalhe administrativo de psicologo, com tabela de **Data**, **Acao**, **Descricao** e **Usuario**, sem badge tecnico de fonte no cabecalho. Nao houve endpoint novo, schema Prisma, migration, package, mock, seed ou backfill artificial.

## Atualizacao 2026-07-22: contador de denuncias recebidas

Apos feedback de produto, a aba **Geral** passa a exibir tambem o contador **Denuncias recebidas** ao lado do recorte principal de **Posts**, **Comentarios feitos** e **Respostas de psicologos verificados**.

O contador usa `post_report` real vinculado a posts ou comentarios do paciente no periodo do detalhe, incluindo comparativo com periodo anterior pelo mesmo contrato de metricas ja existente. Nao ha acao de moderacao nessa area, mock, seed, backfill artificial, schema Prisma, migration ou package novo.

## Atualizacao 2026-07-22: previa visual local de estatisticas vazias

Apos feedback de produto, a aba **Estatisticas** do detalhe administrativo de paciente pode exibir numeros de exemplo somente para visualizacao local de layout quando o ambiente esta em `NODE_ENV=development`, o paciente alvo e `cmrqsrab5001f1guh2ve5oy90` e os blocos ainda nao possuem dados reais.

A decisao e uma excecao visual e temporaria para avaliacao do Admin local: a UI preserva recortes que ja tenham dado real e nao altera backend, endpoint, schema Prisma, migration, seed, backfill, banco ou contrato HTTP. Em build/producao (`NODE_ENV=production`) a previa fica desativada, mantendo os estados vazios honestos quando nao houver dados reais.

Complemento de 2026-07-23: por feedback visual, o aviso global da previa foi removido da interface e a analise completa de intencao do paciente tambem pode receber numeros de exemplo na mesma restricao local/development do paciente de preview, apenas quando a analise estiver sem sinais reais. A decisao detalhada da analise de intencao permanece no ADR-0312.

## Atualizacao 2026-07-22: paridade visual dos cards de Situacao da conta e Engajamento

Apos feedback visual de produto, os cards **Situacao da conta** e **Engajamento** da aba **Geral** do detalhe administrativo de paciente passaram a seguir o mesmo modelo dos cards do detalhe administrativo de psicologo: card externo simples, painel destacado interno com eyebrow em caixa alta, titulo principal, helper text e icone, seguido das linhas de dados e do CTA no rodape.

A alteracao remove a hierarquia duplicada anterior desses dois cards, sem alterar metricas, contratos HTTP, backend, schema Prisma, migrations, packages, mocks, seeds, backfill artificial ou dados sensiveis. Os dados continuam vindo do contrato real existente de paciente. Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente; as referencias auditaveis foram os screenshots enviados pelo usuario, o PNG local `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e o layout local do detalhe de psicologo.

## Atualizacao 2026-07-23: nome de exibicao editavel pelo Admin

A excecao auditada do card **Dados pessoais** passa a incluir tambem o **Nome de exibicao** do paciente, persistido em `user.name` pelo endpoint `PUT /api/admin/private/patients/:id/personal-data` com `reason` obrigatorio e auditoria em `admin_activity_log`.

A decisao substitui a limitacao anterior de editar somente genero neste card. E-mail e localizacao coarse continuam somente leitura; telefone, nascimento, bio, endereco completo, IP e coordenadas permanecem omitidos. Nao houve schema Prisma, migration, package novo, mock, seed, backfill ou endpoint simulado.
