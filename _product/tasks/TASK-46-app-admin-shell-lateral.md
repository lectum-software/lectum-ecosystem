# TASK-46: Aplicação Admin separada e shell lateral

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-46 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
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

- [x] App `admin/` existe como aplicação separada e roda localmente.
- [x] Login admin usa backend real da TASK-45; não existe admin fake no client.
- [x] Token/cookie/storage admin são separados do frontend de pacientes/psicólogos.
- [x] Rotas protegidas redirecionam para `/login` quando não há sessão admin válida.
- [x] Sidebar contém exatamente: Dashboard, Tráfego, Comunidades, Psicólogos, Pacientes, Financeiro, Notificações e Configurações.
- [x] Shell é mobile-first, responsivo e acessível por teclado.
- [x] Páginas ainda não implementadas exibem placeholder honesto, sem métricas fake.
- [x] Nenhum `<img>` cru foi usado.
- [x] Formulário de login usa React Hook Form, Zod e controllers/fundação local alinhada à TASK-02.
- [x] `_product/proto/admin/Dashboard.png` foi citado como referência visual; Builder/Quick Copy foi usado se disponível.
- [x] `pnpm --dir admin check`, `pnpm --dir admin build` e checks relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/` se a estrutura do app/admin forms/tokens exigir decisão nova.
- [x] Commit criado com mensagem convencional e `git push` executado.

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


## Registro de execução

- Concluída em 2026-07-09.
- Criado app `admin/` separado, com Next.js App Router na porta local `3002`, login real via backend da TASK-45 e storage `lectum.admin.*`.
- Builder/Quick Copy não estava disponível nas ferramentas do ambiente; a referência visual usada foi `_product/proto/admin/Dashboard.png`.
- Validações executadas: `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm --dir admin audit --prod`, `pnpm check`, smoke HTTP local em `/login` e `/dashboard`, e smoke API real de login/hidrate/logout com admin temporário removido ao final.

## Correção de conectividade local em 2026-07-20

- Diagnóstico de regressão operacional: o Admin em `localhost:3002` apontava corretamente para `localhost:3001`, mas o backend não estava escutando na porta durante o submit do login.
- Ajustado o erro de rede do Admin para informar a URL efetiva da API e orientar a verificação do backend/`NEXT_PUBLIC_API_URL`, sem criar mock ou fallback simulado.
- Ajustado `backend` dev watcher para ignorar `src/external/generated/prisma/**`, evitando reinícios por artefatos gerados durante `prisma generate`.
- ADR registrado: `adrs/0288-admin-login-backend-dev-conectividade.md`.
