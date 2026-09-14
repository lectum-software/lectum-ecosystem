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

## Complemento: serialização das origens no TUS

O diagnóstico real fornecido pelo operador em 14/09/2026 revelou cinco vídeos com
`originsMatchConfiguration=false` e `originsContainJsonCharacters=true`, incluindo
dois prontos. Webhook URL/segredo conferem. O adapter codificava array JSON em
`allowedorigins`; esse texto foi persistido com caracteres que não são domínios.

Decisão: no header TUS, codificar em Base64 uma lista de domínios separada por
vírgula. Manter arrays JSON em corpos JSON (básico/copy). Não alterar o parser de
env, nem aceitar/remover silenciosamente caracteres de JSON na configuração.
Não ampliar allowlist, desativar `requiresignedurls`, mudar limites ou reabrir R2.

Referências oficiais consultadas em 14/09/2026:
- https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/
- https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/

A documentação descreve o campo e a restrição de origens, mas não exemplifica a
serialização interna dessa lista no header. A correção usa a evidência remota e o
contrato do transporte; o roundtrip real de um novo upload ainda é gate de aceite,
não pode ser substituído por simular o provider nos testes.

Trade-off: patch mínimo para novos uploads; sem chamada extra ao provider por
reserva/playback e sem reescrever ativos existentes. Reparação de origens legadas
deve ser operação manual escopada a ativos do banco de homologação, com diagnóstico
prévio; não executada neste patch. Dados e mídias permanecem intactos. Nenhuma env
nova obrigatória; atualização operacional das envs continua pendente e separada.

Regressão: cinco testes puros do serializador, quatro falhas antes da correção e
cinco sucessos depois. Mantidos métodos básico/importação, signed URLs, creator,
expiração e duração. Os testes de adapter existentes não contam como E2E.

Checks desse complemento: backend com 784 testes aprovados e nenhum skip/falha;
Prisma/TypeScript/Biome/build aprovados. Check global aprovado (seis skips
preexistentes de FFmpeg local no video). Sem alteração de UI, banco ou packages.

## Aceite operacional confirmado (14/09/2026)

Commit `7ff4b60a` / 0.1.381 publicado em homolog, com envs aplicadas e os quatro
artefatos confirmados nessa versão. Dois uploads autorizados na conta da auditoria
usaram arquivos técnicos reais: 745.086 bytes/3s e 239.480.318 bytes/40s. Ambos
foram processados, reproduzidos integralmente pelo Stream e mantidos após reload.
O teste grande exercita o transporte TUS, não o limite de upload básico.

O operador forneceu a leitura GET da API real do Stream após o envio. Foi
encontrado exatamente o novo arquivo grande: `ready=true`, `processingError=false`,
`signed=true`, `originsMatch=true` e `originsContainJsonCharacters=false`.
Portanto, o roundtrip confirma a serialização CSV no metadata TUS e a preservação
das restrições, além da evidência funcional de playback. Não houve necessidade
de wildcard, desativação de assinatura ou alteração de limites para passar.

Backend `/ping`, `/health` e `/ready` responderam 200 no smoke por curl; frontend
e Admin `/version` responderam 200/0.1.381. O operador confirmou separadamente
autenticação/readiness do serviço video 0.1.381 pela rede privada.

Este fechamento muda apenas documentação/versão, não código, banco ou envs.
O aceite se limita à regressão de novos uploads: não repara metadados históricos,
não valida todos os perfis de acesso/aparelhos nem os jobs de transformação
FFmpeg/BullMQ. Essas atividades não devem ser declaradas concluídas nem disparadas
automaticamente como consequência deste registro.
