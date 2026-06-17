# ADR-0018: Shell privado mobile-first e navegação por papel

## Status

Accepted

## Task relacionada

TASK-12: Shell privado mobile.

## Contexto

As primeiras rotas privadas já existiam em caminhos transitórios como `/dashboard`,
`/patient/welcome` e `/app/professional/billing/plans`. A TASK-12 define `/app` como prefixo
canônico para telas internas e exige que o shell compartilhe header, container responsivo,
navegação inferior e estados de sessão sem recriar layout por página.

As referências visuais consultadas foram as imagens locais:

- `_product/proto/Psicólogos.jpg`;
- `_product/proto/Feed Comunidade.jpg`;
- `_product/proto/Notificações.jpg`;
- `_product/proto/Perfil do paciente.jpg`;
- `_product/proto/Perfil - Psicólogo.jpg`.

Builder/Quick Copy não estava disponível como ferramenta direta nesta sessão, então foi usado o
fallback auditável das imagens exportadas.

## Decisão

- O prefixo privado canônico do frontend passa a ser `/app`.
- `frontend/src/templates/private` centraliza:
  - header sticky mobile-first;
  - container responsivo;
  - estado inicial de sessão;
  - erro de sessão em PT-BR;
  - bottom nav fixa com ícones `lucide-react`;
  - ramificação da navegação a partir de `user.role`.
- O shell lê a sessão real por `GET /api/private/auth/hidrate` e atualiza a store persistida com o
  `user` retornado, sem criar endpoint `/me`.
- As rotas base criadas ou ajustadas são:
  - `/app`;
  - `/app/psychologists`;
  - `/app/community`;
  - `/app/notifications`;
  - `/app/profile`;
  - `/app/favorites`, adicionada para não deixar o item obrigatório da navegação inferior sem rota.
- Rotas sem API real nesta task exibem estado vazio honesto e não usam mock, seed ou dado fake.
- A conclusão do onboarding do paciente passa a redirecionar para `/app`, não mais para
  `/dashboard`.
- O backend mantém `requireRole(...)` como fronteira de segurança fail-closed e consolida os mounts
  de namespaces role-only em `write.ts`:
  - `/api/private/patient/*` com `_auth` + `requireRole("paciente")`;
  - `/api/private/psychologist/*` com `_auth` + `requireRole("psicologo")`.
- O boot do backend valida os mounts registrados e falha se uma rota sob esses namespaces for
  registrada sem o papel esperado.
- O frontend pode esconder/mostrar atalhos por papel, mas a autorização real continua no backend.

## Consequências

- Tasks futuras de descoberta, comunidade, perfil e conta podem reaproveitar `PrivateTemplate` em
  vez de recriar header/bottom nav.
- `/dashboard` permanece apenas como rota transitória legada; novos destinos privados devem usar
  `/app`.
- A navegação para áreas ainda não implementadas fica disponível com estados vazios, sem falsa
  conclusão de listagens ou feeds.
- O shell depende da sessão hidratada real; se a API privada estiver indisponível sem usuário
  persistido, o usuário vê erro de sessão em PT-BR.
- Tokens de papel divergente seguem bloqueados pelo servidor, independentemente da navegação
  exibida no cliente.

## Validações

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke real de autorização:
  - paciente em `/api/private/psychologist/billing/plans` retornou `403`;
  - psicólogo em `/api/private/patient/profile` retornou `403`.
- Browser local headless em `390x844` validou `/app/profile` com cookie real, sessão hidratada,
  header e bottom nav. Usuários temporários de smoke foram removidos do banco.

## Atualização em 2026-06-05: shell privado sem cabeçalho

### Contexto

Produto solicitou remover o cabeçalho das telas do shell privado, mantendo a navegação inferior
como principal elemento persistente do layout interno.

### Decisão

- `PrivateTemplate` não renderiza mais o header privado.
- A prop `showHeader` permanece aceita por compatibilidade com páginas existentes, mas não altera a
  renderização enquanto o shell privado estiver definido como sem cabeçalho.
- A navegação inferior, hidratação real de sessão e estados de loading/erro permanecem inalterados.

### Consequências

- As telas internas começam diretamente pelo conteúdo da página, alinhadas ao pedido visual atual.
- Ações antes disponíveis no cabeçalho, como sair ou alternar tema, continuam acessíveis nas telas de
  perfil/configuração já existentes ou futuras.

### Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local headless em `390x844` validou `/app/profile` com `hasHeader=false` e `navCount=1`.

## Atualização em 2026-06-12: menu lateral desktop para telas com bottom nav

### Contexto

Produto definiu que toda tela que usa a navegação inferior no mobile deve adotar, no desktop (`>=1024px`), o mesmo padrão visual já usado na experiência de Psicólogos: bottom nav oculta e menu lateral esquerdo fixo. O perfil público do psicólogo não entra nesta regra porque não renderiza a navegação do shell.

### Decisão

- O `PrivateTemplate` passa a usar `desktopNavigation="sidebar"` como padrão.
- A bottom nav continua inalterada no mobile e recebe `lg:hidden` no shell.
- O menu lateral desktop é renderizado uma única vez pelo shell, com logo Lectum, itens com ícone e texto, destaque em azul para o item ativo e itens secundários em tom neutro.
- O conteúdo das telas que renderizam a navegação recebe `lg:pl-[240px]` e `lg:pb-8` para respeitar a largura da sidebar sem alterar o layout mobile.
- Rotas públicas que usam `showNavigation={false}`, como `/app/psychologist/[id]`, permanecem sem adaptação de sidebar.
- A rota singular `/app/psychologist/*` passa a ativar o item Psicólogos quando estiver em uma tela interna que renderiza o shell com navegação.

### Consequências

- Telas como Psicólogos, Favoritos, Comunidade, Notificações e Perfil passam a compartilhar a mesma navegação desktop sem duplicar componentes por página.
- O layout mobile permanece intacto.
- Telas que já optam por `showNavigation={false}` ou `showHeader={false}` continuam sem navegação global, preservando fluxos específicos de perfil público, setup ou billing.

Validações do ajuste desktop:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/HTTP em `localhost:3000`: `/app/psychologists`, `/app/profile`, `/app/community` e `/app/psychologist/test-public` responderam `200`, preservando acesso às rotas e mantendo o perfil público fora do shell com navegação.

## Atualizacao em 2026-06-12: sidebar desktop recolhivel e perfil publico

### Contexto

Produto solicitou que o menu lateral desktop do shell pudesse ser recolhido/expandido e que o Perfil Publico do Psicologo tambem exibisse essa navegacao no desktop, sem alterar o mobile.

### Decisao

- O `PrivateTemplate` centraliza o estado recolhido/expandido da sidebar desktop.
- A preferencia e salva em `localStorage` sob `lectum.desktopSidebar`, com telas internas expandidas por padrao quando nao ha valor salvo.
- O estado recolhido usa largura de 88px, exibe somente icones, mantem destaque ativo e usa `title` nos links para tooltip nativo; o estado expandido preserva logo, icones e textos.
- A compensacao lateral do conteudo acompanha a largura efetiva da sidebar (`lg:pl-[240px]` ou `lg:pl-[88px]`).
- A rota publica `/app/psychologist/[id]` passa a renderizar apenas a sidebar desktop (`showMobileNavigation={false}`), iniciando recolhida por padrao se nao houver preferencia salva. O mobile do perfil publico continua sem navegacao global.

### Consequencias

- A navegacao desktop fica mais flexivel em telas largas, sem duplicar componentes por pagina.
- O perfil publico ganha acesso ao menu global no desktop, mas preserva a experiencia mobile e o foco no conteudo do psicologo.
- A preferencia salva e compartilhada entre perfil publico e telas internas.

### Validacoes

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6` respondeu `200`.
- HTTP local em `/app/psychologists` respondeu `200`.

## Atualizacao em 2026-06-17: posicao padronizada do bloqueio de acesso anonimo

### Contexto

As rotas publicamente acessiveis que dependem de sessao para mostrar dados privados (`/app/profile`, `/app/notifications` e `/app/favorites`) usam o mesmo card de acesso bloqueado. Como `/app/favorites` customizava o `contentClassName` do shell para remover padding e expandir largura, o card anonimo herdava esse layout e ficava visualmente mais alto/desalinhado que Perfil e Notificacoes.

### Decisao

- Separar no `PrivateTemplate` as classes de compensacao global de navegacao (`navigationAwarePageShellClassName`) das classes especificas de cada pagina (`contentClassName`).
- O estado de sessao carregando e o estado bloqueado sem token usam somente as classes globais do shell, sem herdar `contentClassName` da rota.
- O conteudo autenticado continua usando `pageShellClassName`, preservando os layouts customizados de Favoritos e demais telas.

### Consequencias

- O card de usuario nao autenticado fica no mesmo eixo visual em Perfil, Notificacoes e Favoritos no mobile e no desktop.
- Telas com layout customizado continuam podendo ajustar o conteudo autenticado sem afetar o bloqueio compartilhado.
- Nao houve mudanca de contrato, rotas, autenticacao, backend, Prisma, persistencia ou packages.

### Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP sem sessao em mobile 390px e desktop 1280px confirmou `topSpread=0` e `leftSpread=0` para `/app/profile`, `/app/notifications` e `/app/favorites`.
