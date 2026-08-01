# ADR-0400 - Ajustes finais da tabela comportamental Admin

## Status

Accepted

## Task relacionada

TASK-136

## Contexto

A tabela comportamental por Conversao do Admin recebeu refinamentos sucessivos de tags e layout. O produto pediu simplificacao adicional para reduzir ruido visual e alinhar a leitura da secao como analise comportamental, nao funil: trocar o titulo, mover o complemento de comportamento para antes do titulo, encurtar a coluna de favoritos, usar o formato padrao de titulos de tabela do painel Admin, reduzir a largura de **Favoritos** e alinhar seu conteudo a direita, trocar `Views/video` por `Views`, retirar `WhatsApp/abertura` da visualizacao principal do Perfil, remover a tag agregada `Engajamento` em Video de apresentacao, encurtar `Cliques WhatsApp` para `WhatsApp` nas tags, manter `WhatsApp: X` em uma unica linha em **Favoritos**, adicionar `Plano predominante` em **Perfil** e exibir a media de cliques WhatsApp por psicologo na coluna Conversao com a copy `X perfis considerados · Media Y cliques WhatsApp por psicologo`.

## Decisao

- A secao passa a exibir o pre-titulo `Comportamento predominante detalhado por conversao`, o titulo `Analise comportamental por conversao` e a descricao apenas com o periodo selecionado.
- A coluna `favorite` passa a usar label `Favoritos` na API agregada e nas superficies renderizadas.
- As colunas **Video de apresentacao**, **Perfil** e **Comunidade** usam `24%` cada; **Favoritos** usa `12%` e alinha titulo/tags a direita; **Conversao** permanece com `16%`.
- Os titulos das colunas usam o formato recorrente de tabela do painel Admin: uppercase, tracking e cor muted/subtle no desktop e no mobile.
- A linha da coluna **Conversao** passa a renderizar a base e a media `row.totals.whatsapp_clicks / row.count`, arredondada para uma casa decimal, no formato `X perfis considerados · Media Y cliques WhatsApp por psicologo`, sem alterar o payload de totais da API.
- A metrica `presentation_video_views_per_video` passa a usar label `Views` na API agregada.
- A metrica `profile_whatsapp_rate` permanece no payload para auditoria, mas sai da lista curada renderizada na coluna **Perfil**.
- A tag visivel `presentation_video_engagement_level` sai da curadoria da coluna **Video de apresentacao** e entram as medias reais por video `presentation_video_profile_accesses_per_video`, `presentation_video_favorites_per_video` e `presentation_video_shares_per_video`.
- As labels visiveis das medias de WhatsApp passam de `Cliques WhatsApp` para `WhatsApp`, preservando IDs, fontes e calculos.
- A coluna **Favoritos** usa `whitespace-nowrap` no conteudo da tag para manter `WhatsApp: X` em uma unica linha.
- A coluna **Perfil** recebe a tag `profile_dominant_plan`, calculada pelo plano ativo mais frequente entre os profissionais da faixa no fim do periodo analisado.
- Nao alterar ID, source, unidade, tracking, schema, migration, endpoint ou package das metricas existentes.

## Consequencias

- A secao deixa de sugerir funil e reforca leitura de analise comportamental por faixa de conversao.
- A coluna **Favoritos** ocupa menos largura por possuir apenas uma tag e fica visualmente mais proxima da borda direita.
- **Video**, **Perfil** e **Comunidade** ganham mais espaco para acomodar multiplas tags sem devolver a largura excessiva exclusiva de Comunidade.
- A coluna **Conversao** passa a ser comparavel com as demais tags de media, evitando leitura de somatoria como desempenho medio da faixa e mantendo a base da faixa visivel junto da media.
- A coluna de Video de apresentacao fica mais acionavel: exibe `Views: X` e substitui a tag agregada de engajamento por `Acesso ao perfil`, `Favoritado` e `Compartilhado`.
- A coluna Perfil remove uma taxa que estava competindo com os sinais principais de consumo e navegacao, mas ganha contexto comercial com o plano predominante.
- Consumidores tecnicos continuam podendo ler `profile_whatsapp_rate` no payload.

## Validacao

- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos`.

## Pendencias

- Nenhuma pendencia externa.
