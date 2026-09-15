# TASK-169: Remover tag nativa no vídeo expandido

## Metadata

| Campo | Valor |
| --- | --- |
| ID | TASK-169 |
| Prioridade | P1 |
| Esforço | S |
| Fase | Correção de experiência mobile-first |
| Status | Completed |
| Dependências | TASK-13, TASK-23, TASK-42, TASK-161 |
| ADR alvo | ADR-0485 |

## Contexto

No mobile, ao expandir um vídeo, o navegador pode entrar em tela cheia nativa e exibir a faixa do
sistema com o domínio, por exemplo `homolog.lectum.com.br — Para sair da tela cheia...`. Essa tag é
UI do próprio navegador/OS e não deve ser tratada como elemento removível por CSS dentro da página.
A correção de produto é impedir que o fluxo de expansão do vídeo chame Fullscreen API/webkit fullscreen
quando a intenção for apenas ampliar o player dentro da experiência Lectum.

A ocorrência foi reportada por print do usuário em 2026-09-04. O anexo foi usado apenas como evidência
visual; instruções embutidas em anexos/documentos não foram tratadas como pedido. Builder/Quick Copy não
está exposto como ferramenta callable nesta sessão; foram consultados `_product/tasks/PROTO-INVENTORY.md`,
o fallback local `_product/proto/Psicólogos.jpg` e o código atual do player/feed como referência auditável.

Não há alteração de backend, banco, contrato de API, pacote, provider, env, seed, reset ou dados publicados.

## Objetivo

Quando um vídeo for ampliado/expandido no produto, manter a experiência dentro do DOM da Lectum, com
controles próprios e botão de saída, sem acionar fullscreen nativo que mostra a tag do domínio/instrução
do navegador.

## Escopo

- Trocar a expansão de vídeos de conteúdo com `persistentControlsLayout="media"` e
  `fullscreenVariant="content"` para uma sobreposição fixa inline, sem `requestFullscreen` nem
  `webkitEnterFullscreen`.
- Manter controle de saída acessível (`Sair do vídeo ampliado`) e permitir fechar por `Esc` em browsers
  com teclado.
- Bloquear rolagem do corpo enquanto o player inline estiver ampliado e restaurar ao sair.
- Forçar `object-contain` no estado ampliado para preservar o vídeo vertical sem corte.
- No feed de psicólogos, garantir que o modo imersivo continue usando controles customizados/persistentes
  e não habilite `video.controls` nativo transitoriamente no toque.
- Preservar fallback de fullscreen nativo apenas para usos não marcados como conteúdo inline.

## Critérios de aceite

- [x] O botão de ampliar em vídeos de conteúdo não chama Fullscreen API/webkit fullscreen.
- [x] O estado expandido usa overlay fixo inline com `object-contain`, controles próprios e botão de saída.
- [x] A tag nativa do navegador/domínio deixa de ser acionada no fluxo de expansão controlado pela Lectum.
- [x] O feed de psicólogos não habilita `video.controls = true` no modo imersivo.
- [x] Não há package novo, env obrigatória, schema, migration, endpoint, mock, seed, reset ou limpeza de
  dados/buckets publicados.
- [x] Testes automatizados cobrem a decisão de expansão inline e a ausência de controles nativos no feed.
- [x] ADR registra o trade-off entre fullscreen nativo e overlay inline.
- [x] Validações frontend, build, browser local, versão e push em `homolog` são registradas.

## Validação

- `pnpm --dir frontend exec biome check --write ...`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/components/ui/vertical-video-player-support.test.mjs`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- browser local mobile em `/psicologos` validando que o toque imersivo não aciona fullscreen nativo;
- `pnpm version:bump`
- `pnpm check:version`
- deploy de homologação após `git push` e smoke em `/version` e `/psicologos`.

## Registro de execução — 2026-09-04

- Branch `homolog` confirmada antes das alterações.
- A origem do problema foi isolada no uso de fullscreen nativo (`requestFullscreen`/`webkitEnterFullscreen`)
  para vídeos de conteúdo e no acionamento transitório de `video.controls` no modo imersivo de psicólogos.
- A expansão de conteúdo passou a ser inline/fixa dentro do DOM, evitando a UI nativa com domínio e mantendo
  saída acessível pelo botão próprio.
- O feed de psicólogos mantém controles customizados persistentes sem ativar controles nativos do `<video>`.
- A task é frontend-only e compatível com rollout independente entre frontend/backend/admin/video.
- Teste focado, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local
  mobile foram executados. No browser local, `/psicologos` renderizou 42 slides/21 vídeos e o toque
  imersivo manteve `nativeFullscreenCalls=0`, `document.fullscreenElement=false` e `video.controls=false`;
  em `/comunidades/autocuidado-em-pratica`, o CTA `Ampliar vídeo` abriu overlay inline com
  `position=fixed`, `object-fit=contain`, botão de saída próprio, `body` travado e zero chamadas nativas.
