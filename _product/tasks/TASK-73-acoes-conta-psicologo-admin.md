# TASK-73: Ações administrativas de conta do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-73 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin / Psicólogos / Conta |
| Status | Completed |
| Dependências | TASK-45, TASK-46, TASK-55, TASK-68 |
| ADR alvo | ADR-0269 |

## Contexto

A aba **Conta** do detalhe administrativo do psicólogo já concentrava suporte de e-mail, senha e sessões. Faltavam ações operacionais para punição e desligamento solicitadas pelo produto:

- **Suspender conta**;
- **Desativar conta**;
- **Excluir conta**.

A opção de restrição parcial foi rejeitada por decisão de produto. Portanto, esta task não implementa escopos intermediários de permissão; suspensão e desativação bloqueiam acesso de forma ampla e exclusão usa o fluxo seguro existente de soft delete/anonymization.

## Objetivo

Permitir que um Admin autenticado execute ações reais e auditadas de suspensão, desativação e exclusão da conta do psicólogo diretamente em `/psicologos/[id]?tab=conta`, sem mocks, sem hard delete e sem quebrar os fluxos de auditoria, login e descoberta pública existentes.

## Escopo

### Backend

- Adicionar status operacional em `user.account_status` com valores `"active" | "suspended" | "deactivated" | "deleted"`.
- Registrar `user.account_status_changed_at`.
- Expor o status e capacidades no contrato `GET /api/admin/private/psychologists/:id/account`.
- Criar endpoints Admin privados:
  - `POST /api/admin/private/psychologists/:id/account/suspend`;
  - `POST /api/admin/private/psychologists/:id/account/deactivate`;
  - `POST /api/admin/private/psychologists/:id/account/delete`.
- Suspender/desativar:
  - gravam `active=false`;
  - removem `user_token`;
  - preservam dados e `deleted=false`;
  - registram `admin_activity_log`.
- Excluir:
  - reutiliza o fluxo real de soft delete/anonymization da própria conta;
  - grava `account_status="deleted"`;
  - remove sessões;
  - registra auditoria administrativa;
  - bloqueia exclusão quando há assinatura paga vinculada a gateway ou pagamento inadimplente.
- Login Google também deve bloquear usuários inativos, mantendo consistência com login manual/JWT.

### Admin UI

- Inserir card **Ações da conta** na aba **Conta** do detalhe do psicólogo.
- Exibir status atual, última alteração e eventual bloqueio de exclusão.
- Implementar formulários mobile-first com React Hook Form, Zod e controllers do Admin.
- Exigir motivo obrigatório e confirmação forte:
  - `SUSPENDER CONTA`;
  - `DESATIVAR CONTA`;
  - `EXCLUIR CONTA`.
- Atualizar cache/toasts sem reload manual.
- Após exclusão, retornar para a lista de psicólogos.

## Fora do escopo

- Restrição parcial de funcionalidades.
- Reativação administrativa.
- Hard delete físico de usuário.
- Cancelamento automático de assinatura em gateway.
- Ações equivalentes para pacientes ou administradores.
- Impersonação.
- Mocks, endpoints simulados ou dados artificiais.

## Critérios de aceite

- [x] A aba **Conta** exibe o card **Ações da conta** com **Suspender conta**, **Desativar conta** e **Excluir conta**.
- [x] Restrição parcial não foi implementada.
- [x] As ações usam endpoints Admin privados reais e protegidos por autenticação Admin.
- [x] Suspensão grava `account_status="suspended"`, `active=false`, encerra sessões e audita a ação.
- [x] Desativação grava `account_status="deactivated"`, `active=false`, encerra sessões e audita a ação.
- [x] Exclusão reutiliza soft delete/anonymization real, grava `account_status="deleted"`, encerra sessões e audita a ação.
- [x] Exclusão fica bloqueada quando houver assinatura paga vinculada a gateway ou inadimplência operacional.
- [x] Login Google respeita `active=false` para contas suspensas/desativadas/excluídas.
- [x] A aba **Atividades** lista eventos de suspensão, desativação e exclusão sem expor segredos.
- [x] Formulários usam React Hook Form, Zod e controllers existentes.
- [x] UI mobile-first segue o padrão visual da aba **Conta** existente.
- [x] Nenhum `<img>` cru foi usado.
- [x] Nenhum pacote novo foi instalado.
- [x] Prisma migration foi criada e `pnpm --dir backend db:migrate` foi executado sem reset destrutivo.
- [x] `DATA-MODEL.md` foi atualizado.
- [x] ADR criado em `adrs/`.
- [x] Checks/builds relevantes foram executados.
- [x] Commit próprio e `git push` executados.

## Execução TASK-73

- Implementado `account_status` em `user` com migration `20260714164500_add_user_account_status`.
- Criados endpoints Admin privados para suspender, desativar e excluir conta de psicólogo.
- Suspensão/desativação usam status operacional + `active=false` + revogação de `user_token`.
- Exclusão administrativa reutiliza `AccountRepository.deleteOwnAccount`, preservando soft delete/anonymization e acrescentando auditoria Admin.
- A leitura da aba **Conta** retorna status, rótulo, data de mudança, bloqueio de exclusão e capabilities.
- A aba **Atividades** recebeu os tipos `account_suspended`, `account_deactivated` e `account_deleted`.
- A UI da aba **Conta** recebeu card mobile-first de ações sensíveis, com motivo, confirmação forte e estados de bloqueio.
- Builder/Quick Copy não estava acessível no ambiente; a execução usou o padrão visual da aba **Conta** já implementada, as imagens locais registradas em `PROTO-INVENTORY.md` e a captura compartilhada pelo usuário.

## Validação executada

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `node -e "JSON.parse(require('fs').readFileSync('backend/locales/pt/translation.json','utf8'))"`
- Smoke HTTP local:
  - `GET http://localhost:3002/psicologos/cmrgrztri7000tn0uh1q4n8vxf?tab=conta` retornou 200.
  - `POST /api/admin/private/psychologists/test-id/account/suspend` sem sessão retornou 401.
  - `POST /api/admin/private/psychologists/test-id/account/deactivate` sem sessão retornou 401.
  - `POST /api/admin/private/psychologists/test-id/account/delete` sem sessão retornou 401.

## Pendências

- Nenhuma pendência funcional. A reativação administrativa fica fora do escopo até decisão específica de produto.
