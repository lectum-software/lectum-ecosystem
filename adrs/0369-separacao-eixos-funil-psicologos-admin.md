# ADR-0369 - Separacao de eixos no funil Admin de psicologos

## Status

Accepted

## Contexto

O dashboard Admin de psicologos exibia o funil executivo em blocos combinados:

- **Visibilidade** como Comunidade x Video de apresentacao;
- **Engajamento e Favoritos** como Engajamento recebido x Favoritados recebidos;
- matriz de origem alternavel entre os dois eixos compostos.

Na revisao de produto de 2026-07-30, a leitura desejada mudou para analisar cada sinal contra
Conversao de forma independente antes de avançar para novos cruzamentos. Os calculos, pesos,
percentis e fontes existentes continuam validos; a mudanca e de apresentacao e agregacao visual.

## Decisao

- Separar os donuts do card executivo em cinco blocos:
  - Video de apresentacao;
  - Visibilidade na comunidade;
  - Engajamento recebido;
  - Favoritados recebidos;
  - Conversao.
- Derivar os novos donuts a partir das categorias reais ja calculadas em `profile_exposure` e
  `profile_engagement_favorites`, preservando **Dados Insuficientes** nos blocos isolados.
- Trocar a matriz expandida do funil para quatro leituras separadas:
  - Conversao x Visibilidade na Comunidade;
  - Conversao x Video de apresentacao;
  - Conversao x Engajamento recebido;
  - Conversao x Favoritados recebidos.
- A matriz separada e derivada no Admin a partir dos contratos reais compostos existentes, agrupando
  as 16 colunas atuais pelo eixo solicitado. Isso preserva as formulas ja implementadas e evita novo
  endpoint enquanto a necessidade e apenas analitica/visual.
- Manter o funil sintetico usando as matrizes compostas como origem predominante, porque ele ainda
  resume a sequencia **Visibilidade -> Interesse -> Conversao**; a auditoria detalhada passa a ser
  feita pelas matrizes separadas.

## Consequencias

- O Admin passa a comparar cada sinal isolado com Conversao sem misturar video com comunidade nem
  engajamento com favoritos.
- A tela ganha mais cards no topo; a grade permanece mobile-first e so usa cinco colunas em telas
  muito largas.
- Como nao ha contrato novo, nao existe migration, package novo, seed, mock ou endpoint paralelo.
- Se uma proxima task exigir API especifica para cada matriz, ela deve promover essa derivacao para o
  backend com contrato versionado.

## Validacao

- Builder/Quick Copy nao esteve disponivel como ferramenta callable; a execucao usou
  `_product/tasks/PROTO-INVENTORY.md`, `_product/proto/admin/Psicologos/Psicologos - Dashboard.png`
  e o screenshot enviado pelo usuario.
- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`.
- `pnpm --dir admin typecheck`.
- `pnpm --dir admin check`.
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`.
- `pnpm check`.
- Browser local autenticado em `/psicologos` validou os donuts separados e as quatro matrizes
  isoladas em desktop e viewport mobile de 390px. Screenshots locais:
  `.tmp/task100-separated-dashboard-desktop.png` e
  `.tmp/task100-separated-dashboard-mobile-390.png`.
- Admin temporario real de validacao local foi criado com `admin:bootstrap` e removido do banco ao
  final junto com seus tokens.

## Task relacionada

- TASK-100 - Matrizes Conversao x Engajamentos/Favoritos e Visibilidade no Admin de psicologos
  (ajuste complementar de 2026-07-30).
