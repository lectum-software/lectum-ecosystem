# ADR-0254 - Suporte administrativo de conta do psicólogo

## Status

Accepted

## Contexto

A TASK-68 precisava centralizar no Admin operações de suporte sobre credenciais e acesso do psicólogo sem misturar com perfil, CRP, plano ou conteúdo. As ações envolvem e-mail de login, confirmação, recuperação de senha, senha temporária e sessões, todas sensíveis e com risco operacional se tratadas como ação do próprio psicólogo.

Também já existia auditoria administrativa genérica da TASK-67 via `admin_activity_log`, portanto criar uma segunda trilha de auditoria seria redundante e dificultaria a aba Atividades.

## Decisão

- Criar a aba **Conta** no detalhe administrativo do psicólogo, depois de **Denúncias**, consumindo endpoints Admin privados sob `/api/admin/private/psychologists/:id/account`.
- Reutilizar campos existentes: `user.email`, `provider`, `password`, `confirmed`, `confirmed_date`, `confirm_code`, `confirm_date`, `recovery_code`, `recovery_date`, `need_reset` e `user_token`.
- Registrar ações sensíveis em `admin_activity_log` com `domain="psychologist_account"`, `area="conta_e_acesso"`, motivo obrigatório, ator Admin e payload seguro.
- Permitir senha temporária somente para contas com senha local; a senha é salva como hash, define `need_reset=true`, limpa recovery pendente e invalida sessões do psicólogo.
- Não criar senha local para conta Google/OAuth sem senha local; a UI mostra indisponibilidade honesta.
- Exigir envio transacional real para confirmação/redefinição. Se o provedor não estiver configurado, retornar erro honesto em vez de simular envio.
- No frontend do usuário, respeitar `need_reset=true` redirecionando para `/app/account/need-reset` e usando `POST /api/private/auth/need_reset`.

## Consequências

- Não há migration: a task fica apoiada no modelo de autenticação existente.
- Alteração de e-mail, senha temporária e encerramento explícito removem `user_token` do psicólogo afetado, sem invalidar a sessão do Admin executor.
- A aba Atividades passa a exibir eventos de Conta e acesso sem expor senha, hash, códigos de confirmação, recovery code, JWT ou tokens.
- Ambientes sem SMTP configurado bloqueiam envios com retorno honesto; a operação não é marcada como enviada falsamente.
- Builder/Quick Copy não estava disponível no ambiente; a UI seguiu os padrões das imagens locais das abas Geral, Denúncias e Atividades.

## Task relacionada

TASK-68 - Conta e acesso do psicólogo no Admin.

## Validações

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `GET /api/admin/private/psychologists/test-id/account` sem sessão retornou 401, confirmando proteção Admin.
- Browser local/headless 390px para rotas `/psicologos/[id]?tab=conta` e `/app/account/need-reset` com limitação de sessão autenticada real.
