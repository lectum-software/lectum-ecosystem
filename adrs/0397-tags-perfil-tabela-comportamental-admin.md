# ADR-0397: Tags de Perfil na tabela comportamental Admin

## Status

Accepted

## Task relacionada

TASK-133

## Contexto

A coluna **Perfil** da tabela comportamental por Conversao precisava expor os sinais de consumo do perfil publico sem depender da leitura sintetica de aba predominante. O produto pediu tags explicitas para permanencia, abas Avaliacoes/Conteudo, views de video e retencao de video.

## Decisao

- A coluna **Perfil** usa um conjunto curado de tags, com `Cliques WhatsApp` sempre em primeiro lugar.
- A tag `profile_dominant_tab` deixa de ser renderizada na tabela, mas a metrica pode permanecer no payload para auditoria e compatibilidade.
- O backend passa a disponibilizar metricas medias por psicologo para:
  - `profile_reviews_tab_opens_per_psychologist`;
  - `profile_content_tab_opens_per_psychologist`;
  - `profile_video_views_per_psychologist`.
- A retencao media do video de apresentacao fica disponivel em `profile_video_retention` com unidade percentual.
- `profile_average_stay_seconds` passa a ter `display_value` explicito para mostrar `0s` quando nao houver base real, mantendo `tone=zero`.
- A action tecnica de Publicacoes e apresentada ao usuario como **Aba Conteudo**, sem renomear tracking ou schema.
- Nao criar schema, migration, tracking ou package novo.

## Consequencias

- A leitura da coluna Perfil passa a ser mais diagnostica: consumo, navegacao interna e video aparecem separadamente.
- O Admin evita a conclusao ambigua de `Aba predominante` quando as abas possuem pouca ou nenhuma atividade.
- Os dados continuam sendo first-party e agregados a partir dos eventos existentes.
- Consumidores do payload que ainda precisarem de `profile_dominant_tab` nao sao quebrados.

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
