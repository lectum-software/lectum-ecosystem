# ADR-0146 - Ações de respostas do usuário

Status: Accepted

## Contexto

A tela `/app/posts/mine` passou a separar posts e respostas/comentários do usuário. Posts próprios já tinham menu de dono com editar, silenciar e excluir, mas as respostas do usuário ainda dependiam apenas da navegação para o post original. O produto pediu paridade de ações nas respostas, mantendo a mesma regra de exclusão segura aplicada a posts: preservar contribuições de psicólogos em conversas iniciadas por pacientes.

## Decisão

- Criar `PUT /api/private/posts/:id/replies/:replyId` para edição owner-only do texto de `post_reply`.
- Manter autoria, post, hierarquia e mídia da resposta imutáveis no fluxo de edição.
- Evoluir `DELETE /api/private/posts/:id/replies/:replyId` para bloquear exclusão por autores não psicólogos quando a subárvore ativa do comentário/resposta já contém contribuição de psicólogo.
- Permitir que autores psicólogos excluam seus próprios comentários/respostas a qualquer momento, incluindo subárvores, espelhando a regra de posts de psicólogos.
- Reutilizar o mute persistido do post para a opção `Silenciar` no menu de resposta, porque as notificações de respostas pertencem à conversa do post e não existe requisito de mute granular por reply.
- Na UI, renderizar menu próprio apenas quando `reply.author.id` é o usuário atual, com modal de edição baseado na fundação TASK-02 (React Hook Form/Zod/controllers) e confirmação de exclusão.

## Consequências

- Pacientes não conseguem apagar um comentário/resposta que já recebeu participação profissional abaixo dele; o conteúdo profissional fica preservado.
- Psicólogos mantêm autonomia para remover suas próprias contribuições quando necessário.
- O backend continua sendo a fonte final da regra; a UI apenas antecipa bloqueios quando o DTO já informa resposta profissional direta.
- Não há novo modelo de dados, migration, package ou storage; o mute por resposta é deliberadamente representado como mute da conversa do post.

## Task relacionada

- Complemento de produto sobre `/app/posts/mine` em TASK-28.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- Validações finais de build, `pnpm check` e browser local registradas na execução do complemento.

## Complemento 2026-06-21 - editar comentario proprio no detalhe do post

O menu de comentarios/respostas dentro da propria arvore do post deve ter paridade minima com as acoes do usuario em `Meus posts e respostas`.

Decisao complementar:

- Exibir `Editar` no menu de tres pontos de `ReplyCard` somente quando `reply.author.id` for o usuario autenticado.
- Reutilizar a `ReplyEditModal` existente e o endpoint real `PUT /api/private/posts/:id/replies/:replyId`, sem criar fluxo paralelo ou mock.
- Manter `Salvar`, `Compartilhar` e `Excluir` no mesmo menu para comentarios proprios; comentarios de terceiros continuam com `Salvar`, `Compartilhar` e `Denunciar`.
- Preservar o bloqueio de propagacao/collapse da arvore porque o menu continua dentro de `data-comment-collapse-ignore`.

Consequencias:

- O usuario consegue corrigir um comentario direto no contexto da conversa, sem voltar para `/app/posts/mine`.
- A regra de dominio permanece centralizada no backend e nos hooks ja existentes; nao houve novo schema, endpoint, package, storage ou alteracao de permissao.

Validacao complementar:

- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- Chrome/CDP mobile `390x844` no detalhe do post demo: sucesso ao abrir o menu do comentario proprio `cmqnag8iv0024g8uhognhksz3`, confirmar ordem `Editar/Salvar/Compartilhar/Excluir` e abrir a modal `Editar comentario` preenchida.
