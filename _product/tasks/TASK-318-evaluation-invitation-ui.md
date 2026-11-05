# TASK-318 - Convites de avaliacao

## Escopo autorizado

- [x] Usar ReviewsIcon na notificacao de avaliacoes pendentes.
- [x] Titulo: Recebeu acolhimento? Retribua com uma avaliacao.
- [x] Padronizar a acao Avaliar em botoes, formularios, acessibilidade e push.
- [x] Desktop: acao abaixo do video, alinhada a borda direita da midia.
- [x] Mobile: preservar icone na barra de resposta.
- [x] Lista de profissionais com nome livre e botao azul abaixo, no padrao de pacientes adquiridos.
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
sem overflow horizontal e com botao abaixo do nome. Midia e elegibilidade
preservadas. Nenhuma alteracao de dados ou configuracao em producao.
