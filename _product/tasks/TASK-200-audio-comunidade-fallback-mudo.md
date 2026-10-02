# TASK-200 - Audio da comunidade apos fallback mudo

Dependencia: TASK-194 (Completed). Status: Completed.

## Escopo

Corrigir a reativacao involuntaria do som nos videos da comunidade depois de um
bloqueio de autoplay audivel. A preferencia explicita persistida continua valida,
mas um fallback mudo suspende o som no documento ate nova acao no volume. Nao
interpretar scroll, canplay, play, carregamento ou permissao do navegador como
consentimento. Preservar controles, layout e navegacao mobile-first de 390px.

## Investigacao

O coordenador colocava apenas o elemento atual em muted apos play rejeitado. A
preferencia compartilhada continuava habilitada; canplay e o proximo video a
reaplicavam. Teste funcional do coordenador real reproduziu a divergencia antes
da correcao. A reproducao especifica no aparelho do usuario nao foi executada.

## Criterios de aceite

- [x] Fallback por NotAllowedError mantem videos atuais e novos mudos ate volume explicito.
- [x] Preservar preferencia persistida e compartilhamento apos ativacao explicita.
- [x] Nao suspender som por AbortError ou por falha obsoleta de outro video.
- [x] Rejeicao tardia nao sobrepoe acao mais recente nem retoma video desmontado.
- [x] play/playing/volumechange/metadata nao reativam som contra o estado mudo.
- [x] Validar check frontend, build e regressao funcional do coordenador.
- [x] ADR, versao e plano de publicacao em homolog com smoke de midia real.

## Deploy e rollback

Frontend only. Sem env, migration, pacote, alteracao de midia ou dados publicados.
Risco: sincronizacao da preferencia e eventos assincronos de playback. O bloqueio
e apenas em memoria; nao apaga o opt-in persistido. Rollback por reversao revisada
do commit. Producao somente mediante pedido explicito e validacao de homolog.

## Validacao

Teste de regressao falhou antes e passou apos a correcao. Usa fontes reais e
doubles locais de eventos de midia para representar permissoes e promessas;
nenhum mock ou endpoint simulado e incluido no produto.

Frontend check completo aprovado (um skip preexistente de symlink Windows), build
Next 16.3.3 aprovado. Guards de versao, ADRs, tasks, segredos, encoding, source-size,
source-safety, env e ciclos aprovados. Versao 0.1.535. Nenhum ajuste visual.
Smoke de midia real apos deploy deve ser registrado no relatorio de execucao
`outputs/admin-conteudo/audio-comunidade-0535.md`, fora do repositorio. Sem acesso
a aparelho fisico iOS/Android; nao declarar esse teste como executado.

## Complemento 0.1.552 - preservar ativacao explicita na navegacao atual

Referencia: gravacao do usuario de 02/10/2026. O bloqueio de um elemento apos o
usuario ativar o volume ainda suspendia o som de toda a pagina. Separar a escolha
feita neste documento da preferencia recuperada do storage: apenas a segunda
pode cair no fallback global mudo. A primeira permanece habilitada mesmo quando
o navegador recusa autoplay de outro elemento.

- [x] Negacao apos opt-in atual nao silencia o elemento nem os proximos videos.
- [x] Elemento recusado aguarda play manual; canplay/scroll nao repetem a negacao.
- [x] Nova escolha de volume invalida o bloqueio da tentativa anterior.
- [x] Snapshot antigo nao restaura mute/volume zero contra a escolha atual.
- [x] Fallback inicial e mute explicito continuam impedindo audio involuntario.

Sem nova permissao, tentativa de burlar autoplay, mudanca de layout, API, banco,
env ou dependencia. O navegador continua podendo exigir um toque em reproduzir
no elemento bloqueado. Homolog primeiro; producao somente mediante novo pedido.

Validacao 0.1.552: sete testes focados aprovados, check completo do frontend e
build aprovados. Smoke com midia real e coordenador real em Chromium, nas telas
390x844 e 1440x900, confirmou inicio mudo, opt-in, troca de video, mute explicito
e isolamento de NotAllowedError controlado em um elemento. Essa negacao simulada
nao comprova a politica nativa do Safari; falta validacao em iPhone fisico.
Check raiz passou pelos guards e frontend, mas parou no typecheck do backend
porque DATABASE_URL nao esta configurada no ambiente local. Sem alteracao de
codigo backend nem uso do banco de producao para contornar essa limitacao.
