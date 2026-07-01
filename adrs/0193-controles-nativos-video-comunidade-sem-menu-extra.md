# ADR-0193: Controles nativos de video da comunidade sem menu extra

## Status

Accepted

## Task relacionada

Ajuste ad-hoc pos TASK-15/TASK-40 em `/psychologists/[id]?tab=publicacoes`, reaproveitando videos reais de posts/respostas da comunidade.

## Contexto

Os videos de publicacoes de comunidade exibidos no perfil publico do psicologo usam `CommunityMediaBlock`, que reutiliza o `VerticalVideoPlayer` com controles nativos do navegador para preservar play/pause, volume, linha do tempo e fullscreen sem criar um player paralelo.

No Chrome em viewport mobile-first (~390px), os controles nativos mostravam um botao de tres pontinhos ao lado do botao de ampliar. Esse menu expunha acoes auxiliares do navegador, como download, velocidade, picture-in-picture ou reproducao remota, que nao fazem parte da experiencia Lectum e geravam ruido visual.

## Decisao

- Manter os controles nativos nos videos de comunidade para preservar a acao nativa de ampliar/fullscreen.
- Alterar o default do `VerticalVideoPlayer` para controles nativos com `controlsList="nodownload noplaybackrate noremoteplayback"`.
- Desabilitar picture-in-picture e reproducao remota tambem para a variante nativa, salvo override explicito via `videoProps`.
- Nao criar controles customizados novos para essa correcao, evitando regressao de acessibilidade e de fullscreen nativo.

## Consequencias

- O menu de tres pontinhos deixa de ter acoes auxiliares para exibir nos videos de comunidade em Chrome mobile/desktop compativel com `controlsList`.
- A opcao de ampliar/fullscreen permanece disponivel nos controles nativos.
- O ajuste e centralizado no player compartilhado e beneficia outros usos nativos do `VerticalVideoPlayer`, como video de apresentacao no perfil, sem mudar contratos de API ou persistencia.
- Navegadores que nao respeitarem algum item de `controlsList` podem manter controles proprietarios; nesse caso, a experiencia continua funcional e sem mock.

## Validacao

- `_product/tasks/PROTO-INVENTORY.md` consultado; referencia visual local: `_product/proto/Perfil Profissional - Publicações.jpg`.
- Builder/Quick Copy nao estava acessivel como ferramenta MCP neste ambiente; foi usado o proto local e o screenshot enviado pelo usuario como referencia visual.
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP local em viewport mobile 390x844 na rota `/psychologists/cmr0lvmb90000l4uh50e6b0zl?tab=publicacoes`: 3 videos renderizados com `controls=true`, `controlsList="nodownload noplaybackrate noremoteplayback"`, `disablePictureInPicture=true` e `disableRemotePlayback=true`.

## Pendencias

- Nenhuma.
