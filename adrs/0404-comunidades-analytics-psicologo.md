# ADR-0404: Comunidades no Analytics privado do psicologo

## Status

Accepted

## Task relacionada

TASK-20

## Contexto

O Analytics do psicologo ja apresentava indicadores gerais e o bloco de video de apresentacao.
Produto pediu incluir, imediatamente abaixo do video, uma leitura de comunidades com participacao,
posts, respostas, cliques WhatsApp e um diagnostico simples do nivel de atividade. No refinamento
seguinte, produto pediu remover os detalhes por comunidade e trocar a leitura por dois donuts de
posts/respostas com e sem video, alem de tabela com cliques WhatsApp por tipo de conteudo.

A restricao principal e que o Analytics nao pode distribuir conversoes de forma estimada: o total de
`contact_request` nao possui `community_id`. Ja existem fontes reais para participacao comunitaria
(`community_member`, `community_post`, `post_reply`) e eventos first-party de acao importante
(`important_action_event`) que podem apontar para posts/respostas comunitarias.

## Decisao

- O contrato `GET /api/private/psychologist/analytics` passa a expor o agregado `communities`.
- Comunidades ativas sao consideradas quando o psicologo segue a comunidade ou tem participacao real
  nela por posts/respostas publicados, mas a UI nao expõe lista nem detalhes por comunidade.
- Posts e respostas sao contados por periodo a partir de `community_post.author_id` e
  `post_reply.author_id`, separando `media_type="video"` de conteudos sem video.
- Cliques WhatsApp sao agregados nos quatro grupos `post_with_video`, `post_without_video`,
  `reply_with_video` e `reply_without_video`, usando apenas `important_action_event.action_type="whatsapp_click"`
  quando o alvo rastreavel (`target_type`/`target_id`) aponta para `community_post` ou `post_reply`
  de autoria do psicologo.
- Autoacoes autenticadas do proprio psicologo sao excluidas das metricas comunitarias.
- O diagnostico de atividade e derivado de score simples sobre posts, respostas, WhatsApp e quantidade
  de comunidades ativas no periodo.
- A UI exibe diagnostico, donut de posts, donut de respostas e uma tabela com os quatro grupos e seus
  cliques WhatsApp.

## Consequencias

- O psicologo passa a comparar se conteudos com video estao gerando mais publicacoes/respostas e mais
  cliques WhatsApp rastreaveis.
- Conteudos sem evento de WhatsApp com alvo comunitario exibem WhatsApp 0 honestamente.
- `contact_request` continua sendo fonte do total geral de conversoes, mas nao e distribuido por
  grupo de conteudo sem evento first-party rastreavel.
- Nao ha schema, migration, backfill, endpoint paralelo, mock, seed ou package novo.
- Se a plataforma precisar historico/materializacao por performance, sera necessario ADR especifico
  para snapshot de analytics comunitario.

## Validacao

- `pnpm --dir backend check`.
- `pnpm --dir frontend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Browser/HTTP local com `next start --hostname 127.0.0.1 --port 3137` e request em
  `/app/professional/analytics` retornando `307` para login sem sessao autenticada.

## Pendencias

- Nenhuma pendencia externa para a entrega atual.

## Atualizacao 2026-08-02 - Diagnostico no final do bloco

Por ajuste de leitura mobile-first, o bloco `Comunidade` passa a exibir primeiro os donuts de posts/respostas e a tabela de cliques por conteudo; o `Diagnostico` foi movido para o final do bloco.

Consequencia: a regra de calculo do diagnostico comunitario nao muda. A alteracao e somente de hierarquia visual, mantendo os dados reais de `community_member`, `community_post`, `post_reply` e `important_action_event`.
