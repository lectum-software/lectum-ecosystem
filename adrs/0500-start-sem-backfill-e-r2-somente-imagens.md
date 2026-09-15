# ADR-0500: Start sem backfill e R2 somente para imagens

## Status

Accepted

## Task relacionada

TASK-180 — Start sem backfill e R2 somente para imagens.

## Contexto

O bootstrap introduzido após ADR-0497 executava um lote de migração de mídia a cada start
em homologação. A ausência de configuração era interpretada como `auto`; falhas não bloqueavam
readiness, mas deploy/restart podia iniciar consultas, importação Stream e alteração de vínculos.
Em 14/09/2026 o operador determinou que backfill seja exclusivamente manual no container.

## Decisão

1. Remover a chamada, implementação, política e env do backfill de startup, em vez de apenas
   trocar o default. Nenhum valor da env antiga pode reativar essa execução.
2. Preservar `prisma migrate deploy`, a API e os schedulers normais de produto.
3. Manter a CLI compilada, dry-run por padrão, confirmação de ambiente, lock, retomada,
   associação após Stream pronto e preservação das origens/capas R2.
4. Novos vídeos de apresentação, posts e respostas usam exclusivamente o contrato Stream.
   Endpoints legados já recusam vídeo; reforçar fileFilter/storage e multipart compartilhado
   para aceitar somente JPEG/PNG/WebP, antes de qualquer escrita no R2. A assinatura de arquivo
   continua necessária: trocar o MIME não transforma vídeo em imagem.
5. Não bloquear leitura de mídia antiga nem abort de sessões legadas. Remover essas capacidades
   antes do inventário quebraria dados existentes; elas não autorizam novos vídeos R2.
6. Não mudar visibilidade, autenticação ou acesso anônimo dos vídeos públicos. Arquivos
   temporários de FFmpeg no volume dedicado não constituem publicação de vídeo no R2.

## Consequências e deploy

- Sem env obrigatória nova, dependência, alteração de schema, reset ou limpeza de mídia.
- A chave `R2_TO_STREAM_STARTUP_MIGRATION` pode ser removida do Dokploy após publicar.
- Imagens permanecem nas mesmas rotas; clientes atuais já enviam vídeos ao Stream.
- O inventário remoto depende do operador e cobre referências ativas no banco, não órfãos R2.
- Rollback para o código anterior requer desativar a env antiga antes, pois voltaria o backfill.
- Este trabalho não declara corrigida a reprodução TUS pendente na TASK-179.

## Validação

Testes de contrato de startup detectam a chamada anterior e protegem Prisma/CLI separados.
Testes HTTP locais reais exercitam parser e storage recusando vídeo antes do provider,
além de permitir os tipos de imagem no parser. Testes de assinatura, sessão, argumentos
e rotas complementam a cobertura; nenhum upload Cloudflare é simulado como aceite funcional.
Check/build e smoke de homologação registrados na TASK-180 e na entrega operacional.
