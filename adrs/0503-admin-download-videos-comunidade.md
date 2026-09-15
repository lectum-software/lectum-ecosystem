# ADR-0503 — Downloads de vídeos no Admin de Comunidades

Data: 2026-09-15

## Status

Aceita — TASK-183.

## Contexto

O Admin precisa baixar vídeos exibidos em posts/respostas de Comunidades. Existem dois formatos:

1. **Original**: arquivo MP4 original/baixável do provider para vídeos novos no Cloudflare Stream ou fonte pública legada R2 para vídeos antigos.
2. **Com arte Lectum**: mesmo vídeo 9:16 com cartão/branding já entregue ao psicólogo no fluxo privado de compartilhamento.

Ambientes de homologação e produção têm dados reais desde 2026-08-07, então a solução não pode resetar banco, apagar buckets, criar seeds ou introduzir persistência destrutiva. O contrato precisa ser aditivo porque backend e Admin podem ficar em versões diferentes durante rollout.

A documentação oficial do Cloudflare Stream indica que downloads MP4 são habilitados por vídeo via `/downloads`, o status deve ser consultado até `ready`, e URLs privadas assinadas precisam carregar permissão `downloadable`; a API de token também suporta `flags.original` para retornar o vídeo original sem transformações.

## Decisão

- Adicionar endpoints privados do Admin em Comunidades para:
  - preparar download original do vídeo;
  - iniciar/status/download de render job com arte.
- Para **original Stream**, o backend Admin:
  - resolve a referência Lectum `/api/private/video-assets/:id/playback`;
  - valida que o `video_asset` existe e está `ready`;
  - consulta/cria o MP4 de download no Cloudflare Stream;
  - quando `ready`, emite URL curta assinada com `downloadable=true` e `flags.original=true` somente na resposta do endpoint Admin.
- Para **original legado R2**, o backend usa a mesma resolução segura de fonte `posts/media/` já usada pelo render social e devolve a URL pública validada.
- Para **com arte**, o Admin reutiliza o mesmo job `social_share` do app `video/`, com os mesmos metadados, rótulos (`Postado na Lectum`/`Respondido na Lectum`), nome profissional, selo verificado e `fileName` do fluxo do psicólogo. O arquivo final é baixado via proxy do backend, sem expor o serviço interno ao browser.
- A UI Admin adiciona botões abaixo do miniplayer/preview: **Baixar original** para todo vídeo e **Baixar com arte** apenas quando o autor é psicólogo.
- Não criar tabela, coluna, migration, package novo, seed, objeto R2 novo ou cache persistente para os downloads novos.

## Consequências

- O primeiro download original de um vídeo Stream pode retornar `inprogress`; o Admin faz polling seguro até ficar pronto ou orientar nova tentativa.
- O provider pode manter o MP4 de download preparado no Cloudflare Stream mesmo após rollback. Isso não cria registro Lectum nem autoriza limpeza automática.
- O download original é uma exceção administrativa ao princípio de playback sem download; tokens de player continuam sem `downloadable`.
- O download com arte mantém a paridade visual/formato exigida porque passa pelo mesmo processador `social_share`; não há geração no browser.
- Sem env nova e sem alteração de banco.

## Rollback

Reverter backend e Admin remove os botões e endpoints. Não executar limpeza de `video_asset`, Cloudflare Stream, R2 ou registros legados. Jobs efêmeros do serviço `video/` expiram pelo ciclo normal do serviço.

## Validação

Executada em 2026-09-15 na branch `homolog`:

- `pnpm --dir backend check` — aprovado.
- `pnpm --dir backend build` — aprovado.
- `pnpm --dir admin check` — aprovado.
- `pnpm --dir admin build` — aprovado.
- `pnpm check` — aprovado no fechamento da TASK-183.
- `pnpm version:bump` e `pnpm check:version` — executados antes do commit, sincronizando os cinco manifests.

Observações:

- `pnpm --dir backend db:migrate` não se aplica: não houve alteração em `backend/prisma/schema.prisma` nem em migrations.
- Validação visual manual em browser local não foi automatizada neste ambiente por ausência de sessão autenticada/ferramenta de browser; a tela foi implementada a partir do protótipo local e das capturas do usuário e validada por build do Admin.
