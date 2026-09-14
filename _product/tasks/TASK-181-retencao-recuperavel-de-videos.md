# TASK-181 — Retenção recuperável de vídeos

| Campo | Valor |
|---|---|
| Status | In Progress |

Dependências: TASK-163, TASK-165, TASK-180. Prioridade solicitada pelo operador em 14/09/2026.

## Regra aprovada e escopo

Preservar vídeos substituídos/excluídos, com marcação operacional para revisão e limpeza
futura. O inventário de homolog encontrou 64 vídeos R2; nenhum tinha referência direta
nos campos ativos inspecionados. Há origens migradas, histórico, exclusões lógicas e
artefatos. Não chamar todos de órfãos nem restaurar conteúdo excluído automaticamente.

- Catálogo interno persistente por objeto/provider, idempotente, com motivo, data de
  retenção, revisão opcional e bloqueio de exclusão ativo por padrão.
- Marcar aposentadoria/substituição de ativos Stream na transação que muda o estado.
- Não excluir fisicamente vídeos prontos cancelados nem versões substituídas.
- Preservar vídeos R2 legados nos helpers de perfil e de compartilhamento; não executar
  scheduler de limpeza desses artefatos no start.
- CLI manual para catalogar vídeos R2 em lotes: dry-run padrão, apply com confirmação do
  ambiente, sem escrever no bucket, migrar bytes ou modificar associações do produto.
- CLI de consulta paginada do catálogo, preparada para revisão manual/futuro job. Revisão
  vencida não equivale a permissão de apagar; nenhum comando de purge/release é criado.

## Fora do escopo

Transferir os 64 originais para outro armazenamento, abortar multipart, restaurar
conteúdo, executar limpeza, UI Admin, prazo jurídico definitivo e job destrutivo.
O catálogo não torna o bucket privado nem certifica equivalência de uma cópia Stream.
R2 permanece somente para novas imagens; esses vídeos são acervo legado em transição.

## Deploy e segurança

Backend apenas. Nova tabela aditiva, sem alteração de colunas existentes; nenhum reset,
seed, backfill de mídia no boot ou env obrigatória nova. Prisma deploy precede o novo
backend; só depois o operador executa o catálogo manual. Frontend/Admin/video antigos
continuam compatíveis. Rollback conserva tabela/registros, mas versão antiga pode voltar
a apagar versões substituídas: pausar essas operações se rollback for inevitável.
Validação de banco em PostgreSQL real descartável e local, sem usar DATABASE_URL do .env.

## Aceite

- [x] Modelo aditivo com bloqueio de exclusão e revisão nullable, sem prazo inventado.
- [x] Substituição/cancelamento de vídeo pronto conserva provider e marca retenção atomicamente.
- [x] Helpers legados não apagam vídeo R2; limpeza de artefatos não inicia automaticamente.
- [x] Catálogo R2 manual, limitado, retomável/idempotente e com logs sanitizados.
- [x] Consulta do catálogo não retorna chaves, URLs, UID, PII ou credenciais.
- [x] Migration dev isolada, Prisma/TypeScript/Biome, build e testes reais de persistência.
- [x] ADR/DATA-MODEL/runbook e versão 0.1.383 preparados.
- [ ] Deploy e smoke de homologação, seguidos da validação remota do catálogo pelo operador.

## Evidências locais — 14/09/2026

- `pnpm --dir backend db:migrate --name add_video_retention_records`: aplicado em PostgreSQL
  local descartável, com URL explicitamente isolada; sem conectar ao banco do `.env`.
- `pnpm --dir backend check`: Prisma/TypeScript/Biome e 791 testes aprovados.
- `pnpm --dir backend build`, `pnpm check` e `pnpm check:version`: aprovados.
- Docker backend 0.1.383: build aprovado, imagem
  `sha256:412b852bb2432c11b60c556da5a6f2c48d5e1177a8aa95d1273992c84a9f4a02`.
- `scripts/video-retention-integration.mjs`: 12 verificações com módulos compilados e
  PostgreSQL real. Inclui idempotência concorrente, rollback, troca do perfil, cancelamento
  pronto, reserva incompleta, paginação e saída sanitizada da CLI real.
- `scripts/video-asset-association-integration.mjs`: 28 regressões de associação aprovadas
  com a mesma imagem e banco descartável. Sem chamadas Cloudflare nem mocks de provider.
- Nenhuma UI alterada. As verificações locais não substituem a consulta ao R2 real nem
  comprovam a existência/recuperabilidade de um objeto remoto específico.

## Runbook no container do backend

Depois do deploy com a migration aplicada, iniciar **somente com leitura**:

```sh
cd /app
node --enable-source-maps dist/operations/video-assets/video-retention.js \
  --catalog-r2 --dry-run --limit=5
```

Revisar o resultado antes de gravar. Havendo `failed`, `conflicts` ou `unknown`, investigar;
nunca tratar essas contagens como autorização de exclusão. Para registrar o lote aprovado:

```sh
node --enable-source-maps dist/operations/video-assets/video-retention.js \
  --catalog-r2 --apply --confirm=homolog --limit=5
```

O comando só cria linhas no banco. Repetir lotes (no máximo 50 por chamada) pula objetos
já registrados com o mesmo tamanho/ETag; não altera prazo ou bloqueio. Ao terminar,
reexecutar dry-run e conferir `inventoryComplete`, `existing` e ausência de pendências.
Cada execução tem teto conservador de 10 mil objetos listados; atingindo-o, não presumir
inventário completo. A revisão opcional `--review-after=AAAA-MM-DD` usa UTC e nunca libera
exclusão; sem política aprovada, omitir essa flag.

Consulta posterior, somente leitura:

```sh
node --enable-source-maps dist/operations/video-assets/video-retention.js --list --limit=50
```

Se houver `nextCursor`, continuar com `--after=CURSOR`. Não há comando de purge, liberação
do bloqueio, restauração ou job de exclusão nesta entrega.

## Operação publicada

A marcação do acervo existente depende do dry-run e apply executados pelo operador no
container. Não confundir código entregue com 64 objetos já catalogados/movidos.
Os ganchos automáticos desta task cobrem aposentadoria explícita de `video_asset`, troca
do vídeo de apresentação e cancelamento pronto. Exclusão lógica do conteúdo pai continua
preservando bytes; não afirmar que todos os eventos Admin/comunidades ganharam marcação.
