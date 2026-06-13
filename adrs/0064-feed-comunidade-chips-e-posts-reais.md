# ADR-0064: Feed da Comunidade agregado com posts reais

## Status

Accepted

## Task relacionada

TASK-23, refinamentos solicitados em 2026-06-12 e 2026-06-13.

## Contexto

A tela de comunidade deixou de representar o detalhe de uma comunidade específica. A regra vigente é que o destino principal da nav bar "Comunidade" seja o **Feed da Comunidade**: um feed vertical com posts de destaque de todas as comunidades, inspirado no PDF local "Feed Comunidade" e sem arrays locais/mocks para preencher a UI.

As páginas de detalhe por comunidade serão criadas depois. Até lá, chips e links de comunidade podem filtrar o feed agregado ou apontar para a rota futura, mas não devem tratar a tela atual como detalhe canônico.

## Decisão

- Usar `/app/community/feed` como rota canônica do Feed da Comunidade e atualizar a nav inferior para esse destino via `DEFAULT_COMMUNITY_FEED_HREF`.
- Manter `/app/community` como tela de explorar/listar comunidades; o chip `Explorar` aponta para essa rota.
- Centralizar os chips em `frontend/src/utils/community.ts`:
  - `Ansiedade` → `ansiedade-em-equilibrio`;
  - `Relacionamentos` → `relacionamentos-com-proposito`;
  - `Mulheres` → `mulheres-em-foco`;
  - `Autocuidado` → `autocuidado-em-pratica`;
  - `Luto` → `luto-e-ressignificacao`.
- Refatorar a tela do feed para mobile-first: primeira linha apenas com busca "Buscar no feed" e botão de filtro; chips abaixo; em seguida, cards de posts.
- Remover seta de voltar, textos/título de detalhe, faixa de membros e faixa de total de posts.
- Criar `GET /api/private/community/feed/posts` para retornar posts publicados de destaque de todas as comunidades, ordenados por engajamento denormalizado (`upvotes_count`, `replies_count`, `saves_count`) e data.
- Aceitar filtros opcionais no endpoint agregado: `search`, `community`, `scope` (`all` ou `following`).
- Enquanto `community_member`/seguir comunidades não estiver implementado (TASK-25), `scope=following` retorna estado vazio honesto; não inventa vínculo sem persistência.
- Preservar `GET /api/private/community/:slug/posts` como contrato por comunidade para detalhe futuro/compatibilidade.
- Enriquecer o DTO de post com dados derivados e públicos: `author.type_label`, `author.verified`, `author.whatsapp_url`, `featured_badge`, `media_url`, `media_type`.
- Mascarar autores não psicólogos como `Membro Anônimo` e exibir CTA `Chamar no WhatsApp` apenas quando houver psicólogo com WhatsApp público.
- Substituir a ação visual de curtir por controles de upvote/downvote, mantendo comentários, salvar e compartilhar.
- Preparar `media_url` e `media_type` retornando `null` enquanto não existir schema de mídia de posts.

## Consequências

- A tela principal da comunidade passa a ter densidade de feed preenchido com dados reais persistidos.
- A navegação inferior não leva mais o usuário para uma comunidade específica por padrão.
- Chips de comunidade funcionam como filtros/compatibilidade do feed até a criação das páginas de detalhe.
- O filtro "Apenas comunidades que sigo" fica disponível na UI e no contrato, mas exibe vazio honesto até a entrega persistida de `community_member`.
- Mídia/vídeo, detalhe de post, comentários, votos persistidos, salvamentos e respostas estruturadas seguem dependentes de tasks futuras.

## Validação

- `pnpm --dir backend check`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Validação local de API com token temporário:
  - `GET /api/private/community/feed/posts?page=1&limit=5` retornou `200`, `count=10`, `5` itens e primeira comunidade `Mulheres em Foco`;
  - `GET /api/private/community/feed/posts?page=1&limit=5&community=relacionamentos-com-proposito` retornou `200`, `community_slug=relacionamentos-com-proposito`, `2` itens;
  - `GET /api/private/community/feed/posts?page=1&limit=5&scope=following` retornou `200`, `count=0`.
- Validação HTTP local de rotas:
  - `GET http://localhost:3000/app/community/feed` retornou `200`;
  - `GET http://localhost:3000/app/community/feed?community=relacionamentos-com-proposito` retornou `200`;
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou `200` como compatibilidade/filtro até o detalhe futuro.

## Pendências

- Implementar `community_member`/seguir comunidades para popular o filtro `following` (TASK-25).
- Criar schema persistido para mídia de posts quando anexos/vídeos de comunidade entrarem no escopo.
- Implementar páginas de detalhe de comunidade e post.
- Implementar comentários, votos, salvamentos e respostas nas tasks 24, 26 e 28.