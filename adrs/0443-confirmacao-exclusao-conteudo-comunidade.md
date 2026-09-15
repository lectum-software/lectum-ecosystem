# ADR-0443: Confirmação de exclusão de conteúdo da comunidade

## Status

Accepted

## Task relacionada

TASK-147

## Contexto

Posts, comentários e respostas da comunidade possuem regras de exclusão com impacto de domínio:
autoria obrigatória, soft delete no backend, remoção da subárvore quando permitido e bloqueio quando
um conteúdo de paciente já recebeu contribuição profissional protegida. A solicitação operacional foi
reduzir exclusões acidentais sem enfraquecer essas regras existentes.

O frontend já confirmava exclusão de posts nos fluxos de ações do autor. O menu de comentários dentro
do detalhe/thread do post chamava a mutation de exclusão diretamente, dependendo apenas da resposta do
backend para sucesso ou bloqueio.

## Decisão

Adicionar uma confirmação visual destrutiva no frontend antes de executar a exclusão de comentários e
respostas, reutilizando a mutation existente e sem alterar contrato, rota, payload ou regra backend.

Posts continuam usando `PostOwnerActionMenu`, que já apresenta confirmação e mantém o tratamento de
bloqueio por contribuição profissional. Comentários/respostas dentro do post passam por
`CommunityDeleteConfirmationModal` antes de chamar `onDeleteReply`.

## Consequências

- Reduz risco de toque acidental em mobile antes de uma ação destrutiva.
- Mantém o backend como autoridade das regras de exclusão e ownership.
- A UI passa a explicar quando respostas encadeadas também serão removidas.
- Há uma pequena duplicidade visual temporária com modais de ação existentes; uma unificação completa
  pode ser feita em task futura sem mudar o contrato.

## Produção e rollout

- **Compatibilidade com dados existentes:** sem alteração de dados.
- **Banco/migration:** sem alteração.
- **Envs:** nenhuma variável nova.
- **Contratos:** nenhum endpoint ou DTO alterado; frontend novo apenas adia a chamada existente até a
  confirmação do usuário.
- **Compatibilidade entre apps:** backend, frontend e admin podem publicar em momentos diferentes; a
  mudança é frontend-only e tolera qualquer versão atual do backend.
- **Ordem de deploy:** publicar frontend em homologação.
- **Smoke de homologação:** validar menu de comentário/resposta em detalhe do post e thread; confirmar
  que cancelar não chama exclusão e que confirmar chama a mutation existente. Conferir que post próprio
  segue abrindo confirmação.
- **Rollback:** reverter o commit remove a nova confirmação de comentário/resposta e preserva as regras
  backend.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
- Smoke visual local em Chrome headless com rota temporária para a modal, removida antes do commit.

## Pendências

- Nenhuma decisão externa pendente.
