# ADR-0499: CORS da negociação de upload Stream

## Status

Accepted — TASK-179, 14/09/2026.

## Contexto

O commit `fb4df718` adicionou `X-Lectum-Video-Upload-Methods` ao cliente de upload
compartilhado por apresentação, posts e respostas. A política CORS do backend
não foi atualizada. Homolog 0.1.377 responde OPTIONS 204, mas sem esse header em
`Access-Control-Allow-Headers`; browsers não enviam o POST nesses casos.

As checagens anteriores de provider/DTO não detectavam falhas de preflight.
`/ready` 200 também não detecta um contrato navegador/API incompatível.

## Decisão

- Liberar apenas o cabeçalho de negociação na allowlist existente.
- Extrair o middleware atual para `main/server/cors.ts`, usado pelo app e pelos
  testes HTTP reais. Preservar origens `WEB_URL`, credentials, métodos e demais headers.
- Não usar wildcard nem refletir headers enviados arbitrariamente.
- Não remover autenticação/autorização, assinatura de playback ou limites.
- Não reabrir fallback de escrita R2 para contornar um problema de transporte.
- Manter apps/instalações independentes. Nenhum package, env ou banco novo.

## Rollout

Backend pode ser publicado antes do frontend, sem alteração deste consumidor.
Push em homolog aciona deploy. Validar versão, health, ready, OPTIONS e upload real.
Rollback reintroduz a falha de CORS; não apagar ou migrar objetos como parte do rollback.
Esta correção não aciona manualmente backfill e não muda sua política existente.

## Validação

- OPTIONS publicado confirma ausência do novo header antes da correção.
- Browser com conta de auditoria e MP4 descartável confirma falha imediata.
- Cinco testes de transporte com Express/CORS reais: allowlist, clientes antigos,
  origem não autorizada/opaca/sufixo, header arbitrário e resposta de rota inexistente.
- Os testes falham com a política antiga e passam com a corrigida.
- Backend check: 764 testes passam, zero falhas/skips; build aprovado.
- Browser local: preflight real e POST com credentials/headers passam no middleware
  compilado; rota inexistente retorna 404 legível, sem simular negócio/provider.
- Check global encontrou uma remoção indevida do comentário ESLint no redirect
  OAuth e no interceptor do Admin, também feita nos commits recentes. Restauradas as exceções pontuais já
  justificadas: falha de sessão precisa de recarga completa para descartar caches.
  Nenhuma navegação/comportamento de autenticação foi modificado.
- Upload end-to-end publicado só será considerado validado após deploy/teste real.

## Revisão complementar

Não há evidência de falta de env como causa deste preflight: health/ready/version
estão saudáveis. Isso não prova permissões/capacidade no provider.
O POST direto e `maxDurationSeconds` TUS são documentados pela Cloudflare:
https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/

Riscos distintos encontrados em fonte, não reproduzidos como causa deste incidente:
POST básico sem timeout explícito; tentativa de TUS após resposta ambígua do básico
pode reservar mais de um ativo; backfill automático em homolog roda lote único de 50.
Não executar migração/limpeza nem relaxar segurança para investigar tais hipóteses.

Check global `pnpm check` aprovado (6 skips preexistentes no FFmpeg local de video).
