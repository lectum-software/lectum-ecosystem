# ADR-0461 — Exclusão de conta Google sem senha local

## Status

Aceito em 2026-08-15.

## Contexto

O modal de exclusão de conta exibido no perfil/setup profissional estava solicitando **Senha atual**
quando a conta tinha sido cadastrada pelo Google. O fluxo original diferenciava contas Google-only
pela ausência de `user.password`; porém contas legadas ou operacionalmente alteradas podem manter
`provider="google"` e ainda possuir um hash local. Para o usuário, a identidade de cadastro continua
sendo Google e a exigência de senha local cria bloqueio indevido.

## Decisão

- Para exclusão própria de conta, `user.provider="google"` passa a ser a regra canônica de
  confirmação por Google, independentemente da existência de `user.password`.
- Senha atual fica restrita a contas não Google com senha local.
- O endpoint de intenção `POST /api/private/account/delete/google-intent` aceita contas Google com
  senha legada e emite o fluxo OAuth curto já existente.
- O `POST /api/private/account/delete` valida reautenticação Google recente antes da exclusão de
  qualquer conta Google.
- A UI do modal não renderiza o campo **Senha atual** para contas Google e só mostra o formulário
  destrutivo após carregar o contrato real de segurança da conta, evitando flicker de senha durante
  o loading.

## Consequências

- Contas cadastradas por Google não ficam presas por uma senha local desconhecida ou legada.
- O fluxo mantém confirmação forte: reautenticação Google + digitação de `EXCLUIR`.
- O contrato de API permanece compatível e aditivo; não houve migration, pacote novo ou variável
  de ambiente nova.
- Contas sem Google e sem senha continuam bloqueadas com erro de domínio seguro, sem exclusão
  automática.

## Task relacionada

- TASK-30 — Configurações de conta.

## Validações

- `pnpm --dir backend exec tsc --noEmit --pretty false`
- `pnpm --dir frontend exec tsc --noEmit --pretty false`
- `pnpm --dir backend test`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm --dir admin build`
- `pnpm check:version`
- `pnpm check`
- Smoke de homologação registrado no fechamento da task após o push.
