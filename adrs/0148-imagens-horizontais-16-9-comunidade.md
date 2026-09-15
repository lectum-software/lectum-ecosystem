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


## Complemento 2026-06-22 - largura util total para imagens horizontais em respostas

Depois do ajuste inicial para `16:9`, imagens horizontais em respostas ainda podiam usar a largura compacta herdada do enquadramento vertical. Isso mantinha espaco lateral ocioso no card e reduzia a leitura da midia.

Decisao complementar:

- Em `MediaBlock` do detalhe do post, quando uma imagem de resposta/comentario for detectada como horizontal, usar `w-full` e remover o `max-w` compacto.
- Manter `max-w` compacto apenas para imagens verticais/quadradas em respostas, preservando a densidade da arvore.
- Atualizar o atributo `sizes` para imagens horizontais considerar uma largura maior no desktop.
- Nao alterar videos, storage, upload, schema, permissao, payloads ou regras de composicao texto/midia.

Consequencias:

- Imagens horizontais em respostas aproveitam toda a largura util da coluna do comentario mantendo `16:9`.
- Imagens verticais continuam visualmente controladas e nao passam a ocupar largura excessiva.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso apos reexecucao com timeout maior.
- Chrome/CDP desktop `1440x900`: sucesso na rota `/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video`, validando resposta real com imagem horizontal e confirmando `ratio=1.7777`, `w-full` e `widthGap=0` contra a largura util da coluna.


## Complemento 2026-06-22 - videos horizontais em respostas

Depois da regra de imagens horizontais, videos horizontais anexados a comentarios/respostas ainda eram renderizados no player vertical, causando barras pretas e perda de largura util.

Decisao complementar:

- Reutilizar a deteccao de orientacao por metadados reais de video ja existente no controle de anexos de respostas.
- Quando o video renderizado em comentario/resposta for horizontal, aplicar container `aspect-video`, `w-full` e `max-w-none`, usando a largura util disponivel da coluna.
- Manter videos verticais no enquadramento compacto/centralizado existente.
- Aplicar a decisao tanto no detalhe do post quanto no card compartilhado de comunidade, para que listas e contribuicoes reutilizadas nao regridam.
- Nao alterar schema, storage, upload, payloads, permissoes, player fullscreen, votos, salvos ou ordenacao.

Consequencias:

- Videos horizontais em comentarios passam a se comportar como midia horizontal real, preservando `16:9` e reduzindo barras pretas causadas por container vertical.
- Videos verticais continuam adequados ao consumo mobile e nao passam a ocupar largura excessiva.
- A orientacao continua sendo derivada no cliente, evitando nova coluna persistida somente para metadados visuais.

Validacao complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `pnpm --dir backend db:migrate`
- `pnpm --dir backend build`
