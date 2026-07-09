# TASK-57: Detalhe administrativo do psicólogo — Estatísticas e publicações

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-57 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Pending |
| Dependências | TASK-45, TASK-46, TASK-55 |
| ADR alvo | ADR se houver nova decisão sobre métricas indisponíveis, vídeo ou atribuição |

## Contexto

As abas "Estatísticas" e "Publicações" usam como referências:

- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`;
- `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.

Muitos dados já existem por eventos de perfil, vídeo, WhatsApp, favoritos e comunidade. Métricas de busca/visualizações detalhadas só podem aparecer se houver tracking real.

## Objetivo

Exibir estatísticas de negócio/comunidade e publicações do psicólogo com dados reais, sem inventar métricas de busca ou visualização.

## Escopo frontend

- Implementar abas:
  - Estatísticas;
  - Publicações.
- Estatísticas:
  - visualizações de perfil;
  - cliques WhatsApp;
  - favoritos;
  - vídeo de apresentação com retenção quando real;
  - posts/respostas/salvamentos/comentários recebidos;
  - comunidades em que participa.
- Publicações:
  - filtros por comunidade, tipo e período;
  - cards de totais;
  - lista paginada de posts/respostas;
  - métricas de upvotes/downvotes/comentários/visualizações/salvamentos/compartilhamentos quando reais.

## Escopo backend

- Endpoints admin privados:
  - `GET /api/admin/private/psychologists/:id/statistics`;
  - `GET /api/admin/private/psychologists/:id/publications`.
- Usar dados reais de:
  - `profile_view_event`;
  - `profile_video_watch_session`;
  - `contact_request`;
  - `psychologist_favorite`;
  - `community_post`;
  - `post_reply`;
  - `post_vote`;
  - `post_save`;
  - `post_reply_save`;
  - `post_share`;
  - `page_view_event` apenas se TASK-49 já estiver disponível e confiável.

## Fora do escopo

- Editar ou remover publicações.
- Moderar conteúdo.
- Criar tracking novo.
- Exibir resultados de busca sem fonte real.

## Critérios de aceite

- [ ] Abas só abrem para admin autenticado.
- [ ] Estatísticas usam dados reais.
- [ ] Métricas indisponíveis aparecem como indisponíveis ou são omitidas.
- [ ] Publicações vêm de `community_post`/`post_reply` reais.
- [ ] Filtros e paginação funcionam.
- [ ] Vídeo usa `next/image`/player existente; nenhum `<img>` cru.
- [ ] UI mobile-first validada.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Imagens de referência foram citadas.
- [ ] Checks/builds relevantes executados sem erros.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.
