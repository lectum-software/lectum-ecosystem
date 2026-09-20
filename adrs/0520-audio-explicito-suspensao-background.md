# ADR-0520 - Audio explicito persistido e suspensao de background

Data: 2026-09-20. Status: Aceito. Task: TASK-194.

## Contexto

A TASK-193 interpretou incorretamente a persistencia de som. O usuario quer
autoplay inicialmente mudo e som compartilhado depois da primeira acao explicita.
O feed de psicologos mantinha play direto em analytics/navegacao e um tap generico
desmutava a midia. A guarda nao fiscalizava play/playing tardio nem a conclusao
assincrona de play. Pausar o elemento nao suspendia carregamento hls.js.

## Decisao

- Uma preferencia local compartilhada entre feed comunitario, cards e feed de
  psicologos. Nova chave versionada, inicialmente falsa; nao migrar preferencias
  legadas cuja origem explicita nao pode ser comprovada. Apenas controle de volume
  escreve a escolha, inclusive mutar. Fallback de autoplay nao altera a escolha.
- Tap no corpo e botao de retomar nao concedem audio. A escolha persiste entre
  videos e recargas no mesmo navegador; storage indisponivel degrada para memoria.
- O modulo de atencao existente memoriza blur/pagehide/freeze ate sinal de retorno
  com documento visivel e focado. Consumidores consultam a mesma autoridade.
- Fiscalizar play, playing, timeupdate e resolucao de promessa. Caminhos de
  retomada do feed usam a funcao protegida; remover autoPlay nativo desse feed.
- Cada guarda pausa seu elemento para preservar sua propria intencao de retomada;
  pausar todos a partir da primeira guarda impedia as demais de registrar retomada.
- HLS.js inicia segmentos com autoStartLoad false e suspende por stopLoad quando
  inativo. HLS nativo continua sob pause do elemento; buffers ja entregues nao sao
  recuperaveis. Nao prometer faturamento zero nem detectar atencao humana real.

## Impacto e rollout

Frontend only; APIs compativeis, nenhum package/env/migration ou dado de negocio.
Aplicacoes independentes. Push homolog, smoke funcional com midia real, PR revisado
para main, checks e smoke de producao. Rollback por reversao em homolog e promocao.
Builder indisponivel nos tools; sem alteracao de layout, icones ou design. Mantida
interface mobile-first existente; alteracao de label acessivel acompanha a acao.

## Validacao

Testes de contrato e browser real sem mocks. Playwright ja disponivel no cache
local, sem instalar dependencia. Desabilitar a emulacao de foco do Playwright
antes de testar troca de aba/minimizacao para nao mascarar visibilidade/foco.
Resultado funcional e versoes publicados registrados na TASK-194.

Referencias: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
e https://hlsjs.video-dev.org/api-docs/hls.js.hls.
