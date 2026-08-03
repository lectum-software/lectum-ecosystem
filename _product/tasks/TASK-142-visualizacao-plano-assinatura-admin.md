# TASK-142: Visualização do valor atual do plano em Configurações Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-142 |
| Prioridade | P1 |
| Esforço | P |
| Fase | Admin / Configurações / Assinatura |
| Status | Completed |
| Dependências | TASK-31, TASK-45, TASK-46, TASK-62, TASK-141 |
| ADR alvo | ADR-0408 |

## Contexto

O Admin já possui o submenu **Configurações > Assinatura** criado pela TASK-141, mas a rota reaproveita diretamente a relação financeira de assinaturas. O pedido atual é começar simples: exibir, nessa página, o valor atual do Plano Profissional definido pelo backend, sem criar edição administrativa de preço.

A fonte de verdade do preço é `subscription_plan.price_cents` para `slug="profissional"`, atualizado pela ADR-0406 para R$ 29,90. A tela deve apenas consultar esse dado real e formatar o valor.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Neste ambiente não há ferramenta Builder/Quick Copy callable; a referência visual auditável usada é `_product/proto/admin/Configurações.png` e a captura enviada pelo usuário em 2026-08-03.

## Objetivo

Exibir em `/configuracoes/assinatura` um card mobile-first com o valor atual do Plano Profissional lido por API Admin real, sem misturar a tela de configuração com a listagem operacional de assinaturas.

## Pré-requisitos e bloqueios

- TASK-31 concluída para existência de `subscription_plan`.
- TASK-45/TASK-46 concluídas para autenticação e shell Admin.
- TASK-62 concluída para relação financeira de assinaturas.
- TASK-141 concluída para submenu **Configurações > Assinatura**.
- Não instalar packages novos.
- Não criar edição de preço, auditoria de alteração ou integração nova com gateway nesta task.
- Não usar mocks nem fallback com valor hardcoded no frontend.

## Escopo backend

- Criar endpoint Admin privado read-only:
  - `GET /api/admin/private/settings/subscription-plan`.
- O endpoint deve ler `subscription_plan` real com `slug="profissional"` e `deleted=false`.
- Retornar preço em centavos (`price_cents`), moeda fixa `BRL`, intervalo, status ativo e timestamps.
- Registrar rota em `backend/src/main/server/imports/write.ts`.

## Escopo frontend/admin

- Criar client específico para `/configuracoes/assinatura`.
- Consumir API via `admin/src/api/req/settings`, caller TanStack Query e query key.
- Exibir card com:
  - nome do plano;
  - valor formatado em BRL;
  - intervalo de cobrança;
  - fonte operacional `subscription_plan.price_cents`;
  - data de atualização;
  - aviso de somente leitura.
- Não exibir a relação de assinaturas vinculadas nessa tela; essa listagem permanece no menu **Financeiro**.
- UI mobile-first: uma coluna na base ~390px e progressão para grade em telas maiores.

## Fora do escopo

- Alterar valor do plano pelo Admin.
- Criar histórico/auditoria de mudança de preço.
- Criar migration Prisma.
- Alterar checkout, cobrança Mercado Pago ou assinaturas existentes.
- Criar múltiplos planos ou política comercial de reajuste.
- Exibir listagem financeira de assinaturas em Configurações.

## Critérios de aceite

- [x] `/configuracoes/assinatura` exibe o valor atual do Plano Profissional vindo do backend.
- [x] O frontend não possui hardcode do preço do plano.
- [x] A API Admin privada retorna o plano real de `subscription_plan`, sem mock.
- [x] A tela é mobile-first e alinhada ao padrão visual de Configurações Admin.
- [x] A tela não exibe a listagem de assinaturas vinculadas; o foco é somente o valor atual do plano.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum package novo foi instalado.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Browser local validou a tela Admin.
- [x] ADR criado/atualizado.
- [x] Commit criado e push executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local em `/configuracoes/assinatura`

## Execução

Concluída em 2026-08-03.

- Criado endpoint Admin privado `GET /api/admin/private/settings/subscription-plan`.
- O endpoint lê o Plano Profissional real em `subscription_plan` com `slug="profissional"` e `deleted=false`.
- Criados tipos, req, caller TanStack Query e query key no app Admin.
- Criada a tela `/configuracoes/assinatura` com card mobile-first de valor atual do plano, exibindo `R$ 29,90` a partir de `price_cents=2990`.
- Removida a listagem **Assinaturas vinculadas** da página de Configurações conforme feedback do usuário; a relação operacional continua no menu **Financeiro**.
- Atualizado `DATA-MODEL.md` com o contrato read-only do endpoint.
- Criado o ADR-0408 para registrar a decisão de visualização read-only.

### Validações executadas

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke API Admin autenticado em `GET http://localhost:3001/api/admin/private/settings/subscription-plan`: retornou `200` com `price_cents=2990`, `currency="BRL"` e `source="subscription_plan"`.
- Browser local via Chrome headless/CDP em `http://localhost:3002/configuracoes/assinatura`: confirmou título **Assinatura**, valor `R$ 29,90`, ausência de **Assinaturas vinculadas** e sessão Admin autenticada.
