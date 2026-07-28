# ADR-0335: Demanda e engajamento em duas colunas no dashboard Admin de psicologos

## Status

Accepted

## Task relacionada

TASK-84, ajuste pos-feedback em 2026-07-28.

## Contexto

O dashboard Admin de psicologos ja exibia o bloco **Demanda** e, logo abaixo, o comparativo
**Demanda x Engajamento**. Apos a iteracao do dashboard de pacientes, o produto pediu que o bloco
superior de demanda tambem se comportasse como uma leitura pareada em duas colunas, semelhante a
**Intencao e engajamento dos pacientes**.

Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente. A execucao usou
`_product/tasks/PROTO-INVENTORY.md`, a referencia local
`_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`, o padrao implementado em
`/pacientes` e a captura enviada pelo usuario.

## Decisao

- Renomear o card superior de `/psicologos` para **Demanda e engajamento dos psicologos**.
- Manter um unico filtro por plano no card, aplicado simultaneamente as duas colunas.
- Reorganizar o card em layout mobile-first: colunas empilhadas em telas estreitas e duas colunas
  a partir do desktop amplo.
- Manter a coluna **Demanda** usando o contrato real `demand` ja existente.
- Criar a coluna **Engajamento** derivando a distribuicao de `demand_engagement.totals`, sem
  alterar backend, contrato HTTP, migration ou criar endpoint paralelo.
- Exibir o engajamento como tres buckets agregados: **Alto engajamento**, **Baixo engajamento** e
  **Dados insuficientes**.
- Preservar o bloco separado **Demanda x Engajamento** como leitura observacional detalhada e
  acionavel para lista filtrada.

## Consequencias

- O Admin ganha uma leitura executiva mais comparavel ao dashboard de pacientes sem duplicar
  tracking nem inventar metricas.
- A coluna de engajamento reutiliza dados reais ja calculados pela TASK-89 e segue o mesmo recorte
  de periodo/plano do card.
- A matriz detalhada continua abaixo do card para manter a navegacao por quadrantes.
- A classificacao permanece interna, agregada e nao deve ser usada como ranking publico ou regra
  punitiva.

## Validacao

- `pnpm --dir admin exec biome check "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir admin check`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Smoke local de `/psicologos` no Admin dev server.

## Pendencias

- Nenhuma decisao externa pendente.
