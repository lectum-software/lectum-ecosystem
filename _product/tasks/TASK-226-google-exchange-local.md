# TASK-226 - Troca unica da sessao Google no localhost

## Objetivo

Corrigir a duplicacao de GET /api/public/google/me no callback do frontend
em desenvolvimento. O cookie de troca e de uso unico; a segunda chamada
causava 401 apos a autenticacao Google.

## Escopo

Guardar o inicio da troca com useRef no componente existente. Nao desativar
Strict Mode, nao flexibilizar o backend e nao alterar cookies, OAuth ou banco.
ADR-0566. Trabalho local em homolog, sem push/deploy.

## Aceite

- [x] Reproduzir duas chamadas no Next dev antes da correcao.
- [x] Fazer uma chamada por montagem, inclusive com replay de efeitos.
- [x] Permitir nova tentativa apos nova navegacao completa ao callback.
- [x] Preservar redirecionamento para erro quando nao ha cookie valido.
- [x] Cobrir o guard na suite de auth-redirect.
- [x] Confirmar login Google completo com o usuario no navegador pessoal.

## Validacao

Seis testes de auth-redirect aprovados. Biome e ESLint dos dois arquivos
aprovados; TypeScript do frontend aprovado. Build completo nao executado.
Playwright com frontend/backend locais reais, sem cookies nem mocks:
uma chamada por visita em 1440px e 390px, duas visitas em cada tamanho;
401 esperado e redirecionamento para /auth/error sem loop. Antes eram duas
chamadas por visita. Usuario confirmou que conseguiu entrar; o redirecionamento
seguinte para planos foi identificado como onboarding da conta de desenvolvimento
nova, nao falha de autenticacao. A pedido do usuario, operacao separada habilitou
cortesia administrativa de 30 dias exclusivamente no banco de desenvolvimento,
sem gateway ou mudanca em producao. WhatsApp e perfil nao foram inventados.

## Rollback

Reverter apenas o guard e seu teste. Nenhuma migration, dependencia ou env nova.
