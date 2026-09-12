# ADR-0497: Novos vídeos sempre pelo Cloudflare Stream

## Status

Accepted

## Task relacionada

Correção operacional 2026-09-12 sobre TASK-163, TASK-165, TASK-171 e TASK-173.

## Contexto

Depois da ativação do Cloudflare Stream, alguns vídeos recentes continuaram aparecendo em URLs
legadas do R2. A causa arquitetural era a exceção criada para tolerar falhas de provisão inicial do
Stream: quando o frontend recebia erro antes do TUS, ele voltava para os endpoints single/multipart
em R2 de vídeo de apresentação, post ou resposta.

Esses vídeos R2 entregam o arquivo original, sem transcodificação e sem HLS adaptativo. Por isso,
com a mesma internet, um vídeo em Stream pode tocar melhor enquanto um vídeo R2 com bitrate,
resolução, codec ou `moov atom` menos favoráveis pode travar.

Em 2026-09-12 foi feito inventário somente leitura nas superfícies publicadas de homologação via
APIs públicas/autenticadas disponíveis ao ambiente: página/lista de psicólogos, feed de comunidade e
respostas de posts. O inventário identificou vídeos R2 ainda associados nessas superfícies, mas a
execução local do backfill oficial não tinha as credenciais válidas do banco publicado nem as envs
Cloudflare Stream necessárias para aplicar a migração. Nenhum reset, seed, exclusão de bucket ou
escrita em dados publicados foi executado.

## Decisão

- Encerrar as exceções das ADRs 0487 e 0489: novos uploads de vídeo não têm mais fallback de escrita
  para R2.
- Frontend de apresentação, post e resposta sempre usa `uploadVideoAsset`/TUS/Cloudflare Stream para
  MIME `video/*`; falhas de provisão, upload ou processamento falham de forma segura para nova
  tentativa, sem chamar transporte legado de vídeo.
- Backend rejeita clientes antigos que tentarem usar os endpoints legados de vídeo em R2 antes de
  gravar objeto novo ou associar URL R2. Nos fluxos multipart e serviços internos, a resposta é
  `video_upload_stream_required`; nos endpoints single protegidos por parser, vídeo deixa de ser MIME
  permitido para impedir a escrita já no filtro de upload.
- Endpoints e multipart legados continuam disponíveis apenas para imagens e para abortar sessões
  antigas; leitura de URLs R2 existentes permanece compatível até migração.
- O comando oficial `video:migrate-r2-to-stream` continua sendo o caminho de backfill. O modo
  `--dry-run` pode rodar sem provider Stream para inventário seguro; `--apply` continua exigindo
  provider Stream real e confirmação explícita do ambiente.
- Como o ambiente local não tem acesso aos secrets publicados, o backend também passa a iniciar um
  lote de backfill em background no boot da API de homologação. Esse lote usa o mesmo serviço oficial,
  limite de 50 candidatos, lock transacional, provider Stream real do runtime e nunca apaga objetos ou
  capas R2. Produção permanece em skip seguro por padrão e só roda com opt-in operacional explícito.

## Consequências

- A plataforma para de criar novos vídeos R2 nos fluxos afetados, mesmo se frontend e backend forem
  atualizados em momentos diferentes.
- Se o Stream publicado estiver indisponível, novos vídeos ficam temporariamente bloqueados em vez de
  gerar arquivo original no R2. Isso é intencional porque preserva a arquitetura alvo, evita nova
  dívida de migração e reduz travamentos por arquivo original.
- Vídeos R2 existentes continuam tocando pelo caminho legado até o backfill de startup/manual
  associar uma referência Stream pronta; eles não são apagados e podem continuar apresentando
  performance inferior ao Stream enquanto pendentes.
- ADR-0487 e ADR-0489 ficam superseded apenas na parte de fallback R2. Decisões ainda válidas sobre
  mensagens públicas seguras, limpeza best effort e não exposição de provider permanecem aplicáveis.

## Produção e rollout

- Compatibilidade com dados existentes: aditiva. Nenhum schema/migration; URLs R2 legadas continuam
  legíveis e migráveis pela TASK-165.
- Envs: `R2_TO_STREAM_STARTUP_MIGRATION` é opcional e tem fallback seguro `auto`; em homologação
  publicada roda o lote de startup, em produção não roda sem opt-in explícito. O backend precisa
  manter as envs Stream já existentes configuradas; isso não é uma nova exigência deste deploy.
  Complemento 2026-09-12: em runtime publicado, a flag backend legada
  `CLOUDFLARE_STREAM_ENABLED` nao desativa mais a configuracao; se as credenciais obrigatorias
  estiverem ausentes ou invalidas, `/ready` deve retornar 503 em vez de deixar uploads de video
  falharem apenas no composer.

- Compatibilidade entre versões: frontend novo sempre chama Stream; backend novo recusa legado de
  vídeo. Frontend antigo que tentar R2 para vídeo recebe erro público seguro em vez de criar objeto.
- Ordem: publicar backend e frontend em `homolog`, validar `/health`, `/ready`, `/ping`, `/version`
  e acompanhar os logs `[R2_STREAM_STARTUP_MIGRATION_*]`. O runbook manual da TASK-165 permanece
  disponível para dry-run/reexecução em lotes pequenos dentro do ambiente com secrets reais.
- Rollback: reverter este commit reabriria o fallback R2; se rollback for inevitável, não apagar
  ativos Stream nem objetos R2. Preferir manter bloqueio temporário de novos vídeos a voltar a criar
  R2.

## Validação

- Inventário read-only em homologação:
  - página/lista de psicólogos: 16 perfis lidos, 11 vídeos de perfil ainda em R2 e 5 em Stream;
  - feed de comunidade: 10 vídeos de post lidos, 1 ainda em R2 e 9 em Stream;
  - respostas de posts do feed: 11 vídeos de resposta lidos, 2 ainda em R2 e 9 em Stream.
- Tentativa local do backfill oficial foi interrompida sem escrita porque o ambiente local não tinha
  credenciais válidas do banco publicado nem envs Stream; por isso, a aplicação do backfill foi
  movida para o boot seguro do backend em homologação.
- Validações automatizadas desta correção ficam registradas no fechamento operacional da task.

## Operação manual complementar

- Se for preciso reexecutar ou auditar fora do startup, usar no container/runtime do backend de
  homologação com secrets reais:

```bash
pnpm --dir backend video:migrate-r2-to-stream -- --dry-run --limit=5
pnpm --dir backend video:migrate-r2-to-stream -- --apply --confirm=homolog --limit=5
```

- Repetir lotes até o dry-run retornar `candidates_in_batch: 0`, sem apagar objetos/capas R2.
- Após homologação aprovada, repetir o runbook em produção somente por promoção revisada
  `homolog` → `main` e janela operacional própria.


## Complemento operacional 2026-09-12: contrato TUS de provisao

- A provisao TUS para novos videos deve seguir a grafia documentada pela Cloudflare em `Upload-Metadata`: `maxDurationSeconds` para o limite reservado, junto de `expiry`, `requiresignedurls`, `allowedorigins` e `thumbnailtimestamppct`.
- O UID canonico continua sendo o `stream-media-id` retornado pelo provider. Quando a reserva TUS ja foi aceita e a URL de upload oficial foi emitida, a ausencia desse header pode ser reconciliada por uma busca exata pelo `creator` interno enviado em `Upload-Creator`, falhando fechado em zero, mais de um resultado ou contrato invalido.
- A reconciliacao nao reabre fallback R2, nao cria provider alternativo e nao torna `/ready` dependente de uma chamada mutante ao Stream. Falhas seguem como indisponibilidade segura para o usuario.
