# ADR-0064: Feed de comunidade vertical com chips canônicos

## Status

Accepted

## Task relacionada

TASK-23, refinamento solicitado em 2026-06-12.

## Contexto

O feed de `/app/community/[slug]` precisava se aproximar da referência visual "Feed Comunidade", com densidade de rede social mobile, cards brancos, busca, chips horizontais e CTA de WhatsApp. A regra do projeto continua proibindo mocks/frontend arrays para concluir a task; portanto, a tela deve consumir posts persistidos pelo backend.

O PDF local `C:\Users\tulio\Downloads\Feed Comunidade.pdf` foi usado como referência solicitada. A renderização headless direta do PDF via Chrome/Edge retornou imagem em branco no ambiente, então a implementação também conferiu a imagem exportada equivalente `_product/proto/Feed Comunidade.jpg`, já inventariada como referência ativa da TASK-23.

## Decisão

- Centralizar o mapeamento de comunidades/chips em `frontend/src/utils/community.ts`, com nomes curtos e slugs canônicos:
  - `Ansiedade` → `ansiedade-em-equilibrio`;
  - `Relacionamentos` → `relacionamentos-com-proposito`;
  - `Mulheres` → `mulheres-em-foco`;
  - `Autocuidado` → `autocuidado-em-pratica`;
  - `Luto` → `luto-e-ressignificacao`.
- Refatorar `/app/community/[slug]` como feed mobile-first com cabeçalho, busca, chips horizontais, card de estatísticas e lista vertical de posts.
- Manter a navegação inferior/shell privado atual.
- Estender `GET /api/private/community/:slug/posts` com busca por `title`, `content` e `author.name`.
- Enriquecer o DTO de autor com dados derivados e públicos: `type_label`, `verified` e `whatsapp_url`.
- Mascarar autores não psicólogos no feed como `Membro Anônimo`.
- Derivar `featured_badge="TOP #1 MENTOR"` quando o autor psicólogo tem entitlement profissional ativo e o post possui alto engajamento (`upvotes_count >= 60`).
- Preparar campos `media_url` e `media_type` no DTO retornando `null` enquanto o schema de mídia de posts não existir, evitando inventar coluna fora do `DATA-MODEL.md`.
- Usar dados persistidos no banco para validação visual local; não criar arrays locais de posts nem endpoint simulado.

## Consequências

- A tela deixa de parecer vazia quando há posts persistidos e mantém estado vazio honesto quando a comunidade não tem posts.
- O chip ativo acompanha a URL acessada diretamente.
- O CTA `Chamar no WhatsApp` aparece apenas para posts de psicólogos com WhatsApp público no perfil.
- Mídia/vídeo e respostas estruturadas seguem preparadas visualmente/contratualmente, mas dependem de schema/task futura para dados próprios.

## Validação

- `pnpm --dir backend check`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir backend build`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Validação local de API com token temporário:
  - `GET /api/private/community/ansiedade-em-equilibrio/posts?page=1&limit=5` retornou `200`, comunidade `Ansiedade em equilíbrio`, `2` posts;
  - `GET /api/private/community/relacionamentos-com-proposito/posts?page=1&limit=5` retornou `200`, comunidade `Relacionamentos com Propósito`, `2` posts.
- Validação HTTP local de rotas:
  - `GET http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou `200`;
  - `GET http://localhost:3000/app/community/relacionamentos-com-proposito` retornou `200`.

## Pendências

- Criar schema persistido para mídia de posts quando o produto priorizar anexos/vídeos de comunidade.
- Implementar detalhe real de post, comentários, votos, salvamentos e respostas nas tasks 24, 26 e 28.
