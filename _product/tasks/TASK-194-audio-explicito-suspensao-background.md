# TASK-194 - Audio explicito persistido e suspensao de background

Dependencia: TASK-193 (Completed). Status: In Progress.

## Escopo e deploy

Corrigir a interpretacao da TASK-193: a primeira habilitacao de som exige o controle
de volume, mas a escolha deve persistir nos proximos videos. Investigar retomadas
em background, incluindo promessas de play pendentes e carregamento HLS.
Frontend only; sem env, package, banco, backend ou dados publicados alterados.
Rollback por reversao do commit em homolog e promocao revisada. Sem mudanca visual;
preservar layout mobile-first (~390px) e controles existentes.

## Criterios de aceite

- [ ] Som inicialmente mudo; escolha explicita compartilhada entre videos e persistida.
- [ ] Pausar por blur/pagehide/freeze sem depender de estado transitorio de hasFocus.
- [ ] Bloquear retomadas tardias por play/playing e promessas pendentes.
- [ ] Suspender carregamento HLS enquanto documento inativo.
- [ ] Validar testes, frontend check/build e comportamento em navegador real.
- [ ] ADR, versao, commit/push e smoke de homologacao; producao somente apos validar.

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
