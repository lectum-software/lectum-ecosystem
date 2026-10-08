# TASK-238 - Comunidade geral no fim da selecao de post

## Escopo

Na criacao de post, ordenar as comunidades especificas alfabeticamente e deixar
saude-mental-em-geral por ultimo, com separador sutil e a descricao solicitada:
"Nao encontrou uma comunidade especifica? Publique aqui." (acentuada na UI).
Nao mudar catalogo, busca, valores enviados ou seletores de outros fluxos.
ADR-0578. Referencia: captura e texto do usuario de 07/10/2026.
PROTO-INVENTORY consultado; Builder indisponivel. Reutilizar o seletor existente,
mobile-first, com validacao em 390px e desktop.

## Aceite

- [x] Comunidade geral por ultimo com descricao exata e separacao discreta.
- [x] Busca preservada, sem incluir opcoes fora do resultado ou inventar comunidade.
- [x] Selecao mantem slug e nome no gatilho; descricao acessivel na opcao.
- [x] Testes, checks, build e browser responsivo validados.

## Rollout

Frontend apenas; sem API, migration, env ou dependencia nova. Commit local em
homolog, sem push/deploy ate nova autorizacao. Demais seletores mantem o visual
anterior quando as propriedades opcionais nao forem fornecidas.

## Validacao

Frontend check completo aprovado (Biome, ESLint, TypeScript e suites), incluindo
tres testes novos de ordenacao, identidade por slug, imutabilidade e ausencia.
Gates de versao, segredos, encoding, ADRs, tasks, source-safety, env, source-size
e ciclos aprovados. Versao local 0.1.610, bump unico.

Build de producao aprovado em outputs/release-0610-frontend-clean, copia limpa
sem env ou cache dev, com node_modules compartilhado. 765 arquivos src/scripts/
public comparados byte a byte com o checkout. 90 paginas geradas e remocao de
sourcemaps aprovada. Avisos nao bloqueantes do cache webpack.

outputs/check-post-community.cjs monta o formulario e controller reais com
catalogo publico consultado apenas por GET (sem endpoints simulados). Browser
Chrome em 320/390/1440: ultima opcao, texto exato, separador, ausencia de overflow,
busca sem acento, resultado vazio, selecao por click/Enter, Escape e retorno de
foco aprovados. Capturas inspecionadas; nenhum pageerror ou envio de formulario.
Descricao associada a opcao por aria-describedby. Largura do menu limitada ao
viewport para acomodar nome e texto auxiliar.

O banco local ainda nao tem a comunidade geral; nao foi criada artificialmente.
Rota real localhost:3000/app/comunidades/feed/publicacao/nova verificada e redireciona
visitante ao login. Nao houve teste de submit autenticado, alteracao de banco ou
publicacao em producao nesta task. Logs em outputs/task238-* e
outputs/release-0610-frontend-build.log, fora do repositorio.
