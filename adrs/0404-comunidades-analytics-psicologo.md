# ADR-0404: Comunidades no Analytics privado do psicologo

## Status

Accepted

## Task relacionada

TASK-20

## Contexto

O Analytics do psicologo ja apresentava indicadores gerais e o bloco de video de apresentacao.
Produto pediu incluir, imediatamente abaixo do video, uma leitura de comunidades com participacao,
ranking Top Mentor, posts, respostas, cliques WhatsApp por comunidade e um diagnostico simples do
nivel de atividade.

A restricao principal e que o Analytics nao pode distribuir conversoes de forma estimada: o total de
`contact_request` nao possui `community_id`. Ja existem fontes reais para participacao comunitaria
(`community_member`, `community_post`, `post_reply`) e eventos first-party de acao importante
(`important_action_event`) que podem apontar para posts/respostas comunitarias.

## Decisao

- O contrato `GET /api/private/psychologist/analytics` passa a expor o agregado `communities`.
- Uma comunidade e listada quando o psicologo segue a comunidade ou tem participacao real nela por
  posts/respostas publicados.
- Posts e respostas sao contados por periodo a partir de `community_post.author_id` e
  `post_reply.author_id`.
- Cliques WhatsApp por comunidade usam apenas `important_action_event.action_type="whatsapp_click"`
  quando o alvo rastreavel (`target_type`/`target_id`) aponta para `community_post` ou `post_reply`
  de autoria do psicologo.
- Autoacoes autenticadas do proprio psicologo sao excluidas das metricas comunitarias.
- O ranking Top Mentor exibido reaproveita o ranking derivado existente, sem criar snapshot novo.
- O diagnostico de atividade e derivado de score simples sobre posts, respostas, WhatsApp e quantidade
  de comunidades ativas no periodo.
- A UI usa os endpoints reais existentes de seguir/deixar de seguir comunidade e refaz o aggregate apos
  a mutacao.

## Consequencias

- O psicologo passa a ver quais comunidades estao gerando atividade e contatos rastreaveis.
- Comunidades com posts/respostas, mas sem evento de WhatsApp com alvo comunitario, exibem WhatsApp 0
  honestamente.
- `contact_request` continua sendo fonte do total geral de conversoes, mas nao e distribuido por
  comunidade sem evento first-party rastreavel.
- Nao ha schema, migration, backfill, endpoint paralelo, mock, seed ou package novo.
- Se a plataforma precisar historico/materializacao por performance, sera necessario ADR especifico
  para snapshot de ranking/analytics comunitario.

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
