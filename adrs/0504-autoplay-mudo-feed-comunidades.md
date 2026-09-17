# ADR-0504 - Autoplay mudo nos videos de Comunidades

Data: 2026-09-15

## Status

Aceita - ajuste de produto solicitado pelo usuario.

## Contexto

Os videos do feed de Comunidades exigiam toque manual em cada card para iniciar a reproducao. O usuario pediu comportamento equivalente ao Instagram/TikTok: reproducao automatica no feed, comecando sem som, mantendo os controles existentes e deixando o icone de volume visivel para ativacao clara do audio.

A primeira entrega ativou o comportamento apenas nas listas/feed de Comunidades. Em seguida, o usuario apontou que a tela "Dentro do Post" mantinha o comportamento manual. A causa era separacao de escopo/componente: o feed usa `PostCard` com `enableFeedAutoplay`, enquanto a pagina de detalhe usa `PostBody`, `ThreadOriginalPostCard` e `ReplyCard`, sem esse opt-in.

Como Lectum pode exibir conteudo sensivel de psicologia e saude, a mudanca precisa preservar controle do usuario, nao disparar audio antes de intencao explicita e nao alterar backend, banco, Stream, R2, jobs ou contratos de API.

O Builder/Quick Copy ativo nao ficou acessivel neste ambiente: a tentativa `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/` falhou com `ENOENT` no cache local do `npx`. A referencia visual usada foi `_product/proto/Feed Comunidade.jpg`, que ja exibe player com play e volume sobre a midia em layout mobile-first.

Na sequencia, o usuario pediu que qualquer modal aberta sobre um video pause o video de fundo, mesmo quando ele estiver sob autoplay. O caso critico e a folha/modal de criar post no feed de Comunidades, que nao usa a primitive `Modal` baseada em `dialog`, mas sim um overlay customizado mobile-first.

## Decisao

- Ativar autoplay nos cards de video das listas/feed de Comunidades e tambem na tela "Dentro do Post".
- Na pagina de detalhe, habilitar o mesmo gerenciador para a midia do post principal, para o post original exibido em threads e para videos de respostas/filhos.
- O autoplay comeca mudo por padrao e usa preferencia local degradavel `lectum:community-feed-video-sound-enabled`.
- Quando o usuario toca no controle de volume de um video:
  - ativar audio nesse video;
  - salvar a preferencia local;
  - aplicar a preferencia aos proximos videos do feed enquanto ela permanecer ativa.
- Se o usuario silenciar novamente, os proximos videos voltam a iniciar mudos.
- Manter os controles existentes do `VerticalVideoPlayer`; quando os controles imersivos estiverem ocultos e o video estiver mudo, exibir um botao de volume/mute isolado para tornar a ativacao do audio evidente.
- Garantir que apenas um video registrado nas superficies de Comunidades toque por vez. O player mais visivel e mais proximo do centro da viewport e selecionado; videos que saem de foco pausam.
- Respeitar pausa manual: se o usuario pausar o video em foco, o gerenciador nao deve religa-lo automaticamente enquanto ele continuar em foco.
- Introduzir uma suspensao client-side de midia por modal, com ownership por documento e evento interno `lectum:modal-media-suspension-change`.
- Toda abertura da primitive `Modal` e a abertura do fluxo de criar post como slot modal passam a adquirir essa suspensao; a ultima modal fechada libera o autoplay para reavaliar o video em foco.
- Enquanto a suspensao estiver ativa, o gerenciador de autoplay de Comunidades pausa todos os videos registrados sem marcar isso como pausa manual do usuario e bloqueia novas tentativas de `play()` atrasadas.
- Sem package novo, migration, env obrigatoria nova, endpoint novo, mock, seed ou alteracao de dados publicados.

## Consequencias

- O comportamento melhora fluidez do feed sem remover play/pause, progresso, fullscreen ou volume.
- Browsers podem negar autoplay com som mesmo apos preferencia ativa; nesses casos o player tenta continuar mudo e mantem controle manual visivel, sem toast tecnico.
- A preferencia fica apenas no dispositivo/browser e nao contem PII.
- A mudanca e inteiramente frontend e compativel com backend/admin/video em versoes diferentes.
- A chave local manteve o nome legado de feed para preservar a preferencia ja salva no browser de usuarios que usaram a primeira entrega.
- A suspensao e local ao browser e aditiva: modais sobrepostas mantem a pausa ate a ultima liberar, e apps/backend/admin/video em versoes diferentes continuam compativeis.

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

Complemento executado em 2026-09-15:

- A tela de detalhe do post agora usa o mesmo opt-in de autoplay comunitario para post principal, post original em thread e replies.
- O Builder/Quick Copy foi tentado novamente via `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/`, mas o cache local do `npx` continuou falhando com `ENOENT`; a referencia visual usada para o detalhe foi `_product/proto/Dentro do Post.jpg`.
- Validacao local do complemento: teste focado de autoplay comunitario, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `pnpm version:bump` para `0.1.392`, `pnpm check:version` e smoke local do frontend buildado.

Complemento executado em 2026-09-15 para modais sobre videos:

- A primitive `Modal` emite suspensao de midia enquanto aberta, e o overlay customizado de criar post em slot modal faz o mesmo.
- O autoplay comunitario pausa todos os videos registrados ao receber a suspensao e reavalia o candidato ao fechar a ultima modal, preservando a preferencia de som e os controles existentes.
- Builder/Quick Copy foi tentado novamente e permaneceu indisponivel por `ENOENT` no cache local do `npx`; as referencias visuais usadas foram `_product/proto/Feed Comunidade.jpg` e `_product/proto/Criar Nova Postagem - Pacientes.jpg`.
- Validacao local do complemento: teste focado de autoplay/modal, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `pnpm version:bump` para `0.1.393`, `pnpm check:version` e smoke local do frontend buildado.
