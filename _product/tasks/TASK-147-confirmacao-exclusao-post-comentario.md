# TASK-147: Confirmação antes de excluir post ou comentário

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-147 |
| Prioridade | P1 |
| Esforço | P |
| Fase | Comunidade / Segurança de interação |
| Status | Completed |
| Dependências | TASK-26, TASK-28, TASK-145 |
| ADR alvo | ADR-0443 |

## Contexto

Usuários autenticados podem excluir conteúdos próprios da comunidade quando as regras existentes
permitirem. Posts já usam a modal de ações do autor para confirmar a exclusão e preservar a regra de
bloqueio quando há resposta profissional protegida. Comentários e respostas exibidos dentro do post,
porém, disparavam a mutation de exclusão diretamente a partir do menu de overflow.

A solicitação é adicionar uma confirmação antes da exclusão de comentário/post, sem alterar as regras
de autorização, ownership, soft delete, proteção por contribuição de psicólogo ou respostas do backend.

Referência visual: `_product/proto/Dentro do Post.jpg` para manter a experiência mobile-first em base
~390px. O Builder/Quick Copy ativo está documentado em `PROTO-INVENTORY.md`, mas não há ferramenta
Builder disponível nesta sessão; por isso a validação visual usa as imagens locais e o browser local.

## Objetivo

Evitar exclusões acidentais em conteúdos da comunidade exigindo um passo explícito de confirmação
antes de executar as mutations existentes de exclusão.

## Escopo

- Auditar os pontos de frontend que chamam exclusão de posts e comentários.
- Preservar a confirmação já existente para posts em `PostOwnerActionMenu`.
- Adicionar confirmação ao menu de comentário/resposta usado no detalhe do post e na thread de
  respostas.
- Manter o mesmo `onDeleteReply` e a mesma mutation/backend, sem mudar regras de bloqueio.
- Usar UI mobile-first, tokens existentes e sem package novo.

## Fora do escopo

- Alterar regras backend de exclusão.
- Criar endpoint novo, migration, env ou dados de seed.
- Redesenhar os menus de edição, denúncia, salvar ou compartilhar.

## Impacto em produção e plano de rollout

- **Banco:** sem alteração de schema, migration ou dados.
- **Envs:** nenhuma variável nova.
- **Contratos:** nenhum contrato de API alterado; o frontend apenas intermedeia a confirmação antes
  de chamar a mutation existente.
- **Compatibilidade entre apps:** backend antigo e novo continuam compatíveis porque não há mudança de
  payload, rota ou resposta.
- **Ordem de deploy:** apenas frontend precisa publicar; backend e admin não dependem desta mudança.
- **Rollback:** voltar o commit remove a etapa visual de confirmação e mantém as regras de backend.
- **Smoke de homologação:** abrir detalhe de post/thread, acionar menu de comentário próprio, confirmar
  que o primeiro clique abre a modal e que apenas o botão "Excluir" dispara a exclusão real; validar
  que exclusão de post próprio segue mostrando a confirmação existente.

## Critérios de aceite

- [x] A branch de implementação foi confirmada como `homolog` antes de editar.
- [x] Todos os pontos de exclusão de post no frontend foram auditados e continuam usando confirmação.
- [x] O menu de comentário/resposta dentro do post abre confirmação antes de chamar `onDeleteReply`.
- [x] A confirmação informa que respostas encadeadas também serão removidas quando aplicável.
- [x] As regras de exclusão existentes permanecem no backend/mutation sem alteração.
- [x] Não houve package novo, env nova, migration, mock ou dado fake.
- [x] A UI permanece mobile-first, com tokens existentes e sem `<img>`.
- [x] ADR-0443 foi criado e indexado.
- [x] Checks/builds relevantes do frontend foram executados.
- [x] Commit convencional criado em `homolog`, com bump sincronizado, e push comunicado/executado.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check:version`
- `git diff --check`
- browser local no fluxo de detalhe do post/thread

## Execução

Concluída em 2026-08-10.

- Criado `CommunityDeleteConfirmationModal`, modal destrutiva reutilizável e mobile-first para ações
  de exclusão em comunidade.
- `ReplyOverflowMenu` passou a abrir a modal antes de chamar `onDelete`, cobrindo detalhe do post,
  rota pública PT-BR e thread de respostas por reutilização do mesmo componente.
- `PostOwnerActionMenu` foi auditado e mantido, pois já preserva confirmação e bloqueios existentes
  antes da mutation de post.
- Nenhuma regra de backend, contrato de API, package, env, migration ou dado foi alterado.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`,
  `git diff --check` e smoke visual local em Chrome headless com rota temporária removida ao final.
