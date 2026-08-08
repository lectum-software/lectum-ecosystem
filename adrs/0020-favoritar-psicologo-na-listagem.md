# ADR-0020: Favoritos e seguindo de psicólogos

## Status

Accepted

## Task relacionada

TASK-14: Favoritos e seguindo. A primeira versão deste ADR registrou o recorte de favorito direto no card da descoberta; esta atualização conclui a task com favoritos e seguindo completos.

## Contexto

A descoberta de psicólogos da TASK-13 já era real e paginada. A TASK-14 exige diferenciar favoritar e seguir, persistir ambas as ações, expor listas dedicadas e refletir mudanças imediatamente no frontend.

Pelas regras do projeto, nenhuma dessas interações poderia ser mock, estado apenas local ou endpoint simulado. A primeira implementação colocou favoritos e seguindo sob rotas de paciente em `/api/private/patient/*`, protegidas por `requireRole("paciente")`.

Em 2026-06-08, a regra de produto foi ajustada: usuários não seguem psicólogos, seguem comunidades; porém qualquer usuário autenticado pode favoritar psicólogos para acesso posterior na tela "Favoritos". Portanto, favoritos deixam de ser uma ação exclusiva do papel `paciente`; a relação continua usando `psychologist_favorite.user_id`, agora entendido como usuário autenticado genérico.

## Decisão

- Manter os modelos Prisma `psychologist_favorite` e `psychologist_follow` previstos no `DATA-MODEL.md`, com `@@unique([user_id, psychologist_id])`, índices por usuário/profissional e soft delete.
- Expor a rota canônica de favoritos sob `/api/private/user/favorites`, protegida apenas por `_auth`:
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
- Manter `/api/private/patient/favorites` como compatibilidade legada com `requireRole("paciente")`, mas o frontend passa a usar a rota canônica user-level.
- Manter follows legados com `requireRole("paciente")`, sem botão visível, porque seguir usuários foi depreciado na UI.
- Validar no backend que o alvo é um psicólogo ativo, não deletado e com `psychologist_profile.published = true`.
- Retornar metadados contextuais `favorited` e `followed` na descoberta e nas listagens dedicadas.
- Criar as rotas frontend `/app/favorites` e `/app/following` com cards reutilizáveis, estados de loading/erro/vazio, contadores reais e tabs entre as listas.
- Usar atualização otimista no frontend com snapshot e rollback em erro para diretório, favoritos e seguindo.

## Consequências

- Favoritar e seguir são ações independentes, persistidas em tabelas separadas.
- A descoberta continua em `/api/private/directory/*`, mas devolve estado contextual do usuário autenticado para melhorar UX.
- As listas dedicadas ocultam relações cujo psicólogo alvo deixe de estar ativo/publicado.
- Psicólogos e pacientes podem navegar pela descoberta e favoritar psicólogos pela rota user-level; rotas legadas de paciente continuam `403` para papéis divergentes.
- A integração dos botões no perfil profissional fica para a TASK-15, porque `/app/psychologist/[id]` ainda não existe no produto atual.
- O coração favoritado usa feedback visual vermelho na UI para diferenciar claramente o estado persistido.

## Validação

- `pnpm --dir backend db:migrate --name add_psychologist_favorites` na execução parcial que criou os modelos.
- `pnpm --dir backend db:migrate` na conclusão da TASK-14, retornando schema já sincronizado.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Smoke real de API: paciente e psicólogo temporários; `403` para psicólogo em `/api/private/patient/favorites`; criar/listar/remover favorito; criar/listar/remover seguindo; diretório refletindo `favorited=true` e `followed=true`; remoção dos usuários temporários.
- Browser headless desktop `1440x1000`: `/app/favorites` com card real e remoção pelo coração até estado vazio; `/app/following` com card real e remoção pelo botão `Seguindo` até estado vazio.
- Atualização 2026-06-08:
  - `pnpm --dir backend check`
  - `pnpm --dir frontend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend build`
  - `pnpm check`

## Pendências

- Implementar fluxo real de WhatsApp/contact request na TASK-16; o CTA visual do card mantém navegação para o perfil público até esse fluxo existir.

## Atualização 2026-07-05 - bloqueio de auto-favorito

### Contexto

Psicólogos autenticados podiam visualizar o próprio perfil público e o próprio vídeo de apresentação na descoberta. Nesses contextos, o botão de coração ainda aparecia como acionável, criando uma ação inválida: favoritar a si mesmo.

### Decisão

- O backend passa a rejeitar `POST /api/private/user/favorites/:id` e a rota legada equivalente quando `req.auth.id` é igual ao `:id` do psicólogo alvo.
- O `DELETE` permanece idempotente para permitir limpeza operacional de relações antigas, mas novas relações de auto-favorito não são criadas.
- As leituras do diretório/perfil e a listagem de favoritos não consideram relações em que `user_id` e `psychologist_id` apontam para o mesmo usuário.
- O frontend desabilita o coração no próprio perfil público e no próprio vídeo/card ativo de `/psychologists`, com estado visual inativo e texto acessível informando que não é possível favoritar o próprio perfil.

### Consequências

- A UI deixa de oferecer uma ação impossível ao psicólogo no próprio perfil/vídeo.
- A regra fica garantida no backend, sem depender apenas de esconder ou desabilitar o botão.
- Não houve alteração de schema Prisma, migrations, packages ou contrato público além de normalizar `favorited=false` para o próprio perfil.
