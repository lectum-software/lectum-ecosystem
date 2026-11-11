# Rotacao de logs por container (preparada, nao aplicada)

TASK-327 / ADR-0692. Esta preparacao versionada nao altera a VPS, o Docker daemon,
os containers existentes nem a retencao de uploads/arquivos do GlitchTip. Nao ha
autorizacao de deploy, restart, limpeza, emissao fiscal ou cobranca nesta task.

## Politica

- Driver `json-file`, `max-size: "20m"`, `max-file: "5"`, `compress: "true"`.
- Opcoes sao strings. Preservar stdout/stderr e `docker logs`, sem incluir env,
  labels, payloads ou dados pessoais como enriquecimento de log.
- Aproximadamente 100 MiB por container antes de compressao. Nao e quota global,
  garantia de dias de historico nem limite rigido para uma mensagem individual;
  replicas, containers anteriores, buffers e arquivos temporarios somam espaco.
- Rotacao descarta automaticamente os logs mais antigos do conjunto ao atingir
  o limite, depois de aplicada. Definir a janela de diagnostico necessaria e, se
  preciso, arquivamento seguro antes de autorizar o rollout. Nao trata logs como
  substituto de ledger, auditoria financeira/fiscal ou backup.
- Nao usar `mode: non-blocking` para mascarar perda de logs. Esta task nao muda
  configuracao de envio ao Sentry/GlitchTip nem conteudo sanitizado das aplicacoes.

## Artefatos e alcance

### Video (Compose)

`video/docker-compose.yml` aplica a ancora `x-container-logging` aos servicos api,
worker e redis. A configuracao so afeta containers criados em um **futuro rollout
autorizado**. Nao executar `up`, `down`, `restart` ou `--force-recreate` agora.
Volumes, redes, filas, TTLs, imagens e dados permanecem como definidos antes.

### Backend (Dokploy Application / Swarm)

`backend/docker-log-driver.json` e somente o objeto Docker API
`ServiceSpec.TaskTemplate.LogDriver`:

```json
{
  "Name": "json-file",
  "Options": {
    "max-size": "20m",
    "max-file": "5",
    "compress": "true"
  }
}
```

Dockerfile nao define o driver de logs. O arquivo nao e importado automaticamente
pelo backend, pelo Dockerfile ou pelo Dokploy. No codigo oficial do Dokploy
**v0.29.13**, o schema de Application e os formularios Swarm consultados nao
expoem um campo persistente LogDriver. Portanto, **publicar apenas a imagem nao
habilita rotacao no backend**. Antes da aplicacao remota, validar um caminho
suportado e persistente no provedor (ou preparar mudanca separada de orquestracao),
preservando integralmente o ServiceSpec atual. Nao colar este objeto em campos de
healthcheck, labels ou update policy. Nao usar `docker service update` ad hoc como
substituto permanente: o proximo deploy do Dokploy pode sobrescrever a alteracao.

### GlitchTip (Compose existente fora deste repositorio)

O stack real e externo ao repo. Nao inventar compose completo, imagens, recursos,
nomes, credenciais ou mounts a partir deste exemplo. Em futuro rollout autorizado,
integrar **somente** o seguinte fragmento no compose real, apos conferir o diff:

```yaml
x-container-logging: &container-logging
  driver: json-file
  options:
    max-size: "20m"
    max-file: "5"
    compress: "true"

# Em cada servico web e worker ja existente:
logging: *container-logging
```

O campo `logging` pertence ao proprio servico, nao a `environment`, `deploy` ou
`volumes`. Preservar versao, comando/scheduler, secrets, banco, uploads, redes e
backups. Esta preparacao nao garante aplicacao ao GlitchTip nem exige sua atualizacao.

## Validacao local

```sh
node --test scripts/container-logging.test.mjs
LECTUM_DOCKER_LOG_TESTS=true node --test scripts/container-logging.test.mjs
```

A segunda chamada renderiza o **Compose real**, com env limpo e valores locais
apenas para validacao sintatica; nao carrega `.env` do produto nem cria servicos.
Nao representa validacao de Redis/video ou de qualquer provider publicado.

Ensaio real do driver, somente no OrbStack local do macOS:

```sh
node scripts/container-log-rotation.local.mjs --execute
```

O script recusa Linux/VPS, contexto diferente de OrbStack, endpoint remoto,
imagem ausente ou politica diferente da preparada. Sem `--execute`, apenas exibe
ajuda. Usa a imagem Node ja presente, fixada por digest; nao faz pull. Cria dois
containers novos sem portas, rede, mounts ou volumes, rootfs read-only, usuario
1000, sem capabilities e processo finito; ambos ficam parados e preservados apos
o ensaio. Nao altera nem remove recursos existentes. Nao precisa de banco/envs do
produto nem chama bootstrap, providers ou daemon publicado.

Em 11/11/2026, o ensaio aprovou a politica real 20m/5/compress e a leitura final
por API. Com 4k/3/compress apenas no caso reduzido, os primeiros registros foram
rotacionados; 30 registros (sequencias 211-240) e marcador final permaneceram
legiveis, 6.533 bytes recuperados pela API. Esse total maior que o arquivo ativo
de 4 KiB comprova leitura de registros retidos rotacionados com compressao
habilitada, sem abrir os arquivos internos do daemon. Nao e prova de rollout
produtivo nem de uma janela de retencao temporal.

Prova de rotacao do driver deve usar container efemero **local**, imagem ja
validada, `--network none`, sem bind/volume, usuario nao privilegiado e processo
finito. Usar limite reduzido somente no ensaio para produzir rotacao em poucos
bytes; conferir LogConfig, compressao/rotacao e leitura final por APIs do Docker.
Nao ler, truncar ou editar diretamente arquivos ativos `*-json.log`; nao executar
ensaios na VPS. Nao confundir o limite reduzido com a politica publicada acima.

## Gate de futura publicacao (nao executado agora)

1. Obter autorizacao de rollout, conferir capacidade livre, backups existentes e
   a necessidade de preservar logs antigos. Nao iniciar builds com margem insuficiente.
2. Comparar configuracao efetiva com o artefato por servico, sem imprimir secrets.
   Nao salvar/enviar configuracao completa com envs e dados privados para logs/chat.
3. Garantir caminho persistente do provedor antes de aplicar o backend. Planejar
   substituicao controlada de containers, healthchecks, filas e rollback. Nao
   prometer zero downtime para Compose/replica unica sem prova de disponibilidade.
4. Conferir containers novos via `HostConfig.LogConfig` (Compose) ou
   `TaskTemplate.LogDriver` (Swarm), mais `docker logs`, health/ready e versoes.
   Conferir todos os nos se o servico estiver em cluster.
5. Containers ja existentes **nao recebem a configuracao retroativamente**.
   A rotacao nao libera imediatamente os 2,87 GB de um container antigo.
6. Preservar os dados e a possibilidade de rollback. Remover a politica apenas
   afeta containers futuros e pode voltar a deixar crescimento ilimitado; nao
   recupera logs que a retencao ja descartou.

Nao modificar `daemon.json`, reiniciar Docker, trocar storage driver, apagar
containers/imagens/volumes, truncar logs, chamar prune ou alterar retencao de
GlitchTip para aplicar esta preparacao. Rotacao nao resolve os uploads de 23,3 GB
nem elimina a necessidade de capacidade adequada para imagens novas e anteriores.

## Referencias oficiais consultadas em 11/11/2026

- [Docker json-file](https://docs.docker.com/engine/logging/drivers/json-file/)
- [Compose logging](https://docs.docker.com/reference/compose-file/services/#logging)
- [Docker Engine API ServiceSpec](https://docs.docker.com/reference/api/engine/)
- [Dokploy Advanced](https://docs.dokploy.com/docs/core/applications/advanced)
- [Dokploy v0.29.13 Application schema](https://github.com/Dokploy/dokploy/blob/v0.29.13/packages/server/src/db/schema/application.ts)
