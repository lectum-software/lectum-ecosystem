# ADR-0266: Métricas administrativas de conversão e uso da plataforma por psicólogos

## Status

Accepted

## Contexto

O dashboard administrativo de psicólogos precisava responder quanto tempo os psicólogos levam entre cadastro e primeira assinatura paga e como usam a plataforma Lectum. O detalhe individual também precisava mostrar o prazo até assinatura no bloco de assinatura e concentrar métricas de navegação na aba **Estatísticas**.

A Lectum não intermedia consultas, sessões clínicas, mensagens ou conversas por WhatsApp. Portanto, as novas métricas precisam ficar restritas a cadastro, assinatura e navegação first-party autenticada.

## Decisão

- A conversão até assinatura paga será calculada por coorte de `user.createdAt` do psicólogo no período selecionado.
- A primeira assinatura paga será a primeira `professional_subscription` não deletada com plano profissional pago (`subscription_plan.price_cents > 0` e slug diferente de `gratuito`) e origem real Mercado Pago (`source`/`gateway`/assinatura gateway), usando `professional_subscription.createdAt` como data de ativação disponível no modelo atual.
- Status `ativa` e `cancelada` contam como conversão histórica paga. Assim, cancelamento posterior não remove a primeira conversão. Plano gratuito e cortesia administrativa não contam.
- Média, mediana, P75 e P90 consideram apenas psicólogos convertidos. A faixa **Ainda não assinou** entra nos buckets da coorte, mas não entra nos percentis.
- O modo de cadastro terá apenas **Google** e **E-mail e senha**; provedores legados/desconhecidos ficam em contador indisponível, sem criar categoria de produto.
- O uso da plataforma será derivado somente de `page_view_event` autenticado com `user.role="psicologo"`.
- A duração média só será exibida quando pelo menos 50% dos pageviews autenticados do recorte tiverem `duration_seconds` positivo; caso contrário, o retorno informa indisponibilidade honesta para essa métrica.
- Páginas mais acessadas serão normalizadas para rótulos humanos seguros, sem paths crus, IDs, query strings ou segredos.
- Não haverá alteração de schema Prisma nem backfill artificial de eventos históricos.
- Builder/Quick Copy não estava disponível no ambiente de execução; os blocos seguiram o padrão visual das imagens locais de dashboard, Geral e Estatísticas. Não havia protótipo específico para estes novos blocos.

## Consequências

- O Admin passa a acompanhar conversão paga, prazo de conversão, modo de cadastro e uso da plataforma sem criar dashboard paralelo.
- Métricas antigas continuam compatíveis e os novos campos são adicionados aos contratos existentes do dashboard, detalhe e estatísticas.
- Períodos sem dados reais retornam copy/estado de indisponibilidade em vez de zero falso.
- A limitação de usar `professional_subscription.createdAt` como data da primeira assinatura paga fica documentada até existir campo/evento mais específico de ativação confirmada.
- Não há migration nem `db:migrate`, pois a task reutiliza dados persistidos existentes.

## Alternativas consideradas

1. **Criar tabela agregada nova de analytics**: rejeitada nesta etapa porque os eventos e assinaturas reais já existem e a task não exige materialização.
2. **Usar `payment_event` como única fonte de conversão**: adiada, pois o contrato vigente de assinatura profissional já centraliza plano, origem e status; payload bruto de pagamento não deve ser exposto.
3. **Exibir paths crus nas páginas mais acessadas**: rejeitada por risco de expor IDs, query strings e detalhes sensíveis.
4. **Criar tracking de terceiros ou backfill histórico**: rejeitado por estar fora do escopo e por violar a regra de não inventar eventos.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Smoke HTTP local em `/psicologos`, `/psicologos/test-id`, `/psicologos/test-id?tab=estatisticas`.
- Smoke HTTP local dos endpoints Admin privados sem sessão retornando 401.
