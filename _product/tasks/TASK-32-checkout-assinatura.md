# TASK-32: Checkout de assinatura

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-32 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Assinatura |
| Status | Pending |
| Dependências | TASK-02, TASK-03, TASK-31 |
| ADR alvo | ADR de checkout e gateway de pagamento |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Finalizar Assinatura - Psicólogo.jpg` | `figma-design-frame-40-Finalizar-Assinatura---Psic-logo.html` |
| `_product/proto/Endereço de Faturamento - Layout Ajustado.jpg` | `figma-design-frame-25-Endere-o-de-Faturamento---Layout-Ajustado.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Esta task não pode avançar sem gateway real. O frontend pode coletar endereço e iniciar sessão de pagamento, mas não pode simular pagamento aprovado.

## Objetivo

Implementar checkout real de assinatura com endereço de faturamento e gateway decidido.

## Pré-requisitos e bloqueios

- Provedor **decidido: Mercado Pago** (ADR-0003; ver `DATA-MODEL.md` › "Assinatura e cobrança"). O bloqueio restante são as **credenciais** (access token + public key, sandbox/prod): sem elas, construir o fluxo/adapter mas **não** transacionar ao vivo nem ativar assinatura — parar e registrar pendência.
- O fluxo deve ser **agnóstico ao gateway**: implementar atrás da porta `PaymentGateway`; só `MercadoPagoAdapter` conhece o MP. Nenhum import do SDK do MP fora do adapter.
- Cartão tokenizado **client-side** (Checkout Bricks); PAN/CVV nunca tocam o backend. Persistir apenas `payment_method.gateway_token` + display; nunca PAN/CVV.
- CEP via controller `cep` da TASK-02; não criar consulta de CEP paralela.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/billing/checkout`
- `/app/professional/billing/address`

Implementação esperada:

- Criar tela de checkout e endereço de faturamento.
- Validar dados fiscais/endereço com Zod (fundação TASK-02; CEP via controller `cep`).
- Coletar e tokenizar o cartão com o **Card Payment Brick do Mercado Pago** (SDK MP no client); enviar ao backend apenas o `card_token` (nunca PAN/CVV).
- Exibir erro de pagamento, pendente e sucesso conforme retorno real (status normalizado do `DATA-MODEL.md`).
- Não armazenar dados sensíveis de cartão no frontend fora do provedor.

## Escopo backend

Implementação esperada:

- Implementar a porta `PaymentGateway` + `MercadoPagoAdapter` (ver `DATA-MODEL.md` › "Abstração de gateway"); o service depende da porta, não do SDK.
- Criar a assinatura via **Preapproval** do MP com o `card_token` recebido (`auto_recurring` mensal, `external_reference` = `professional_subscription.id`); guardar o `id` do preapproval em `gateway_subscription_id`.
- Persistir endereço de faturamento permitido.
- Criar/atualizar `professional_subscription` com status **normalizado** do MP (mapa no `DATA-MODEL.md`); só ativar via webhook confirmado.
- Validar plano e usuário profissional.
- Não ativar plano sem confirmação real do gateway/webhook.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md` › "Assinatura e cobrança"; usar nomes/campos exatos, sem inventar):

- `billing_address` (`zip/street/number/complement?/district/city/state`; CEP via controller `cep` da TASK-02).
- `professional_subscription` (criada/atualizada conforme webhook; `status` `"inativa"|"ativa"|"inadimplente"|"cancelada"`; nunca ativar sem confirmação real do gateway).
- `payment_event` (registro bruto do webhook; `@@unique([gateway, external_id])` para idempotência).

Endpoints esperados:

- POST `/api/private/psychologist/billing/checkout`
- PUT `/api/private/psychologist/billing/address`
- POST `/api/public/billing/webhook` — tópicos MP `subscription_preapproval`/`subscription_authorized_payment`/`payment`; **validar `x-signature` (HMAC-SHA256, manifest `id:<data.id>;request-id:<x-request-id>;ts:<ts>;`) antes de processar**; só então persistir `payment_event` (idempotente) e refletir status normalizado em `professional_subscription`.

**Guarda de papel:** as rotas de checkout/endereço de billing são exclusivas de psicólogo. Vivem sob `/api/private/psychologist/billing/*` e são protegidas por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. O webhook `POST /api/public/billing/webhook` **permanece público** (chamado pelo gateway, não autenticado por usuário; autenticidade via verificação de assinatura do provedor). Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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

Packages permitidos nesta task (instalar só aqui, com ADR; ver `PACKAGES.md`):

- `mercadopago` (SDK Node, backend) — só dentro do `MercadoPagoAdapter`.
- `@mercadopago/sdk-react` (Checkout Bricks, frontend) para o Card Payment Brick.
- React Hook Form, Zod, Prisma (já instalados).

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

## Execucao parcial de fluxo em 2026-06-07

- A rota `/app/professional/billing/checkout` foi criada apenas como tela honesta de bloqueio para o fluxo pago.
- O CTA do plano profissional aponta para essa rota para manter a ordem solicitada: planos -> pagamento.
- Nenhum checkout, SDK Mercado Pago, tokenizacao de cartao, webhook, endereco de faturamento persistido ou assinatura profissional ativa foi implementado.
- TASK-32 continua Pending/Bloqueada operacionalmente ate existirem credenciais reais Mercado Pago (`MERCADO_PAGO_ACCESS_TOKEN`, public key e segredo de webhook) e contrato final de checkout.
