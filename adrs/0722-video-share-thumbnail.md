# ADR-0722 - Capa publica de video nos metadados sociais

Data: 2026-11-24

## Contexto

O Search Console selecionou uma imagem generica Open Graph transparente em um
post de video. O VideoObject ja usa uma capa JPEG opaca, mas o preview social
de referencias internas de video nao tinha imagem e recorria ao template.

## Decisao

Reutilizar readPublicReel para resolver a capa da midia principal em showPost
e showReply, sem depender de legendas. Expor somente o endpoint estavel de
thumbnail; nao persistir URLs assinadas. O frontend resolve esse caminho
restrito contra a origem publica da API para Open Graph e Twitter.

Posts de texto/imagem mantem suas capas; respostas com midia propria nao
herdam a capa do post. Respostas sem midia mantem fallback para o post.
As dimensoes da capa nao sao presumidas. As rotas individuais de reel ja
usam a capa real e permanecem inalteradas.

## Consequencias

Uma consulta adicional ao resolvedor publico para metadados com video.
Permissoes, disponibilidade e thumbnails seguem o mesmo contrato da pagina.
Sem migration ou nova dependencia. Erros operacionais nao sao mascarados
como capa valida. Validacao Google depende de novo rastreamento.
