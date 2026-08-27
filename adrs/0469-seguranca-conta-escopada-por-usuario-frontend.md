# ADR-0469: Seguranca de conta escopada por usuario no frontend

## Status

Aceito em 2026-08-27.

## Task relacionada

TASK-30 - Configuracoes de conta.

## Contexto

Uma captura enviada pelo usuario em 2026-08-26 mostrou o modal de exclusao da propria conta em
mobile exibindo apenas a confirmacao `EXCLUIR` e, apos o submit, a mensagem generica "Voce nao tem
permissao para realizar esta acao.". O relato indicava conta criada com e-mail e senha; nesse caso,
o fluxo correto precisa exibir **Senha atual** antes da confirmacao destrutiva.

A investigacao encontrou dois riscos no frontend:

1. `account.security` usava uma chave React Query estatica (`["account_security"]`). Em uma troca de
   conta/sessao dentro da mesma experiencia mobile/PWA, a modal podia reutilizar temporariamente o
   contrato de seguranca de outro usuario enquanto o refetch estava em andamento.
2. A camada global de erro troca `403` por uma mensagem publica generica para evitar vazamento de
   detalhes tecnicos. No modal de exclusao, porem, o backend ja retorna `code` de dominio seguro, e
   a UI deve preferir esse codigo para explicar senha invalida, dispositivo ausente ou sessao
   expirada sem expor dados sensiveis.

## Decisao

- Escopar o cache de `account.security` pelo `user.id` autenticado.
- Nao executar a query privada de seguranca ate existir um usuario autenticado no estado local.
- Fazer a modal destrutiva tratar `isFetching` como carregamento, ocultando/desabilitando o
  formulario enquanto o contrato real e revalidado.
- Quando `has_password=true` e a conta nao e Google, exigir **Senha atual** tambem no schema Zod do
  formulario de exclusao.
- Enviar a senha atual exatamente como digitada, sem `trim()`, preservando a semantica de senha.
- Mapear `code` seguro de falhas de exclusao (`account_current_password_invalid`,
  `account_password_login_unavailable`, `account_delete_confirmation_invalid`, `device_not_found` e
  `token_not_authorized`) antes do fallback generico por status.

## Consequencias

- Contas locais com senha deixam de herdar estado visual de uma conta anterior e voltam a exigir a
  confirmacao correta antes da exclusao.
- A mensagem do modal fica acionavel para o usuario sem reduzir a politica global de sanitizacao de
  erros.
- O backend permanece como autoridade: `user.provider="google"` exige reautenticacao Google;
  contas nao Google com `user.password` exigem senha atual; contas sem metodo confirmavel seguem
  bloqueadas.
- O cache de seguranca ainda pode ser invalidado de forma ampla pelo prefixo `account_security`, mas
  leituras renderizadas sao isoladas por usuario.

## Producao e rollout

- Sem alteracao de banco, migration, backfill ou contracao.
- Sem package novo.
- Sem variavel de ambiente nova e sem **ALERTA DE DEPLOY**.
- Compativel com backend atual: contrato HTTP nao muda.
- Deploy independente do frontend; durante rollout, backend antigo/novo continua aceitando os
  mesmos payloads.
- Rollback: reverter o commit do frontend. O backend preserva a defesa em profundidade e continuara
  bloqueando exclusoes sem senha atual ou reautenticacao Google.
- Smoke de homologacao apos push: abrir `/app/configuracoes/conta` autenticado, abrir **Excluir minha
  conta** em uma conta local com senha e confirmar que **Senha atual** aparece antes de `EXCLUIR`;
  consultar tambem `/version` do frontend.

## Validacao

- Referencias visuais consultadas: captura do usuario e imagens locais
  `_product/proto/Configuracoes de Conta - Login Google.jpg` e `_product/proto/Editar E-mail e Senha.jpg`.
- Builder/Quick Copy nao estava exposto como ferramenta callable neste ambiente; foi usado o fallback
  local de imagens.
- `pnpm --dir frontend exec tsc --noEmit --pretty false`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Chrome headless local em `http://localhost:3010/app/configuracoes/conta` confirmou renderizacao
  mobile da rota publica/privada sem crash, redirecionando para login sem sessao.
- Demais checks/build/smoke sao registrados no fechamento da task.

## Pendencias

- Nao foi executada exclusao real de conta em homologacao/producao para preservar dados publicados.
