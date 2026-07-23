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

## Ajuste pós-feedback 2026-07-22 - Cartão salvo na confiabilidade

- Pedido do usuário: na área de **Confiabilidade do pagamento**, exibir os dados de cartão do psicólogo que ficam salvos.
- O contrato de assinaturas financeiras passou a retornar `payment_method` seguro por assinatura, usando somente dados locais de exibição (`brand`, `last4`, `exp_month`, `exp_year` e data de atualização) persistidos em `payment_method`; `gateway_token`, PAN e CVV continuam fora do payload Admin.
- A UI do detalhe expandido passou a exibir **Cartão salvo do psicólogo** dentro de **Confiabilidade do pagamento**, com bandeira/final/validade quando existirem e estado honesto quando nenhum cartão seguro estiver salvo.
- O backend marca se o cartão salvo corresponde ao `gateway_subscription_id` da assinatura; quando não corresponde, a UI informa apenas que é o último cartão salvo do psicólogo, sem afirmar vínculo indevido.
- Após feedback visual, o cartão salvo permanece alinhado no topo à direita do bloco azul e os contadores de confiabilidade voltaram a ocupar a largura horizontal das duas colunas abaixo do cabeçalho/cartão.
- Não houve alteração de Prisma/migrations, packages, cobrança no gateway, mock, seed ou dado artificial.

## Ajuste pós-feedback 2026-07-23 - Filtro de confiabilidade

- Pedido do usuário: adicionar um filtro de **Confiabilidade** em `/financeiro/assinaturas`.
- A rota Admin `GET /api/admin/private/finance/subscriptions` passou a aceitar o filtro `paymentHealth` com os valores reais derivados de `payment_health.status`: `healthy`, `attention`, `risk`, `critical` e `insufficient_history`.
- Como a confiabilidade é calculada a partir de `professional_subscription` + `payment_event` reconciliado, o filtro é aplicado no service depois do mapeamento real de saúde de pagamento, sem criar coluna persistida, endpoint paralelo, mock ou aproximação no banco.
- A UI mobile-first passou a exibir o select **Confiabilidade** ao lado de busca, datas de início e status; o filtro fica refletido na URL, participa da key do React Query e é limpo pelo botão **Limpar**.
- O filtro preserva a paginação sobre o resultado filtrado e continua usando somente assinaturas pagas Mercado Pago reais, excluindo plano gratuito/cortesia pelas regras existentes.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.
- Não houve alteração de Prisma/migrations, packages, cobrança no gateway, seed, mock, dado artificial ou endpoint simulado.

### Critérios de aceite do ajuste

- [x] `/financeiro/assinaturas` possui filtro visual **Confiabilidade** com todas as classificações reais.
- [x] O filtro usa o contrato Admin privado existente via query `paymentHealth`, sem endpoint paralelo.
- [x] A filtragem ocorre sobre `payment_health.status` calculado a partir de dados reais de assinatura e `payment_event`.
- [x] A paginação e o contador refletem o resultado filtrado.
- [x] O botão **Limpar** também remove o filtro de confiabilidade.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/assinaturas/client.tsx" "src/api/req/finance/index.ts" "src/api/cache/keys.ts"`
- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/finance/dashboard/DTOs/IAdminFinanceDashboardDTO.ts" "src/modules/api/admin/private/finance/dashboard/use-cases/services.ts" "src/modules/api/admin/private/finance/lists/validator/index.ts"`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke de serviço real com `.env` local: `listAdminFinanceSubscriptions({ period: "all", paymentHealth, limit: 50 })` retornou `status=200` para `healthy`, `attention`, `risk`, `critical` e `insufficient_history`, com os itens retornados sempre compatíveis com o filtro solicitado.
- Smoke HTTP local protegido: `GET http://localhost:3001/api/admin/private/finance/subscriptions?period=all&paymentHealth=risk` sem token Admin retornou `401`.
- Smoke HTTP local Admin: `GET http://localhost:3002/financeiro/assinaturas?paymentHealth=risk` retornou `200`; Microsoft Edge headless abriu a rota local sem sessão e confirmou carregamento do shell protegido, enquanto a validação visual autenticada permaneceu baseada na captura enviada pelo usuário e no build Admin porque não há acesso automatizado à sessão Admin já aberta.
- Observação: após as validações acima, alterações fora do escopo apareceram em arquivos de comunidades no backend e uma nova tentativa de `pnpm --dir backend check` falhou por import não usado em `backend/src/modules/api/admin/private/communities/manage/use-cases/services.ts`; essas alterações não pertencem a este ajuste e não foram incluídas no commit.

## Ajuste pós-feedback 2026-07-23 - Tamanho da busca nos filtros de assinaturas

- Pedido do usuário: corrigir o tamanho da barra de pesquisa em `/financeiro/assinaturas`, que ficou larga demais após a inclusão do filtro **Confiabilidade** e invadia visualmente os filtros de data.
- A largura da busca foi limitada no layout desktop (`xl/2xl`), preservando largura total no fluxo mobile-first e mantendo os filtros **Início de**, **Início até**, **Status** e **Confiabilidade** alinhados no mesmo bloco.
- O ajuste é exclusivamente visual no Admin; não altera contrato HTTP, backend, Prisma/migrations, packages, dados persistidos, mock ou endpoint simulado.
- Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; as referências auditáveis foram `_product/proto/admin/Financeiro.png` e a captura autenticada enviada pelo usuário em 2026-07-22.

### Critérios de aceite do ajuste

- [x] A barra de pesquisa não sobrepõe os filtros de data/status/confiabilidade no desktop.
- [x] A busca continua responsiva e ocupa largura útil no mobile.
- [x] Os filtros existentes continuam no mesmo contrato real e sem endpoint paralelo.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi usado.
- [x] Nenhum package, schema Prisma, migration, mock ou endpoint simulado foi adicionado.

### Validação complementar executada

- `pnpm --dir admin exec biome check --write "src/app/(admin)/financeiro/assinaturas/client.tsx"`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/financeiro/assinaturas` retornou `200`.
