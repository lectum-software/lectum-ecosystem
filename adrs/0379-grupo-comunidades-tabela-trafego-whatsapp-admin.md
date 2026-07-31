# ADR-0379: Grupo visual de Comunidades na tabela de trafego WhatsApp Admin

## Status

Accepted

## Task relacionada

TASK-115

## Contexto

A tabela **Origem do trafego para psicologos** do Admin ja recebe do backend as origens canonicas de WhatsApp definidas na TASK-114: Perfil, Explorar, Busca e filtros, Favoritos e cinco subcategorias reais de Comunidades. A exibicao plana dessas cinco subcategorias deixava a leitura dispersa quando Comunidades era a principal origem, apesar de os dados detalhados estarem corretos.

O usuario pediu que Comunidades fosse apresentado como um unico bloco da tabela, com uma linha superior de somatorio e linhas subordinadas para Posts com video, Posts sem video, Respostas com video, Respostas sem video e Ranking Top Mentores.

Builder/Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) nao ficou callable no ambiente desta execucao; a decisao visual foi validada com `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` e com o screenshot enviado pelo usuario em 2026-07-31.

## Decisao

Manter o contrato da API Admin detalhado e canonico, sem criar novo campo agregado no backend, e derivar apenas na camada de apresentacao do Admin um item visual `Comunidades`.

A linha agregada:

- soma `whatsapp_clicks`, `sessions`, `profile_views` e `percentage` das cinco subcategorias de Comunidades;
- participa da ordenacao das linhas principais por maior WhatsApp primeiro usando o somatorio;
- recebe o selo **Principal origem** quando o somatorio de Comunidades for a maior origem;
- exibe os detalhes imediatamente abaixo, indentados, sem selo proprio nas subcategorias.

As subcategorias continuam vindo individualmente do backend para preservar rastreabilidade e evitar backfill, seed ou mudanca de contrato.

## Consequencias

- A tabela fica mais facil de ler quando Comunidades concentra os cliques, sem perder o detalhamento operacional.
- O backend segue como fonte real dos eventos e nao ganha campo derivado redundante.
- A ordenacao principal passa a usar uma entidade visual agregada; portanto a UI precisa manter explicitamente a lista de IDs comunitarios canonicos da TASK-114.
- Se novas subcategorias de Comunidades forem adicionadas no backend, a composicao visual do Admin deve ser atualizada para inclui-las no grupo.

## Validacao

- `pnpm --dir admin check` - sucesso.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build` - sucesso.
- `pnpm check` - sucesso.
- Browser local em `http://localhost:3002/psicologos` via Chrome/CDP - sucesso em desktop 1440px e mobile 390px.
- Evidencias visuais geradas em `.tmp/task115-admin-psicologos-desktop.png` e `.tmp/task115-admin-psicologos-mobile.png`.

## Pendencias

- Nenhuma pendencia externa.
