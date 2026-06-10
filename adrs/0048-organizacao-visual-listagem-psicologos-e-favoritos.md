# ADR-0048: Padronizar o layout de Psicólogos/Favoritos ao padrão de telas organizadas

## Status

Accepted

## Task relacionada

Requisição de refinamento da interface das telas de `/app/psychologists` e `/app/favorites`.

## Contexto

As telas de listagem de psicólogos e favoritos estavam com distribuição de largura e seções diferente das
telas de conta (Notificações/Perfil/Editar Perfil/Assinatura), o que gerava percepção de layout desorganizado em
algumas resoluções e quebra de ritmo visual.

## Decisão

- Padronizar as duas telas em uma estrutura de página com:
  - cabeçalho fixo no topo, com largura total (`w-screen`) e centralização interna em `max-w-[430px]`;
  - container interno único, também com `max-w-[430px]`, sem layout em múltiplas colunas;
  - cartões e estados (`loading`, `error`, `empty`) no mesmo padrão de espaçamento das telas organizadas.
- Manter os componentes existentes (card de psicólogo e estados reutilizados), evitando refatoração estrutural.
- Manter `autoHideNavigation` para Psicólogos (já exigido pela task de descoberta) e manter a tela de Favoritos no fluxo padrão.

## Consequências

- Melhor consistência visual e previsibilidade de espaçamento entre páginas já estabilizadas.
- Redução de complexidade visual em desktop para evitar cartões desalinhados em grades largas.
- Impacto mínimo de manutenção por reaproveitar componentes atuais.

## Validação

- `pnpm check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendências

- Nenhuma pendência de arquitetura adicional para esta decisão.
