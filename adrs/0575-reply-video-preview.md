# ADR-0575 - Previa de video compartilhada na edicao de comentarios

## Status

Aceito.

## Contexto

O controle de anexos de comentarios ainda renderizava videos atuais com src
direto. Isso nao resolve referencias de playback e nao garante quadro no iOS.
O thumbnail persistido pode conter moldura social antiga e segue ignorado.

## Decisao

Reutilizar PostEditVideoPreview, ja validado na edicao de posts, para videos
sem miniatura local. Ele consulta playback pelo asset/viewer, usa poster fresco
e apresenta quadro de video com seek curto ou fallback acessivel em erro.
O controle deixa de sondar referencias de video em um elemento separado.
A previa comunica dimensoes opcionais junto da orientacao, preservando videos
quadrados nos comentarios sem alterar o layout ja usado pelos posts.

## Consequencias

Uma unica implementacao para HLS/MP4 e fallback; sem autoplay, nova dependencia
ou alteracao de upload/permissao/save. Validar comentarios e regressao de posts.
Cache de playback segue isolado por viewer, e a politica de URL nao muda.
