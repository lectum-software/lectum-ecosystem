# TASK-308 - Desfocar comentarios e liberar navegacao dos reels

Status: Done, validado localmente em 0.1.770. Dependencia: TASK-307. ADR-0669.

## Escopo

O video enviado em 01/11 mostra o teclado fechado com o rascunho Teste,
player retido e confirmacao nativa de descarte ao sair. Corrigir apenas reels.
Builder indisponivel; referencia: video do usuario e componentes atuais.
Mobile-first: validar 320/390 px e desktop 1440 px.

## Aceite

- [x] Ocultar teclado ou tocar fora desfoca realmente o compositor do reel.
- [x] Rascunho desfocado nao bloqueia swipe, teclado ou avancar automaticamente.
- [x] Navegar descarta rascunho do video anterior sem confirmacao.
- [x] Minimizar/fechar comentarios desfoca e descarta sem confirmacao.
- [x] Envio, preparacao de midia e seletores internos continuam protegidos.
- [x] Formularios fora de reels preservam confirmacao e comportamento existente.
- [x] Testes, check, build e QA local real aprovados; fixtures removidas.

Sem mudanca de API, banco, dependencias ou variaveis. Sem push/deploy.

## Evidencias locais

- Video de 25,54 s analisado por quadros locais em `.tmp/task308-video-sheet.jpg`.
- Contratos focados: 48 testes aprovados, 3 skips dos harnesses visuais opcionais;
  apos refinamento do alvo de clique, 27 testes aprovados e 1 skip preexistente.
- Chrome real, API 3005 e PostgreSQL isolado 55432: 320/390/1440 px, swipe nativo
  mobile, wheel desktop, retorno por teclado com rascunho vazio, X/Escape/gesto
  da folha, evento blur antes da desmontagem e publicacao real de comentarios.
- Requisicao de envio retida temporariamente no navegador e depois encaminhada
  a API real, sem resposta simulada: envio pendente bloqueia saida e swipe.
- Visitante: digitar, enviar, continuar explorando na conversao e navegar funciona.
- Sem dialogos nativos, erros JS ou HTTP 500; fixtures UUID removidas em finally.
  Relatorio: `.tmp/task308-browser-results.json`; log: `.tmp/task308-browser.log`.
- Teclado: eventos controlados de VisualViewport exercitaram o hook real;
  reducao pequena por toolbar nao desfoca, ciclo de teclado aberto/fechado desfoca.
  Chrome nao reproduz teclado nativo iOS: confirmacao em iPhone fisico pendente.
- QA descobriu alvo deslocado em 320 px pelo blur no pointerdown; foco agora
  aguarda click em botoes externos, sem atrasar o desbloqueio de gesto no video.
- Bump unico para 0.1.770, check:version e lint do hook final aprovados.
- Build compilado usa politica de origens de producao que recusa API loopback;
  QA funcional ocorre em next dev com API real local, sem relaxar essa politica.
- Check integral aprovado: `.tmp/task308-check.log`. Ultima revisao do hook
  revalidada por lint, build e suite de reels: 81 aprovados, 7 skips de harnesses
  opcionais; `.tmp/task308-reels-tests.log`. Novos testes incluidos no script
  `test:content-videos`, sem depender de execucao manual.
- Build Next 16.4.1 aprovado: `.tmp/task308-build.log`; limpeza de source maps
  confirmada. Previa dev restaurada em http://localhost:3104.
