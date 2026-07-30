# ADR-0365 - Tooltips de titulo no funil executivo de psicologos Admin

## Status

Aceita

## Contexto

O funil executivo de `/psicologos` usa tres donuts lado a lado para Visibilidade,
Engajamento e Favoritos e Conversao. As tooltips em itens de legenda do donut intermediario
poluiam a leitura operacional, especialmente em opcoes como **Sem Engajamento e Sem favoritos**,
quando a explicacao metodologica pertence ao titulo do bloco.

O feedback de produto tambem pediu que a explicacao dos titulos mostre o padrao da plataforma do
periodo selecionado em destaque, para o Admin entender rapidamente a regua aplicada ao funil sem
reintroduzir cards auxiliares brancos.

## Decisao

- Remover as tooltips das opcoes do donut **Engajamento e Favoritos**, reutilizando o controle
  existente `showDescriptionTooltips={false}` do componente compartilhado de donut.
- Manter/ativar uma tooltip no titulo de **Visibilidade**, **Engajamento e Favoritos** e
  **Conversao**, sempre a frente do titulo e com explicacao curta do que o bloco mede.
- Exibir o padrao da plataforma do periodo selecionado em negrito dentro dessas tooltips:
  comunidade e video para Visibilidade, score de engajamento e favoritos para Engajamento e
  Favoritos, e cliques de WhatsApp para Conversao.
- Derivar os textos dos benchmarks reais ja retornados pelo contrato do dashboard, sem criar endpoint,
  mock, dado artificial, package, schema Prisma ou migration.

## Consequencias

- A legenda do donut intermediario fica mais limpa e consistente com os donuts de Visibilidade e
  Conversao.
- A explicacao metodologica permanece acessivel no nivel correto de hierarquia: o titulo do bloco.
- Os padroes do periodo continuam visiveis sem reintroduzir os cards brancos removidos.
- Como a mudanca e somente de UI Admin, nao ha impacto em contratos publicos, ranking, backend ou banco
  de dados.

## Validacao

- `pnpm --dir admin exec biome check --write "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- HTTP local no Admin retornou `200` para `http://localhost:3002/psicologos`.
- Smoke estatico no fonte confirmou tres ocorrencias de `showDescriptionTooltips={false}` nos donuts
  executivos e negrito nos benchmarks do titulo **Engajamento e Favoritos**.

## Pendencias

Nenhuma.
