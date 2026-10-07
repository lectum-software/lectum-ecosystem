# ADR-0564 - Recuperacao geometrica do rodape no PWA

## Status

Aceito para homologacao; confirmacao fisica pendente.

## Contexto

Usuario reportou navegacao e comentario fixos no meio da tela ao rolar para
cima no PWA iPhone. O teclado nao foi confirmado como gatilho. Ha relatos
similares no WebKit, mas nao foi possivel reproduzir o compositor nativo aqui.

- https://bugs.webkit.org/show_bug.cgi?id=297779
- https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport

O calculo existente do comentario ignorava offsetTop ao medir sobreposicao
e considerava composerActive suficiente mesmo sem um campo com foco.

## Decisao

- Hook compartilhado pelas duas barras, habilitado apenas em iOS standalone
  abaixo de 640px, sem campo editavel focado e sem zoom.
- Medir bottom real contra innerHeight, compensando somente lacuna positiva
  maior que 4px por CSS custom property, sem alterar transformacoes existentes.
- Descontar a compensacao anterior, liberar na recuperacao nativa, coalescer
  eventos em requestAnimationFrame e limpar listeners/timers na desmontagem.
- Preservar barras ocultas/dimmed, comentarios inline, arrasto e desktop.
- Nao manipular scroll, foco, body, drafts ou armazenamento global.
- Corrigir separadamente teclado: area visivel inclui offsetTop; exigir foco
  editavel e reducao relevante de altura; nao duplicar reposicionamento nativo.
- Android nao recebe compensacao PWA; calculo de teclado permanece compartilhado.

## Consequencias

Sem mudanca visual nominal, contrato, banco ou dependencia. Adiciona medicao
limitada a um frame por evento na barra visivel do PWA iOS. A compensacao e
uma mitigacao verificavel para desvio geometrico, nao garantia contra toda
falha de composicao do WebKit. Testes sinteticos e browser nao substituem
confirmacao no iPhone afetado; producao depende dessa confirmacao.
