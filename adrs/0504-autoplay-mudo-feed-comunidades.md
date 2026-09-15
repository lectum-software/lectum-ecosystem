# ADR-0504 - Autoplay mudo no feed de Comunidades

Data: 2026-09-15

## Status

Aceita - ajuste de produto solicitado pelo usuario.

## Contexto

Os videos do feed de Comunidades exigiam toque manual em cada card para iniciar a reproducao. O usuario pediu comportamento equivalente ao Instagram/TikTok: reproducao automatica no feed, comecando sem som, mantendo os controles existentes e deixando o icone de volume visivel para ativacao clara do audio.

Como Lectum pode exibir conteudo sensivel de psicologia e saude, a mudanca precisa preservar controle do usuario, nao disparar audio antes de intencao explicita e nao alterar backend, banco, Stream, R2, jobs ou contratos de API.

O Builder/Quick Copy ativo nao ficou acessivel neste ambiente: a tentativa `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/` falhou com `ENOENT` no cache local do `npx`. A referencia visual usada foi `_product/proto/Feed Comunidade.jpg`, que ja exibe player com play e volume sobre a midia em layout mobile-first.

## Decisao

- Ativar autoplay somente nos cards de video das listas/feed de Comunidades.
- O autoplay comeca mudo por padrao e usa preferencia local degradavel `lectum:community-feed-video-sound-enabled`.
- Quando o usuario toca no controle de volume de um video:
  - ativar audio nesse video;
  - salvar a preferencia local;
  - aplicar a preferencia aos proximos videos do feed enquanto ela permanecer ativa.
- Se o usuario silenciar novamente, os proximos videos voltam a iniciar mudos.
- Manter os controles existentes do `VerticalVideoPlayer`; quando os controles imersivos estiverem ocultos e o video estiver mudo, exibir um botao de volume/mute isolado para tornar a ativacao do audio evidente.
- Garantir que apenas um video registrado do feed toque por vez. O player mais visivel e mais proximo do centro da viewport e selecionado; videos que saem de foco pausam.
- Respeitar pausa manual: se o usuario pausar o video em foco, o gerenciador nao deve religa-lo automaticamente enquanto ele continuar em foco.
- Sem package novo, migration, env obrigatoria nova, endpoint novo, mock, seed ou alteracao de dados publicados.

## Consequencias

- O comportamento melhora fluidez do feed sem remover play/pause, progresso, fullscreen ou volume.
- Browsers podem negar autoplay com som mesmo apos preferencia ativa; nesses casos o player tenta continuar mudo e mantem controle manual visivel, sem toast tecnico.
- A preferencia fica apenas no dispositivo/browser e nao contem PII.
- A mudanca e inteiramente frontend e compativel com backend/admin/video em versoes diferentes.

## Rollback

Reverter o commit remove o registro de autoplay e volta ao comportamento manual. Nao ha dado persistido em servidor, schema, bucket ou provider para desfazer. A chave de `localStorage` pode ficar orfa no navegador sem impacto funcional.

## Validacao

Executada na branch `homolog`:

- Teste focado do seletor e contratos de autoplay do feed.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm version:bump` e `pnpm check:version` antes do commit.
- `pnpm check` no fechamento.
- Smoke local do frontend buildado: `/version` respondeu `0.1.391` e `/comunidades` respondeu HTTP 200.