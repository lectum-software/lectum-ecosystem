# ADR-0605 - Composer abaixo da modal de criar post

## Status
Aceito e aprovado pelo usuario para producao em 11/10/2026.

## Contexto e decisao
Captura do usuario em 11/10 mostra o composer de comentarios atravessando a modal Criar Post no detalhe de publicacao. Composer usa camada 80 e overlay da criacao usa 70. No desktop, o composer e item de grid, entao z-index continua efetivo mesmo com sm:static.

Corrigir a camada do composer para 60: acima da navegacao 40/50 e abaixo do overlay 70. Nao aumentar indiscriminadamente todas as modais nem desmontar o formulario (preservar texto, midia, foco e estado). Reutilizar estrutura existente. Sem alterar layout, comportamento de teclado, envio ou composer inline. Base mobile-first 390px, aplicavel tambem ao desktop da captura. Builder indisponivel; PROTO-INVENTORY e captura usados como referencia.

## Deploy e rollback
Somente frontend, sem package, contrato, env ou migration. Rollback por reversao desta camada. Sem push/deploy. Task anterior ADR-0604 permanece aguardando conferencia, sem misturar sua conclusao com este bug priorizado pelo usuario.

## Validacao
Regressao compara as camadas reais do composer e overlay, preserva camada acima da navegacao e impede override por breakpoint. Check/build e browser local pendentes.

Frontend check completo e build aprovados; 9 testes focais de composer/layout aprovados. ADR/tasks guards aprovados. Source-size permanece bloqueado pelo reply-card.tsx preexistente com 708/700 linhas, nao alterado neste ajuste. Logs .tmp/oct11-composer-layer-check.log e oct11-composer-layer-build.log. Frontend reiniciado apos build. Browser integrado apresenta abas em erro e nao disponibiliza a sessao autenticada do Chrome; conferencia solicitada ao usuario. Sem bump, commit, push ou deploy enquanto aguarda aprovacao visual.

Usuario confirmou Conferidos e aprovados e autorizou publicacao. Evidencias de pendencia acima sao historicas, substituidas pela aprovacao explicita. Commit proprio; publicacao condicionada aos gates do lote.
