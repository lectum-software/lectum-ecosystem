# ADR-0276: Miniplayer 9:16 compacto na edição do perfil profissional

## Status

Accepted

## Task relacionada

Solicitação direta do usuário em 2026-07-17, sem task numerada nova no roadmap.

## Contexto

No front-end principal da Lectum (não Admin), a tela privada de edição do perfil do psicólogo (`/app/professional/profile/setup`) exibia a pré-visualização do vídeo de apresentação com largura desktop de até 390px. Em vídeos verticais 9:16, isso deixava o miniplayer muito alto e competia com o conteúdo do formulário e com a barra fixa de salvar alterações.

A referência visual consultada foi `_product/proto/Editar Perfil - Psicólogo.jpg`. O Quick Copy ativo não está exposto como ferramenta MCP nesta sessão do Codex; por isso a checagem visual usou o protótipo local e a captura enviada pelo usuário.

## Decisão

- Reduzir somente o miniplayer da edição do perfil profissional, sem alterar o componente global `VerticalVideoPlayer` nem outras telas que o usam.
- Manter a proporção nativa 9:16 do `VerticalVideoPlayer` (`aspect-[9/16]`).
- Preservar o sizing mobile original (`w-full`) para não reduzir a visualização em telas pequenas.
- Preservar também o limite original de tablet (`md:max-w-[390px]`) e reduzir apenas no desktop (`lg:max-w-[300px]`).
- Manter a centralização a partir de `md` com `md:mx-auto`, preservando a hierarquia dentro do card de apresentação no desktop.
- Não criar package, endpoint, mock, dado fake ou alteração de schema.

## Consequências

- O vídeo permanece vertical 9:16, mas ocupa menos altura na edição do perfil.
- O ajuste é isolado na rota de autogestão do psicólogo e não reduz o player do perfil público ou das métricas.
- Em telas mobile, a visualização continua ocupando a largura disponível como antes; em tablet, mantém o limite anterior de 390px.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação visual em browser local logado ficou limitada porque a sessão Codex não possui acesso ao browser autenticado do usuário; a tela é privada e não deve ser validada com sessão mockada.

## Pendências

- Validar visualmente no browser já autenticado do usuário, se desejar conferir a percepção final com o vídeo real.
