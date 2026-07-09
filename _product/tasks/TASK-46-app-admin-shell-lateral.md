# TASK-46: Aplicação Admin separada e shell lateral

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-46 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45 |
| ADR alvo | ADR da TASK-45 ou novo ADR caso a estrutura do app `admin/` diverja do planejado |

## Contexto

O painel administrativo deve ser uma aplicação separada do site/app principal. Em produção, o Admin deve poder ser publicado em domínio próprio, consumindo somente APIs reais do backend. O menu lateral definido para a primeira versão contém: Dashboard, Tráfego, Comunidades, Psicólogos, Pacientes, Financeiro, Notificações e Configurações.

A referência visual inicial é `_product/proto/admin/Dashboard.png`, que mostra o padrão de sidebar escura, topo claro, avatar do admin e área de conteúdo com cards.

## Objetivo

Criar o app `admin/` com login administrativo real, sessão separada, rotas protegidas e shell responsivo com menu lateral, sem depender do `frontend/` em runtime.

## Pré-requisitos e bloqueios

- TASK-45 concluída com auth admin real.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Dashboard.png` como referência visual local.
- Não importar código diretamente de `frontend/` como dependência runtime; frontend e admin são aplicações separadas.
- Se for necessário copiar/adaptar fundações de formulário/UI do `frontend`, justificar em ADR e manter o app admin autônomo.

## Escopo frontend

- Criar aplicação `admin/` com Next.js App Router, TypeScript, Tailwind, React Query, Axios, Zod e React Hook Form conforme packages aprovados.
- Criar configuração de ambiente própria:
  - `NEXT_PUBLIC_API_URL`;
  - nomes de cookies/storage separados do app principal.
- Criar fluxo:
  - `/login`;
  - rota protegida inicial `/dashboard`;
  - hidratação de sessão admin via `/api/admin/private/auth/hidrate`;
  - logout.
- Criar shell:
  - sidebar com logo Lectum/admin;
  - menu: Dashboard, Tráfego, Comunidades, Psicólogos, Pacientes, Financeiro, Notificações, Configurações;
  - estado ativo por rota;
  - botão de recolher/expandir no desktop;
  - drawer/menu colapsado em mobile/tablet;
  - topo com sino de notificações e área de perfil admin.
- Criar página placeholder honesta para itens ainda não implementados, sem números ou dados fake.

## Escopo backend

- Nenhum endpoint novo além dos criados na TASK-45, salvo ajustes pequenos de CORS/headers para permitir o app admin em origem separada.

## Fora do escopo

- Criar métricas reais do dashboard.
- Criar telas de Tráfego, Comunidades, Psicólogos, Pacientes, Financeiro, Notificações e Configurações além de placeholders honestos.
- Criar permissões granulares por tipo de admin.
- Instalar biblioteca de gráficos ou tabela.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: separação de aplicações e regras de UI.
- `PACKAGES.md`: não instalar pacotes novos sem necessidade e ADR.
- `PROTO-INVENTORY.md`: referência visual Admin Dashboard.

Frontend esperado:

- Estrutura `admin/` independente, com `package.json`, lockfile próprio quando necessário e scripts:
  - `dev`;
  - `build`;
  - `check`;
  - `typecheck`;
  - `lint`/`biome` se adotado conforme padrão vigente.
- API client admin:
  - enviar `Authorization: Bearer <admin token>`;
  - enviar `x-device`;
  - não reutilizar cookie/token do `frontend`.
- React Query:
  - keys próprias;
  - hooks para login/hydrate/logout.
- Forms:
  - login com React Hook Form + Zod;
  - controllers/fundação local do admin ou adaptação documentada da TASK-02, sem importar runtime de `frontend/`.
- UI:
  - mobile-first obrigatório, mesmo que o visual principal seja desktop;
  - cores por tokens;
  - nenhum `<img>` cru; usar `next/image` quando imagem for necessária;
  - sidebar responsiva e acessível por teclado;
  - labels/aria para menu, recolher, notificações, perfil e logout.

Packages usados:

- Preferir os mesmos packages já aprovados em `frontend`.
- Se `admin/` duplicar dependências, manter versões compatíveis com `PACKAGES.md`.
- Não instalar chart/table libs nesta task.

Regras anti-recriação:

- Antes de criar componentes no admin, consultar padrões equivalentes em `frontend/src/templates`, `frontend/src/components/ui`, `frontend/src/hooks/form` e `frontend/src/api`.
- Não criar design system paralelo; criar apenas a base mínima do admin, compatível com tokens Lectum.
- Qualquer divergência necessária por app separado deve ser registrada em ADR.

## Critérios de aceite

- [ ] App `admin/` existe como aplicação separada e roda localmente.
- [ ] Login admin usa backend real da TASK-45; não existe admin fake no client.
- [ ] Token/cookie/storage admin são separados do frontend de pacientes/psicólogos.
- [ ] Rotas protegidas redirecionam para `/login` quando não há sessão admin válida.
- [ ] Sidebar contém exatamente: Dashboard, Tráfego, Comunidades, Psicólogos, Pacientes, Financeiro, Notificações e Configurações.
- [ ] Shell é mobile-first, responsivo e acessível por teclado.
- [ ] Páginas ainda não implementadas exibem placeholder honesto, sem métricas fake.
- [ ] Nenhum `<img>` cru foi usado.
- [ ] Formulário de login usa React Hook Form, Zod e controllers/fundação local alinhada à TASK-02.
- [ ] `_product/proto/admin/Dashboard.png` foi citado como referência visual; Builder/Quick Copy foi usado se disponível.
- [ ] `pnpm --dir admin check`, `pnpm --dir admin build` e checks relevantes foram executados sem erros.
- [ ] ADR criado ou atualizado em `adrs/` se a estrutura do app/admin forms/tokens exigir decisão nova.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir backend check` se houver ajuste de CORS/headers/backend
- Browser local:
  - login com admin real;
  - hydrate/refresh;
  - logout;
  - sidebar desktop;
  - drawer/colapso mobile.

## Notas de execução

- Se o app admin precisar de porta local própria, documentar no README do `admin/` e em scripts raiz somente se isso não transformar o repositório em monorepo operacional.
- Não usar dados de exemplo nos cards do Dashboard; a TASK-48 cria as métricas reais.
