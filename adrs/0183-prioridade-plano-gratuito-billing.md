# ADR-0183: Prioridade do plano gratuito ativo na tela Minha Assinatura

## Status

Accepted

## Task relacionada

Correção de regressão pós-TASK-32/TASK-33.

## Contexto

Após a implementação do checkout e da gestão de assinatura, psicólogos que já tinham uma
assinatura gratuita ativa podiam passar a ver a tentativa mais recente de assinatura profissional
cancelada em `/app/professional/billing`. Isso acontecia porque os endpoints de assinatura atual
priorizavam o registro mais recente de `professional_subscription`, mesmo quando havia um plano
`gratuito` ativo e a tentativa profissional não estava mais acionável.

A experiência anterior de produto, registrada no ADR-0117 e baseada na referência local
`_product/proto/Minhas Assinatura - Psicólogo.jpg`, mostrava claramente `Plano Gratuito` e os
benefícios desbloqueados pela Assinatura Profissional. O Builder Quick Copy não estava disponível
como ferramenta direta neste ambiente; a correção usou a implementação anterior versionada e a
referência local como fonte visual.

## Decisão

- Os resolvedores de assinatura atual passam a priorizar:
  1. assinatura profissional ativa válida;
  2. assinatura profissional acionável no gateway (`inativa` ou `inadimplente`) com
     `gateway_subscription_id`;
  3. assinatura gratuita ativa válida;
  4. fallback para o registro mais recente, apenas quando não houver estado ativo/acionável.
- A rota `/app/professional/billing` volta a renderizar a experiência persuasiva anterior para
  psicólogos com `Plano Gratuito` ativo, reutilizando a view de
  `/app/professional/billing/subscription`.
- Tentativas profissionais canceladas e sem vínculo acionável no Mercado Pago deixam de substituir
  visualmente o plano gratuito ativo.
- A gestão de cartão permanece disponível apenas para assinatura profissional não cancelada e
  vinculada ao gateway.

## Consequências

- Psicólogos gratuitos voltam a ver a tela correta de plano atual e benefícios de upgrade.
- A tela de gestão de cartão continua preservada para assinaturas profissionais pagas ou pendentes
  acionáveis no Mercado Pago.
- A regra evita criar mocks ou corrigir dados manualmente: a seleção é derivada de dados reais
  persistidos.
- Se houver uma tentativa profissional pendente com `gateway_subscription_id`, ela ainda aparece
  como acionável em vez de mascarar o fluxo como gratuito.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir frontend exec biome check src/app/app/professional/billing/logic.tsx src/app/app/professional/billing/subscription/logic.tsx`
- `pnpm --dir backend exec biome check src/modules/api/private/psychologist/billing/current/repositories/CurrentRepository.ts src/modules/api/private/psychologist/billing/select-free/repositories/SelectFreeRepository.ts src/modules/api/private/psychologist/billing/subscription/repositories/SubscriptionRepository.ts src/utils/subscription-entitlement.ts`

`pnpm check` foi executado, mas falhou em arquivos não relacionados já alterados fora desta
correção (`frontend/src/components/pwa-install-prompt.tsx`,
`frontend/src/hooks/notification/index.tsx` e `frontend/src/utils/prompt-cooldown.ts`) por
formatação pendente do Biome.

## Pendências

- Validação visual autenticada em browser local deve ser feita na sessão real do usuário, pois este
  ambiente não expõe ferramenta de inspeção visual/autenticação do navegador.
