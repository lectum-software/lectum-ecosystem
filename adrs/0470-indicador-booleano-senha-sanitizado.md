# ADR-0470: Indicador booleano de senha em respostas sanitizadas

## Status

Aceito em 2026-08-27.

## Task relacionada

TASK-30 - Configuracoes de conta.

## Contexto

Depois do deploy 0.1.216, uma nova captura mostrou que a exclusao de uma conta informada como
cadastrada com e-mail e senha ainda nao exibia **Senha atual**. A mensagem mudou para senha
invalida, confirmando que o backend destrutivo continuava bloqueando a operacao sem senha, mas a UI
continuava sem o campo.

A investigacao encontrou a causa no limite global de resposta HTTP: `send` chama
`sanitizeSensitiveData` para remover segredos antes de enviar qualquer payload. Esse sanitizador
normalizava a chave `has_password` para `haspassword` e removia o campo por terminar em
`password`. O dado e um metadado booleano seguro e ja fazia parte do contrato de
`/api/private/account/security`; sem ele, o frontend assumia `false`.

A consulta read-only no banco configurado localmente nao encontrou o e-mail relatado, portanto nao
houve inspeção nem alteracao de registro publicado. A correcao foi feita por contrato e defesa em
profundidade, sem depender de dado real ou exclusao de conta.

## Decisao

- Preservar no sanitizador somente a chave normalizada `haspassword` quando o valor for booleano.
- Continuar removendo `password`, hashes, confirmações de senha e qualquer `has_password` nao
  booleano.
- Manter o backend como autoridade para a exclusao destrutiva: contas Google exigem reautenticacao;
  contas locais com senha exigem senha atual; contas sem metodo confirmavel permanecem bloqueadas.
- No frontend, tratar provedores locais (`manual`, `email` e `local`) como confirmacao por
  senha mesmo se `has_password` estiver ausente durante rollout misto.

## Consequencias

- `/api/private/account/security` volta a entregar o indicador necessario para renderizar
  **Senha atual** sem expor hash, senha, provider bruto sensivel ou PII adicional.
- Outros endpoints que usam `has_password` como metadado booleano seguro deixam de perder o campo.
- A politica global de sanitizacao continua conservadora: o allowlist e exato e depende do tipo
  booleano.
- Clientes antigos continuam compativeis porque o campo ja existia no tipo; clientes novos tambem
  funcionam contra backend antigo pelo fallback de provider local.

## Producao e rollout

- Sem migration, backfill, contracao ou alteracao de schema.
- Sem package novo.
- Sem variavel de ambiente nova e sem **ALERTA DE DEPLOY**.
- Backend e frontend podem subir em qualquer ordem em homologacao; a mudanca e aditiva e segura.
- Rollback: reverter o commit. A defesa destrutiva do backend segue recusando exclusao sem senha
  atual ou reautenticacao Google.

## Validacao

- `pnpm --dir backend exec tsc --noEmit --pretty false`.
- `pnpm --dir backend exec node --import tsx --test src/utils/sanitize-sensitive.test.ts src/helpers/return/index.test.ts src/modules/api/private/account/use-cases/delete-confirmation.test.ts`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check` antes do commit.
- Chrome headless mobile local em `http://localhost:3011/app/configuracoes/conta` confirmou rota sem crash e redirecionamento seguro para login sem sessao.
- Smoke de homologacao em `/version`, `/ping`, `/health` e `/ready` apos push sera registrado no fechamento da task.

## Pendencias

- Nao executar exclusao real de conta em homologacao/producao para preservar dados publicados.
