# TASK-317 - Download fiscal, busca CRP e pergunta em video

## Aceite

- [x] PDF com marca, numero (ou pagamento) e data dd-mm-aaaa, sem PII.
- [x] Acao Nota Fiscal em semibold, com icone preservado.
- [x] Busca por nome preservada e CRP com/sem formatacao e zeros normalizado.
- [x] Pergunta limitada a tres linhas com reticencias, sem reduzir fonte; preview e exportacao iguais.
- [x] Testes, builds e validacao visual local.

## Evidencias locais - 2026-11-05

- Versao 0.1.780; check completo da raiz passou (inclui as quatro aplicacoes).
- Builds backend, frontend e video passaram. Admin sem alteracao funcional.
- PostgreSQL isolado: busca formatada, sem formatacao, regional distinta, nome
  e exclusao de perfil incompleto/nao publicado; fixtures removidas ao terminar.
- Playwright com componentes reais e CSS local em 390/1440px: tres linhas visiveis,
  reticencias, sem transbordamento no texto e peso computado 600 no link fiscal.
- Video: 109 testes passaram, nenhum skip, com FFmpeg 9.0.2 local verificado
  por SHA256. Inclui render real da pergunta longa; frame inspecionado.
- Fonte do render Windows usa fallback local; selecao de Manrope no container
  Linux e tamanhos de fonte existentes nao foram alterados.
- Regressao adicional confirma paridade entre quebra de texto da previa e FFmpeg.
- Nome do PDF coberto por testes de data, timezone, ausencia de numero/data,
  modo teste e rejeicao de caminhos inseguros no cliente.
- Nao houve chamada a SendNF, emissao de documento nem alteracao de producao.

Logs e capturas locais em .tmp/task317-*. Novos downloads sociais geram novo job;
arquivos ja exportados nao sao reescritos.

## Limites

Sem push/deploy e sem alterar configuracao fiscal produtiva. Nenhuma emissao real.
Sem novos pacotes ou migrations. Builder indisponivel; referencias: capturas do
usuario e componentes existentes, conforme PROTO-INVENTORY.md.
Publicacao requer backend/frontend/video; Admin nao tem alteracao funcional.

## Riscos e rollback

Nome fiscal usa authorized_at do provider e timezone America/Sao_Paulo. Sem data
valida, omite a data em vez de inventar a data do pagamento/download.
Backend expoe Content-Disposition somente no download autorizado. Cliente aceita
versao anterior do endpoint. Rollback: artefatos anteriores, sem alteracao de dados.
