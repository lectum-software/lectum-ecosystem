# ADR-0723 - Uma transcricao visual por video no post

Data: 2026-11-24

## Contexto

PublicTranscript mantinha um disclosure no rodape, duplicando TranscriptPanel
da midia. A hidratacao publica atual ja carrega playback e captions no servidor.
TranscriptPanel mantem o texto renderizado com hidden quando esta fechado.

## Decisao

Retirar somente o disclosure de PublicTranscript e manter seu JSON-LD validado.
Preservar o painel e os controles existentes, sem esconder texto exclusivo para
buscadores. Verificar HTML inicial e abertura/fechamento no browser local.

## Consequencias

Elimina a duplicacao sem mudar contratos, banco ou controles do player.
A disponibilidade da transcricao no painel continua dependendo da leitura
publica do playback; erros nao devem produzir texto inventado.
Paginas individuais de reels permanecem inalteradas.
