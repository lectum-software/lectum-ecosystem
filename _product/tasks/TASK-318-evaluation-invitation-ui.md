# TASK-318 - Convites de avaliacao

## Escopo autorizado

- [x] Usar ReviewsIcon na notificacao de avaliacoes pendentes.
- [x] Titulo: Recebeu acolhimento? Retribua com uma avaliacao.
- [x] Padronizar a acao Avaliar em botoes, formularios, acessibilidade e push.
- [x] Desktop: acao abaixo do video, alinhada a borda direita da midia.
- [x] Mobile: preservar icone na barra de resposta.
- [x] Refinamento solicitado: somente icone tambem no desktop, mantendo tooltip e nome acessivel Avaliar.
- [x] Lista refinada: botao azul compacto a direita, nome em uma linha com reticencias.
- [x] Avaliar na lista abre TestimonialComposer sobre a mesma pagina, sem nova navegacao.
- [x] Verificacoes e build local.

## Limites e referencias

PROTO-INVENTORY.md consultado. Builder indisponivel; referencia ativa: capturas
enviadas e componentes WeeklyWhatsappNotification e AcquiredPatientsLogic.
Sem mudanca de elegibilidade, janela de envio, configuracao, banco ou dependencias.
Sem push/deploy. Dados temporarios usados somente no banco PostgreSQL local
isolado, removidos ao concluir as capturas. Nenhuma avaliacao ou push real enviado.

Decisao: ADR-0679.

## Evidencias

Frontend check completo e build aprovados (.tmp/review-adjustments-check.log e
.tmp/review-adjustments-build.log). Testes backend de convite/push: 6 aprovados;
service worker: 3 aprovados. Biome dos arquivos backend alterados aprovado.
Suite frontend mantem skips opcionais preexistentes; QA visual desta tarefa usa
Playwright com API real e banco isolado, sem endpoints simulados.

Capturas reais em .tmp/review-previews: notificacoes, post mobile/desktop,
lista, perfil, modal e pagina. Nome longo validado em 320, 390 e 1440 px,
sem overflow horizontal. Refinamento posterior posiciona o botao ao lado do nome. Midia e elegibilidade
preservadas. Nenhuma alteracao de dados ou configuracao em producao.

Refinamento 0.1.782: suite testimonials com 48 aprovados, 3 skips opcionais e
zero falhas (.tmp/review-refinement-tests.log). ESLint dos componentes, Biome
dos cinco arquivos e build frontend aprovados (.tmp/review-refinement-build.log).
Playwright com API real confirmou modal padrao sobre a lista, URL preservada,
fechamento sem navegacao, botao compacto a direita e reticencias em 320/390/1440 px.
Capturas 02, 03 e 06 atualizadas; acao inline somente com icone em todas as larguras.
