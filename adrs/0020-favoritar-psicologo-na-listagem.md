# ADR-0020: Favoritar psicólogo direto na listagem de descoberta

## Status

Accepted

## Task relacionada

Complemento solicitado pelo usuário em `/app/psychologists`, com impacto parcial na TASK-14: Favoritos e seguindo.

## Contexto

A listagem de psicólogos já era real e paginada pela TASK-13, mas o card ainda exibia o coração como affordance não funcional. O usuário pediu que o coração fosse clicável para favoritar o psicólogo, além de ajustes visuais no card e na barra de filtros.

Pelas regras do projeto, a ação de favorito não pode ser mock ou estado apenas local. O `DATA-MODEL.md` define que favoritos pertencem à TASK-14 e devem usar `psychologist_favorite` sob rotas de paciente em `/api/private/patient/*`, protegidas por `requireRole("paciente")`.

## Decisão

- Criar os modelos Prisma `psychologist_favorite` e `psychologist_follow` previstos no `DATA-MODEL.md`, com `@@unique([user_id, psychologist_id])`, índices por usuário/profissional e soft delete.
- Implementar neste recorte apenas a ação real de favorito no card da listagem:
  - `POST /api/private/patient/favorites/:id`
  - `DELETE /api/private/patient/favorites/:id`
- Montar `/api/private/patient/favorites` com `requireRole("paciente")`, fail-closed, conforme ADR-0002.
- Validar no backend que o alvo é um psicólogo ativo, não deletado e com `psychologist_profile.published = true`.
- Retornar `favorited` no endpoint `GET /api/private/directory/psychologists`, calculado a partir do usuário autenticado.
- No frontend, o botão de coração usa a API real, invalida as queries de descoberta e reflete `aria-pressed`/ícone preenchido depois da persistência.
- A listagem e telas completas de Favoritos/Seguindo permanecem pendentes na TASK-14; este ADR registra apenas o toggle necessário para o card solicitado.

## Consequências

- O card deixa de ter estado falso: favoritar/desfavoritar persiste no banco.
- A descoberta continua caller-neutra sob `/api/private/directory/*`, mas pode devolver metadado contextual `favorited` para o usuário autenticado.
- O endpoint de favorito só funciona para pacientes; psicólogos continuam podendo navegar na descoberta, mas não executar a ação paciente-only.
- A TASK-14 ainda precisa implementar `GET /api/private/patient/favorites`, `follows` e as telas dedicadas.

## Validação

- `pnpm --dir backend db:migrate --name add_psychologist_favorites`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real de API: paciente temporário criado via API, `GET /api/private/directory/psychologists`, `POST /api/private/patient/favorites/:id`, nova listagem com `favorited=true`, `DELETE /api/private/patient/favorites/:id` e remoção do usuário temporário.
- Browser headless desktop `1440x1000`: verificou tags `Ansiedade`, `Depressão`, `Luto`, `Compulsões`, `Traumas`, texto `Disponível hoje`, CTA `Chamar no WhatsApp`, layout expandido e clique no coração alterando `aria-pressed` para `true`.

## Pendências

- Implementar listas completas de Favoritos e Seguindo na TASK-14.
- Implementar fluxo real de WhatsApp/contact request na TASK-16; o CTA visual do card mantém navegação para o perfil público até esse fluxo existir.
