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
- Atualização em 2026-08-15: a UI não navega mais cegamente para a URL absoluta retornada pela
  intenção de exclusão. Ela valida a origem da API, preserva apenas os parâmetros assinados
  retornados pelo backend e recompõe o caminho público como
  `/api/public/google/login/{deviceId}` usando o mesmo identificador de dispositivo usado na
  requisição autenticada.
- Ajuste posterior em 2026-08-15: para evitar falso bloqueio no próprio modal, se o backend já
  retornar uma URL confiável de `/api/public/google/login/{deviceId}`, o frontend deve navegar
  diretamente para ela. A recomposição local fica restrita a URLs confiáveis que ainda não tenham o
  segmento de device, usando `device_id` retornado pelo backend ou, como fallback temporário de
  rollout, o fingerprint local.
- A resposta de `POST /api/private/account/delete/google-intent` passa a incluir `device_id` de
  forma aditiva para permitir que clientes novos recomponham a URL sem depender de uma segunda
  resolução assíncrona de fingerprint após a intenção já ter sido criada.
- O backend também passa a responder `400 device_id_not_found` no caminho público sem dispositivo
  (`/api/public/google/login`), evitando uma página genérica de 404 quando algum cliente antigo ou
  configuração incompleta tentar iniciar OAuth sem o segmento obrigatório.

## Consequências

- Contas cadastradas por Google não ficam presas por uma senha local desconhecida ou legada.
- O fluxo mantém confirmação forte: reautenticação Google + digitação de `EXCLUIR`.
- O contrato de API permanece compatível e aditivo; não houve migration, pacote novo ou variável
  de ambiente nova.
- Contas sem Google e sem senha continuam bloqueadas com erro de domínio seguro, sem exclusão
  automática.
- Links antigos/incompletos de confirmação Google deixam de cair em 404 genérico e falham de forma
  controlada; clientes novos sempre enviam o usuário ao login Google com device id no path,
  preservando a validação do token curto no callback.
- Durante o rollout, frontend novo funciona com backend antigo quando a URL já contém device no
  caminho; backend novo funciona com frontend antigo porque `device_id` é apenas campo adicional.

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
- 2026-08-15: validação adicional da URL de confirmação Google e da proteção do caminho sem device:
  `pnpm --dir frontend test`, `pnpm --dir backend test`, `pnpm --dir frontend check`,
  `pnpm --dir backend check`, `pnpm --dir frontend build`, `pnpm --dir backend build`,
  `pnpm check`, `git diff --check` e smoke publicado registrados no fechamento do ajuste.
- 2026-08-15: validação da correção de falso bloqueio do modal: `pnpm --dir frontend test`,
  `pnpm --dir frontend check`, `pnpm --dir backend check`, `pnpm --dir frontend build`,
  `pnpm --dir backend build`, `pnpm check` e smoke publicado registrados no fechamento do ajuste.
