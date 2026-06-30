# ADR-0190: Range requests para midia publica

## Status

Accepted

## Task relacionada

TASK-13/TASK-40 (ajuste pos-conclusao em `/psychologists`)

## Contexto

Um video de apresentacao na pagina publica de psicologos continuava sem responder corretamente ao arraste da barra de progresso. A UI do player ja aplicava `currentTime`, mas a rota backend `/public/files/*` entregava os objetos do bucket apenas como stream completo, sem suporte explicito a `Range`, `Content-Range`, `Content-Length` e `Accept-Ranges`.

Em navegadores, seek confiavel em MP4 remoto depende de suporte a requisicoes parciais quando o browser precisa buscar outro trecho do arquivo. Sem isso, alguns videos podem tocar normalmente, mas falhar ao arrastar a barra ate que o arquivo inteiro seja baixado.

## Decisao

- A rota backend de arquivos publicos passa a aceitar e repassar `Range: bytes=...` ao storage S3/R2 via `GetObjectCommand`.
- Respostas parciais retornam status `206`, `Content-Range`, `Content-Length` e `Accept-Ranges: bytes`.
- `HEAD /public/files/*` passa a responder metadados do objeto com `Content-Length`, `Content-Type` e `Accept-Ranges: bytes`.
- A mesma capacidade e mantida em `/files/*` autenticado para evitar comportamento divergente entre midias publicas e privadas.
- Nao foi criado proxy ou remendo visual no frontend; o player continua usando a fonte de midia real.

## Consequencias

- O navegador consegue buscar trechos do MP4 durante o arraste da barra de progresso, inclusive para videos de apresentacao de psicologos.
- A melhoria tambem beneficia videos de comunidades e outras midias publicas servidas pelo mesmo bucket.
- A API continua sem expor arquivos fora dos prefixos publicos permitidos.

## Validacao

- `pnpm --dir backend exec biome check --write src/config/multer/filesRoute.ts`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- Validar manualmente `HEAD` e `Range` em `/public/files/psychologist/video/...mp4`.
