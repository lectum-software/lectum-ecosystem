# TASK-33: Gestão de assinatura e cartão

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-33 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Assinatura |
| Status | Pending |
| Dependências | TASK-02, TASK-32 |
| ADR alvo | ADR de gestão de assinatura e método de pagamento |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Minhas Assinatura - Psicólogo.jpg` | `figma-design-frame-43-Minhas-Assinatura---Psic-logo.html` |
| `_product/proto/Alterar cartão de crédito.jpg` | `figma-design-frame-22-Alterar-cart-o-de-cr-dito.html` |
| `_product/proto/Cartão Alterado com Sucesso.jpg` | `figma-design-frame-56-Cart-o-Alterado-com-Sucesso.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Método de pagamento é dado sensível. O sistema deve delegar cartão ao provedor e só persistir identificadores seguros.

## Objetivo

Permitir que psicólogo veja assinatura atual e altere método de pagamento via gateway real.

## Pré-requisitos e bloqueios

- Alteração de cartão é **delegada ao gateway** e depende do provedor real — **bloqueio TASK-03** (ver `DATA-MODEL.md` › "Assinatura e cobrança"), herdado via TASK-32. Sem gateway, parar e registrar pendência.
- Persistir **apenas `gateway_token`** e dados de exibição (`brand`/`last4`/`exp_month`/`exp_year`). **Nunca** armazenar PAN/CVV. O fluxo permanece agnóstico ao gateway.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/billing`
- `/app/professional/billing/card`

Implementação esperada:

- Criar tela Minha Assinatura.
- Criar fluxo de alteração de cartão via provider/checkout seguro.
- Criar confirmação de cartão alterado.
- Exibir plano, status, próxima cobrança e ações permitidas.
- Não coletar número de cartão diretamente se gateway exige componente hospedado.

## Escopo backend

Implementação esperada:

- Endpoint de assinatura atual.
- Endpoint para iniciar troca de método de pagamento.
- Webhook para confirmar atualização.
- Persistir apenas últimos 4 dígitos/bandeira quando permitido.
- Não cancelar/alterar plano sem confirmação real.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Assinatura e cobrança"; usar nomes/campos exatos, sem inventar):

- `professional_subscription` (leitura: plano, status, `current_period_end`).
- `payment_method` (`gateway_token` + display only `brand/last4/exp_month/exp_year`; **nunca PAN/CVV**).
- `payment_event` (confirmação via webhook; `@@unique([gateway, external_id])`).

Endpoints esperados:

- GET `/api/private/psychologist/billing/subscription`
- POST `/api/private/psychologist/billing/payment-method/session`
- POST `/api/public/billing/webhook` — **verificar assinatura do provedor antes de processar**.

**Guarda de papel:** as rotas de gestão de assinatura/cartão são exclusivas de psicólogo. Vivem sob `/api/private/psychologist/billing/*` e são protegidas por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. O webhook `POST /api/public/billing/webhook` **permanece público** (chamado pelo gateway, não autenticado por usuário; autenticidade via verificação de assinatura do provedor). Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

- Gateway escolhido
- TanStack Query
- Prisma

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
- [ ] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002; o webhook `/api/public/billing/webhook` permanece público.
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
