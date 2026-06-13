# ADR-0070: Ranking derivado de Top Mentores da comunidade

## Status

Accepted

## Task relacionada

TASK-27

## Contexto

A TASK-27 estava bloqueada até existir uma decisão explícita de pontuação para o ranking de mentores. O ranking não pode aceitar score do frontend, não pode usar dados decorativos e deve ser derivado de eventos persistidos em `post_vote`, `community_post`, `post_reply` e do entitlement profissional ativo em `professional_subscription`.

## Decisão

O ranking de mentores será calculado em tempo de leitura, sem `mentor_score_snapshot` nesta etapa.

Elegibilidade:

- usuário com `role="psicologo"`, ativo e não deletado;
- `psychologist_profile.deleted=false`;
- `psychologist_profile.published=true`;
- `psychologist_profile.cfp_verified_at` preenchido;
- ao menos uma `professional_subscription` ativa em plano não gratuito, usando `activeProfessionalEntitlementWhere()`.

Períodos aceitos:

- `30d` (padrão): últimos 30 dias;
- `90d`: últimos 90 dias;
- `all`: histórico completo.

Filtro opcional:

- `community=<slug>` restringe votos, posts e respostas à comunidade informada.

Fórmula:

```text
score = (upvotes_received * 10) + (replies_published * 3) + (posts_published * 2)
```

Onde:

- `upvotes_received`: contagem de linhas reais em `post_vote` com `value=1`, não deletadas, recebidas em posts ou respostas de autoria do mentor no período/filtro;
- `replies_published`: respostas reais em `post_reply`, não deletadas, feitas pelo mentor no período/filtro;
- `posts_published`: posts reais em `community_post`, não deletados e `status="publicado"`, feitos pelo mentor no período/filtro.

Critérios de desempate:

1. maior `score`;
2. maior `upvotes_received`;
3. maior `replies_published`;
4. maior `posts_published`;
5. nome do profissional em ordem alfabética;
6. `id` como desempate estável.

Mentores com `score=0` não entram no ranking para evitar lista vazia de significado. O endpoint retorna até 5 posições por padrão, com limite máximo técnico de 10.

## Consequências

- O frontend só exibe dados derivados pelo backend e não ordena localmente.
- Upvotes têm peso maior que volume de participação, reduzindo incentivo a spam.
- A assinatura profissional ativa é gate de elegibilidade, não bônus de pontuação.
- O cálculo em leitura é suficiente para o volume atual; snapshot deve ser considerado apenas se houver pressão real de performance.
- O período `all` pode crescer em custo no futuro e deverá ser monitorado antes de materializar.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação local adicional: `next start --port 3002` e Chrome headless foram usados para abrir a rota. Sem uma sessão autenticada real, a aplicação redireciona para login após a tentativa de hidratação/API; a rota também foi confirmada no build do Next como `/app/community/top-mentors`.

## Pendências

- Reavaliar criação de `mentor_score_snapshot` somente após métricas reais indicarem necessidade de performance.
