# TASK-180 — Start sem backfill e R2 somente para imagens

| Campo | Valor |
|---|---|
| Status | Completed |

Dependências: TASK-163, TASK-165, TASK-166 e ADR-0497.

## Pedido e escopo

Em 14/09/2026, o operador determinou: vídeos no Cloudflare Stream, imagens no R2;
backfill legado somente por comando manual no container, nunca no start da API.
O bootstrap atual inicia um backfill de até 50 vídeos em homolog por padrão.
Esta task tem prioridade explícita sobre o diagnóstico remoto pendente da TASK-179.

- Remover invocação, implementação e configuração do backfill automático.
- Manter `prisma migrate deploy`, schedulers de produto e CLI manual retomável.
- Reforçar os uploads R2 compartilhados com a allowlist de imagens já usada pelas rotas.
- Preservar autenticação, vídeos públicos, leitura legada e cancelamento de sessões antigas.
- Não apagar objetos R2 nem afirmar que todos já foram migrados sem inventário remoto.

## Deploy e compatibilidade

Somente backend funcional; sem UI, package novo, schema ou migration de banco.
Nenhuma env nova: `R2_TO_STREAM_STARTUP_MIGRATION` deixa de ter efeito e pode ser removida.
Backend pode publicar antes dos demais apps. APIs atuais já recusam upload de vídeo no R2.
Arquivos temporários de FFmpeg no serviço dedicado não são armazenamento público R2.
Rollback para a versão anterior reintroduz o backfill automático; se inevitável, desativar
explicitamente a configuração antiga antes do rollback. Não há rollback de dados nesta task.

## Aceite

- [x] Start sem qualquer execução de migração R2 → Stream, inclusive opt-in antigo.
- [x] Migrações Prisma preservadas e CLI manual disponível no build.
- [x] Novos vídeos recusados antes de escrita nos uploads R2 compartilhados.
- [x] Imagens, assinatura de arquivo, vínculo de sessão e abort legado preservados.
- [x] Testes de regressão, check global e build do backend aprovados.
- [x] Runbook manual e ADR atualizados; versão sincronizada para publicação.

## Limites da validação

Esta task não conclui o diagnóstico de upload/reprodução TUS da TASK-179.
O inventário e eventual aplicação em homolog dependem da execução manual pelo operador.
Nenhuma migração de mídia nem limpeza em ambiente publicado será disparada pelo agente.


## Evidências de execução — 14/09/2026

- Regressão de startup reproduzida: o teste falhou com a chamada antiga; após remoção,
  os três testes de separação start/Prisma/CLI passaram.
- Testes HTTP reais em loopback: parser de imagens aceita JPEG/PNG/WebP; parser e storage
  recusam vídeo mesmo com allowlist ampla ou chamada que dispensa o fileFilter.
- Fixture criptografada local de sessão antiga: partes e complete recusados; inspeção e
  cancelamento seguro sem provider configurado preservados; usuário diferente recusado.
  Não houve chamada Cloudflare nesse teste nem validação remota simulada.
- `pnpm --dir backend check`: 779 testes, zero falhas/skips, Prisma/TypeScript/Biome aprovados.
- `pnpm check`: aprovado nos quatro apps; seis skips preexistentes de FFmpeg local no video.
  A cobertura complementar de três sessões legadas foi seguida de novo check/build backend.
- `pnpm --dir backend build`: aprovado. CLI compilada executada com `--help`, sem backfill;
  os dois módulos de startup removidos não existem no dist após build limpo.
- `pnpm version:bump`: executado uma vez, 0.1.379 → 0.1.380 nos cinco manifests;
  `pnpm check:version` aprovado. Sem alteração de schema, migration ou lockfile.
- Smoke anterior à publicação: backend `/ping`, `/health`, `/ready` HTTP 200;
  frontend/admin `/version` HTTP 200; todos ainda 0.1.379.

## Entrega operacional

Commit/push de homologação e smoke da 0.1.380 são confirmados na resposta de entrega após
publicação. Esta documentação não atesta deploy antecipadamente. O serviço privado video
não recebeu mudança funcional e sua versão não é consultável desta máquina pela rede pública.
A ausência de vídeos legados em homologação só pode ser afirmada após dry-run no container;
o operador recebe o comando manual. Nenhum apply foi executado nesta task.
