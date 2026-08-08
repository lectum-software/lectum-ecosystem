# TASK-12: Shell privado mobile

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-12 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Infra UI |
| Status | Completed |
| Dependências | TASK-06, TASK-08 ou TASK-11 |
| ADR alvo | ADR de navegação privada mobile |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Psicólogos.jpg` | `figma-design-frame-15-Psic-logos.html` |
| `_product/proto/Feed Comunidade.jpg` | `figma-design-frame-3-Feed-Comunidade.html` |
| `_product/proto/Notificações.jpg` | `figma-design-frame-17-Notifica--es.html` |
| `_product/proto/Perfil do paciente.jpg` | `figma-design-frame-30-Perfil-do-paciente.html` |
| `_product/proto/Perfil - Psicólogo.jpg` | `figma-design-frame-19-Perfil---Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

As telas internas compartilham topo, fundo, cards e navegação inferior. Esta task evita recriar layout por página e reduz risco de inconsistência visual.

## Objetivo

Criar o shell privado mobile-first com navegação, proteção e áreas por perfil, servindo de base para todas as telas internas.

## Pré-requisitos e bloqueios

- Depende de sessão real e ao menos um perfil cadastrado.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Prefixo canônico das telas privadas: `/app` (ver `DATA-MODEL.md`, "Convenção de rotas"). Esta task define esse prefixo e as tasks seguintes o reaproveitam. A navegação inferior segue o PRD §6 (Psicólogos, Favoritos, Comunidade, Notificações, Perfil).

Rotas esperadas:

- `/app`
- `/app/psychologists`
- `/app/community`
- `/app/notifications`
- `/app/profile`

Implementação esperada:

- Criar/ajustar `frontend/src/templates/private` com header, bottom nav e container responsivo.
- Integrar `proxy.ts` e sessão persistida sem loops.
- Ramificar a navegação por `user.role` (`"paciente" | "psicologo"`, ver `DATA-MODEL.md`), lido da sessão hidratada via `GET /api/private/auth/hidrate`.
- Criar estados globais de carregamento de sessão e fallback de rota.
- Garantir que cada item da navegação use ícone `lucide-react`.

## Escopo backend

Implementação esperada:

- Reusar o endpoint de sessão real `GET /api/private/auth/hidrate`, que já retorna `user`. Não inventar `/me`.
- O shell lê `user.role` (ver `DATA-MODEL.md`, "Decisão estrutural") da sessão hidratada para ramificar a navegação entre paciente e psicólogo.
- Não criar endpoint de shell sem necessidade; usar contrato de sessão existente.
- Se o shell precisar de flags de onboarding (`patient_profile.onboarding_completed_at`) ou status profissional (`psychologist_profile.crp_status`/`published`), expô-los no payload de `hidrate` ou via endpoint da TASK-08/11 — sem inventar campos além do que `DATA-MODEL.md` define.

Guarda de papel (estabelecer aqui — ver `DATA-MODEL.md`, "Camadas de autenticação e autorização", e `adrs/0002-arquitetura-auth-roles.md`):

- Criar o middleware `requireRole(...)` (fail-closed: papel divergente → `403`), aplicado **depois** do `_auth`.
- Aplicá-lo **por namespace no mount** em `backend/src/main/server/imports/write.ts`: `/api/private/psychologist/*` → `requireRole("psicologo")`; `/api/private/patient/*` → `requireRole("paciente")`; `/api/private/directory/*`, `/api/private/community/*`, `/api/private/posts/*`, notificações e conta → só `_auth`.
- A navegação por `user.role` no frontend é apenas UX; a fronteira de segurança é o middleware no servidor.
- Adicionar check no boot que falhe se rota sob `/psychologist/*` ou `/patient/*` subir sem o `requireRole` correspondente.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `user` (campo `user.role`)
- `patient_profile`
- `psychologist_profile`

Endpoints esperados:

- GET `/api/private/auth/hidrate` (sessão real; retorna `user` com `role`)

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- Next.js App Router
- Redux Toolkit em memória + hidratação da sessão pela API
- TanStack Query
- lucide-react

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Middleware `requireRole(...)` criado, fail-closed, aplicado por namespace no `write.ts` conforme `DATA-MODEL.md`/ADR-0002.
- [x] Smoke test: token de paciente recebe `403` em rota psicólogo-only e vice-versa.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Execução

- Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; a validação visual
  usou as imagens locais obrigatórias de `_product/proto`.
- Rotas criadas/ajustadas no prefixo canônico `/app`: `/app`, `/app/psychologists`,
  `/app/community`, `/app/notifications`, `/app/profile`; a rota adicional
  `/app/favorites` foi criada para manter o item obrigatório da navegação inferior do PRD sem
  usar dados simulados.
- `PrivateTemplate` passou a hidratar a sessão real via `GET /api/private/auth/hidrate`, exibir
  loading/erro de sessão e renderizar navegação inferior mobile-first com ícones `lucide-react`.
- O onboarding do paciente passou a encaminhar para `/app` após conclusão, substituindo o destino
  transitório `/dashboard`.
- O backend manteve o contrato real de sessão e consolidou mounts role-only com `_auth` seguido de
  `requireRole(...)`, além de check de boot para namespaces `/api/private/patient/*` e
  `/api/private/psychologist/*`.
- Smoke de autorização real: token de paciente retornou `403` em
  `/api/private/psychologist/billing/plans`; token de psicólogo retornou `403` em
  `/api/private/patient/profile`. Usuários temporários foram removidos ao final.
- Browser local headless em viewport mobile `390x844` validou `/app/profile` com cookie real,
  sessão hidratada, header e bottom nav. Usuário temporário removido ao final.
- Validações executadas:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm check`

### Ajuste posterior em 2026-06-05

- Produto solicitou remover o cabeçalho das telas do shell privado.
- `PrivateTemplate` passou a renderizar somente conteúdo e navegação inferior, mantendo hidratação de
  sessão, loading/erro e bottom nav.
- ADR atualizado: `adrs/0018-shell-privado-mobile.md`.
- Validações executadas no ajuste:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - Browser local headless em viewport mobile `390x844` validou `/app/profile` com
    `hasHeader=false` e `navCount=1`.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

### Ajuste complementar em 2026-06-12: sidebar desktop padronizada

- O shell privado continua mobile-first: abaixo de `1024px`, a navegação inferior permanece igual.
- A partir de `1024px`, toda tela que renderiza a navegação do `PrivateTemplate` passa a ocultar a bottom nav e exibir menu lateral esquerdo fixo com os mesmos itens: Psicólogos, Favoritos, Comunidade, Notificações e Perfil.
- O perfil público do psicólogo permanece fora da regra porque usa `showNavigation={false}`.
- O conteúdo das telas com navegação recebe compensação lateral no desktop para não ficar sob a sidebar, preservando a largura confortável dos containers existentes.
- O item Psicólogos também considera rotas singulares `/app/psychologist/*` como ativas quando alguma tela interna com navegação apontar para um perfil/contato de psicólogo.
- Não houve alteração de rotas, dados, autenticação, backend, Prisma ou packages.

Validações do ajuste desktop:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/HTTP em `localhost:3000`: `/app/psychologists`, `/app/profile`, `/app/community` e `/app/psychologist/test-public` responderam `200`, preservando acesso às rotas e mantendo o perfil público fora do shell com navegação.

### Ajuste complementar em 2026-06-12: sidebar desktop recolhivel e perfil publico

- O `PrivateTemplate` passou a suportar menu lateral desktop recolhivel, mantendo o mobile inalterado com bottom nav.
- O estado expandido exibe logo Lectum, icones e textos; o estado recolhido reduz a largura para 88px, exibe somente icones e mantem `title` nos links para apoio de tooltip nativo.
- A preferencia do usuario e persistida em `localStorage` com a chave `lectum.desktopSidebar`; sem preferencia salva, telas internas seguem expandidas por padrao.
- O conteudo principal acompanha automaticamente a largura do menu com padding desktop de 240px ou 88px, sem alterar o layout mobile.
- A rota publica `/app/psychologist/[id]` passou a renderizar a sidebar apenas em desktop, sem bottom nav no mobile. Nessa rota, o padrao sem preferencia salva e iniciar recolhida para preservar foco no perfil.
- O item `Psicologos` permanece ativo nas rotas singulares `/app/psychologist/*`.
- Nao houve alteracao de dados, autenticação, rotas, backend, Prisma, packages ou componentes internos das telas.

Validacoes do ajuste:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6` respondeu `200`.
- HTTP local em `/app/psychologists` respondeu `200`.


### Ajuste complementar em 2026-06-14: sidebar desktop orientada por rotas principais

- Produto solicitou que, no desktop, a sidebar seja navegacao principal expandida apenas nas cinco areas centrais: `/app/psychologists`, `/app/favorites`, `/app/community/feed`, `/app/notifications` e `/app/profile`.
- O `PrivateTemplate` passou a derivar o default recolhido/expandido por rota: rotas principais iniciam expandidas; telas secundarias e internas iniciam recolhidas.
- A persistencia manual do usuario foi escopada por rota (`lectum.desktopSidebar:{pathname}`), evitando que uma escolha em tela secundaria force todas as demais telas a desrespeitarem o default de produto.
- A faixa azul/estado ativo da sidebar desktop agora aparece somente quando o `pathname` corresponde exatamente a uma das cinco rotas principais e ao `href` do item.
- A bottom navigation mobile continua usando o calculo anterior por prefixos, preservando o comportamento abaixo de `lg`.
- Nao houve alteracao de rotas, dados, autenticação, backend, Prisma, migrations, packages ou componentes internos das telas.
- ADR criado: `adrs/0084-sidebar-desktop-rotas-principais.md`.

Validacoes do ajuste:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em rotas principais e secundarias representativas de `/app`.

### Ajuste complementar em 2026-06-14: controle da sidebar integrado ao divisor

- Produto solicitou novo refinamento visual do controle desktop de expandir/recolher a sidebar para remove-lo da area da marca Lectum.
- O `PrivateTemplate` passou a renderizar o controle como um pequeno handle circular preso a linha divisoria direita do menu lateral, alinhado ao topo do sidebar sem ocupar espaco no cabecalho.
- O controle usa seta simples: apontando para esquerda quando o menu esta expandido e rotacionando para direita quando o menu esta recolhido.
- A marca Lectum volta a ser o unico elemento dominante do cabecalho, sem quebra de linha, sem deslocamento de avatar/nome e sem botao dentro do flex da marca.
- A alteracao afeta somente o desktop (`lg:flex`); mobile e bottom navigation permanecem inalterados.
- Nao houve alteracao de rotas, dados, autenticacao, backend, Prisma, migrations, packages ou componentes internos das telas.
- ADR atualizado: `adrs/0079-controle-sidebar-desktop-moderno.md`.

Validacoes do ajuste:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/psychologists` respondeu `200`.

### Ajuste complementar em 2026-06-16: sidebar desktop recolhida em telas de conteudo focado

- Produto solicitou que as telas de Avaliacoes feitas, Minhas Avaliacoes do profissional, E-mail e senha e Meus posts e respostas exibam a sidebar desktop recolhida por padrao para liberar area util do conteudo.
- As rotas ajustadas foram: `/app/reviews`, `/app/professional/reviews`, `/app/settings/account` e `/app/posts/mine`.
- Cada tela passou a renderizar o `PrivateTemplate` com `desktopSidebarDefaultCollapsed` e `showMobileNavigation={false}`, mantendo o mobile sem navegacao global como antes e adicionando apenas a sidebar recolhida no desktop.
- A expansao manual continua disponivel pelo controle do menu lateral e segue a persistencia por rota ja definida para a sidebar desktop.
- Nao houve alteracao de dados, autenticacao, backend, Prisma, migrations, packages, rotas principais, Feed, Comunidades, Psicologos, Favoritos ou Perfil.
- ADR atualizado: `adrs/0084-sidebar-desktop-rotas-principais.md`.

Validacoes do ajuste:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Chrome/CDP autenticado em desktop 1280px nas quatro rotas confirmou sidebar presente, largura 88px e controle `Expandir menu lateral`.
- Chrome/CDP autenticado em mobile 390px confirmou sidebar oculta e ausencia de bottom navigation adicional nas quatro rotas.

### Ajuste complementar em 2026-06-16: header secundario oficial

- Produto definiu o header de `/app/notifications` como padrao visual oficial para telas secundarias: sem card branco, sem container destacado, titulo forte alinhado a esquerda e melhor aproveitamento horizontal.
- Foi criado o componente compartilhado `SecondaryPageHeader`, preservando o mesmo modelo do header de Notificacoes e adicionando suporte opcional a acao direita ou botao de voltar a esquerda.
- As rotas ajustadas foram: `/app/reviews`, `/app/settings/account`, `/app/posts/mine`, `/app/following` e `/app/posts/saved`.
- Os headers antigos com fundo branco, borda sticky, centralizacao e acoes extras foram removidos dessas telas.
- O header de `/app/notifications` passou a usar o mesmo componente compartilhado para manter a fonte visual ativa em um unico lugar.
- Nao houve alteracao de rotas, ordenacao, dados, autenticacao, backend, Prisma, migrations ou packages.
- Builder/Quick Copy nao estava exposto como ferramenta no ambiente; a referencia ativa foi o proprio header implementado em `/app/notifications`.
- ADR criado: `adrs/0111-header-secundario-oficial-notificacoes.md`.

Critérios de aceite do ajuste:

- [x] Avaliacoes feitas usa o header secundario oficial com voltar.
- [x] E-mail e Senha usa o header secundario oficial com voltar.
- [x] Meus Posts e Respostas usa o header secundario oficial com voltar.
- [x] Comunidades Seguidas usa o header secundario oficial com voltar.
- [x] Salvos usa o header secundario oficial com voltar.
- [x] Os headers antigos em card/container branco foram removidos das telas alvo.
- [x] O header de Notificacoes permanece com a mesma aparencia e foi convertido para o componente compartilhado.

Validacoes do ajuste:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em mobile 390px e desktop 1280px confirmou titulo, botao de voltar quando aplicavel, ausencia de fundo/sombra/borda de card no header e rota correta em `/app/notifications`, `/app/reviews`, `/app/settings/account`, `/app/posts/mine`, `/app/following` e `/app/posts/saved`.

### Ajuste complementar em 2026-06-17: posicao padronizada do bloqueio de acesso anonimo

- Produto solicitou que o card de usuario nao autenticado apareca no mesmo eixo visual em Perfil, Notificacoes e Favoritos.
- O `PrivateTemplate` passou a separar classes de navegacao/compensacao do shell (`pb` mobile e `pl` desktop) das classes de conteudo especificas de cada rota.
- O estado de acesso bloqueado agora usa apenas o container compartilhado do shell e nao herda `contentClassName` da pagina, evitando que `/app/favorites` aplique `pt-0`, `px-0` ou `max-w-none` ao card anonimo.
- Perfil, Notificacoes e Favoritos mantem o mesmo espacamento superior e o mesmo centro horizontal/vertical no mobile e no desktop.
- Nao houve alteracao de rotas, autenticacao, backend, Prisma, migrations, packages ou conteudo autenticado das telas.

Validacoes do ajuste:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP sem sessao em mobile 390px e desktop 1280px confirmou `topSpread=0` e `leftSpread=0` para o card bloqueado em `/app/profile`, `/app/notifications` e `/app/favorites`, sem overflow horizontal.
