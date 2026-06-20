# ADR-0113 — Exclusão de conta para pacientes e psicólogos

## Status

Aceito em 2026-06-17.

## Contexto

A exclusão de conta precisava deixar de ser uma ação parcial do perfil do psicólogo e passar a atender pacientes, psicólogos gratuitos e psicólogos assinantes dentro da edição de perfil. A operação é sensível porque remove dados pessoais, encerra sessões, precisa evitar exclusões acidentais e não pode quebrar a integridade histórica das discussões da comunidade.

Também existem contas sem senha local, autenticadas somente via Google. Para essas contas, a confirmação por senha não é possível e a plataforma precisa validar identidade sem criar uma autenticação paralela.

## Decisão

- Manter a exclusão em `POST /api/private/account/delete`, compartilhada por pacientes e psicólogos.
- Exigir confirmação textual `EXCLUIR` e:
  - senha atual para contas com senha local;
  - reautenticação Google recente para contas Google sem senha.
- Reusar o OAuth Google existente com `intent="delete_account"` e token JWT curto, registrando a prova temporária em `user_background` com `type="account_delete_reauth"` e `device_id`.
- No callback OAuth do `intent="delete_account"`, retornar diretamente para a rota interna de exclusão com `deleteReauth=ok`, em vez de cair no fluxo genérico de login em `/auth/redirect`.
- Realizar a operação em transação Prisma, com soft delete/anomização do `user`, remoção de tokens e soft delete de preferências, notificações, favoritos, follows, contatos, avaliações, memberships, saves, votes e dados privados de perfil.
- Preservar publicações e comentários públicos para não quebrar conversas, mas exibir autores deletados como `Membro Excluído` ou `Psicólogo Excluído`.
- Para psicólogos, cancelar assinaturas locais/free/cortesia na transação e manter bloqueio quando existir cobrança externa vinculada a gateway ou inadimplência.
- Expor uma seção reutilizável de “Excluir minha conta” em Editar perfil de paciente e setup de perfil profissional, com modal destrutiva, confirmação e suporte ao fluxo Google.

## Consequências

- A plataforma preserva a integridade das comunidades sem manter dados pessoais visíveis do usuário excluído.
- Contas Google-only têm proteção equivalente à senha sem introduzir novo schema ou pacote.
- A reautenticação Google de exclusão não deve ser tratada como login novo; o usuário volta ao modal de exclusão para concluir a confirmação textual.
- Assinaturas com risco de cobrança externa continuam exigindo regularização/cancelamento no gateway antes da exclusão.
- O fluxo fica preparado para integrar cancelamento real de gateway quando a camada de billing externa estiver concluída.
- Não houve alteração de schema nem instalação de packages.
