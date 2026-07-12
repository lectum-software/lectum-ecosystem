# ADR-0258: Padrão de contadores clicáveis em gráficos do Admin

## Status

Aceita

## Task relacionada

Ajuste visual avulso do painel Admin, após TASK-53 e TASK-57.

## Contexto

Os gráficos do Admin usam contadores superiores clicáveis para controlar quais
curvas aparecem no gráfico. O dashboard de psicólogos já estabeleceu o padrão
visual desejado: contador no topo, ícone colorido de acordo com a curva e estado
selecionado sem sombra própria no botão.

A aba **Estatísticas** do detalhe administrativo do psicólogo já tinha os
contadores clicáveis em **Estatísticas de negócio**, mas ainda não exibia os
ícones coloridos por curva e mantinha sombra no contador selecionado.

Referência visual local consultada: `_product/proto/admin/Psicólogos/Psicólogos - Dashboard.png`.
Builder/Quick Copy não esteve disponível como ferramenta neste ambiente; a
implementação usou a imagem local, o dashboard já implementado em
`admin/src/app/(admin)/psicologos/client.tsx` e a solicitação visual do produto.

## Decisão

Padronizar contadores de gráficos no Admin com:

- contadores posicionados acima do gráfico;
- contador clicável para alternar a curva exibida;
- ícone do contador na mesma cor visual da curva correspondente;
- botão selecionado sem `shadow-admin-soft`, usando `shadow-none`;
- estado indisponível honesto e desabilitado quando a métrica não tiver dado real.

Nesta correção, o padrão foi aplicado aos contadores de **Estatísticas de
negócio** em `admin/src/app/(admin)/psicologos/[id]/client.tsx`.

## Consequências

- A aba de Estatísticas fica alinhada ao dashboard de psicólogos.
- A relação entre contador e curva fica mais clara visualmente.
- Não houve alteração de API, banco de dados, pacote, autenticação ou regra de
  domínio.
- O padrão deve ser reutilizado em futuros gráficos com contadores clicáveis no
  Admin.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local: `GET http://localhost:3002/psicologos/test-id?tab=estatisticas`
  retornou `200`.

## Pendências

- Nenhuma.
