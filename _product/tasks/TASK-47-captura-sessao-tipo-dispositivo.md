# TASK-47: Captura de sessão e tipo de dispositivo para analytics admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-47 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Analytics |
| Status | Pending |
| Dependências | TASK-39 |
| ADR alvo | ADR se houver novo modelo `visitor_session` ou mudança no contrato público de analytics |

## Contexto

Hoje a Lectum já envia um `x-device` gerado por fingerprint estável e já possui captura pública de localização em `visitor_location`, com `visitor_id`, `session_id`, `user_id`, cidade/estado/país e frequência controlada. Porém não existe captura persistida do tipo de dispositivo (`mobile`, `desktop`, `tablet`) para alimentar gráficos administrativos.

A referência visual `_product/proto/admin/Dashboard.png` possui o card "Atividade por dispositivo". Esse card só pode ser implementado com dados reais.

## Objetivo

Persistir sessões reais de visitantes com tipo de dispositivo normalizado, permitindo agregações por período para Dashboard e futura aba Tráfego.

## Pré-requisitos e bloqueios

- Ler `_product/tasks/ARCHITECTURE.md`, `_product/tasks/DATA-MODEL.md` e `_product/tasks/PACKAGES.md`.
- Reutilizar a captura de analytics existente quando possível.
- Não armazenar user-agent bruto, IP bruto ou dados sensíveis desnecessários.
- Não usar serviço externo ou pacote novo para parser de user-agent sem validar `PACKAGES.md` e registrar ADR.

## Escopo frontend

- Estender o componente de analytics global atual para enviar metadados normalizados de sessão/dispositivo.
- Classificar `device_type` como:
  - `mobile`;
  - `tablet`;
  - `desktop`;
  - `unknown`.
- Enviar dados opcionais não sensíveis, quando disponíveis:
  - `viewport_width`;
  - `viewport_height`;
  - `os` normalizado simples;
  - `browser` normalizado simples.
- Manter falhas de analytics silenciosas para não quebrar UX.

## Escopo backend

- Criar modelo Prisma recomendado `visitor_session` ou alternativa justificada em ADR.
- Upsert por par `visitor_id` + `session_id`.
- Vincular `user_id` quando houver token válido.
- Persistir `first_seen_at` e `last_seen_at` para agregação de sessões.
- Validar payload com Zod/pacote local.
- Atualizar interfaces `backend/src/interfaces/objects`.
- Se a rota existente `/api/public/analytics/location-capture` for estendida, manter compatibilidade com payloads antigos.

## Fora do escopo

- Criar tela Admin de Tráfego.
- Criar Dashboard Admin.
- Capturar eventos de página detalhados/pageviews.
- Armazenar user-agent bruto.
- Instalar biblioteca de analytics.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`: Prisma, validação, resposta e regras de privacidade.
- `DATA-MODEL.md`: convenções de modelos e soft delete.
- `PACKAGES.md`: evitar pacote novo.

Backend esperado:

- Modelo sugerido:
  - `visitor_session`
  - `id`
  - `deleted`, `deletedAt`, `createdAt`, `updatedAt`
  - `visitor_id String`
  - `session_id String`
  - `user_id String?`
  - `device_type String @default("unknown")`
  - `os String?`
  - `browser String?`
  - `viewport_width Int?`
  - `viewport_height Int?`
  - `first_seen_at DateTime @default(now())`
  - `last_seen_at DateTime @default(now())`
  - relação opcional com `user`
  - `@@unique([visitor_id, session_id])`
  - `@@index([device_type, createdAt])`
  - `@@index([user_id, createdAt])`
  - `@@index([last_seen_at])`
  - `@@map("visitor_sessions")`
- Serviço:
  - upsert idempotente por sessão;
  - atualizar `last_seen_at` quando a sessão reaparecer;
  - associar `user_id` quando o visitante autenticar depois.
- Resposta:
  - manter formato `{ captured, linked, authenticated, ... }` ou criar retorno equivalente documentado.

Frontend esperado:

- Atualizar `frontend/src/components/analytics/location-capture.tsx` ou criar componente equivalente sem duplicar chamadas.
- Atualizar `frontend/src/api/req/analytics` e callers.
- Heurística client-side sem pacote novo:
  - `navigator.userAgentData?.mobile` quando disponível;
  - fallback por user-agent e viewport;
  - tablet separado quando heurística indicar iPad/tablet;
  - `unknown` quando não houver segurança.

Packages usados:

- Nenhum pacote novo.

Regras anti-recriação:

- Reutilizar `visitor_id`/`session_id` já existentes.
- Reutilizar padrão atual de analytics público e validação silenciosa.
- Não criar endpoint simulado só para o admin.

## Critérios de aceite

- [ ] Sessões reais são persistidas com `visitor_id`, `session_id` e `device_type`.
- [ ] Usuário autenticado é vinculado à sessão quando houver token válido.
- [ ] Payload antigo de localização continua funcionando ou migração de contrato foi documentada.
- [ ] Não há armazenamento de user-agent bruto, IP bruto ou dado sensível novo sem justificativa.
- [ ] `mobile`, `desktop`, `tablet` e `unknown` são valores aceitos e documentados.
- [ ] Existe índice adequado para agregação por período e tipo de dispositivo.
- [ ] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [ ] Se houve alteração de banco/schema/migrations, `pnpm --dir backend db:migrate` foi executado sem erro.
- [ ] `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check` e `pnpm check` foram executados sem erros.
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm check`
- Browser local:
  - abrir app anonimamente e confirmar registro de sessão;
  - logar e confirmar vínculo de `user_id`;
  - testar viewport mobile e desktop.

## Notas de execução

- Esta task viabiliza apenas a base de dados. O card "Atividade por dispositivo" entra na TASK-48.
- Se for necessário resetar banco por conflito de migration local, perguntar ao usuário antes de qualquer comando destrutivo.
