# TASK-165: Migração segura de vídeos legados do R2 para Cloudflare Stream

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-165 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Infraestrutura de mídia e operação publicada |
| Status | Completed |
| Dependências | TASK-157, TASK-163, TASK-164 |
| ADR alvo | ADR-0480 |

## Contexto

A TASK-163 direcionou vídeos novos de apresentação, posts e respostas para Cloudflare Stream, mas
preservou os vídeos anteriores no R2. Esses registros ainda usam URLs `/public/files/*`, entregam o
arquivo original em vez de HLS adaptativo e dependem do backend no caminho de leitura. O usuário
precisa executar a migração manualmente no terminal do container de homologação, sem conhecer SQL,
sem copiar IDs à mão e sem arriscar apagar mídia funcional.

Homologação e produção são ambientes publicados. A cópia pode demorar, falhar no provider ou
concorrer com uma edição feita pelo dono. Por isso, esta task não é um script de substituição em
massa: ela implementa um backfill pequeno, inspecionável, retomável e idempotente. A referência do
conteúdo só muda depois de o Stream confirmar `ready`; o objeto e a capa no R2 permanecem intactos
para auditoria e rollback futuro.

Não há tela nova nem alteração visual. Builder/Quick Copy e os protótipos não se aplicam a esta
operação backend-only.

## Objetivo

Disponibilizar no artefato compilado do backend um comando operacional que:

1. inventarie vídeos R2 ainda associados a perfil, post ou resposta ativos;
2. valide objeto, tipo, tamanho e capacidade pública de `HEAD` + `GET Range`;
3. copie cada origem para Cloudflare Stream como vídeo privado;
4. espere processamento terminal sem trocar uma mídia ainda funcional;
5. associe a referência Lectum somente com compare-and-swap sobre o estado original;
6. possa ser executado novamente após timeout/restart sem criar cópias deliberadamente duplicadas;
7. nunca exclua vídeo ou miniatura do R2.

## Escopo técnico

### Inventário permitido

O comando consulta somente registros ativos que ainda apontem para os prefixos legados conhecidos:

- `psychologist_profile.video_url` em `psychologist/video/`;
- `community_post.media_url`, com `media_type="video"`, em `posts/media/`;
- `post_reply.media_url`, com `media_type="video"`, em `posts/media/`.

A descoberta respeita dono, perfil/post/comunidade ativos e finalidade. URLs com query, fragmento,
path traversal, barra invertida ou prefixo não permitido são recusadas. O script reconstrói a URL
pública usando o `BASE` do ambiente atual e nunca importa uma URL arbitrária persistida no banco.

### Validação da origem

Antes de qualquer escrita, o backend:

- consulta metadados diretamente no bucket R2 configurado;
- aceita somente `video/mp4`, `video/quicktime` ou `video/webm`, com fallback fechado por extensão;
- aplica o limite de bytes já definido para a finalidade de upload;
- exige URL HTTPS pública do próprio backend;
- exige `HEAD 200` com tamanho exato, `Accept-Ranges: bytes` e `Content-Range` completo;
- exige `GET Range: bytes=0-0` com `206` e tamanho total correspondente.

`/public/files/*` continua compatível com consumidores existentes e passa a fornecer o
`Content-Range` necessário no `HEAD` de vídeos. A rota não recebe token Cloudflare e não expõe nova
categoria de arquivo.

### Cópia e privacidade no Cloudflare Stream

O adapter usa a API oficial `POST /accounts/{account_id}/stream/copy`, com o campo preferencial
`input`. Cada vídeo recebe:

- `requireSignedURLs=true`;
- `allowedOrigins` já configurado para o ambiente;
- `creator` igual ao ID técnico determinístico da migração;
- metadado mínimo de correlação, sem usuário, nome do arquivo, URL ou PII em logs;
- miniatura padrão em 10% da duração.

O script nunca devolve nem registra API token, UID do provider, URL de origem ou dados do dono. A
reprodução continua passando pela autorização Lectum e por URL HLS assinada curta; o backend não
vira proxy de segmentos.

### Idempotência e retomada

Para cada associação é derivado SHA-256 determinístico de finalidade, alvo e chave R2. O hash
origina um `migration_key` único e um `creator` Cloudflare estável. Em nova execução:

- uma reserva local equivalente é reaproveitada;
- antes de criar uma cópia, o provider é consultado pelo `creator`;
- zero resultados permite iniciar a cópia; um resultado válido é reconciliado; resposta ambígua ou
  múltiplos resultados falha fechada;
- ativo ainda em processamento é consultado novamente, não duplicado;
- um lock advisory transacional em conexão dedicada impede dois comandos `--apply` simultâneos no
  mesmo banco, inclusive atrás de pool transacional;
- o lote é sequencial para limitar carga no banco, no R2 e no Stream.

Falha ou timeout preserva a reserva e a origem. Rodar o mesmo comando novamente continua do estado
persistido. Nenhum mecanismo marca a origem como removível.

### Associação atômica

A troca de `video_url`/`media_url` acontece em transação e somente quando:

- o `video_asset` está `ready` e ainda corresponde à reserva;
- dono, finalidade e contexto permanecem válidos;
- URL e miniatura atuais continuam exatamente iguais às observadas no inventário;
- perfil/post/resposta e seu contexto continuam ativos.

Se o usuário editar/remover a mídia durante o processamento, o compare-and-swap não sobrescreve a
mudança. Para posts, a linha compatível em `community_post_media` é atualizada junto da referência
principal. A origem e miniatura antigas ficam registradas no ativo de migração.

### Persistência aditiva

A migration adiciona campos opcionais a `video_assets`:

| Campo | Uso |
| --- | --- |
| `source_provider` | identifica origem `cloudflare_r2` sem alterar ativos Stream normais |
| `source_reference` | preserva a referência R2 que estava associada |
| `source_thumbnail_reference` | preserva a capa legada quando existente |
| `migration_key @unique` | deduplicação e retomada determinística |
| `migrated_at` | momento em que a referência foi trocada com sucesso |

Todas as colunas são nullable; registros existentes permanecem válidos e não recebem backfill. O
rate limit de upload do usuário ignora ativos criados pela operação, para a manutenção não bloquear
novos uploads legítimos.

## Contrato do comando

Executar dentro de `/app` no container do backend:

```bash
# 1. Inspeção sem escrita no banco e sem criar vídeos no Stream (padrão)
pnpm video:migrate-r2-to-stream -- --dry-run --limit=5

# 2. Aplicação em homologação, depois de revisar o resumo
pnpm video:migrate-r2-to-stream -- --apply --confirm=homolog --limit=5
```

Filtros opcionais:

```bash
--purpose=all
--purpose=profile_presentation
--purpose=community_post
--purpose=community_reply
--poll-seconds=10
--wait-seconds=1800
```

Regras de CLI:

- sem flag, o modo é `dry-run` e o lote é `5`;
- lote mínimo `1`, máximo `50`;
- `--apply` e `--dry-run` são mutuamente exclusivos;
- qualquer modo exige `BASE` HTTPS reconhecido do ambiente Lectum publicado;
- `--apply` exige `--confirm=homolog` ou `--confirm=production` igual ao ambiente detectado;
- a detecção usa `BASE`/`WEB_URL` e, quando explícito, `SENTRY_ENVIRONMENT`; `NODE_ENV=production`
  sozinho nunca libera a escrita porque a mesma imagem atende homologação;
- flags desconhecidas, sem valor ou destrutivas são recusadas;
- saída por item e resumo usam apenas referência hash curta, finalidade, bytes, resultado e motivo
  controlado;
- exit code `0` indica lote concluído, `1` indica falha e `2` indica item processando/pulado que
  requer inspeção ou nova execução.

Resultados esperados: `eligible`, `migrated`, `already_attached`, `processing`, `skipped` ou
`failed`. Repetir lotes até `candidates_in_batch: 0`. `more_candidates_may_exist: true` significa
somente que o limite foi preenchido e outro lote deve ser executado.

## Segurança operacional

- O padrão não escreve.
- Não existe flag para apagar origem, capa, bucket ou registros.
- Não executar reset, seed, `db push`, truncate ou limpeza do R2/Stream.
- Não executar dois terminais de migração ao mesmo tempo.
- Não alterar `BASE` para contornar a confirmação do ambiente.
- Não usar o comando antes de o deploy aplicar a migration e `/ready` confirmar Stream/R2/banco.
- Interromper com `Ctrl+C` é seguro; a próxima execução reconcilia banco e `creator` no provider.
- Itens falhos ficam funcionais no R2 e devem ser investigados pelo motivo controlado, sem editar o
  banco manualmente.

## Impacto de deploy

- **Banco:** expansão nullable e índice único. Sem backfill automático, lock de tabela prolongado,
  reset ou alteração dos campos de conteúdo durante o deploy.
- **Backend:** passa a responder `Content-Range` em `HEAD` de vídeo e inclui um comando compilado que
  permanece inerte até chamada manual.
- **Frontend/Admin/video:** nenhum contrato ou runtime funcional muda; apenas versão sincronizada no
  commit.
- **Configuração:** nenhuma env nova. O comando reutiliza `DATABASE_URL`, R2, `BASE`/`WEB_URL` e as
  credenciais Stream já exigidas pela TASK-163.
- **Provider:** o deploy sozinho não copia mídia nem consome minutos novos. Somente `--apply` cria
  vídeos.
- **Rollback:** reverter código mantém colunas/linhas compatíveis. Não reverter migration aplicada,
  não apagar ativos Stream e não apagar objetos R2. As referências já migradas continuam exigindo o
  backend/configuração Stream ativos.

## Runbook de homologação

1. Confirmar deploy do backend e versões em `/ping`.
2. Confirmar `/health` e `/ready` com HTTP 200.
3. No terminal do container, executar `cd /app`.
4. Rodar o `dry-run` com lote `5` e revisar todos os itens.
5. Rodar `--apply --confirm=homolog --limit=1` no primeiro vídeo.
6. Abrir a superfície pública correspondente sem login e validar imagem, play, seek e HLS.
7. Confirmar que ativo sem associação pública ou removido não recebe playback.
8. Confirmar no R2 que a origem continua presente, sem executar limpeza.
9. Avançar em lotes de `5`; repetir comandos após `processing` e parar diante de `failed`.
10. Encerrar quando o dry-run retornar zero candidatos e registrar contagens por finalidade.

Produção só repete o runbook em task/janela operacional própria depois de homologação aprovada. A
confirmação muda para `--confirm=production`; isso não autoriza push direto em `main`.

## Critérios de aceite

- [x] Migration aditiva cria cinco campos nullable e índice único sem editar migration aplicada.
- [x] `pnpm --dir backend db:migrate` foi executado e a migration foi validada em PostgreSQL local
  descartável, sem acessar/resetar banco publicado.
- [x] Inventário cobre perfil, post e resposta ativos sem aceitar chave/URL arbitrária.
- [x] Dry-run é o padrão e valida R2 + HTTP Range sem escrever no banco ou chamar `/copy`.
- [x] Apply exige confirmação exata do ambiente e lock global no banco.
- [x] Importação cria vídeo Stream privado e reconcilia por `creator` determinístico.
- [x] Referência só muda quando o Stream está pronto e o conteúdo ainda mantém origem/capa original.
- [x] Reexecução após falha, timeout ou interrupção não cria uma nova cópia deliberadamente.
- [x] Nenhum caminho da operação apaga vídeo ou miniatura R2.
- [x] Ativos de manutenção não consomem a cota de uploads do usuário.
- [x] Logs e erros não expõem PII, segredo, UID, URL, nome de arquivo, SQL ou mensagem crua do provider.
- [x] Script faz parte do build/runtime Docker e possui ajuda e filtros documentados.
- [x] Nenhum package ou env foi adicionado; documentação e ADR-0480 refletem a operação.
- [x] Backend check/build, testes focados, check de raiz e validação de versão passam sem warnings.
- [x] Versão dos cinco manifests é incrementada uma vez no commit.
- [x] Commit e push ocorrem em `homolog`; deploy e smoke de `/health`, `/ready` e `/ping` são
  registrados, ou bloqueio externo é reportado sem alegar publicação.

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir backend audit --prod`
- `pnpm check`
- após o build: `pnpm --dir backend video:migrate-r2-to-stream -- --help`
- homologação: dry-run real e primeiro apply de um item executados manualmente pelo usuário no
  container, pois a task não usa credenciais publicadas nem simula mídia real.

## Registro de execução — 2026-09-04

- A branch `homolog` foi confirmada antes das alterações. Não houve reset, seed, `db push`,
  exclusão de objeto nem acesso a credenciais de produção.
- `pnpm --dir backend db:migrate` foi invocado conforme o gate. A `DATABASE_URL` de desenvolvimento
  configurada estava sem conexão; no PostgreSQL local descartável, o Prisma Dev materializou o
  schema e recusou `migrate dev` com P3005 sem que fosse feito reset de ambiente publicado. O SQL
  exato da migration foi então aplicado em schema isolado descartável e confirmou as cinco colunas
  nullable e o índice único; `prisma migrate diff --from-empty` também aprovou o schema.
- Testes focados aprovaram 22 casos de adapter Stream, identidade/política e CLI. O check completo do
  backend aprovou 245 testes, além de Biome, dependências runtime e TypeScript.
- `pnpm --dir backend build` gerou a operação em `dist`; `--help` executou pelo script de produção e
  uma tentativa `--apply` em ambiente não reconhecido foi bloqueada antes de banco/provider.
- `pnpm --dir backend audit --prod` não encontrou vulnerabilidade conhecida e `pnpm check` aprovou
  os cinco projetos, documentação, envs, segurança de fontes e ciclos.
- Não foi executado dry-run/apply contra mídia publicada antes do deploy. Essa validação real fica
  deliberadamente no runbook manual de homologação, sem mocks ou alegação de migração concluída.
- Não houve alteração de UI; Builder/protótipos e validação visual não se aplicam.

## Correção pós-deploy — TASK-166

O primeiro dry-run real encontrou um item elegível e recusou quatro por ausência/inconsistência do
contrato `HEAD` depois da passagem pelo Cloudflare Proxy. Nenhum apply foi executado. A TASK-166
substituiu a origem de importação por rota extensionless e no-store, acrescentou diagnóstico
sanitizado e fixou o pnpm do container. O runbook deve continuar somente após o novo deploy e a
repetição do dry-run.
