# ADR 0141 - Ações do autor para silenciar e excluir posts

Status: Accepted

## Contexto

O MVP precisava permitir que o usuário gerenciasse os próprios posts sem remover contribuições profissionais já publicadas por psicólogos. A regra de domínio exige que posts sem respostas ou com respostas apenas de pacientes possam ser excluídos, mas qualquer resposta de psicólogo, em qualquer nível da árvore, deve bloquear a exclusão.

O inventário visual ativo foi consultado para os fluxos de comunidade (`Feed Comunidade`, `Dentro da Comunidade`, `Dentro do Post` e `Meus Posts`). Builder/Quick Copy não está disponível como ferramenta executável neste ambiente; a implementação seguiu os padrões locais de menus de respostas e modais existentes.

## Decisão

- Criar a tabela `post_notification_mutes` para representar silenciamento por usuário e post, sem alterar votos, métricas, ranking ou conteúdo visível.
- Expor endpoints privados para `POST /api/private/posts/:id/mute`, `DELETE /api/private/posts/:id/mute` e `DELETE /api/private/posts/:id`.
- Restringir silenciamento e exclusão ao autor do post no backend.
- Bloquear exclusão quando existir qualquer `post_reply` não deletada com `author.role = "psicologo"`, independente de verificação ou plano.
- Excluir posts permitidos por soft delete do post e das respostas associadas, mantendo histórico operacional sem remover respostas profissionais.
- Retornar nos DTOs de posts os campos `muted_by_current_user` e `has_psychologist_reply` para a UX decidir entre confirmação destrutiva e modal de bloqueio.
- Aplicar filtro de silenciamento na geração de notificações de novas respostas, votos e salvamentos relacionados ao post.
- Reutilizar o padrão visual dos menus de respostas para o menu de três pontos nos posts do próprio usuário.

## Consequências

- O autor ganha controle sobre notificações do próprio post sem impacto no feed, métricas ou Top Mentor.
- A regra de preservação profissional fica garantida no backend, mesmo que a interface esteja desatualizada.
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
