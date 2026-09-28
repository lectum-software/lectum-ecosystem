# ADR-0535 - Retorno apos autenticacao

## Status
Aceito em 2026-09-28.

## Contexto
O historico do navegador preserva etapas anteriores do cadastro mesmo quando o
destino final usa replace. O retorno do ranking podia reabrir essas etapas.

## Decisao
Reiniciar o historico interno ao concluir autenticacao e impedir fallback nativo
atraves dessa fronteira. Ranking retorna a comunidade; comunidade sem origem de
conteudo segura retorna ao feed por replace. O navegador nao permite apagar
arbitrariamente suas entradas anteriores.

Adicionar guard client nas rotas de entrada (login, selecao e registro), usando
hidratacao da sessao, nunca somente dados persistidos. Pageshow atualiza presenca
de token e revalida a sessao para restauracoes do navegador. Preservar destino
interno solicitado e as regras existentes de confirmacao/onboarding. Callback
Google, erro, verificacao e redefinicao nao sao bloqueados por esse guard.

## Aceite
- [x] Ranking apos login retorna a comunidade e depois ao feed.
- [x] Historico anterior ao login nao e usado pelo retorno interno.
- [x] Navegacao comum entre conteudos mantem o retorno.
- [x] Cadastro incompleto mantem confirmacao de email.
- [x] Login/cadastro restaurado verifica sessao antes de permitir nova entrada.

## Validacao
Regressoes em auth-navigation.test.mjs, auth-redirect.test.mjs e testes do hook
de presenca de sessao. OAuth real depende de validacao com conta autorizada.
