# ADR 0141 - Ações do autor para silenciar e excluir posts

Status: Accepted

## Contexto

O MVP precisava permitir que o usuário gerenciasse os próprios posts sem remover contribuições profissionais já publicadas por psicólogos em posts criados por pacientes. A regra de domínio exige que posts de pacientes sem respostas ou com respostas apenas de pacientes possam ser excluídos, mas qualquer resposta de psicólogo, em qualquer nível da árvore, deve bloquear a exclusão.

Em ajuste posterior, a regra foi refinada para autores psicólogos: quando a publicação principal é produção profissional do próprio psicólogo, o autor deve ter autonomia total para remover o conteúdo, independentemente de comentários, respostas de outros psicólogos, votos ou engajamento.

O inventário visual ativo foi consultado para os fluxos de comunidade (`Feed Comunidade`, `Dentro da Comunidade`, `Dentro do Post` e `Meus Posts`). Builder/Quick Copy não está disponível como ferramenta executável neste ambiente; a implementação seguiu os padrões locais de menus de respostas e modais existentes.

## Decisão

- Criar a tabela `post_notification_mutes` para representar silenciamento por usuário e post, sem alterar votos, métricas, ranking ou conteúdo visível.
- Expor endpoints privados para `POST /api/private/posts/:id/mute`, `DELETE /api/private/posts/:id/mute` e `DELETE /api/private/posts/:id`.
- Restringir silenciamento e exclusão ao autor do post no backend.
- Bloquear exclusão de posts criados por pacientes quando existir qualquer `post_reply` não deletada com `author.role = "psicologo"`, independente de verificação ou plano.
- Permitir que posts criados por psicólogos sejam excluídos em qualquer circunstância pelo próprio autor.
- Excluir posts permitidos por soft delete do post e das respostas associadas, mantendo histórico operacional.
- Retornar nos DTOs de posts os campos `muted_by_current_user` e `has_psychologist_reply` para a UX decidir entre confirmação destrutiva e modal de bloqueio.
- Aplicar filtro de silenciamento na geração de notificações de novas respostas, votos e salvamentos relacionados ao post.
- Reutilizar o padrão visual dos menus de respostas para o menu de três pontos nos posts do próprio usuário.

## Consequências

- O autor ganha controle sobre notificações do próprio post sem impacto no feed, métricas ou Top Mentor.
- A regra de preservação profissional para posts de pacientes fica garantida no backend, mesmo que a interface esteja desatualizada.
- A listagem passa a carregar metadados adicionais por post para exibir estado de silenciamento e bloqueio de exclusão.
- Menções ainda não têm fluxo dedicado no produto; quando forem implementadas, devem consultar `post_notification_mutes` antes de notificar o autor.

## Validação

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local:
  - `http://localhost:3000/app/community` retornou 200.
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou 200.
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` retornou 200.
  - `http://localhost:3000/app/posts/mine` retornou 200.

## Pendências

- Validar visualmente no navegador com um usuário autor de post que possua cenários reais: sem respostas, com respostas apenas de pacientes e com resposta de psicólogo.

## Complemento 2026-06-20 - autonomia de exclusão para psicólogos

O bloqueio por contribuições profissionais foi restringido a posts cujo autor é paciente. Posts criados por psicólogos podem ser excluídos pelo próprio autor em qualquer circunstância, e a confirmação da interface usa a nomenclatura "publicação" para reforçar que o conteúdo principal faz parte da produção profissional do autor.

Validação adicional:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke HTTP local:
  - `http://localhost:3000/app/community` retornou 200.
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` retornou 200.
  - `http://localhost:3000/app/posts/mine` retornou 200.

## Complemento 2026-06-20 - estado visual de post silenciado

A interface passou a exibir o selo "Post silenciado" quando o DTO do post informa
`muted_by_current_user = true`. O selo é renderizado apenas a partir desse campo
escopado ao usuário autenticado, portanto o estado fica visível somente para quem
silenciou o próprio post e não altera a apresentação pública do conteúdo para os
demais membros.

Validação adicional:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Smoke HTTP local:
  - `http://localhost:3000/app/posts/mine` retornou 307.
  - `http://localhost:3000/app/community/feed` retornou 200.
  - `http://localhost:3000/app/community/ansiedade-em-equilibrio/post/demo-post-ansiedade-apresentacao-video` retornou 200.
