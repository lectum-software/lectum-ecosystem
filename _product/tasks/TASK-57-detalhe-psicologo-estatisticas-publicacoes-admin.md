# TASK-57: Detalhe administrativo do psicólogo — Estatísticas e publicações

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-57 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Admin |
| Status | Completed |
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

- [x] Abas só abrem para admin autenticado.
- [x] Estatísticas usam dados reais.
- [x] Métricas indisponíveis aparecem como indisponíveis ou são omitidas.
- [x] Publicações vêm de `community_post`/`post_reply` reais.
- [x] Filtros e paginação funcionam.
- [x] Vídeo usa `next/image`/player existente; nenhum `<img>` cru.
- [x] UI mobile-first validada.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Imagens de referência foram citadas.
- [x] Checks/builds relevantes executados sem erros.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.


## Execução

- Implementados endpoints privados Admin `GET /api/admin/private/psychologists/:id/statistics` e `GET /api/admin/private/psychologists/:id/publications` com dados reais existentes.
- A aba **Estatísticas** exibe visualizações de perfil, cliques WhatsApp, favoritos, métricas de vídeo quando disponíveis, participação em comunidades e lista métricas sem tracking como indisponíveis.
- A aba **Publicações** exibe totais, filtros por comunidade/tipo/período, paginação e lista somente leitura de posts/respostas reais.
- Referências visuais usadas: `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`; Builder/Quick Copy não estava disponível no ambiente.
- ADR criado: `adrs/0237-admin-psicologo-estatisticas-publicacoes.md`.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, API local autenticada e browser local via Edge/CDP nas abas `estatisticas` e `publicacoes`.

### Corre��o p�s-valida��o em 2026-07-11

- Ativado o contador **Resultados de busca** na aba Admin **Estat�sticas** com tracking real de impress�o do psic�logo quando o card/slide fica ativo na listagem p�blica.
- A persist�ncia reaproveita `profile_view_event.source="search_result"` e preserva `source="profile_page"` para aberturas reais do perfil, sem criar mock, seed ou estimativa.
- O endpoint `POST /api/private/directory/psychologists/:id/search-impression` usa `optionalAuth`, n�o dispara notifica��o de visualiza��o de perfil e ignora autoimpress�o do pr�prio psic�logo.
- As m�tricas existentes de visualiza��o de perfil passaram a filtrar `source="profile_page"` para n�o misturar resultados de busca com visitas ao perfil.
