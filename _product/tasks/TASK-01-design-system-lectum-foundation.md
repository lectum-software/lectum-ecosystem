# TASK-01: Design System Lectum Foundation

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-01 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Design foundation |
| Status | Completed |
| Dependências | TASK-00 |
| ADR alvo | ADR-0004 |

## Contexto

O frontend atual funciona, mas ainda não está alinhado aos protótipos Lectum. As imagens exportadas e o Quick Copy Builder indicam:

- Fonte: Manrope.
- Fundo app: `#F6F7F8`.
- Card/surface: branco, borda `#E2E8F0` ou `#CBD5E1`.
- Texto forte: `#0F172A`.
- Texto secundário: `#64748B`.
- Texto sutil: `#94A3B8`.
- Azul principal: `#308CE8`.
- Layout mobile-first, largura alvo 390px e containers max 448px.
- Bordas: 12px para cards de escolha, 16px para inputs/botões, 24px para auth cards.

Protótipos base para foundation:

- `_product/proto/Seleção de Perfil.jpg`
- `_product/proto/Login.jpg`
- `_product/proto/Cadastro de Psicólogo.jpg`

O Builder está autenticado e o Quick Copy foi validado. Antes de implementar, o executor deve consultar `PROTO-INVENTORY.md` e complementar a leitura visual pelo Quick Copy quando a ferramenta estiver disponível no cliente.

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Objetivo

Criar a fundação visual do Lectum no frontend para que as próximas telas sejam implementadas de forma consistente, sem remendos por página.

## Pré-requisitos e bloqueios

- Consultar `_product/tasks/PROTO-INVENTORY.md`.
- Usar Builder/Quick Copy quando disponível no cliente; se não estiver acessível, registrar limitação e usar imagens locais.
- Não usar URL temporária de ferramenta visual como asset final.
- Não trocar stack visual para biblioteca nova sem ADR.

## Escopo frontend

- Configurar Manrope como fonte principal no Next.js.
- Definir tokens CSS/Tailwind para cores, radius, shadow, typography e layout mobile-first.
- Criar componentes base do design:
  - `Button`;
  - `Input`;
  - `Checkbox`;
  - `AuthCard`;
  - `Logo`;
  - `DividerWithLabel`;
  - `BottomNavigation`;
  - `PageShell`;
  - `EmptyState`;
  - `InlineAlert`;
  - `LoadingState`.
- Revisar componentes existentes em `frontend/src/components/ui` para seguir o design Lectum.
- Remover estilos visuais que conflitem com os protótipos.
- Garantir que nenhuma tela dependa de asset temporário de ferramenta visual. Assets de logo/ícones essenciais devem ser baixados, versionados ou recriados como componente estável quando permitido.

## Escopo backend

- Nenhuma alteração backend é esperada nesta task.
- Não criar endpoint, seed ou model para preencher componentes visuais.
- Se algum componente exigir dado real, registrar a necessidade para a task funcional correspondente.

## Fora do escopo

- Criar fluxos novos de backend.
- Implementar cadastro completo.
- Implementar busca/comunidade/assinatura.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`, seção Frontend.
- `PACKAGES.md`, seções Frontend já instalado e Frontend candidatos por task.

Arquivos esperados:

- `frontend/src/app/globals.css`: tokens globais, Tailwind v4 e variáveis CSS.
- `frontend/src/app/layout.tsx`: trocar Geist por Manrope usando `next/font/google`.
- `frontend/src/components/ui/*`: componentes base internos do projeto.
- `frontend/src/registry/new-york-v4/ui/*`: adaptar componentes existentes antes de criar novos.
- `frontend/src/templates/auth`, `frontend/src/templates/private`, `frontend/src/templates/public`: shells por tipo de rota.

Packages permitidos nesta task:

- Já instalados: `tailwindcss`, `@tailwindcss/postcss`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react`, `sonner`, `next-themes`.
- Candidatos condicionais: Radix UI apenas para componentes necessários do foundation, como `checkbox`, `label`, `tabs`, `dialog`, `tooltip`, `separator`, `scroll-area`, `avatar`, `switch`, `select`.

Regras anti-recriação:

- Não criar biblioteca de UI paralela fora de `components/ui` ou `registry/new-york-v4/ui`.
- Não criar novos tokens por tela; todo token recorrente deve ir para o foundation.
- Não instalar biblioteca visual completa sem ADR.

## Estados obrigatórios

Componentes base devem prever estados reutilizáveis:

- loading;
- disabled;
- erro;
- sucesso;
- vazio;
- foco;
- hover/pressed quando aplicável;
- responsividade mobile-first.

## Critérios de aceite

- [x] Design tokens Lectum documentados em código e ADR.
- [x] Manrope aplicada globalmente.
- [x] Componentes base criados ou ajustados.
- [x] Login atual continua funcional após troca visual.
- [x] Nenhum asset crítico depende de URL temporária de ferramenta visual.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] `pnpm --dir frontend check` sem erros/warnings.
- [x] `pnpm --dir frontend build` sem erros.
- [x] Validação local da rota de login no dev server.
- [x] ADR criado em `adrs/`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local com `pnpm --dir frontend dev`

## Evidências de execução

- `pnpm --dir frontend check`: aprovado sem erros ou warnings.
- `pnpm --dir frontend build`: aprovado com rotas `/`, `/auth/login`, `/auth/redirect`, `/auth/error` e `/dashboard`.
- `pnpm --dir frontend dev`: servidor local subiu em `http://localhost:3000`.
- `curl -I http://localhost:3000/auth/login`: retornou `HTTP/1.1 200 OK`.
- Limitação registrada: a ferramenta de browser MCP não estava disponível no contexto da execução; a validação visual automatizada foi substituída por smoke test local da rota.

## Notas para executor

Esta task não deve redesenhar uma tela completa além do necessário para validar o foundation. O objetivo é preparar tokens, componentes e shells para que as próximas tasks não criem estilos por página.
