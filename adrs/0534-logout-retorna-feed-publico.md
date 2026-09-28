# ADR-0534 - Logout retorna ao feed publico

## Status
Aceito em 2026-09-27.

## Contexto
Sair da conta enviava o usuario ao login, apesar de o feed permitir leitura publica.
O botao do perfil tambem sobrescrevia explicitamente o destino com a rota de login.

## Decisao
O logout voluntario usa `/` por padrao, incluindo o fallback para destinos inseguros.
O botao do perfil utiliza esse padrao centralizado. A navegacao continua ocorrendo
somente depois da revogacao e da limpeza local da sessao. Falhas de rede preservam
a sessao local e o tratamento de erro existente. Reautenticacao automatica por 401
continua usando o login com callback; destinos internos explicitos sao preservados.

## Aceite
- [x] Logout voluntario abre o feed publico.
- [x] Revogacao e limpeza precedem o redirecionamento.
- [x] Falha de rede nao simula logout bem-sucedido.
- [x] Reautenticacao e destinos internos explicitos permanecem funcionais.

## Validacao
Testes de regressao em `frontend/src/hooks/cookies/signout/signout.test.mjs`.
