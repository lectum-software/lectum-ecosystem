# ADR-0025 - TASK-19: avaliacoes do psicologo e entitlement profissional

## Status

Accepted - revisada em 2026-06-09

## Contexto

A TASK-19 cria a tela privada onde o psicologo acompanha avaliacoes recebidas e responde depoimentos. A execucao anterior havia bloqueado a task porque a TASK-18 completa dependia de upload privado de documento CRP (TASK-11).

Em 2026-06-09 a decisao de produto mudou: o fluxo de validacao documental do perfil foi abandonado para este recorte. A validacao profissional passa a ocorrer por consulta real via InfoSimples/API CFP ou por cortesia manual administrativa. A base executavel de perfil privado para o MVP e o recorte TASK-18A (`/app/professional/profile/setup`), combinado com os entitlements de assinatura das TASK-31/31A/31B.

A referencia visual da TASK-19 foi consultada pela imagem local:

- `_product/proto/Minhas Avaliacoes - Psicologo.jpg`.

Builder/Quick Copy nao esteve acessivel nesta execucao; a imagem local foi usada como fallback auditavel.

## Decisao

Desbloquear e concluir a TASK-19 usando os modelos reais ja existentes (`professional_review`, `psychologist_profile` e `professional_subscription`), sem criar schema novo, seed, mock ou endpoint simulado.

A regra de dominio passa a ser:

- somente psicologos com Plano Profissional ativo ou cortesia manual administrativa podem receber avaliacoes;
- o entitlement e consultado no banco via `professional_subscription.status="ativa"`, periodo vigente e plano ativo nao gratuito;
- a elegibilidade de avaliacao pelo paciente deve barrar psicologos sem esse entitlement;
- a autogestao do psicologo em `/api/private/psychologist/reviews` tambem exige o mesmo entitlement;
- a resposta do psicologo pode alterar apenas `professional_review.response` e `responded_at`; `rating` e `comment` recebidos nunca sao editados por esse fluxo;
- a atualizacao de resposta recompila `psychologist_profile.rating_avg` e `rating_count` dentro da transacao.

Os endpoints ficam sob `/api/private/psychologist/*` e continuam protegidos por `requireRole("psicologo")` no mount central de `write.ts`, fail-closed conforme ADR-0002.

## Consequencias

- TASK-19 deixa de ser bloqueada por TASK-18 completa e passa a depender do recorte executavel TASK-18A e dos entitlements de assinatura/cortesia.
- Psicologos gratuitos podem manter o perfil, mas nao recebem novas avaliacoes enquanto nao possuirem Plano Profissional ativo ou cortesia manual.
- Pacientes recebem erro de elegibilidade real quando tentam avaliar perfil sem entitlement profissional.
- A tela privada do psicologo mostra apenas avaliacoes reais do proprio profissional autenticado.
- A funcionalidade permanece independente de upload privado de documento CRP.

## Task relacionada

- TASK-19: Avaliacoes do psicologo

## Validacao

- Revisao de `_product/tasks/README.md`, `_product/tasks/TASK-19-avaliacoes-psicologo.md`, `_product/tasks/DATA-MODEL.md` e do recorte `_product/tasks/TASK-18A-perfil-gratuito-sem-crp.md`.
- Revisao visual local de `_product/proto/Minhas Avaliacoes - Psicologo.jpg`.
- Validacoes executadas na task: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir backend build`, `pnpm --dir frontend build`, `pnpm check` e Chrome headless local em `/app/professional/reviews` (sem sessao autenticada, validando protecao/redirect para login).
