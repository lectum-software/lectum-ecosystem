# ADR-0399 - Media no contexto da base e breakdown de autoria no trafego WhatsApp Admin

## Status

Accepted

## Contexto

A tabela **Origem do trafego para psicologos** precisava separar tres leituras que estavam sobrepostas na coluna WhatsApp: total bruto, media por base considerada e qualidade/autoria do clique em conteudos de comunidade.

## Decisao

- A media por conteudo/video/psicologo passa a ser exibida no contexto da linha, ao lado da base considerada, e nao mais abaixo do total de WhatsApp.
- Linhas macro agregadas (**Comunidades**, **Perfil** e **Video de apresentacao**) mostram apenas total e percentual na coluna WhatsApp.
- Posts e respostas recebem `whatsapp_click_actor_breakdown` calculado no backend com `important_action_event.user_id` comparado aos autores reais (`community_post.author_id`/`post_reply.author_id`).
- Cliques anonimos, sem autor resolvido ou de usuario diferente do autor ficam em **outros usuarios**.

## Consequencias

- A coluna WhatsApp volta a priorizar o total e o percentual, com breakdown apenas onde ha autoria de conteudo.
- A media fica semanticamente proxima ao denominador, reduzindo ambiguidade nas linhas macro.
- O contrato da API cresce de forma aditiva; clientes antigos continuam capazes de ignorar o novo campo.
- Nao ha migration, backfill ou novo tracking; o calculo usa eventos e autores ja persistidos.

## Validacao

- Typecheck/check/build de backend e Admin.
- API local conferindo breakdown real em posts/respostas.
- Browser local desktop e mobile 390px em `/psicologos`.
