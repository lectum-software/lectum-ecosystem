# TASK-349 - Reels compartilhado

## Escopo

Abrir o link publico no Reels existente, com controles e continuacao da fila, sem oferecer um segundo player nativo. Preservar SEO e os links ja compartilhados.

## Criterios

- [x] Rota publica assume a abertura mesmo com escopo antigo no history.state.
- [x] Compartilhamento usa URL publica limpa, sem focusReplyId.
- [x] Fallback HTML nao oferece controles de um player diferente durante a hidratacao.
- [x] Validar testes e navegacao real mobile/desktop.
- [ ] Aprovacao antes de push/deploy.

## Evidencia

Build de producao local concluido; 15 testes reexecutados apos o build com sucesso. Sem push/deploy.

Na verificacao read-only da versao produtiva 0.1.844, o link abriu o dialogo interativo sem erro de JavaScript. A falha da captura nao foi reproduzida nessa sessao limpa; corrigimos a dependencia de escopo persistido e a apresentacao nativa intermediaria. Referencia visual: capturas do usuario; Builder indisponivel nesta execucao.

15 testes de host, links e SEO passaram; typecheck passou. Chrome local a 390 e 1440 px abriu o video real, exibiu os controles, manteve um unico dialogo e avancou para outro video com a URL correspondente. Capturas em `.tmp/previa-reels-compartilhado-{390,1440}.png`. O harness encaminhou respostas reais GET da API com CORS local, sem fixtures, e bloqueou mutacoes. O servidor local precisou de NEXT_PUBLIC_API_URL e origem localhost para a hidratacao funcionar no Next dev.
