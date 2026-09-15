# TASK-183 — Download de vídeos no Admin

| Campo | Valor |
|---|---|
| Status | Completed |

## Contexto

No painel administrativo de Comunidades, conteúdos com vídeo precisam permitir ao Admin baixar o arquivo original e, quando o autor for psicólogo, baixar também o vídeo com a arte Lectum no mesmo formato do download feito pelo psicólogo na aplicação principal.

Referências visuais:

- `_product/proto/admin/Comunidades/Comunidades - Detalhes.png`.
- Capturas enviadas pelo usuário em 15/09/2026 para lista e detalhe de conteúdo com vídeo.
- Builder Quick Copy ativo `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`; indisponível como ferramenta neste ambiente, então a execução usa as imagens locais e capturas da conversa.

## Escopo

- Admin: adicionar ações mobile-first na coluna de ações, abaixo do ícone de olho, em lista e detalhe de conteúdo.
- Backend Admin: expor endpoints privados para preparar download do original e reaproveitar o render job social com arte.
- Stream: habilitar geração/consulta do MP4 de download do Cloudflare Stream quando necessário, entregando URL assinada curta apenas ao Admin autenticado.
- Legado R2: preservar download direto de mídia pública legada quando o vídeo não for referência interna do Stream.
- Documentação/ADR: registrar impacto de deploy e decisão de usar o mesmo render `social_share` já usado pelo psicólogo.

## Fora de escopo

- Alterar schema, migrations, seeds ou buckets.
- Reprocessar acervo ou persistir novos artefatos no R2.
- Instalar pacotes novos.
- Promover para produção.

## Impacto de deploy

- Aplicações afetadas: `backend` e `admin`.
- Contrato aditivo: versões antigas do Admin continuam funcionando sem chamar os novos endpoints; backend novo tolera Admin antigo.
- Envs novas: nenhuma.
- Banco: sem alterações.
- Jobs/providers: o download “com arte” usa o serviço `video/` existente via job `social_share`; o original em Cloudflare Stream pode iniciar a criação do MP4 de download do próprio provider e retornar estado `inprogress` até ficar pronto.
- Rollback: reverter backend/admin remove os botões e endpoints; arquivos de download já preparados pelo provider podem permanecer no Cloudflare Stream, sem registro novo no banco Lectum e sem limpeza destrutiva.

## Ajuste pós-feedback — 2026-09-15

- Os botões de download foram reposicionados para a coluna de ações do card/preview, imediatamente abaixo do ícone de visualização pública.
- O miniplayer/preview volta a exibir apenas a mídia; a regra de disponibilidade e o formato dos downloads permanecem inalterados.
- Validações executadas para o ajuste: `pnpm --dir admin check` e `pnpm --dir admin build`.

## Critérios de aceite

- [x] Conteúdos com vídeo no Admin exibem botão para baixar o vídeo original em lista e detalhe.
- [x] Conteúdos com vídeo de psicólogo exibem botão para baixar com arte Lectum em lista e detalhe.
- [x] O download com arte usa o mesmo render `social_share`, metadata, nome de arquivo e layout do fluxo do psicólogo.
- [x] O download original usa Cloudflare Stream com token assinado/downloadable para vídeos novos e fonte pública legada para vídeos R2 antigos.
- [x] Não há package novo, migration, seed ou mock.
- [x] Validações obrigatórias de backend/admin são executadas e registradas.
- [x] ADR criado/atualizado com impacto operacional, rollback e trade-offs.
- [x] Versões dos cinco manifests são sincronizadas antes do commit.
- [x] Commit e push são feitos na branch `homolog`.
