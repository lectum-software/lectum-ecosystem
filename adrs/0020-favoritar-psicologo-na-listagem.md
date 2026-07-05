# ADR-0020: Favoritos e seguindo de psic√≥logos

## Status

Accepted

## Task relacionada

TASK-14: Favoritos e seguindo. A primeira vers√£o deste ADR registrou o recorte de favorito direto no card da descoberta; esta atualiza√ß√£o conclui a task com favoritos e seguindo completos.

## Contexto

A descoberta de psic√≥logos da TASK-13 j√° era real e paginada. A TASK-14 exige diferenciar favoritar e seguir, persistir ambas as a√ß√µes, expor listas dedicadas e refletir mudan√ßas imediatamente no frontend.

Pelas regras do projeto, nenhuma dessas intera√ß√µes poderia ser mock, estado apenas local ou endpoint simulado. A primeira implementa√ß√£o colocou favoritos e seguindo sob rotas de paciente em `/api/private/patient/*`, protegidas por `requireRole("paciente")`.

Em 2026-06-08, a regra de produto foi ajustada: usu√°rios n√£o seguem psic√≥logos, seguem comunidades; por√©m qualquer usu√°rio autenticado pode favoritar psic√≥logos para acesso posterior na tela "Favoritos". Portanto, favoritos deixam de ser uma a√ß√£o exclusiva do papel `paciente`; a rela√ß√£o continua usando `psychologist_favorite.user_id`, agora entendido como usu√°rio autenticado gen√©rico.

## Decis√£o

- Manter os modelos Prisma `psychologist_favorite` e `psychologist_follow` previstos no `DATA-MODEL.md`, com `@@unique([user_id, psychologist_id])`, √≠ndices por usu√°rio/profissional e soft delete.
- Expor a rota can√¥nica de favoritos sob `/api/private/user/favorites`, protegida apenas por `_auth`:
  - `GET /api/private/user/favorites`;
  - `POST /api/private/user/favorites/:id`;
  - `DELETE /api/private/user/favorites/:id`.
- Expor favoritos sob `/api/private/patient/favorites`:
  - `GET /api/private/patient/favorites`;
  - `POST /api/private/patient/favorites/:id`;
  - `DELETE /api/private/patient/favorites/:id`.
- Expor seguindo sob `/api/private/patient/follows`:
  - `GET /api/private/patient/follows`;
  - `POST /api/private/patient/follows/:id`;
  - `DELETE /api/private/patient/follows/:id`.
- Manter `/api/private/patient/favorites` como compatibilidade legada com `requireRole("paciente")`, mas o frontend passa a usar a rota can√¥nica user-level.
- Manter follows legados com `requireRole("paciente")`, sem bot√£o vis√≠vel, porque seguir usu√°rios foi depreciado na UI.
- Validar no backend que o alvo √© um psic√≥logo ativo, n√£o deletado e com `psychologist_profile.published = true`.
- Retornar metadados contextuais `favorited` e `followed` na descoberta e nas listagens dedicadas.
- Criar as rotas frontend `/app/favorites` e `/app/following` com cards reutiliz√°veis, estados de loading/erro/vazio, contadores reais e tabs entre as listas.
- Usar atualiza√ß√£o otimista no frontend com snapshot e rollback em erro para diret√≥rio, favoritos e seguindo.

## Consequ√™ncias

- Favoritar e seguir s√£o a√ß√µes independentes, persistidas em tabelas separadas.
- A descoberta continua em `/api/private/directory/*`, mas devolve estado contextual do usu√°rio autenticado para melhorar UX.
- As listas dedicadas ocultam rela√ß√µes cujo psic√≥logo alvo deixe de estar ativo/publicado.
- Psic√≥logos e pacientes podem navegar pela descoberta e favoritar psic√≥logos pela rota user-level; rotas legadas de paciente continuam `403` para pap√©is divergentes.
- A integra√ß√£o dos bot√µes no perfil profissional fica para a TASK-15, porque `/app/psychologist/[id]` ainda n√£o existe no produto atual.
- O cora√ß√£o favoritado usa feedback visual vermelho na UI para diferenciar claramente o estado persistido.

## Valida√ß√£o

- `pnpm --dir backend db:migrate --name add_psychologist_favorites` na execu√ß√£o parcial que criou os modelos.
- `pnpm --dir backend db:migrate` na conclus√£o da TASK-14, retornando schema j√° sincronizado.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Smoke real de API: paciente e psic√≥logo tempor√°rios; `403` para psic√≥logo em `/api/private/patient/favorites`; criar/listar/remover favorito; criar/listar/remover seguindo; diret√≥rio refletindo `favorited=true` e `followed=true`; remo√ß√£o dos usu√°rios tempor√°rios.
- Browser headless desktop `1440x1000`: `/app/favorites` com card real e remo√ß√£o pelo cora√ß√£o at√© estado vazio; `/app/following` com card real e remo√ß√£o pelo bot√£o `Seguindo` at√© estado vazio.
- Atualiza√ß√£o 2026-06-08:
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`

## Pend√™ncias

- Implementar fluxo real de WhatsApp/contact request na TASK-16; o CTA visual do card mant√©m navega√ß√£o para o perfil p√∫blico at√© esse fluxo existir.

## AtualizaÁ„o 2026-07-05 - bloqueio de auto-favorito

### Contexto

PsicÛlogos autenticados podiam visualizar o prÛprio perfil p˙blico e o prÛprio vÌdeo de apresentaÁ„o na descoberta. Nesses contextos, o bot„o de coraÁ„o ainda aparecia como acion·vel, criando uma aÁ„o inv·lida: favoritar a si mesmo.

### Decis„o

- O backend passa a rejeitar `POST /api/private/user/favorites/:id` e a rota legada equivalente quando `req.auth.id` È igual ao `:id` do psicÛlogo alvo.
- O `DELETE` permanece idempotente para permitir limpeza operacional de relaÁıes antigas, mas novas relaÁıes de auto-favorito n„o s„o criadas.
- As leituras do diretÛrio/perfil e a listagem de favoritos n„o consideram relaÁıes em que `user_id` e `psychologist_id` apontam para o mesmo usu·rio.
- O frontend desabilita o coraÁ„o no prÛprio perfil p˙blico e no prÛprio vÌdeo/card ativo de `/psychologists`, com estado visual inativo e texto acessÌvel informando que n„o È possÌvel favoritar o prÛprio perfil.

### ConsequÍncias

- A UI deixa de oferecer uma aÁ„o impossÌvel ao psicÛlogo no prÛprio perfil/vÌdeo.
- A regra fica garantida no backend, sem depender apenas de esconder ou desabilitar o bot„o.
- N„o houve alteraÁ„o de schema Prisma, migrations, packages ou contrato p˙blico alÈm de normalizar `favorited=false` para o prÛprio perfil.
