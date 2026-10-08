# TASK-239 - Publicacoes do perfil por votos e comentarios

## Escopo

Pedido de 08/10/2026: na lista de publicacoes do perfil publico, ordenar posts e
respostas por votos positivos decrescentes, comentarios decrescentes, data mais
recente e ID decrescente para desempate estavel. Usuario confirmou a prioridade
e autorizou somente esta alteracao no backend, sem mudar banco.

Usar os contadores ja consultados: upvotes_count e replies_count do post; para
respostas, upvotes_count da propria resposta e contagem de filhos nao excluidos.
Ordenar a lista unificada antes do slice de paginacao. Nao somar metricas nem
ordenar apenas a pagina no navegador. Preservar destaque editorial/score atual
da previa, filtros de visibilidade, contagens, formato HTTP e entitlement.

## Aceite

- [x] Posts e respostas ordenados por votos, comentarios, data e ID.
- [x] Respostas usam seus proprios votos/comentarios, nao os do post pai.
- [x] Ordem global antes da paginacao; empates estaveis e sem mutar catalogos.
- [x] Sem queries adicionais, banco, migration, env ou dependencia nova.
- [x] Testes de regressao e dados reais locais em leitura; Prisma/TS/Biome/build aprovados.

## Rollout

Backend apenas; contrato identico, compativel com frontend anterior/novo. Sem
deploy nesta implementacao; promover apenas apos validacoes do release. Nao
reativar autodeploys. Rollback por revisao do backend, sem operacao em dados.
ADR-0580. Dependencia: TASK-238 concluida em commit proprio.

## Evidencias locais

- Cinco testes focais aprovados; check backend completo aprovado com 876/876 testes, Biome e TypeScript.
- Prisma validate e build backend 0.1.614 aprovados; comparador exportado no JavaScript compilado verificado. Schema/migrations intocados; db:migrate nao aplicavel.
- Leitura da API local em cinco perfis retornou tres publicacoes (um post e duas respostas), incluindo um perfil com mais de um item. Comparador real aplicado a esses dados passou prioridade, estabilidade e preservacao das entradas; nenhum endpoint simulado e nenhuma escrita.
- Este teste nao equivale a implantar/reiniciar o endpoint local ou remoto: valida comparador com payloads reais e regressao de wiring antes do slice. Smoke do endpoint implantado permanece como gate de release, nao foi alegado.
- Guards de source-safety, source-size, tasks, ADRs, ciclos e versionamento aprovados. Sem consultas adicionais ou alteracao da previa destacada.
