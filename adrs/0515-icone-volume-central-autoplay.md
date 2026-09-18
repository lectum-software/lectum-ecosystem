# ADR 0515 - Ícone central para ativar áudio em vídeos autoplay

Data: 2026-09-17

## Status

Aceita.

## Contexto

Em vídeos de Comunidades com autoplay mudo, quando o usuário ainda não habilitou o áudio, o controle flutuante de volume aparecia no canto inferior direito. Em telas reais, esse posicionamento competia com rodapé/ações do card e ficava menos claro como primeira ação de ativação do som.

A referência visual ativa continua sendo Builder Quick Copy + `_product/proto/Feed Comunidade.jpg`. Nesta execução, o Builder/Quick Copy foi tentado via `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/`, mas falhou por cache local npm `ENOENT`; a alteração foi validada no componente existente e no print real enviado pelo usuário.

## Decisão

Reposicionar o `VerticalVideoPlayerMutedOverlayControl` para o centro absoluto do vídeo, somente no estado em que os controles persistentes estão ocultos e o vídeo está mudo (`mutedControlVisibility="when-hidden"` + `isMuted`).

O botão recebeu `data-lectum-muted-overlay-control="center"` para teste focado e mantém:

- rótulo acessível para ativar som;
- botão real, não mock;
- `onSoundEnabledChange` e preferência local de áudio já existentes;
- controles persistentes de play/pause, progresso, fullscreen e volume sem alteração.

O botão de volume da prévia de download social permanece no canto inferior direito porque é um fluxo separado e já calibrado pela arte social.

## Impacto de deploy

- Aplicação afetada: `frontend`.
- Banco/migration: nenhum.
- Env nova: nenhuma.
- Package novo: nenhum.
- Contrato API: nenhum.
- Compatibilidade de rollout: segura; backend, admin e video podem ficar em versões diferentes.
- Rollback: reverter o commit volta o controle ao canto inferior direito.
