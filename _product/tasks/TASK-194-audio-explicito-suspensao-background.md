# TASK-194 - Audio explicito persistido e suspensao de background

Dependencia: TASK-193 (Completed). Status: Completed.

## Escopo e deploy

Corrigir a interpretacao da TASK-193: a primeira habilitacao de som exige o controle
de volume, mas a escolha deve persistir nos proximos videos. Investigar retomadas
em background, incluindo promessas de play pendentes e carregamento HLS.
Frontend only; sem env, package, banco, backend ou dados publicados alterados.
Rollback por reversao do commit em homolog e promocao revisada. Sem mudanca visual;
preservar layout mobile-first (~390px) e controles existentes.

## Criterios de aceite

- [x] Som inicialmente mudo; escolha explicita compartilhada entre videos e persistida.
- [x] Pausar por blur/pagehide/freeze sem depender de estado transitorio de hasFocus.
- [x] Bloquear retomadas tardias por play/playing e promessas pendentes.
- [x] Suspender carregamento HLS enquanto documento inativo.
- [x] Validar testes, frontend check/build e comportamento em navegador real.
- [x] ADR, versao, commit/push e smoke de homologacao; producao somente apos validar.

## Investigacao

TASK-193 eliminou persistencia indevidamente. Guarda checava atencao antes de
play, mas nao apos a promessa nem nos eventos play/playing do player generico.
Feed tratava blur/pagehide/freeze consultando estado momentaneo do documento em
vez de suspender incondicionalmente. hls.js continuava carregando apos pause.
Essas lacunas sao verificadas no codigo; reproducao especifica do aparelho pendente.

## Validacao local (0.1.428)

- Teste focado: 4/4; frontend check passou (um teste de symlink ignorado por permissao local).
- Guards de tasks, ADRs, encoding, source-size e versao validados.
- Browser local 390px renderizou a rota; API local indisponivel e API homolog
  recusou origem localhost. Nao usar isso como evidencia de playback aprovado.
- Chrome real via Playwright existente no cache; sem instalar package.
- Baseline publicado 0.1.427 pausou no Chrome desktop com perda de foco;
  o relato mobile especifico ainda nao foi reproduzido neste ambiente.
- Validacao funcional do codigo novo com midia real fica para homolog apos push.
  Nao promover para producao antes do smoke funcional.

## Homologacao funcional aprovada (0.1.428)

- Commit de implementacao: 974ece6e; push homolog aprovado nos checks das quatro apps
  e guards. Build final passou. Um timeout transitorio no teste backend de optional-auth
  foi reexecutado com sucesso; push final passou sem ignorar hooks.
- Executado frontend/scripts/video-focus-smoke.mjs com Chrome real, viewport 390x844,
  midia publica real, sem mocks, interceptacao de requests ou novos packages.
- PASS: autoplay inicialmente mudo; tap generico nao habilita audio; clique em volume
  habilita som; proximo video herda escolha; recarga preserva escolha.
- PASS: troca real de aba e minimizacao pausam todos os videos e mantem currentTime
  estavel; play tardio em background e pausado; retorno retoma com a escolha de som.
- O teste exige /version esperado e desativa emulacao de foco antes das transicoes;
  tentativas com janela fora da tela/emulacao ativa foram descartadas, nao contadas como aceite.
- Sem iPhone/Android fisico disponivel; teste de app/PWA no aparelho do relato permanece
  recomendacao de verificacao de campo, nao evidencia executada.
- Registro final/documentacao e ajuste do runner versionados em 0.1.429, sem mudanca
  no codigo de playback validado. Promocao via PR homolog -> main apos checks e smoke.
