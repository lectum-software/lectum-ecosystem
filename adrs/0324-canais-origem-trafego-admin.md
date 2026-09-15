# ADR-0324: Canais canônicos de origem do tráfego no Admin

## Status

Accepted

## Task relacionada

TASK-50

## Contexto

O feedback de 2026-07-26 pediu que o donut **Origem do tráfego** de `/trafego` conseguisse mapear canais de aquisição mais úteis para operação: **Google orgânico**, **Google Ads**, **Meta Ads**, **Instagram orgânico**, **Instagram (Link na bio)** e **TikTok**.

A captura first-party da TASK-49 já persiste `page_view_event.traffic_source`, `traffic_medium`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` e `referrer_host`, sem salvar URL externa completa nem query string sensível. O desafio era transformar esses campos reais em labels operacionais sem inventar dados nem instalar ferramenta externa de analytics.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a referência visual auditável continua sendo `_product/proto/admin/Tráfego.png` e a captura enviada pelo usuário.

## Decisão

- A agregação de `traffic_sources` do Admin passa a classificar as pageviews de entrada em canais canônicos usando somente campos reais de `page_view_event`:
  - `Google orgânico` para tráfego Google sem sinal pago;
  - `Google Ads` quando `utm_source`/`traffic_source` indicar Google Ads ou quando Google vier com `utm_medium`/`traffic_medium` pago (`cpc`, `paid_search`, `sem`, etc.);
  - `Meta Ads` quando `utm_source`/`traffic_source` indicar Meta/Facebook/Instagram Ads ou quando Meta/Facebook/Instagram vier com medium pago;
  - `Instagram orgânico` para tráfego Instagram sem sinal pago nem sinal de link na bio;
  - `Instagram (Link na bio)` quando Instagram vier com UTM de bio (`bio`, `link_bio`, `link_in_bio`, `linkinbio`, etc. em medium/campaign/content/term);
  - `TikTok` para tráfego TikTok por UTM ou referrer normalizado.
- `Direto`, canais internos Lectum e `WhatsApp` permanecem preservados; demais origens caem em `Outros`.
- Não houve backfill nem alteração do tracking persistido: a classificação é aplicada na leitura do resumo/exportação para manter compatibilidade com eventos já gravados.
- Não foram adicionados pacote, schema Prisma, migration, tracking de terceiros ou armazenamento de click IDs.

## Consequências

- A tela passa a mostrar labels operacionais mais próximos dos canais de aquisição esperados, mantendo a contagem baseada em pageviews reais de entrada por sessão.
- A distinção entre orgânico, pago e link na bio depende de UTMs confiáveis quando o navegador/app não envia referrer suficiente. Campanhas devem usar convenções como:
  - Google Ads: `utm_source=google` e `utm_medium=cpc`/`paid_search` ou `utm_source=google_ads`;
  - Meta Ads: `utm_source=meta`/`facebook`/`instagram` e `utm_medium=paid_social`/`cpc` ou `utm_source=meta_ads`;
  - Instagram link na bio: `utm_source=instagram` e `utm_medium=bio` ou `utm_content=link_bio`;
  - TikTok: `utm_source=tiktok` quando o referrer não for confiável.
- Sem esses sinais, a classificação permanece honesta: Google tende a orgânico, Instagram tende a orgânico, e tráfego sem referrer/UTM continua `Direto`.

## Validação

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/traffic/summary/DTOs/IAdminTrafficSummaryDTO.ts" "src/modules/api/admin/private/traffic/summary/repositories/interfaces/IAdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/repositories/AdminTrafficRepository.ts" "src/modules/api/admin/private/traffic/summary/use-cases/services.ts"` — OK.
- `pnpm --dir admin exec biome check --write "src/api/req/traffic/index.ts"` — OK.
- `pnpm --dir backend check` — OK.
- `pnpm --dir backend build` — OK.
- `pnpm --dir admin check` — OK.
- `pnpm --dir admin build` — OK.
- `pnpm check` — OK após limpar apenas o Prisma Client gerado em `backend/src/external/generated/prisma`, pois a primeira tentativa encontrou `EEXIST` em artefato gerado.
- HTTP local `GET http://localhost:3002/trafego` — 200.
- Smoke direto do serviço contra o banco local não foi repetido porque o Postgres local retornou `EMAXCONNSESSION` (limite de conexões da sessão); nenhuma limpeza/destruição de dados foi executada.
