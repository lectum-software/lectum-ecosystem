# TASK-57: Detalhe administrativo do psic√≥logo ‚Äî Estat√≠sticas e publica√ß√µes

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-57 |
| Prioridade | P1 |
| Esfor√ßo | L |
| Fase | Admin |
| Status | Completed |
| Depend√™ncias | TASK-45, TASK-46, TASK-55 |
| ADR alvo | ADR se houver nova decis√£o sobre m√©tricas indispon√≠veis, v√≠deo ou atribui√ß√£o |

## Contexto

As abas "Estat√≠sticas" e "Publica√ß√µes" usam como refer√™ncias:

- `_product/proto/admin/Psic√≥logos/Detalhes do psic√≥logo/Estat√≠sticas.png`;
- `_product/proto/admin/Psic√≥logos/Detalhes do psic√≥logo/Publica√ß√µes.png`.

Muitos dados j√° existem por eventos de perfil, v√≠deo, WhatsApp, favoritos e comunidade. M√©tricas de busca/visualiza√ß√µes detalhadas s√≥ podem aparecer se houver tracking real.

## Objetivo

Exibir estat√≠sticas de neg√≥cio/comunidade e publica√ß√µes do psic√≥logo com dados reais, sem inventar m√©tricas de busca ou visualiza√ß√£o.

## Escopo frontend

- Implementar abas:
  - Estat√≠sticas;
  - Publica√ß√µes.
- Estat√≠sticas:
  - visualiza√ß√µes de perfil;
  - cliques WhatsApp;
  - favoritos;
  - v√≠deo de apresenta√ß√£o com reten√ß√£o quando real;
  - posts/respostas/salvamentos/coment√°rios recebidos;
  - comunidades em que participa.
- Publica√ß√µes:
  - filtros por comunidade, tipo e per√≠odo;
  - cards de totais;
  - lista paginada de posts/respostas;
  - m√©tricas de upvotes/downvotes/coment√°rios/visualiza√ß√µes/salvamentos/compartilhamentos quando reais.

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
  - `page_view_event` apenas se TASK-49 j√° estiver dispon√≠vel e confi√°vel.

## Fora do escopo

- Editar ou remover publica√ß√µes.
- Moderar conte√∫do.
- Criar tracking novo.
- Exibir resultados de busca sem fonte real.

## Crit√©rios de aceite

- [x] Abas s√≥ abrem para admin autenticado.
- [x] Estat√≠sticas usam dados reais.
- [x] M√©tricas indispon√≠veis aparecem como indispon√≠veis ou s√£o omitidas.
- [x] Publica√ß√µes v√™m de `community_post`/`post_reply` reais.
- [x] Filtros e pagina√ß√£o funcionam.
- [x] V√≠deo usa `next/image`/player existente; nenhum `<img>` cru.
- [x] UI mobile-first validada.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Imagens de refer√™ncia foram citadas.
- [x] Checks/builds relevantes executados sem erros.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Valida√ß√£o m√≠nima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local com admin real.


## Execu√ß√£o

- Implementados endpoints privados Admin `GET /api/admin/private/psychologists/:id/statistics` e `GET /api/admin/private/psychologists/:id/publications` com dados reais existentes.
- A aba **Estat√≠sticas** exibe visualiza√ß√µes de perfil, cliques WhatsApp, favoritos, m√©tricas de v√≠deo quando dispon√≠veis, participa√ß√£o em comunidades e lista m√©tricas sem tracking como indispon√≠veis.
- A aba **Publica√ß√µes** exibe totais, filtros por comunidade/tipo/per√≠odo, pagina√ß√£o e lista somente leitura de posts/respostas reais.
- Refer√™ncias visuais usadas: `_product/proto/admin/Psic√≥logos/Detalhes do psic√≥logo/Estat√≠sticas.png` e `_product/proto/admin/Psic√≥logos/Detalhes do psic√≥logo/Publica√ß√µes.png`; Builder/Quick Copy n√£o estava dispon√≠vel no ambiente.
- ADR criado: `adrs/0237-admin-psicologo-estatisticas-publicacoes.md`.
- Valida√ß√µes executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, API local autenticada e browser local via Edge/CDP nas abas `estatisticas` e `publicacoes`.

### CorreÁ„o pÛs-validaÁ„o em 2026-07-11

- Ativado o contador **Resultados de busca** na aba Admin **EstatÌsticas** com tracking real de impress„o do psicÛlogo quando o card/slide fica ativo na listagem p˙blica.
- A persistÍncia reaproveita `profile_view_event.source="search_result"` e preserva `source="profile_page"` para aberturas reais do perfil, sem criar mock, seed ou estimativa.
- O endpoint `POST /api/private/directory/psychologists/:id/search-impression` usa `optionalAuth`, n„o dispara notificaÁ„o de visualizaÁ„o de perfil e ignora autoimpress„o do prÛprio psicÛlogo.
- As mÈtricas existentes de visualizaÁ„o de perfil passaram a filtrar `source="profile_page"` para n„o misturar resultados de busca com visitas ao perfil.
### CorreÁ„o visual em 2026-07-12

- O tÌtulo **EstatÌsticas de comunidade** foi movido para fora do card branco, seguindo o padr„o visual de **EstatÌsticas de negÛcio**.
- A seÁ„o de comunidade passou a ter seu prÛprio filtro de perÌodo e datas ‡ direita do tÌtulo.
- Os filtros de negÛcio/vÌdeo e comunidade s„o independentes: alterar o perÌodo da comunidade n„o altera o perÌodo de negÛcio.
- A implementaÁ„o reaproveita o endpoint real de estatÌsticas em duas queries separadas, sem alterar contrato backend e sem mock.
- ReferÍncia visual consultada: `_product/proto/admin/PsicÛlogos/Detalhes do psicÛlogo/EstatÌsticas.png`; Builder/Quick Copy n„o estava disponÌvel como ferramenta callable no ambiente.
- ValidaÁıes executadas: `pnpm --dir admin check`, `pnpm --dir admin build` e browser local/headless via Edge/CDP em `http://localhost:3012/psicologos/demo-psychologist-marina-rocha?tab=estatisticas` com admin tempor·rio real removido ao final, confirmando tÌtulo fora do card e filtros independentes.
