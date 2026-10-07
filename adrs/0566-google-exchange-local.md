# ADR-0566 - Troca unica do callback Google por montagem

## Status

Aceito.

## Contexto

TASK-226. O Next dev executa novamente efeitos sob React Strict Mode. A tela
/auth/redirect chamava mutate em cada execucao. O backend consome o token
temporario em /api/public/google/me uma unica vez, portanto chamadas
concorrentes podiam produzir sucesso seguido de erro de sessao expirada.

## Decisao

Usar uma ref local ao componente, marcada antes de mutate, para iniciar uma
unica troca durante sua montagem. Nao limpar essa ref no cleanup do efeito:
o replay nao representa uma nova autenticacao. Uma nova montagem permite
uma nova tentativa. Preservar callbacks de sucesso/erro e todos os controles
de autenticacao, validade e consumo unico do backend.

## Consequencias

Sem cache global de credenciais, novos endpoints, dependencias ou migrations.
Strict Mode permanece ativo. Nao ha retry automatico de um cookie consumido;
falhas continuam encaminhadas ao fluxo de erro para reiniciar o login.
O teste de navegador local cobre a contagem de chamadas e o caminho de erro;
a autenticacao real pelo Google depende da confirmacao do usuario.
