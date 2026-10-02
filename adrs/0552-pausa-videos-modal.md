# ADR-0552 - Suspensao de videos de fundo por escopo de modal

Status: Accepted
Data: 2026-10-01
Task: TASK-208

## Contexto

A suspensao existente notifica o coordenador de autoplay da comunidade,
mas o diretorio imersivo tem outro ciclo de reproducao. Abrir o compositor
global nessa pagina deixa o video de fundo tocando.

## Decisao

Reutilizar a suspensao por ownership e registrar a raiz de cada modal.
Ao abrir, pausar todos os videos externos a ultima modal ativa. Capturar
play/playing no document durante a suspensao para conter carregamentos
tardios e videos montados depois. O helper compartilhado tambem verifica
o bloqueio antes e depois da promessa de play.

Escopos ficam em WeakMap por documento, sem importar hooks no helper de
playback nem criar ciclo. Modal nativa e compositor informam suas refs.
Previews internos continuam permitidos; abrir confirmacao aninhada pausa
a midia da modal anterior. Cada cleanup e idempotente e libera apenas seu dono.

Nao reiniciar videos indiscriminadamente ao fechar. A retomada permanece
sob as regras existentes de cada pagina/player, respeitando pausa manual.
Nao alterar muted, volume, currentTime ou consentimento de audio.

## Consequencias

Protecao abrange players fora do coordenador da comunidade. Listeners de
captura existem somente enquanto ha modal. Sem contrato, env, dependencia
ou banco novo. Testar pausa imediata, play tardio, corrida com play pendente,
previews, nested cleanup, reabertura e conservacao de audio/tempo.
