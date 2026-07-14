# ADR-0269: Ações administrativas de status da conta do psicólogo

## Status

Accepted

## Task relacionada

TASK-73

## Contexto

O Admin precisava excluir contas de psicólogos e oferecer alternativas mais brandas para punição. A opção de restrição parcial foi descartada por decisão de produto; ficaram apenas **Suspender conta**, **Desativar conta** e **Excluir conta** na aba **Conta** do detalhe administrativo.

O modelo já possuía `user.active`, `user.deleted`/`deleted_at`, `user_token` e auditoria administrativa em `admin_activity_log`, mas não havia uma trilha explícita para diferenciar suspensão, desativação e exclusão.

## Decisão

- Criar `user.account_status` com valores operacionais `"active" | "suspended" | "deactivated" | "deleted"` e `user.account_status_changed_at`.
- Manter `user.active` como flag de enforcement de login. Suspensão e desativação gravam `active=false`, removem sessões (`user_token`) e mantêm `deleted=false`.
- Não criar restrição parcial de permissões.
- A exclusão administrativa reutiliza o fluxo existente de soft delete/anonymization (`AccountRepository.deleteOwnAccount`), grava `account_status="deleted"` e mantém auditoria Admin adicional.
- A exclusão não cancela automaticamente cobrança em gateway; quando houver assinatura paga vinculada a gateway ou inadimplência, a ação fica bloqueada até regularização/cancelamento operacional.
- O login Google passa a bloquear usuários inativos antes de hidratar sessão, alinhando OAuth ao comportamento do login manual/JWT.
- Eventos de suspensão, desativação e exclusão são registrados em `admin_activity_log` com domínio `psychologist_account`, área `conta_e_acesso`, motivo obrigatório e payload seguro.
- Builder/Quick Copy não estava acessível no ambiente; a UI seguiu o padrão visual já implementado na aba **Conta**, as imagens locais de `_product/proto` registradas em `PROTO-INVENTORY.md` e a captura compartilhada pelo usuário.

## Consequências

- O Admin tem três ações claras e auditadas para conta do psicólogo.
- Suspensão e desativação são reversíveis por futura decisão operacional, mas a reativação não foi implementada nesta task.
- Perfis suspensos/desativados deixam de autenticar e saem da descoberta pública pelos filtros existentes baseados em usuário ativo/deletado.
- A exclusão preserva a política segura atual de não fazer hard delete físico imediato.
- A camada de billing continua explícita: exclusão não tenta simular cancelamento em gateway.
- A UI e o contrato de conta passam a expor status operacional e motivo de bloqueio de exclusão.

## Alternativas consideradas

1. **Restrição parcial de funcionalidades**: rejeitada porque o produto decidiu manter apenas suspensão, desativação e exclusão.
2. **Usar somente `user.active=false` sem novo status**: rejeitado porque não diferencia punição, desativação operacional e exclusão para auditoria e suporte.
3. **Hard delete físico da conta**: rejeitado por risco de perda de auditoria, integridade referencial e histórico operacional.
4. **Cancelar assinatura no gateway durante exclusão**: rejeitado nesta task por depender de operação externa real e por não poder ser simulada.

## Validação

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Parse JSON de `backend/locales/pt/translation.json`.
- Smoke HTTP local em `/psicologos/cmrgrztri7000tn0uh1q4n8vxf?tab=conta` retornando 200.
- Smokes HTTP sem sessão nos endpoints de suspender, desativar e excluir retornando 401.

## Pendências

- Reativação administrativa e eventual cancelamento operacional de gateway devem virar tasks próprias se o produto decidir implementá-los.

## Complemento 2026-07-14 - Prazo de suspensão

A suspensão administrativa passa a ser sempre temporária e exige seleção de prazo em lista fechada: 1, 7, 15, 30, 60 ou 90 dias. O prazo escolhido é persistido em `user.account_status_expires_at` e entra na auditoria da ação junto da duração em dias.

Decisão operacional:

- suspensão mantém `active=false`, `account_status="suspended"` e sessões encerradas até `account_status_expires_at`;
- desativação e exclusão limpam `account_status_expires_at`;
- ao vencer, a conta é reativada de forma preguiçosa no próximo login real ou na leitura administrativa da aba **Conta**;
- tokens removidos no ato da suspensão não são restaurados; o psicólogo precisa criar nova sessão;
- JWTs antigos não usam a rotina de expiração preguiçosa para não desfazer o efeito de encerramento de sessões.

Alternativa rejeitada: manter o prazo apenas como metadado de auditoria. Isso foi descartado porque a seleção de prazo precisa ter efeito operacional real.

## Complemento 2026-07-14 - Posição do card de ações

O card **Ações da conta** fica no final da aba **Conta**, depois dos blocos de e-mail, senha/recuperação e sessões/segurança.

Essa posição mantém as ações sensíveis disponíveis para o Admin, mas reduz a exposição imediata de comandos punitivos/destrutivos ao abrir a aba, favorecendo leitura prévia do estado e dos controles de suporte antes da decisão operacional.
