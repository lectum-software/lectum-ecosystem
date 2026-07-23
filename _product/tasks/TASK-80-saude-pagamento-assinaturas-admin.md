# TASK-80: Confiabilidade do pagamento nas assinaturas Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-80 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Financeiro |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-56, TASK-62 |
| ADR alvo | ADR sobre cálculo honesto de confiabilidade do pagamento e histórico por assinatura |

## Contexto

O Admin já possui a rota `/financeiro/assinaturas` com assinaturas profissionais pagas e filtros reais.
O usuário pediu, em 2026-07-22, que a listagem mostre apenas uma coluna de **Confiabilidade do pagamento** para indicar se o psicólogo tem problema recorrente de cobrança, e que cada assinatura possa ser expandida por uma seta para exibir o histórico de pagamentos daquela assinatura.

A intenção de produto é preservar a hierarquia:

```text
Assinatura
  └─ Histórico de pagamentos
```

Ou seja, pagamentos não devem virar linhas de assinatura separadas nem tabela paralela de dados simulados.

## Objetivo

Adicionar análise real de confiabilidade do pagamento por assinatura paga Mercado Pago no Admin Financeiro, com coluna resumida na tabela e detalhes expansíveis contendo histórico de cobranças e métricas auxiliares.

## Pré-requisitos e bloqueios

- TASK-45 concluída: autenticação Admin real.
- TASK-46 concluída: app `admin/` e shell lateral.
- TASK-56 concluída: detalhe administrativo já usa `payment_event` real para histórico de pagamentos do psicólogo.
- TASK-62 concluída: Financeiro Admin e `/financeiro/assinaturas` já usam dados reais de `professional_subscription`, `subscription_plan`, `payment_event`, `psychologist_profile` e `user`.
- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md`, `_product/tasks/PACKAGES.md` e `_product/tasks/PROTO-INVENTORY.md`.
- Usar `_product/proto/admin/Financeiro.png` como referência visual local; Quick Copy Builder deve ser usado se estiver acessível.
- Não criar ou simular payment events.
- Se o gateway/evento não permitir identificar histórico por assinatura, exibir estado honesto de histórico insuficiente.

## Escopo backend

- Estender o contrato de assinatura financeira Admin retornado por:
  - `GET /api/admin/private/finance/subscriptions`;
  - previews de assinaturas do dashboard/export quando reutilizarem o mesmo mapper.
- Para cada `professional_subscription` paga Mercado Pago:
  - reconciliar `payment_event` real por `professional_subscription.id` ou `gateway_subscription_id`;
  - retornar `payment_history` com as últimas cobranças vinculadas à assinatura;
  - retornar `payment_health` derivada de:
    - tentativas finais de cobrança;
    - pagamentos bem-sucedidos;
    - pagamentos recusados/cancelados/chargeback;
    - pagamentos pendentes;
    - falhas consecutivas;
    - taxa de sucesso;
    - último sucesso;
    - última falha;
    - dias em atraso quando `professional_subscription.status="inadimplente"`.
- Classificações aceitas:
  - `healthy`;
  - `attention`;
  - `risk`;
  - `critical`;
  - `insufficient_history`.
- Não contar plano gratuito, cortesia/admin grant ou assinatura sem vínculo real Mercado Pago.

## Escopo frontend

- Atualizar `/financeiro/assinaturas`:
  - manter a página mobile-first;
  - adicionar apenas uma coluna de resumo chamada **Confiabilidade do pagamento**;
  - adicionar botão/seta de expansão por assinatura;
  - expandir a assinatura para mostrar histórico de pagamentos e detalhes da confiabilidade;
  - adaptar o comportamento para cards no mobile;
  - não usar `<img>`.
- No detalhe expandido:
  - mostrar taxa de sucesso, tentativas, falhas consecutivas, último sucesso, última falha e atraso quando existir;
  - listar as últimas cobranças vinculadas à assinatura;
  - mostrar estado honesto quando não houver `payment_event` reconciliável.

## Fora do escopo

- Criar cobranças manuais.
- Alterar forma de pagamento.
- Cancelar ou reativar assinatura.
- Chamar gateway em lote para preencher histórico ausente.
- Criar migration ou novo modelo de dados.
- Exportar relatório contábil/fiscal novo.
- Simular pagamento aprovado, recusado ou pendente.

## Critérios de aceite

- [x] `/financeiro/assinaturas` continua protegida por sessão Admin real.
- [x] A tabela mostra apenas uma coluna nova de **Confiabilidade do pagamento** para o resumo da análise.
- [x] Cada assinatura possui seta/botão de dropdown acessível.
- [x] O detalhe expandido mostra o histórico de pagamentos dentro da assinatura.
- [x] O histórico usa somente `payment_event` real reconciliado por id local da assinatura ou `gateway_subscription_id`.
- [x] A confiabilidade do pagamento combina taxa de sucesso, volume de tentativas, falhas consecutivas, pagamentos pendentes e atraso de inadimplência.
- [x] Poucas tentativas ou ausência de eventos geram copy honesta de histórico insuficiente.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] UI mobile-first validada.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum package novo foi instalado.
- [x] Nenhuma migration/alteração Prisma foi criada.
- [x] Checks/builds relevantes executados sem erros.
- [x] ADR criado/atualizado.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local em `/financeiro/assinaturas` com sessão Admin real ou smoke autenticado possível no ambiente.

## Execução 2026-07-22

- Referência visual consultada: `_product/proto/admin/Financeiro.png`; Builder/Quick Copy não ficou exposto como ferramenta callable neste ambiente.
- Backend Financeiro passou a enriquecer cada `FinanceSubscriptionItem` com `payment_health` e `payment_history`, sem migration e sem endpoint simulado.
- A reconciliação do histórico usa apenas `payment_event` real Mercado Pago cujo payload contenha `professional_subscription.id` ou `gateway_subscription_id`.
- A confiabilidade classifica cada assinatura como `healthy`, `attention`, `risk`, `critical` ou `insufficient_history`, combinando taxa de sucesso, tentativas finais, falhas consecutivas, pendências e atraso quando o status local está inadimplente.
- `/financeiro/assinaturas` passou a exibir uma única coluna **Confiabilidade do pagamento**. Após feedback do usuário, a tag ficou com uma linha só (`Saudável`, `Atenção`, `Risco`, `Crítica` ou `Histórico insuficiente`); o resumo completo permanece dentro do dropdown.
- Cada assinatura tem botão/seta expansível. No mobile, a assinatura continua como card mobile-first; no desktop, a linha expande dentro da tabela.
- O detalhe expandido mostra métricas auxiliares e as últimas cobranças vinculadas à assinatura, com estado honesto quando não há `payment_event` reconciliável.
- Validações executadas:
  - `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts" "src/modules/api/admin/private/finance/dashboard/repositories/AdminFinanceDashboardRepository.ts"`;
  - `pnpm --dir admin exec biome check --write "src/api/req/finance/index.ts" "src/app/(admin)/financeiro/assinaturas/client.tsx"`;
  - `pnpm --dir backend check`;
  - `pnpm --dir backend build`;
  - `pnpm --dir admin check`;
  - `pnpm --dir admin build`;
  - `pnpm check`;
  - smoke real do service `listAdminFinanceSubscriptions({ period: "all", limit: 1 })`, confirmando `payment_health` e `payment_history` no item retornado;
  - smoke HTTP local `GET http://localhost:3002/financeiro/assinaturas` retornou `200`.
- ADR criado: `adrs/0309-admin-assinaturas-saude-pagamento.md`.

## Ajuste pós-feedback 2026-07-22 - Termo da coluna

- Pedido do usuário: trocar o termo da coluna para **Confiabilidade do pagamento**.
- A UI de `/financeiro/assinaturas` foi atualizada no header, caption acessível, coluna da tabela, título do detalhe expandido e copy explicativa da confiabilidade.
- A tag continua com uma linha só, exibindo apenas o rótulo da classificação; o resumo completo permanece no dropdown.
- Não houve alteração de contrato HTTP, backend, Prisma/migrations, packages ou dados persistidos.

## Ajuste pós-feedback 2026-07-22 - Simplificação de copy na listagem

- Pedido do usuário: remover o botão **Voltar ao Financeiro**, remover o resumo de período do header e trocar a descrição por **Relação de assinaturas do plano profissional.**
- O texto auxiliar acima dos filtros foi removido para evitar redundância com a busca e a expansão por assinatura.
- No detalhe expandido, a tag de classificação foi removida e o aviso técnico sobre ausência de `payment_event` reconciliado deixou de ser exibido como nota visual.
- O contador/fonte de eventos reconciliados também deixou de aparecer no cabeçalho do histórico, mantendo o histórico dentro da assinatura sem expor detalhe técnico desnecessário.
- Não houve alteração de contrato HTTP, backend, Prisma/migrations, packages ou dados persistidos.
