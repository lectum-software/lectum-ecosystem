# ADR-0326: Gráficos radiais do Admin como donut

## Status

Accepted

## Contexto

O painel administrativo tinha gráficos radiais implementados como pizza em algumas telas, enquanto a referência visual ativa do dashboard de pacientes usa donut com total central.

Builder/Quick Copy não estava disponível neste ambiente, então a validação visual usou a captura fornecida pelo usuário e os protótipos exportados em `_product/proto/admin`.

## Decisão

Padronizar os gráficos radiais do Admin como donut:

- manter os dados reais e legendas existentes;
- abrir o centro do SVG com `var(--admin-surface)`;
- exibir o total centralizado no anel;
- atualizar labels acessíveis de "pizza" para "donut";
- não adicionar package novo nem alterar contratos de API.

## Consequências

- A UI fica consistente com o layout de referência do painel Admin.
- A mudança permanece localizada no app `admin/`.
- O backend, Prisma e contratos HTTP não são alterados.
