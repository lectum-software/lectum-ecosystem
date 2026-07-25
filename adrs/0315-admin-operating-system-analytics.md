# ADR-0315: Sistema operacional em analytics Admin

## Status

Accepted

## Task relacionada

TASK-81

## Contexto

O Admin precisava responder se usuarios mobile usam mais iOS ou Android, sem exigir versao exata do sistema operacional. A base tecnica da TASK-47 ja captura `visitor_session.device_type`, `visitor_session.os` e `visitor_session.browser` de forma normalizada, sem user-agent bruto. Os dashboards de psicologos/pacientes e os detalhes individuais ja tinham graficos de Devices por sessao autenticada.

## Decisão

Usar a fonte existente `visitor_session.os` combinada com `visitor_session.device_type` para os relatorios Admin de sistema operacional, sem migration e sem package novo.

Categorias normalizadas:

- `android` -> Android.
- `ios` -> iOS, exceto quando `device_type="tablet"`, onde aparece como iPadOS.
- `ipados` -> iPadOS.
- `macos`/`mac` -> macOS em desktop; iPadOS em mobile/tablet para cobrir navegadores iPad-like.
- `windows` -> Windows.
- demais valores identificados, como Linux/ChromeOS, entram em Outros.
- ausente/unknown entra em Nao identificado.

Dashboards agregam por sessoes autenticadas do papel da tela e tambem retornam usuarios ativos deduplicados por OS. Detalhes individuais mantem o grafico de Devices e adicionam, em cada device, a lista dos sistemas operacionais observados naquele device com percentual relativo ao device.

## Consequências

- O Admin passa a enxergar OS sem coletar dado bruto adicional.
- Nao ha versao do OS, fabricante ou modelo de aparelho.
- Sessoes historicas sem `os` permanecem como **Nao identificado**; nao ha backfill.
- O mesmo usuario pode aparecer em mais de uma categoria de OS se usou mais de um sistema no periodo.
- Linux/ChromeOS aparecem como **Outros** no recorte desktop, conforme pedido de manter Windows, macOS ou outros.

## Validacao

- `pnpm --dir backend exec biome check --write ...` nos arquivos backend da task.
- `pnpm --dir admin exec biome check --write ...` nos arquivos Admin da task.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Browser local/headless em `http://localhost:3002`: HTTP 200 nas rotas protegidas relevantes; visual autenticado nao foi inspecionado no headless por falta de credenciais/sessao Admin, mas build e typecheck validaram os componentes.

## Pendências

- Nenhuma pendencia externa.
