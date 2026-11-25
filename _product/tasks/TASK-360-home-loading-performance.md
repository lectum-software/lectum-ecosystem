# TASK-360 - Carregamento inicial do feed

Status: Concluida localmente.

## Escopo

Reduzir o caminho critico da home medido no PageSpeed mobile de 24/11/2026
(LCP 9,2s, TBT 330ms). Preservar ranking, seed, paginacao, sessao, consentimento
e controles de video. Sem redesenho; referencia mobile-first sao as capturas
atuais do usuario, a partir de 390px. Builder indisponivel nesta execucao.

## Aceite

- [x] Leituras anonimas do feed nao aguardam fingerprint; sessao/escritas preservadas.
- [x] Posters distantes adiados; capas retidas ao rolar e regras de reproducao inalteradas.
- [x] Avatares responsivos e logo leve sem mudar identidade visual.
- [x] Zoom permitido por viewport e CSS; bloqueador global de gestos removido.
- [x] Testes, check/build frontend e smoke local mobile/desktop.

## Validacao

- Check frontend e build de producao aprovados; testes do interceptor cobrem sessao e guest.
- Guards de versao, tasks, ADRs, tamanho, ciclos, segredos, encoding, source-safety e env aprovados.
- Chrome 390px e 1440px: 12 videos montados, somente 1 poster inicial, 15 avatares otimizados,
  poster distante carregado ao rolar, primeira capa retida no retorno e nenhum pageerror.
- Smoke com leituras reais da API de producao e adaptacao de CORS no harness local;
  escritas bloqueadas. Post publico sem JavaScript preserva poster e transcricao no HTML.
- Logo WebP lossless de 14.060 bytes contra SVG de 308.119 bytes; pixels equivalentes
  a rasterizacao original em 192px.
- Nao medidos: nova nota PageSpeed, gestos em aparelho fisico e fluxo autenticado completo.
  Expansao/reproducao nao recebeu novo teste E2E dedicado. Nova medicao apos publicacao.

## Publicacao

Somente local, sem push/deploy. Sem banco, pacote ou variavel nova.
Rollback: reverter codigo frontend e asset derivado. Imagem original preservada.
Referencia: ADR-0724. SSR do feed e alteracao de CSP ficam fora deste lote;
primeiro medir a remocao das esperas identificadas sem mudar cache/personalizacao.
