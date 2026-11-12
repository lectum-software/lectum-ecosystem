# TASK-327 - Imagem backend enxuta e rotacao de logs preparada

Data: 2026-11-11
Status: Preparacao validada em 0.1.820 e publicada no lote 0.1.824; ativacao remota pendente, auditoria somente leitura concluida
Dependencias: TASK-326
Decisao: [ADR-0692](../../adrs/0692-container-footprint-log-rotation.md)

## Pedido e limites

Otimizar o Dockerfile do backend e preparar rotacao de logs na branch homolog.
Validar localmente e commitar; nao fazer push/deploy, apagar dados, modificar a
VPS, reiniciar servicos ou interromper producao. GlitchTip e administrado fora
deste repositorio: preparar politica e instrucoes, nao inventar sua stack completa.

## Escopo e impacto

- Podar dependencias de desenvolvimento em estagio separado, antes da unica copia
  de node_modules para a imagem final; ownership na copia em vez de chown recursivo.
- Preservar Node/digest, pnpm offline, Debian/native modules, usuario node, assets,
  Prisma CLI/config/migrations, entrypoint e gates reais de transporte.
- Preparar limites json-file por servico, sem alterar daemon.json nem o driver
  global. Logs anteriores nao sao truncados; retencao por bytes nao garante dias.
- Sem schema, migration, env obrigatoria ou package novo. Apps continuam separados.
- Rotacao so tera efeito quando aplicada em futura publicacao explicitamente
  autorizada. Nada muda em containers existentes por este commit local.
- Nao executar cleanup/maintenance do GlitchTip ou remover uploads/artefatos,
  bancos, backups, imagens anteriores ou volumes para fabricar ganho de espaco.
- Rollback futuro usa imagem anterior validada e configuracao por servico anterior;
  nao restaurar logs expirados por promessa nem reiniciar Docker nesta task.

## Aceite

- [x] Imagem final recebe somente dependencias podadas, sem chown recursivo tardio.
- [x] Contratos de runtime/native modules/Prisma/entrypoint e usuario preservados.
- [x] Builds Linux amd64 antes/depois medidos localmente e camadas comparadas.
- [x] Smoke real da imagem em banco local isolado: health/ready/ping e migrations.
- [x] Politica de logs versionada, configuracao validada e rotacao Docker local comprovada.
- [x] Checks/builds relevantes e revisao independente aprovados.
- [x] Bump unico, cinco manifests, task/ADR e commit homolog, sem push/deploy.

## Evidencias

Nao usar backend/.env nos testes: contem conexao remota.
Build nao recebe credenciais reais; validacao deve usar apenas Docker local,
PostgreSQL QA loopback e provedores/gates desligados, sem bootstrap financeiro.


## Resultado local em 11/11/2026

Builds reais Linux amd64, antes e depois, com mesmo contexto/manifests/base Node
24.22.1 e pnpm10.33.0. Depois de materializar ambas as imagens, `docker image
inspect Size` reportou **2.120.987.212 -> 1.187.071.024 bytes**, reducao de
**933.916.188 bytes / 44,03%**. A medida inclui a contabilizacao do Docker local,
nao e tamanho de transferencia do registry nem promessa de espaco liberado na VPS.
Historico anterior tinha copia node_modules718MB e chown recursivo665MB; o novo
runner tem uma copia podada632MB e nao tem camada de prune/chown recursivo.

Digest dos **3.475 arquivos** de dist/assets/schema/migrations/config/entrypoint e
manifest igual nas duas imagens. UID1000, ownership, entrypoint executavel, Prisma
client/CLI, ausencia de devDependencies diretas, pnpm offline e operacoes reais
bcrypt/argon2/sharp aprovados. Os dois builds tambem executaram os20 testes reais
de transporte loopback no usuario node, sem provider financeiro.

Prisma migrate status e entrypoint migrate deploy confirmaram banco QA local sem
migrations pendentes; SELECT1 pelo adapter real aprovado. Sem alteracao de schema,
sem reset/seed/exclusao e sem banco remoto. Rede Docker interna sem egresso e sem
chaves de provider; schedulers, cobranca, fiscal, digests, campaigns e cleanup OFF.
Health/ping200/no-store nas duas imagens em ambos modos; ready200/no-store em
NODE_ENV=test. Em NODE_ENV=production sem credenciais Stream, ready503/no-store e
esperado pelo contrato publicado; teste confirmou fail-closed sem inventar chaves
ou alterar a aplicacao. Primeira expectativa local ready200 em modo production
foi corrigida no harness, nao no produto. O acesso foi validado por HTTP loopback
real dentro do container, pois a rede interna bloqueia publicacao de porta ao host.
Nao e prova E2E Cloudflare, Stripe, SendNF ou ambiente publicado.

Politica json-file20m x5/compress preparada em Compose video e objeto Swarm backend.
Cinco testes aprovados, incluindo renderizacao real do Compose com env isolado.
Ensaio Docker local: politica real aceita e marcador final legivel; ensaio reduzido
4k x3 preservou registros211-240 e marcador final via API, descartando somente logs
sinteticos do proprio ensaio. Containers finitos sem rede/mounts, nao privilegiados,
encerrados0 e preservados; nenhuma limpeza de recursos existentes. Nao se leu nem
editou arquivo json-log ativo. A configuracao compress foi aceita pelo driver;
esta prova nao e medicao de tamanho fisico dos arquivos gzip no host.

Check integral e builds backend/video aprovados em Node24.22.1/pnpm10.33.0.
Suites opt-in do check amplo nao sao declaradas E2E; os gates reais de imagem,
PG QA, Compose e rotacao foram executados separadamente. Revisoes independentes
do Dockerfile e da politica/helper sem bloqueador. Evidencia privada fora do Git.
Nenhum package novo, migration, alteracao remota ou UI; browser/prototipo nao se
aplicam a esta task de infraestrutura. Cinco manifests sincronizados em0.1.820.

## Pendencias de ativacao futura (fora deste pedido)

- Dokployv0.29.13 nao expoe LogDriver persistente na Application: validar caminho
  suportado antes de aplicar. JSON nao e automaticamente consumido pelo provedor.
- Mesclar fragmento no Compose real externo do GlitchTip, apos autorizacao de
  rollout e revisao; nao reconstruir stack/credenciais/mounts a partir de exemplo.
- Nenhuma politica esta aplicada a containers publicados. Nao houve push, deploy,
  restart, prune, truncamento, limpeza de uploads/backups/volumes ou mudanca de
  retencao do GlitchTip. Os23,3GB de uploads e logs remotos existentes permanecem.
- A reducao da imagem nao elimina a necessidade de capacidade/rollback e de evitar
  builds concorrentes. Cache de instalacao ainda pode invalidar com manifesto;
  CI/registry e estrategia de cache sao melhorias separadas.

Releitura HTTP publica da etapa original confirmou backend produtivo0.1.818 com
health/ready/ping200, sem executar comandos na VPS ou modificar servicos publicados.

## Auditoria de ativacao e encerramento de escopo — 11/11/2026

O historico acima descreve a entrega local original. O PR#179 publicou depois a
imagem/codigo preparado no lote0.1.824, **nao a politica de logs remota**. Consulta
somente leitura da VPS/Dokploy confirmou json-file sem limites no backend e no
GlitchTip. Worker:2.874.070.607bytes de log; uploads:23.459.192.832bytes alocados,
separados dos logs. Estado/gates e fontes exatas estao em
[CONTAINER-LOGGING.md](CONTAINER-LOGGING.md#estado-operacional--auditoria-somente-leitura-em-11112026).

- [x] Confirmar configuracao efetiva sem expor secrets ou editar arquivos ativos.
- [x] Confirmar no codigo Dokployv0.29.13 que update avulso nao e persistente.
- [x] Conferir stack GlitchTip, mounts, backups no painel e riscos de recriacao.
- [x] Separar uploads/artefatos de logs e registrar gates de disponibilidade.
- [x] Smoke publico: GlitchTip saudavel; backend health/ready/ping e versoes dos
  tres apps HTTP200, Lectum0.1.824. Nenhuma escrita remota nesta auditoria.
- [ ] Escolher/validar caminho persistente do backend e estrategia de substituicao.
- [ ] Comprovar backup/restauracao e preservacao de logs; validar rollout GlitchTip.
- [ ] Aplicar politica autorizada, inspecionar containers novos e repetir smoke.

Nao houve restart, deploy adicional, cleanup, mudanca de retencao, cobranca ou
emissao nesta auditoria. Rotacao e capacidade ficam como pendencia propria de
infraestrutura, nao como bloqueio reaberto da integracao Stripe/SendNF. Sem UI,
package/env/schema novo. Registro documental local; sem push/novo deploy.

Registro final validado em0.1.825: check integral da raiz e check:version
aprovados em Node24.22.1/pnpm10.33.0 com env local isolado. Cinco manifests
sincronizados por bump unico; revisao independente dos registros sem bloqueios.
Nenhuma alteracao de runtime/UI: sem novo build, migration ou ensaio remoto.
Suites opt-in puladas no check nao sao prova E2E; evidencias produtivas citadas
acima sao as consultas reais ja executadas. Commit local, producao continua824.
