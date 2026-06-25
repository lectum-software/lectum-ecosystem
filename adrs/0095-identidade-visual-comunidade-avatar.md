# ADR 0095 — Identidade visual de comunidade derivada do avatar

## Status

Aceito — 2026-06-15

## Contexto

A página interna de comunidade (`/app/community/[slug]`) usava uma faixa superior azul fixa. O produto pediu que cada comunidade tivesse identidade visual uniforme, derivada da imagem/avatar da própria comunidade, com fallback azul quando a imagem não existir ou a extração falhar.

O Builder Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) não está exposto como ferramenta neste ambiente. A referência visual consultada foi o protótipo local `_product/proto/Dentro da Comunidade.jpg`, conforme `_product/tasks/PROTO-INVENTORY.md`.

## Decisão

1. Adicionar ao modelo `community` campos opcionais para avatar e paleta cacheável:
   - `avatar_url`;
   - `visual_primary_color`;
   - `visual_primary_dark_color`;
   - `visual_soft_color`;
   - `visual_text_color`;
   - `visual_gradient_color`.
2. Expor esses campos no DTO/contrato de comunidades para listagem, feed, detalhe e participação.
3. No frontend, resolver a paleta nesta ordem:
   - usar cores persistidas quando `visual_primary_color` existir;
   - se não houver cor persistida e `avatar_url` existir, extrair a cor dominante do avatar com Canvas no cliente;
   - ignorar pixels transparentes, muito claros, muito escuros ou pouco saturados;
   - normalizar saturação/luminosidade por HSL antes de gerar a paleta;
   - cachear o resultado em memória por `community.id + avatar_url` para evitar recálculo a cada render;
   - usar fallback azul atual quando não houver imagem, quando a imagem for inacessível por CORS ou quando a extração não encontrar cor elegível.
4. Aplicar a paleta apenas como apresentação:
   - gradiente da faixa superior;
   - radial claro próximo ao avatar;
   - fundo/initials do avatar;
   - chip de Top Mentores.

## Consequências

- A mesma comunidade mantém cor estável quando houver cores persistidas ou quando o avatar não mudar.
- Comunidades sem avatar continuam com a identidade azul anterior, sem usar cores aleatórias.
- A extração client-side evita package novo e evita bloquear backend por processamento de imagem neste momento.
- A migration adiciona colunas nullable e não altera dados existentes.
- Se o produto passar a gerenciar upload/avatar de comunidades no backend/admin, os campos de paleta já podem ser preenchidos e cacheados no banco para máxima estabilidade.

## Validação

- `pnpm --dir backend db:migrate --name add_community_visual_identity`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via `next start` em `/app/community/relacionamentos-com-proposito` retornou HTTP 307 sem cookie autenticado, esperado para rota privada.

## Atualizacao 2026-06-25 — avatares publicos do catalogo

Os avatares curados das comunidades ficam em `backend/public/community/icons/*.png` e sao retornados pela API como `/community/icons/*.png`. Esse caminho passa a ser reconhecido pelo frontend como midia publica, junto com `/public/files/`, para que componentes `Image` possam renderizar esses assets diretamente quando necessario, sem exibir o alt text por falha do otimizador local.

A decisao preserva a arquitetura atual: o backend continua servindo os assets publicos e o frontend continua usando `next/image` com `unoptimized` apenas para caminhos publicos conhecidos, sem `<img>` cru e sem criar novo pipeline de assets.

### Validacao desta atualizacao

- `pnpm.cmd --dir frontend exec biome check --write src/utils/media.ts`
- `pnpm.cmd --dir frontend check`
- `pnpm.cmd --dir frontend build`
- `pnpm.cmd check`
- HTTP local `200` em `http://127.0.0.1:3002/app/community/ansiedade-em-equilibrio` via `next start` temporario
- HTTP local `200 image/png` em `http://127.0.0.1:3001/community/icons/ansiedade.png`
