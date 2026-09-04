# TASK-175: Conexão autenticada do backend ao serviço de vídeo

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-175 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Infraestrutura de mídia e operação |
| Status | Completed |
| Dependências | TASK-164 |
| ADR alvo | ADR-0491 |

## Contexto

A aplicação `video/` foi implantada em servidor dedicado com API, worker, Redis e volume saudáveis.
O servidor principal alcança a API pela interface WireGuard e o container real do backend já obteve
`200` em `http://192.168.250.2:3003/ready`. Esse teste comprova transporte, mas o código do backend
ainda não conhece a configuração do serviço nem valida o Bearer compartilhado.

A primeira integração deve confirmar rede, readiness, versão e autenticação sem criar jobs e sem
colocar processamento de vídeo no caminho crítico do produto. Cloudflare Stream continua sendo o
plano de dados de upload/playback; escolher um fluxo que use compressão pertence a task posterior.

Não há interface. Builder, Quick Copy e protótipos não se aplicam.

## Objetivo

Entregar um cliente server-to-server reutilizável e uma operação compilada para provar, dentro do
container do backend de homologação, que a aplicação alcança e autentica no serviço privado de
vídeo sem executar qualquer mutação.

## Escopo backend

- configuração opcional e fail-closed para URL privada, chave e timeout;
- cliente HTTP com timeout, redirects desabilitados e leitura limitada de JSON;
- validação de `/ready`, `/version` e de uma rota privada com ID deliberadamente inválido;
- comando operacional compilado com logs sanitizados e exit code confiável;
- testes de contrato por servidor HTTP local real e smoke contra o serviço real em homologação.

## Fora do escopo

- enviar arquivo, criar/cancelar job ou baixar output;
- mudar uploads, playback ou Cloudflare Stream;
- adicionar dependência do serviço ao boot ou `/ready` do backend;
- frontend, admin, UI, banco, migration, seed, reset ou limpeza de mídia;
- expor a API key, URL privada ou erros internos em API/logs de produto.

## Impacto em produção e plano de rollout

- **Dados/banco:** sem alteração; todos os registros e vídeos existentes permanecem intactos.
- **Envs backend-only:** `VIDEO_PROCESSING_SERVICE_URL`, `VIDEO_SERVICE_API_KEY` e
  `VIDEO_PROCESSING_SERVICE_REQUEST_TIMEOUT_MS`. As duas primeiras são necessárias somente para a
  operação, mas permanecem opcionais no boot; timeout tem fallback de 5 segundos.
- **Ordem:** cadastrar URL/chave no backend sem redeploy isolado, publicar o código opcional em
  homologação, aguardar o deploy automático e executar o comando compilado dentro do container.
- **Contrato:** frontend/admin/video não mudam; nenhum fluxo atual passa a depender do cliente.
- **Jobs/providers:** o probe usa somente GET e não cria, consulta ou remove job real.
- **Rollback:** remover as envs/reverter o cliente; banco, Redis, volume, R2 e Stream não mudam.
- **Smoke:** confirmar backend `/health`, `/ready`, `/ping` e executar
  `pnpm --dir backend video:check-processing-service`, esperando readiness, versão e autenticação
  válidas.

### ALERTA DE DEPLOY

No backend de homologação, cadastrar `VIDEO_PROCESSING_SERVICE_URL` como configuração privada e
`VIDEO_SERVICE_API_KEY` como secret de runtime com o mesmo valor da aplicação `video/`. Não usar
build args, `NEXT_PUBLIC_*`, IP público nem copiar valores para logs/chat. A ausência não impede o
backend de iniciar; apenas o check operacional falha como `configuration_missing`.

## Contrato técnico detalhado

- A URL deve ser uma origem HTTP(S) sem credenciais, path, query, fragmento ou wildcard.
- Em runtime publicado, somente IP literal RFC1918/ULA é aceito; loopback, IP público e DNS falham.
- O header Bearer é enviado somente ao path fixo privado e redirects são recusados.
- Respostas precisam ser JSON de até 16 KiB e seguir o envelope da aplicação `video/`.
- A autenticação é provada por `GET /api/private/jobs/connection-check`: Bearer válido chega ao
  controller e recebe `404 job_not_found`; credencial divergente recebe `401`.
- Logs contêm apenas operação, classe controlada, HTTP status e versão pública; nunca URL, chave,
  body remoto, stack ou mensagem crua.
- Packages novos não são necessários; usar `fetch`, streams e testes nativos do Node já adotado.

Referências: `ARCHITECTURE.md` › “Serviço isolado de processamento de vídeo”, `PACKAGES.md` ›
“Aplicação de processamento de vídeo” e TASK-164.

## Critérios de aceite

- [x] Configuração é opcional no boot e falha fechada quando parcial/inválida.
- [x] Runtime publicado aceita a origem WireGuard privada e rejeita IP público, DNS e loopback.
- [x] Cliente recusa redirects, aplica timeout e limita/valida respostas JSON.
- [x] Readiness, versão e Bearer são verificados sem criar ou alterar jobs.
- [x] Operação compilada retorna exit code confiável e logs sem segredo/URL/body remoto.
- [x] Nenhum fluxo atual, `/ready` do backend, upload, playback ou dado persistido foi alterado.
- [x] Envs, ordem de deploy, rollback e smoke de homologação foram registrados.
- [x] Testes e checks/build backend passam sem warnings.
- [x] Smoke autenticado passa dentro do container real do backend de homologação.
- [x] ADR-0491 está criado e indexado.
- [x] Versão dos cinco manifests foi incrementada uma vez e permanece sincronizada.
- [x] Commit e push ocorrem em `homolog`; deploy automático e smoke foram comunicados.

## Validação mínima

- testes focados em `backend/src/infra/video-processing/video-processing.test.ts`;
- `pnpm --dir backend check`;
- `pnpm --dir backend build`;
- `pnpm check`;
- `pnpm check:version` depois do bump único;
- smoke real no container do backend após cadastrar as envs.

## Notas de execução

- Branch `homolog` confirmada limpa antes da edição.
- A conectividade HTTP sem autenticação já foi comprovada a partir do container real do backend.
- Seis testes focados e os 264 testes backend passaram; `pnpm --dir backend check`, build e o gate
  completo `pnpm check` terminaram sem warnings antes do deploy.
- As envs backend-only foram cadastradas em homologação antes do push para que o novo container já
  nasça apto ao smoke autenticado; seus valores não foram copiados para código, documentação ou log.
- O commit funcional `28f7892f` foi publicado em `homolog`; após a troca do container, `/health` e
  `/ready` responderam corretamente e `/ping` confirmou a versão `0.1.275`.
- No container real do backend de homologação, a operação compilada confirmou
  `authentication: valid`, `readiness: ready`, versão `0.1.275` do serviço e transporte
  `private_network`. Nenhum job foi criado durante o probe.
- Nenhum reset, migration, seed, job ou alteração de mídia faz parte desta task.
