# ADR-0692 - Camadas enxutas e logs Docker limitados por servico

Data: 2026-11-11
Status: Aceita; validada localmente em 0.1.820, sem publicacao
Task: [TASK-327](../_product/tasks/TASK-327-container-footprint-log-rotation.md)

## Contexto

A investigacao somente leitura da VPS identificou pressao de disco por uploads
de observabilidade, logs json-file sem limites e armazenamento de imagens/builds.
Nao sao dados descartaveis. A imagem backend copia node_modules completos,
remove devDependencies em camada posterior e faz chown recursivo tardio; os bytes
anteriores permanecem na imagem. O runtime requer CLI Prisma e modulos nativos.

## Decisao

Podar dependencias em estagio dedicado e copiar apenas o resultado para o runner,
com ownership no COPY e modo executavel explicito do entrypoint. Preservar base
Debian/Node fixada, Corepack offline, assets e contrato de startup/migrations.
Medir antes/depois no mesmo contexto Linux amd64; nao inferir ganho somente do diff.

Preparar json-file com max-size 20m, max-file 5 e compress true por servico,
sem configurar/reiniciar o daemon global. Compose do video e independente;
backend Dokploy/Swarm usa artefato de configuracao especifico. GlitchTip externo
recebe apenas fragmento/runbook a mesclar no compose real, nao uma stack ficticia.

## Consequencias

Limite nominal de cerca de100MB por container, nao por stack nem por periodo.
Rotacao futura elimina logs mais antigos conforme limites: preservar evidencia
necessaria antes de ativar. Nao alterar retencao de eventos/uploads do GlitchTip.
Configuracao nao e retroativa e nao libera os logs atuais apenas por existir no Git.
Futura aplicacao exige publicacao/rollout controlado e validacao dos novos containers;
sem prometer zero interrupcao de um servico de replica unica. Rollback conserva
imagem anterior e configuracao anterior; nao reconstitui logs que ja expiraram.

Esta entrega e exclusivamente local em homolog, sem push/deploy, escrita remota,
restart, truncamento, limpeza de caches/dados ou contratacao de infraestrutura.
Nao adiciona dependencia, env obrigatoria ou migration.

## Validacao

Builds Linux amd64 reais antes/depois, Node24.22.1/pnpm10.33.0, aprovados. Size
reportado pelo Docker apos materializar ambas as imagens:2.120.987.212 ->
1.187.071.024 bytes (-44,03%); nao representa tamanho no registry nem liberacao
imediata na VPS. Runner sem camada tardia chown/prune; 3.475 arquivos de runtime
com digest identico. UID1000, permissoes, pnpm offline, Prisma CLI/client e native
bcrypt/argon2/sharp aprovados. Vinte testes loopback reais em cada build.

Prisma status/deploy e SELECT1 reais em QA isolado, sem migrations pendentes,
reset, seed ou exclusao. Health/ping200; ready200 em NODE_ENV=test e503 esperado
em production sem credenciais Stream, preservando fail-closed. Nenhuma chave
falsa foi usada para declarar dependencia externa pronta. Rede interna sem egresso,
providers/schedulers/gates desativados. Nao e E2E de pagamento/fiscal/Cloudflare.

Cinco testes de logging, incluindo Compose real, aprovados. Driver Docker local
aceitou politica20mx5/compress; ensaio reduzido4kx3 confirmou rotacao e leitura dos
registros finais por API. Sem ler/truncar arquivos ativos; nao afirmar medicao
fisica de gzip somente porque a opcao compress esta habilitada. Containers locais
proprios, finitos, sem rede/volumes, encerrados0 e preservados. Revisoes independentes,
check integral e builds backend/video aprovados. Sem mocks como prova E2E.

O schema/formulario oficial Dokployv0.29.13 nao expoe LogDriver persistente para
Application. O objeto JSON e um contrato Swarm preparado, nao integracao remota
concluida nem garantia de que um deploy comum o aplique. Confirmar caminho
persistente suportado em tarefa de ativacao futura. Nao fazer service update
ad hoc que possa ser sobrescrito pelo provedor. Compose GlitchTip real e externo;
runbook contem somente fragmento, sem inventar stack ou alterar retencao de uploads.
Nenhuma mudanca publicada, nenhum dado remoto alterado; capacidade continua gate
operacional, e builds CI/cache sao melhorias separadas.
