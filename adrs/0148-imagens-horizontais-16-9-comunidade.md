# ADR-0148 - Proporcao 16:9 para imagens horizontais em posts e respostas

## Status

Accepted

## Contexto

Imagens anexadas a posts e respostas da comunidade eram renderizadas sempre no formato vertical `4:5`, o que distorcia a experiencia quando a midia original era horizontal. O ajuste precisava preservar a regra existente para midias verticais e videos, sem alterar backend, storage ou contratos de API.

## Decisao

Detectar a orientacao da imagem no carregamento do componente `Image` usando `naturalWidth` e `naturalHeight`.

- Imagens com proporcao horizontal a partir de `1.12` passam a usar container `aspect-video` (`16:9`).
- Imagens verticais ou quadradas permanecem no padrao atual `aspect-[4/5]`.
- A decisao foi aplicada nos dois pontos que renderizam midia de comunidade: detalhe do post e cards/listas de posts.
- Videos permanecem com os formatos existentes e nao entram nessa regra.
- Nao houve mudanca de schema, endpoints, storage, payloads, permissao de upload ou package.

## Consequencias

- Imagens horizontais deixam de ser exibidas como cards verticais e mantem leitura visual consistente em mobile e desktop.
- A orientacao e definida apos o carregamento da imagem, evitando depender de metadados persistidos no banco.
- Pode existir um pequeno ajuste visual no primeiro load da imagem enquanto o browser informa dimensoes naturais, aceito por evitar nova coluna/metadado e por preservar contratos atuais.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP na rota `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, com resposta temporaria usando imagem horizontal real anexada via endpoint de upload, validando `parentRatio = 1.7777`; a resposta temporaria e o objeto R2 foram removidos no cleanup.

