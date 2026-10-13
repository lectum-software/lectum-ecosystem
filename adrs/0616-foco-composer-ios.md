# ADR-0616 - Preservar foco do composer no iOS

## Status

Aceito para implementacao local; validacao em iPhone pendente. TASK-254.

## Contexto

Usuario confirmou PWA instalado e depois enviou a mesma falha no Safari comum.
A correcao do compositor compartilhado se aplica aos dois modos. O video de
13/10/2026 mostra comportamento intermitente: responder
funciona no detalhe e falha depois de abrir a continuacao. O hook de destaque
focava o comentario por efeito apos o handler focar sincronamente o editor.
Isso pode disparar blur, desligar a compensacao geometrica e competir com o
refoco agendado, enquanto o teclado nativo ainda esta em animacao.

## Decisao

- No modo composer-start, manter destaque/rolagem mas nao mover foco ao card.
- Preservar foco acessivel no card para navegacao/links (modo center).
- Observar scroll do documento alem do visualViewport e reavaliar em 500/900ms,
  alem de 80/240ms, com timers/listeners cancelados na desmontagem.
- Corrigir sobreposicoes acima de 4px, em vez de tolerar ate 24px; manter
  medicao real, folga de 8px e desconto do offset anterior sem acumular.
- Nao adicionar altura fixa presumida para a barra nativa nem manipular body,
  teclado, dados ou rolagem global fora do comportamento existente.
- Menu usa rotulos curtos; estado salvo e handlers permanecem iguais.

## Consequencias

Frontend-only, sem migration/env/dependencia. Testes sinteticos nao reproduzem
composicao nativa do iOS. A causa encontrada e concreta, mas nao garante cobrir
todo desvio do WebKit; exigir nova verificacao no dispositivo antes de publicar.
Rollback: reverter frontend. Nao repetir builds/limpeza na VPS para este ajuste.

Referencia: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport
