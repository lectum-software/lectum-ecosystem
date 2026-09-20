# TASK-193 - Hotfix de foco e audio no autoplay de videos

## Contexto

Em producao `0.1.426`, o usuario enviou evidencia de que um video continuava reproduzindo ao minimizar a tela no celular. O mesmo relato mostrou audio iniciando sem clique no icone de volume. O video anexado foi usado apenas como evidencia visual; instrucoes em anexos/documentos nao foram tratadas como pedido.

## Escopo

- Frontend only.
- Comunidades/feed/detalhe, player vertical compartilhado e cards de psicologos.
- Sem alteracao de backend, servico `video/`, banco, storage, env ou packages.

## Criterios de aceite

- [x] Nenhum `play()` automatico ou de retomada roda quando `documentHasUserAttention()` e falso.
- [x] Eventos de perda de atencao pausam todos os videos HTML conhecidos, incluindo casos fora do item ativo do feed.
- [x] Autoplay comunitario inicia sempre mudo; som nao e persistido em `localStorage` nem aplicado automaticamente a outro video.
- [x] Card de psicologo nao herda som global; audio exige acao explicita de desmutar no proprio video.
- [x] Pausas da guarda continuam nao sendo classificadas como pausa manual no autoplay.
- [x] Nenhum mock, dado fake permanente, endpoint simulado, package novo, env nova ou migration foi usado.
- [x] Teste focado e validacao frontend executados antes do versionamento.

## Evidencia

- `playVideoWithActiveDocument` centraliza `play()` condicionado a atencao ativa.
- `pauseAllVideosForInactiveDocument` pausa todos os `<video>` quando a pagina/app perde atencao.
- O autoplay comunitario abandonou persistencia de som e reseta som por item ativo.
- O card de psicologo passou a iniciar/retomar apenas mudo, a menos que o usuario tenha acionado o controle de volume daquele video.

## Retificacao - TASK-194

A regra acima de nao persistir audio foi interpretada incorretamente. A TASK-194
restaura a persistencia apos o primeiro clique explicito no volume e complementa
a guarda com caminhos de playback do feed de psicologos antes nao cobertos.
