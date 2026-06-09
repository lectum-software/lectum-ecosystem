# ADR-0033: Analytics profissionais com fontes persistidas e gate de plano

## Status

Accepted

## Task relacionada

TASK-20 - Analytics do psicólogo

## Contexto

A tela `Meus Analytics - Psicólogo` exige métricas úteis para o psicólogo, mas a task proíbe números decorativos. Cada card precisa vir de uma tabela/evento persistido, e o recurso é exclusivo do Plano Profissional ou de cortesia manual concedida como assinatura profissional ativa.

O schema atual já possui `contact_request`, `professional_review`, `psychologist_profile`, `community_post` e `professional_subscription`. O modelo opcional `profile_view_event` ainda não existe no Prisma, portanto visualizações de perfil não podem ser exibidas como número real.

## Decisão

- Criar `GET /api/private/psychologist/analytics` sob o namespace de autogestão do psicólogo.
- Registrar a rota em `write.ts` com `mountRoleGuardedRoute(..., "psicologo", ...)`, mantendo fail-closed pelo assert de rotas privadas.
- Gatear o endpoint com `activeProfessionalEntitlementWhere()`, que exige `professional_subscription` ativa vinculada ao `psychologist_profile` e plano diferente de `gratuito`.
- Agregar somente métricas com fonte persistida:
  - `contact_request`: conversões/cliques de WhatsApp por `psychologist_id` e janela de período;
  - `professional_review`: avaliações públicas recebidas no período;
  - `psychologist_profile`: `rating_avg` e `rating_count` materializados;
  - `community_post`: posts publicados e soma de `upvotes_count` + `replies_count`.
- Não criar `profile_view_event` nesta task. A UI informa que visualizações de perfil ficam omitidas enquanto não houver evento persistido.
- Não exibir percentual de crescimento, porque a task atual não cria série histórica comparável entre períodos.
- Criar a rota frontend `/app/professional/analytics` com filtros de período, cards, estado vazio, erro em PT-BR, CTA para assinatura quando o gate falha e aviso explícito de métrica indisponível.

## Consequências

- Analytics passa a ser confiável e auditável a partir das tabelas existentes, sem seed, mock ou derivação indireta.
- A ausência de visualizações de perfil fica transparente ao usuário e ao produto, evitando uma métrica falsa.
- Como não houve mudança de schema nem migration, `db:migrate` não se aplica à execução da TASK-20.
- A página segue o protótipo mobile-first como referência visual, mas reduz os cards aos dados que já têm fonte real.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless em `http://localhost:3000/app/professional/analytics`; sem sessão autenticada, a rota carregou e redirecionou corretamente para login.

## Pendências

- Criar `profile_view_event` em uma task futura caso o produto decida rastrear visualizações de perfil. Até lá, essa métrica deve continuar ausente/explicada, nunca simulada.
