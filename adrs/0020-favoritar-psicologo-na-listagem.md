# ADR-0020: Favoritos e seguindo de psicólogos

## Status

Accepted

## Task relacionada

TASK-14: Favoritos e seguindo. A primeira versão deste ADR registrou o recorte de favorito direto no card da descoberta; esta atualização conclui a task com favoritos e seguindo completos.

## Contexto

A descoberta de psicólogos da TASK-13 já era real e paginada. A TASK-14 exige diferenciar favoritar e seguir, persistir ambas as ações, expor listas dedicadas e refletir mudanças imediatamente no frontend.

Pelas regras do projeto, nenhuma dessas interações poderia ser mock, estado apenas local ou endpoint simulado. O `DATA-MODEL.md` define `psychologist_favorite` e `psychologist_follow` como modelos distintos sob rotas de paciente em `/api/private/patient/*`, protegidas por `requireRole("paciente")`.

## Decisão

- Manter os modelos Prisma `psychologist_favorite` e `psychologist_follow` previstos no `DATA-MODEL.md`, com `@@unique([user_id, psychologist_id])`, índices por usuário/profissional e soft delete.
- Expor favoritos sob `/api/private/patient/favorites`:
  - `GET /api/private/patient/favorites`;
  - `POST /api/private/patient/favorites/:id`;
  - `DELETE /api/private/patient/favorites/:id`.
- Expor seguindo sob `/api/private/patient/follows`:
  - `GET /api/private/patient/follows`;
  - `POST /api/private/patient/follows/:id`;
  - `DELETE /api/private/patient/follows/:id`.
- Montar ambos os routers com `requireRole("paciente")`, fail-closed, conforme ADR-0002.
- Validar no backend que o alvo é um psicólogo ativo, não deletado e com `psychologist_profile.published = true`.
- Retornar metadados contextuais `favorited` e `followed` na descoberta e nas listagens dedicadas.
- Criar as rotas frontend `/app/favorites` e `/app/following` com cards reutilizáveis, estados de loading/erro/vazio, contadores reais e tabs entre as listas.
- Usar atualização otimista no frontend com snapshot e rollback em erro para diretório, favoritos e seguindo.

## Consequências

- Favoritar e seguir são ações independentes, persistidas em tabelas separadas.
- A descoberta continua em `/api/private/directory/*`, mas devolve estado contextual do usuário autenticado para melhorar UX.
- As listas dedicadas ocultam relações cujo psicólogo alvo deixe de estar ativo/publicado.
- Psicólogos podem navegar pela descoberta, mas rotas de paciente para favoritos/seguindo retornam `403` por guarda de papel.
- A integração dos botões no perfil profissional fica para a TASK-15, porque `/app/psychologist/[id]` ainda não existe no produto atual.

## Validação

- `pnpm --dir backend db:migrate --name add_psychologist_favorites` na execução parcial que criou os modelos.
- `pnpm --dir backend db:migrate` na conclusão da TASK-14, retornando schema já sincronizado.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Smoke real de API: paciente e psicólogo temporários; `403` para psicólogo em `/api/private/patient/favorites`; criar/listar/remover favorito; criar/listar/remover seguindo; diretório refletindo `favorited=true` e `followed=true`; remoção dos usuários temporários.
- Browser headless desktop `1440x1000`: `/app/favorites` com card real e remoção pelo coração até estado vazio; `/app/following` com card real e remoção pelo botão `Seguindo` até estado vazio.

## Pendências

- Implementar fluxo real de WhatsApp/contact request na TASK-16; o CTA visual do card mantém navegação para o perfil público até esse fluxo existir.