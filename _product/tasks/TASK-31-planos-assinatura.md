# TASK-31: Planos de assinatura

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-31 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Assinatura |
| Status | Pending |
| Dependências | TASK-03, TASK-18 |
| ADR alvo | ADR de planos profissionais |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Planos de Assinatura.jpg` | `figma-design-frame-5-Planos-de-Assinatura.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Planos aparecem antes do checkout. A task pode listar planos e benefícios, mas compra real depende da decisão de gateway.

## Objetivo

Exibir planos profissionais reais e preparar upgrade sem escolher gateway no código.

## Pré-requisitos e bloqueios

- Gateway de pagamento é **bloqueio TASK-03** (ver `DATA-MODEL.md` › "Assinatura e cobrança"). Sem provedor decidido, esta task entrega **apenas listagem read-only** de planos e da assinatura atual; nenhuma chamada de cobrança.
- Preço do Plano Profissional = `990` centavos (R$ 9,90/mês, PRD §13), em `subscription_plan.price_cents`; preço final confirmado em TASK-03. Não hardcodar preço fora desse modelo.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/billing/plans`

Implementação esperada:

- Criar tela de planos com plano atual e CTAs.
- Buscar planos do backend/config real.
- Destacar limitações do plano atual.
- Se gateway ausente, CTA deve registrar bloqueio/pendência e não simular checkout.
- Não hardcodar preço fora de fonte definida.

## Escopo backend

Implementação esperada:

- Modelar planos ou configurar fonte de planos versionada.
- Endpoint de listagem de planos e assinatura atual.
- Não aceitar plano atual vindo do frontend.
- Registrar regra de features por plano.
- Preparar contrato para checkout da TASK-32.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Assinatura e cobrança"; usar nomes/campos exatos, sem inventar):

- `subscription_plan` (read-only: `slug` `"gratuito"|"profissional"`, `price_cents` = `990` no profissional, `features Json`, `active`).
- `professional_subscription` (status atual da assinatura do psicólogo; somente leitura nesta task).

Endpoints esperados (autogestão do psicólogo; assinatura/billing sob `/api/private/psychologist/billing/*`):

- GET `/api/private/psychologist/billing/plans` — listagem; se vier muitos itens, aplicar paginação do "Contrato padrão de API" (`page`/`limit`).
- GET `/api/private/psychologist/billing/current`

**Guarda de papel:** estes endpoints são exclusivos de psicólogo. Vivem sob `/api/private/psychologist/*` (billing/assinatura sob `/api/private/psychologist/billing/*`) e são protegidos por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

- TanStack Query
- Prisma
- stripe/mercadopago/asaas candidatos condicionais

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

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [ ] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [ ] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
