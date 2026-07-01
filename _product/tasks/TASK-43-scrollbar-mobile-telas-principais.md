# TASK-43: Scrollbar mobile app-like em telas principais

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-43 |
| Prioridade | P2 |
| Esforço | S |
| Fase | Refinos mobile |
| Status | Completed |
| Dependências | TASK-12, TASK-23, TASK-25, TASK-40 |
| ADR alvo | ADR-0197 |

## Contexto

A experiência mobile da Lectum deve se aproximar de um aplicativo instalado em telas principais de navegação contínua, especialmente o feed público/comunitário e a descoberta de psicólogos. A decisão de produto desta task é ocultar somente a barra visual de rolagem no mobile/tablet para os scrolls principais dessas telas, preservando o comportamento de scroll e mantendo barras visíveis no desktop e em containers internos.

Referências visuais consultadas em `_product/tasks/PROTO-INVENTORY.md`:

- `_product/proto/Feed Comunidade.jpg` (414x2525), TASK-23.
- `_product/proto/Dentro da Comunidade.jpg` (414x1763), TASK-25.
- `_product/proto/Psicólogos.jpg` (390x1380), TASK-13.

Builder Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execução, o Quick Copy não estava exposto como ferramenta MCP chamável no ambiente; por isso a validação visual usou o inventário e as imagens locais como fallback auditável.

## Objetivo

Em telas principais mobile-first com scroll contínuo, o usuário rola normalmente por gesto, sem ver a barra de rolagem visual. No desktop, a barra permanece disponível. Scrollbars de containers internos, modais, menus e listas com overflow próprio não recebem a nova regra global desta task.

## Pré-requisitos e bloqueios

- Sem requisito externo.
- Sem alteração de banco, schema Prisma ou migration.
- Sem instalação de package.
- Seguir `ARCHITECTURE.md` para mobile-first e preservação de componentes existentes.
- Seguir `PACKAGES.md`; não há package novo.

## Escopo frontend

- Criar utilitário CSS explícito para ocultar scrollbar visual do scroll principal somente até o breakpoint não-desktop (`max-width: 1023px`).
- Aplicar o utilitário apenas nas telas principais de comunidade/feed e descoberta de psicólogos:
  - feed agregado (`/`, `/community/feed` e compatibilidades que reutilizam `CommunityFeedLogic`);
  - detalhe/feed de comunidade (`/community/[slug]` e equivalente autenticado);
  - descoberta de psicólogos (`/psychologists` e equivalente autenticado).
- Ajustar o feed vertical de psicólogos para deixar a scrollbar visível no desktop, ocultando apenas no layout mobile/tablet.

## Escopo backend

- Nenhum.

## Fora do escopo

- Ocultar scrollbars globalmente em todo o produto.
- Alterar containers internos, modais, drawers, selects, carrosséis ou listas internas.
- Mudar navegação, dados, endpoints, mocks ou regras de domínio.
- Instalar packages.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md` → Frontend, Regras de UI, Templates/shells e anti-recriação.
- `PACKAGES.md` → Política de não instalar package sem necessidade.
- `PROTO-INVENTORY.md` → telas de feed/comunidade/psicólogos.

Frontend esperado:

- `frontend/src/app/globals.css` define `.lectum-mobile-main-scrollbar-hidden` com escopo mobile/tablet.
- A classe usa `:has(.lectum-mobile-main-scrollbar-hidden)` para afetar o scrollbar do viewport apenas quando a tela principal opt-in estiver presente.
- A regra não seleciona descendentes com overflow próprio, preservando containers internos.
- `frontend/src/app/app/community/[slug]/logic.tsx` marca os shells principais de feed e comunidade.
- `frontend/src/app/app/psychologists/logic.tsx` marca a tela principal e limita a ocultação do container vertical ao mobile/tablet.

Packages usados:

- Nenhum package novo.

Regras de UI obrigatórias:

- Mobile-first: a alteração é ativada primeiro em telas mobile/tablet e removida no desktop (`lg`, `min-width: 1024px`).
- Nenhum `<img>` novo foi criado.
- Cores/tokens não foram alterados.
- Formulários/campos não foram alterados.

## Critérios de aceite

- [x] Feed agregado/comunidade em mobile/tablet oculta a barra visual do scroll principal sem bloquear rolagem.
- [x] Tela de psicólogos em mobile/tablet oculta a barra visual do feed vertical, mas mantém scrollbar visível no desktop.
- [x] Containers internos não recebem a nova regra global; apenas telas com opt-in usam `.lectum-mobile-main-scrollbar-hidden`.
- [x] UI mobile-first; nenhum `<img>` cru novo foi usado.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos não foram alterados; TASK-02 não se aplica.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais de `_product/proto` foram citadas quando houver UI.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Browser local em viewport mobile (~390px) e desktop para verificar comportamento visual.

## Notas de execução

A mudança é deliberadamente opt-in por classe para evitar que scrollbars de containers internos sejam ocultadas de forma acidental. Caso uma nova tela principal queira o mesmo comportamento, deve aplicar a classe ao shell principal e registrar a decisão na task correspondente.

## Evidências de validação

- `pnpm --dir frontend check` concluído sem erros em 2026-07-01.
- `pnpm --dir frontend build` concluído sem erros em 2026-07-01.
- Browser local via Chrome headless em `http://localhost:3000/` e `http://localhost:3000/psychologists`:
  - mobile 390x844: `html/body` com `scrollbar-width: none` nas telas opt-in; `.psychologists-video-feed` com `scrollbar-width: none`.
  - desktop 1440x1000: `html/body` com `scrollbar-width: auto`; `.psychologists-video-feed` com `scrollbar-width: auto`.
