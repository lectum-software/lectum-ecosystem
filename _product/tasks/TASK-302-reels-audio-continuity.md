# TASK-302 - Audio continuo dos reels e cantos dos depoimentos

## Escopo aprovado

Reutilizar o elemento de video entre reels, preservando a escolha explicita de
som durante a sessao do viewer. Bloqueio real do navegador continua recuperavel
por toque, sem apagar a preferencia. Arredondar os blocos de depoimentos com o
raio de 26px dos blocos do perfil em perfil, paciente e profissional; conferir estado vazio
e modal. Header de comunidades continua apenas previa.

## Aceite

- [x] Um unico elemento de video nas trocas manuais e automaticas, inclusive entre comunidades.
- [x] Som explicito, mute, pausa e eventos atrasados testados sem interferencia entre reels.
- [x] Progresso, comentarios, navegacao/retorno e camera gratuita preservados.
- [x] Cantos dos blocos e estados vazios conferidos em 320/390/1440.
- [x] Check/build frontend, guardas e smoke com API/MP4 locais aprovados.

ADR-0665. Sem dependencia, migration ou env nova. Sem push/deploy. Validacao
fisica em iPhone nao disponivel neste ambiente e nao sera inferida do Chrome.

## Evidencias locais - 0.1.762

- Check completo do frontend aprovado: Biome, ESLint, TypeScript e suites de regressao.
- Build de producao frontend e guardas da raiz aprovados; cinco manifests em 0.1.762.
- 42 testes focados de audio/layout aprovados, incluindo transferencia do ref,
  eventos atrasados, mute explicito e limpeza do tracking antes da fonte anterior.
- Trocas MP4/HLS/MP4 cobertas por testes unitarios com adaptadores controlados
  (nativo e hls.js); nao constituem integracao com um servidor HLS real.
- Smoke Chrome com API, PostgreSQL e MP4 H.264/AAC reais, exclusivamente locais,
  aprovado em 320/390/1440: um unico video, som ativo, proximo/anterior,
  comentarios pausando, retorno do perfil com tempo restaurado e fim natural
  avancando para outra comunidade. Camera gratuita com contraste preservado.
- Sem erros de pagina ou requisicoes externas; registros temporarios removidos.
- Previa de componentes conferida em 24 cenarios (8 telas x 3 larguras), com
  raio computado de 26px nas listas/estados vazios. Fontes e resposta recuada mantidas.
- Evidencias em .tmp/task302-browser-results.json, task302-reels-{width}.png,
  task302-audio-tests-latest.log, task302-frontend-check-latest.log,
  task302-frontend-build-latest.log, task302-root-check.log e task302-preview.log.

Limite: a verificacao de audio confirma faixa AAC, reproducao e propriedades
muted/volume no Chrome; nao captura a saida fisica do alto-falante. Safari/iPhone
real ainda deve ser conferido antes da aprovacao final nesses dispositivos.

## Referencias

ARCHITECTURE e PROTO-INVENTORY consultados; capturas fornecidas pelo usuario e
componentes existentes sao as referencias visuais. Builder indisponivel nesta
sessao. Docs locais Next consultados para fronteira client e ciclo de vida.
