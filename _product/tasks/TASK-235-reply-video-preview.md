# TASK-235 - Miniatura de video na edicao de comentario

## Objetivo

Exibir a midia existente ao editar comentario, conforme captura do usuario
de 07/10/2026 17:40. PROTO-INVENTORY consultado; preservar o modal existente,
mobile-first (390px), sem redesenho ou dependencia do Builder nesta correcao.

## Causa e decisao

O controle compartilhado usava video.src diretamente: referencias de playback
sao endpoints JSON, nao arquivos. MP4 com preload de metadata tambem pode ficar
sem quadro no iOS. Reutilizar PostEditVideoPreview: poster fresco via playback,
fallback para quadro do video e estado de indisponibilidade. ADR-0575.
Preservar a exclusao do poster social legado, permissoes, upload e payload de save.
Dimensoes reais mantem a proporcao quadrada/vertical/horizontal do comentario.

## Aceite

- [x] Playback nao e usado como arquivo de video; poster fresco e priorizado.
- [x] Video legado usa quadro mudo e inline, sem autoplay.
- [x] Imagens e miniaturas de arquivos selecionados permanecem funcionando.
- [x] Remover/desfazer e renderizacao mobile/desktop conferidos no browser.
- [x] Frontend check/build e gates estruturais aprovados.

## Validacao e publicacao

Testes de markup reais com React/Next Image e QueryClient para estados de cache.
Sem endpoints simulados, seeds ou alteracoes em comentarios reais.
Conferencia no PWA iOS fisico fica com o usuario; browser desktop nao substitui.
Sem pacote, migration, env ou contrato novo. Commit local, sem push/deploy.
Rollback: reverter o uso da previa compartilhada no controle de midia.

## Evidencias

Frontend check completo aprovado (Biome, ESLint, TypeScript e suites).
Quatro testes novos cobrem poster fresco/vencido, MP4 legado, imagens, nova
selecao e remocao. Gates estruturais da raiz aprovados.
outputs/check-reply-preview.cjs validou o componente real em 320/390/1440px:
MP4 local com quadro nao vazio (188 valores distintos nos pixels amostrados),
seek 0.1s, mudo e pausado, proporcao vertical, remover/desfazer, poster vindo
de cache de playback de teste e fallback em erro. Sem endpoint JSON usado como
video, sem overflow/pageerrors. Capturas mobile inspecionadas.
Regressao da edicao de posts via outputs/check-edit-post.cjs passou nas mesmas
tres larguras. Esses fixtures isolados nao substituem salvar um comentario
autenticado nem verificar um asset Stream real no PWA. Nenhuma API foi escrita.
Localhost:3000 respondeu HTTP 200 na verificacao; nao houve reinicio de backend.
Build frontend 0.1.607 aprovado (90 paginas), com aviso nao bloqueante de cache
Webpack. Suites backend/admin/video nao repetidas: sem mudancas funcionais.
