# ADR-0476: Capas internas de videos sem arte social

## Status

Accepted

## Task relacionada

TASK-42 — correcao pos-feedback em 2026-08-31

## Contexto

O feedback do usuario mostrou um video no feed interno da Lectum cuja capa exibia a arte de compartilhamento social com a faixa `Postado na Lectum`. A imagem anexada foi tratada apenas como evidencia visual do problema, nao como instrucao embutida.

A causa encontrada foi dupla:

1. A criacao/edicao de posts de psicologos chamava `createVideoThumbnailFile` com `lectumShareFrame`, gerando `thumbnail_url` com a moldura social.
2. O player interno de comunidades e previews de edicao reaproveitavam `thumbnail_url` como poster/capa do video, inclusive para registros antigos ja salvos.

Essa mistura contrariava a regra de produto: a arte `Postado/Respondido na Lectum` pertence ao arquivo exportavel para redes sociais, nao a videos exibidos dentro da Lectum.

## Decisao

Separar definitivamente capa interna de arte social:

- `createVideoThumbnailFile` volta a gerar apenas frame cru do proprio video. A opcao `lectumShareFrame` e o tipo `LectumVideoThumbnailFrameOptions` foram removidos desse utilitario.
- Criacao e edicao de posts continuam enviando uma miniatura real quando possivel, mas ela nao contem card, faixa, autoria ou qualquer moldura social.
- `CommunityMediaBlock` ignora `thumbnail_url` para videos internos e tenta criar um poster transitorio a partir da propria URL do video. Se a captura client-side falhar, o player fica sem poster em vez de reexibir a arte social.
- Previews de edicao de posts e midia atual de respostas tambem usam o proprio video para a capa, evitando miniaturas persistidas antigas com moldura.
- A arte social permanece somente nos targets/exports de compartilhamento/download (`lectum-share-target` e `lectum-share-media`), incluindo a modal "Publique nas redes sociais".

## Consequencias

- Videos legados que ja possuem `thumbnail_url` com arte deixam de mostrar essa arte no feed, detalhe, thread, salvos, meus posts e edicao, sem backfill e sem alterar dados publicados.
- Novos videos deixam de persistir miniatura com moldura social.
- Metadados externos que ainda usam `thumbnail_url` podem receber uma capa neutra para videos novos ou uma capa antiga para videos ja cacheados/salvos. Se o produto quiser uma imagem social especifica para Open Graph no futuro, sera necessario criar um campo/finalidade separado em vez de reutilizar a capa interna.
- Ha um custo client-side adicional para capturar poster transitorio do video; o fallback seguro e nao exibir poster customizado.

## Producao e rollout

- Compatibilidade com dados existentes: sem alteracao destrutiva; registros antigos permanecem intactos e passam a ser ignorados em superficies internas de video.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada; sem **ALERTA DE DEPLOY**.
- Packages: nenhum pacote novo.
- Compatibilidade entre apps: frontend-only; backend e admin podem permanecer em versoes diferentes.
- Ordem de deploy: push em `homolog` publica o frontend de homologacao automaticamente.
- Rollback: reverter o commit volta a usar `thumbnail_url` como capa interna e restaura a geracao de miniaturas com moldura social em posts de psicologos.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local mobile-first em rota de comunidade com video, confirmando ausencia da arte social no player interno e preservacao da arte apenas no modal de download/social.

## Pendencias

- Nenhuma pendencia externa.
