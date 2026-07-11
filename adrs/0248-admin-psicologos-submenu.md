# ADR-0248: Submenu de Psicólogos no Admin

## Status

Aceita

## Task relacionada

Ajuste visual avulso do painel Admin, após TASK-46, TASK-53 e TASK-54.

## Contexto

O shell lateral do app `admin/` agrupava a área de Psicólogos em um único item de
menu apontando para `/psicologos`. Depois da criação do dashboard administrativo
de psicólogos e da lista administrativa de psicólogos, a navegação precisava
deixar explícitas as duas entradas principais dessa área sem criar uma nova
seção de sidebar nem duplicar o item raiz.

Referências visuais locais consultadas: `_product/proto/admin/Dashboard.png`,
`_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png` e
`_product/proto/admin/Psicólogos/Psicólogos- Lista.png`. Builder/Quick Copy não
esteve disponível como ferramenta neste ambiente; a implementação usou as
imagens locais e a solicitação visual do produto.

## Decisão

Transformar o item lateral **Psicólogos** em um grupo expansível no shell
compartilhado do Admin. O clique no item raiz abre o submenu com:

- **Dashboard** → `/psicologos`;
- **Lista de Psicólogos** → `/psicologos/lista`.

Rotas sob `/psicologos` continuam destacando o grupo raiz como ativo. O submenu
também abre por padrão quando a rota atual já pertence à área de Psicólogos,
preservando contexto em telas de detalhe.

## Consequências

- A navegação entre dashboard e lista de psicólogos fica explícita e centralizada
  no shell lateral.
- Não houve mudança de API, banco, permissões ou contratos de rota.
- A solução mantém o comportamento mobile-first do drawer lateral, pois o mesmo
  componente renderiza o submenu no menu móvel.
- Em sidebar desktop recolhida, o clique no ícone de Psicólogos expande a
  sidebar antes de exibir o submenu, preservando a navegação compacta sem
  esconder as opções filhas.
- O clique no item raiz também recolhe o submenu quando ele já está aberto,
  inclusive em rotas ativas de `/psicologos`, para permitir alternar
  explicitamente entre os estados expandido e recolhido.
- O submenu permanece renderizado no fluxo normal logo abaixo de **Psicólogos**,
  sem posicionamento absoluto, deslocando apenas as opções posteriores do menu
  para baixo quando expandido.
- O topo do shell e a área do usuário ficam com `shrink-0`, e a navegação central
  passa a ser o único container rolável (`min-h-0 overflow-y-auto`). Assim, se o
  submenu precisar ocupar mais altura, ele não reposiciona **Dashboard**,
  **Tráfego** ou **Comunidades**; somente os itens abaixo de **Psicólogos** são
  deslocados.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local em `http://localhost:3002/psicologos` retornou `200`.

## Pendências

- Nenhuma.
