# TASK-52: Detalhe e edição de comunidade no Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-52 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-51 |
| ADR alvo | ADR sobre regras editáveis de comunidade e edição administrativa de identidade visual |

## Contexto

A tela de detalhe da comunidade no Admin usa como referência `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`. Ela apresenta cabeçalho da comunidade, resumo, desempenho, informações, top mentores, posts populares e regras.

Nesta V1, o Admin deve permitir editar apenas os campos definidos pelo produto:

- nome da comunidade;
- avatar/imagem;
- descrição;
- cores/identidade visual;
- regras da comunidade.

Não entram agora configurações avançadas como ativar/inativar, visibilidade, permitir posts, permitir comentários, ordenação padrão, moderação avançada ou ações em massa.

## Objetivo

Criar a tela de detalhe administrativo de uma comunidade com dados reais e formulário de edição para identidade básica e regras, persistindo tudo no backend.

## Pré-requisitos e bloqueios

- TASK-45 concluída: auth admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-51 concluída: dashboard/listagem Admin de comunidades com navegação para detalhe.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` como referência visual local.
- Upload de avatar deve usar storage real já existente. Se as envs de R2/bucket público não estiverem disponíveis, a task deve parar e registrar bloqueio; não usar URL temporária/mock.

## Escopo frontend

- Criar rota protegida no app Admin:
  - `/communities/[id]` ou `/communities/[slug]`, conforme convenção adotada na TASK-46/TASK-51.
- Renderizar:
  - breadcrumb Comunidades > Nome;
  - cabeçalho com avatar, nome, descrição e status informativo;
  - resumo da comunidade;
  - desempenho dos últimos 30 dias/período selecionado;
  - informações da comunidade;
  - top mentores;
  - posts mais populares;
  - regras da comunidade.
- Criar edição:
  - botão "Editar comunidade";
  - formulário para nome, descrição, avatar e cores;
  - gerenciamento de regras: adicionar, editar, remover/soft delete, ativar/desativar e ordenar.
- Estados:
  - loading;
  - erro;
  - vazio;
  - edição em progresso;
  - sucesso/erro de salvamento.
- Formulários:
  - React Hook Form + Zod;
  - controllers/fundação local do app Admin alinhada à TASK-02/TASK-46;
  - campos largura total e slot de erro fixo.

## Escopo backend

- Criar endpoints admin privados:
  - `GET /api/admin/private/communities/:id`;
  - `PUT /api/admin/private/communities/:id`;
  - `POST /api/admin/private/communities/:id/avatar` ou endpoint multipart equivalente;
  - `GET /api/admin/private/communities/:id/rules`;
  - `POST /api/admin/private/communities/:id/rules`;
  - `PUT /api/admin/private/communities/:id/rules/:ruleId`;
  - `DELETE /api/admin/private/communities/:id/rules/:ruleId` como soft delete.
- Criar modelo Prisma `community_rule`.
- Backfill inicial de regras existentes para comunidades atuais usando a copy canônica hoje exibida no app.
- Atualizar o endpoint público/privado de detalhe de comunidade para retornar regras persistidas, substituindo hardcoded visual por dados reais.
- Persistir alterações com auditoria mínima:
  - se `admin` estiver disponível em `req.auth`, registrar admin responsável em log/metadata quando houver padrão;
  - se ainda não houver modelo de auditoria admin, registrar decisão em ADR e não criar log fake.

## Fora do escopo

- Criar status editável ativa/inativa.
- Criar visibilidade pública/privada.
- Bloquear novos posts/comentários.
- Moderação avançada.
- Resolver denúncias.
- Ações em massa.
- Ordenação padrão do feed.
- Criar editor rico de texto para regras.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: módulos admin, Prisma, validação, upload real e respostas.
- `DATA-MODEL.md`: deve ser atualizado antes do schema se `community_rule` ainda não existir documentado.
- `PACKAGES.md`: usar packages já instalados; não instalar color picker avançado sem ADR.
- `PROTO-INVENTORY.md`: referência visual Admin Comunidade Detalhes.

Backend esperado:

- Modelo sugerido `community_rule`:
  - `id String @id @default(cuid())`
  - `deleted Boolean @default(false)`
  - `deletedAt DateTime? @map("deleted_at")`
  - `createdAt DateTime @default(now()) @map("created_at")`
  - `updatedAt DateTime @default(now()) @updatedAt @map("updated_at")`
  - `community_id String`
  - `title String`
  - `description String`
  - `position Int @default(0)`
  - `active Boolean @default(true)`
  - relação com `community`
  - `@@index([community_id, active, position])`
  - `@@map("community_rules")`
- Atualizar `community`/interfaces para relação com regras.
- Backfill:
  - criar regras padrão para cada comunidade existente, preservando a copy atual do produto;
  - regras sugeridas: respeito e empatia; sem dados pessoais; proibido conteúdo nocivo; psicólogos não fazem atendimento; para atendimento, use o WhatsApp.
- Edição de comunidade:
  - `name`: obrigatório, trim, limite definido;
  - `description`: opcional/obrigatório conforme regra atual, limite definido;
  - cores: validar hex `#RRGGBB`;
  - `avatar_url`: só aceitar URL/path gerado pelo upload real do backend.
- Upload:
  - usar multer/R2 público existente;
  - aceitar apenas imagens;
  - limitar tamanho;
  - remover/substituir avatar antigo apenas se já houver utilitário seguro e decisão clara; caso contrário, registrar cleanup futuro sem apagar às cegas.
- Regras:
  - validar título/descrição;
  - posição numérica;
  - soft delete em remoção;
  - sempre filtrar `deleted=false` para exibição.

Frontend esperado:

- `admin/src/api/req/communities`;
- `admin/src/api/callers/communities`;
- query keys próprias e invalidação após mutations.
- Form de comunidade:
  - nome;
  - descrição;
  - upload/preview de avatar com `next/image`;
  - campos de cor hex com preview;
  - submit real.
- Form/lista de regras:
  - adicionar regra;
  - editar inline ou modal;
  - ordenar por controles acessíveis subir/descer;
  - ativar/desativar;
  - remover com confirmação.
- No app de usuários (`frontend`), a tela pública/privada da comunidade deve consumir regras persistidas quando disponíveis.

Packages usados:

- Nenhum pacote novo por padrão.
- Se usar componente de dialog/select/upload específico, validar `PACKAGES.md` e registrar ADR.

Regras anti-recriação:

- Reutilizar upload existente do backend.
- Reutilizar campos visuais já existentes em `community`.
- Não criar tabela paralela de configurações de comunidade.
- Não manter regras hardcoded como fonte ativa depois da persistência.

Regras de UI obrigatórias:

- Mobile-first obrigatório.
- Nenhum `<img>` cru; usar `next/image`.
- Cores por tokens; os campos de cor editam dados da comunidade, mas a UI do admin continua usando tokens.
- Formulários com RHF/Zod/controllers.

## Critérios de aceite

- [x] A tela de detalhe só abre para admin autenticado.
- [x] Dados de resumo/desempenho/top mentores/posts populares vêm de dados reais.
- [x] Admin consegue editar nome, descrição, avatar e cores da comunidade.
- [x] Avatar usa upload real; sem URL temporária/mock.
- [x] `community_rule` existe no Prisma e migration foi aplicada.
- [x] Comunidades existentes recebem regras padrão reais via backfill/migration/script documentado.
- [x] Admin consegue adicionar, editar, ordenar, ativar/desativar e remover regras com persistência real.
- [x] Tela de comunidade do produto passa a exibir regras persistidas.
- [x] Não foram implementadas configurações fora de escopo como status editável, visibilidade ou bloqueio de posts/comentários.
- [x] Formulários usam React Hook Form, Zod e controllers/fundação alinhada à TASK-02/TASK-46.
- [x] UI mobile-first validada em ~390px, tablet e desktop.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Nenhum `<img>` cru foi usado.
- [x] `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` foi citado como referência visual; Builder/Quick Copy foi usado se disponível.
- [x] `pnpm --dir backend db:migrate`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir admin check`, `pnpm --dir admin build` e `pnpm check` foram executados sem erros.
- [x] Browser local validado com admin real e comunidade real.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local:
  - login admin;
  - abrir detalhe de comunidade;
  - editar nome/descrição/cor;
  - fazer upload de avatar real;
  - criar/editar/ordenar/remover regra;
  - abrir a comunidade no app público/usuário e confirmar regras persistidas.

## Notas de execução

- Se `prisma migrate dev` falhar por conflito com dados/estado local, não resetar banco automaticamente; perguntar antes de comando destrutivo.
- Se R2 público não estiver configurado, bloquear apenas a parte de upload e registrar pendência; não simular avatar.

## Resultado da execução

- Implementado o detalhe administrativo em `/comunidades/[slug]` no app `admin/`, protegido pelo shell/autenticação administrativa já existente.
- Criados endpoints administrativos reais para detalhe, edição, upload de avatar e CRUD/ordenação/ativação de regras.
- Criado o modelo `community_rule` com migration e backfill das cinco regras canônicas para comunidades existentes.
- Atualizado o detalhe de comunidade do produto (`frontend`) para consumir regras persistidas, removendo as regras hardcoded como fonte ativa.
- O upload de avatar foi validado com storage real existente; não foi criada URL temporária, mock ou endpoint simulado.
- Builder/Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a` não estava disponível como ferramenta no ambiente; foi usada a imagem local `_product/proto/admin/Comunidades/Comunidades - Detalhes.png` e a limitação foi registrada no ADR.
- Validações executadas com sucesso: `pnpm --dir backend db:migrate`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.
- Validação local com admin real transitório e comunidade real: API de detalhe/edição/regras/upload, tela Admin em ~390px, 768px e 1440px, e retorno público/privado das regras persistidas.
