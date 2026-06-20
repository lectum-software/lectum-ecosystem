# ADR-0137: Variação hero do botão seguir comunidade

## Status

Accepted

## Task relacionada

Ajuste pós-task — comunidade

## Contexto

O botão `Seguir` usado inline nos posts do feed funcionava bem como ação contextual pequena, mas o mesmo tamanho aplicado no header da página da comunidade deixava a ação principal apagada e desalinhada em relação ao avatar/logo, título e metadados da comunidade.

A referência visual ativa segue sendo Builder Quick Copy `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`; como não há ferramenta Builder callable nesta sessão, foi consultada a imagem local `_product/proto/Dentro da Comunidade.jpg`.

## Decisão

- Manter `CommunityFollowButton` como componente único para o botão de seguir comunidades.
- Adicionar uma variação de tamanho `size="hero"` ao componente, preservando `compact` como padrão para usos inline no feed/post.
- A variação `hero` usa altura de 40px, padding horizontal maior, fonte de 13px, largura mínima de 108px e spinner de 16px.
- Aplicar `size="hero"` apenas no header da página da comunidade.
- Remover o `mt-10` específico do botão no header e alinhar botão e logo com `items-center`, reduzindo a sensação de botão flutuante.

## Consequências

- O botão no header da comunidade ganha presença compatível com ação principal.
- O botão inline dos posts do feed mantém sua escala compacta e contextual.
- O componente continua centralizado e reutilizável, sem criar design system paralelo.
- Não há alteração de backend, Prisma, endpoints, packages ou persistência.

## Validação

- `pnpm --dir frontend exec biome check --write "src/components/community/community-follow-button.tsx" "src/components/community/community-follow-toggle.tsx" "src/app/app/community/[slug]/logic.tsx"`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke local: `http://localhost:3000/app/community/ansiedade-em-equilibrio` retornou HTTP 200.
- Smoke local: `http://localhost:3000/app/community` retornou HTTP 200.

## Pendências

- Push remoto depende de credenciais GitHub disponíveis no ambiente.
