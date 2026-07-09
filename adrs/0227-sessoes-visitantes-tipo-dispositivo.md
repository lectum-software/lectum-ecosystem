# ADR-0227 - Sessões de visitantes com tipo de dispositivo normalizado

## Status

Accepted

## Contexto

A TASK-47 precisa alimentar os próximos painéis administrativos com distribuição real de sessões por dispositivo. A base existente já possuía `visitor_location` e o identificador `x-device`, mas não persistia `mobile`, `tablet`, `desktop` ou `unknown` por sessão.

O protótipo de referência é `_product/proto/admin/Dashboard.png`, no card "Atividade por dispositivo". O Builder/Quick Copy ativo não estava disponível como ferramenta MCP nesta execução, então a referência visual ficou registrada apenas como contexto local; esta task implementa a fundação de dados, sem tela.

## Decisão

- Criar o modelo Prisma `visitor_session`, mapeado para `visitor_sessions`, separado de `visitor_location`.
- Usar upsert idempotente por `visitor_id + session_id`, preservando `first_seen_at` e atualizando `last_seen_at`.
- Manter a rota pública existente `POST /api/public/analytics/location-capture` como contrato compatível, adicionando campos opcionais de sessão/dispositivo.
- Normalizar e aceitar somente:
  - `device_type`: `mobile`, `tablet`, `desktop`, `unknown`;
  - `os`: `android`, `chromeos`, `ios`, `linux`, `macos`, `unknown`, `windows`;
  - `browser`: `chrome`, `edge`, `firefox`, `opera`, `safari`, `samsung`, `unknown`.
- Não armazenar user-agent bruto, IP bruto ou payload sensível novo. O frontend usa heurística local sem pacote novo e envia apenas valores normalizados.
- Vincular `user_id` quando o token JWT de usuário final for válido, reutilizando a validação existente de token + `user_token`.

## Consequências

- TASK-48/TASK-50 poderão agregar sessões por `device_type`, `createdAt` e `last_seen_at`.
- Payloads antigos com `visitor_id` e/ou `session_id` continuam válidos; quando `session_id` não existir, a rota segue capturando localização e retorna `session.reason="missing_session_id"`.
- O frontend passa a chamar a captura uma vez por sessão real do navegador, em vez de depender apenas da janela local diária de geolocalização; a frequência de localização continua controlada no backend.
- Não houve instalação de pacote novo.

## Validações

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke anônimo real via `POST /api/public/analytics/location-capture` para `desktop`, `mobile`, `tablet` e `unknown`, com verificação em `visitor_sessions`.
- Smoke de payload legado sem `session_id`, mantendo resposta 200 e `session.reason="missing_session_id"`.
- Smoke autenticado com usuário/token transitórios, comprovando `visitor_session.user_id` vinculado; dados transitórios removidos ao final.
- Produção local do frontend iniciada em porta temporária e rota `/` respondeu HTTP 200.

## Task relacionada

- TASK-47 - Captura de sessão e tipo de dispositivo para analytics admin
