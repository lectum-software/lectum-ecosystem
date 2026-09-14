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

## Complemento: contrato de upload e tentativa ambígua

Após publicar 0.1.378, os logs reais revelaram respostas 200/201 rejeitadas pelo
adapter antes de devolver a capability ao navegador. A antiga allowlist só aceitava
`upload.videodelivery.net`; o contrato agora admite também exatamente
`upload.cloudflarestream.com`. Não seguir a recomendação ampla de CSP como licença
para aceitar qualquer host: manter allowlist de ingestão com HTTPS, porta padrão,
sem credenciais, caracteres de controle ou fragmento. UID continua vindo do campo/header
canônico ou de reconciliação por creator, nunca extraído da URL opaca.

Referência oficial consultada em 14/09/2026: a FAQ lista as famílias videodelivery.net
e cloudflarestream.com para direct creator uploads:
https://developers.cloudflare.com/stream/faq/#i-use-content-security-policy-csp-on-my-website-what-domains-do-i-need-to-add-to-which-directives
Frontend já permite o segundo domínio em connect-src; não há mudança de CSP.

Adicionar `reason` opcional, enumerado, ao erro interno para diferenciar JSON,
envelope, UID, destino e reconciliação. Nunca registrar URL, corpo ou header bruto.
Resposta pública permanece genérica. Esta observabilidade não depende de env nova.

Resposta 2xx rejeitada não prova ausência de efeito remoto: o loop anterior criava
uma reserva básica e tentava outra TUS. Permitir fallback apenas após rejeições
explícitas 400/404/405/415/422 do POST básico. Falhar fechado após timeout/5xx/contrato
inválido; não limpar ativos históricos nem liberar URLs não confiáveis.

Trade-off: uma tentativa ambígua pode manter a reserva remota até expirar, mas não
cria uma segunda reserva automaticamente. Reconciliação/limpeza geral não faz parte
desta correção. Banco, limites, assinatura de playback e autorização permanecem iguais.
Sete testes puros cobrem URL e decisão de fallback; o aceite end-to-end continua
dependendo de upload/processamento/reprodução reais em homolog.
