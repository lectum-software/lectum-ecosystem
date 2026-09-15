# ADR-0214: Cortesia sem historico lateral e com CTA de cartao futuro

## Status

Accepted

## Task relacionada

TASK-33

## Contexto

A tela `/app/professional/billing` passou a diferenciar assinaturas `admin_grant` ativas como cortesia profissional. Para esse estado, o historico de pagamentos e a faixa informativa azul repetiam que a cortesia nao gera cobranca, criando ruido visual e ocupando um quadrante que nao representa uma acao util. O pedido de produto foi remover esses elementos e transformar o campo de metodo de pagamento em um ponto de acao para cadastrar cartao de cobranca para quando a cortesia terminar.

A referencia visual ativa da task continua sendo `_product/proto/Minhas Assinatura - Psicologo.jpg`; o Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente, entao a validacao visual usa a imagem local e o browser local.

## Decisao

- Para `source="admin_grant"`, `status="ativa"` e plano `profissional`, a rota `/app/professional/billing` nao renderiza o aside de historico de pagamentos nem a faixa azul de cortesia ativa.
- O card principal passa a ocupar uma coluna unica em desktop para a cortesia, mantendo a composicao mobile-first.
- O antigo campo de metodo de pagamento da cortesia passa a exibir **Adicionar cartao de cobranca** com a descricao **Cadastre um cartao para a cobranca quando a cortesia chegar ao fim.**.
- A acao contextual da cortesia usa o CTA **Adicionar** apontando para a entrada existente de checkout com `intent=courtesy-renewal`, sem criar novo endpoint, mock, seed, package ou alteracao de schema nesta execucao.
- O historico de pagamentos permanece disponivel para assinaturas pagas/gerenciaveis e segue exibindo somente eventos reais.

## Consequencias

- A cortesia deixa de parecer uma assinatura paga sem pagamentos, reduzindo ambiguidade para o psicologo.
- A UI foca na proxima acao util: preparar um cartao para continuidade apos o periodo concedido.
- Nao ha mudanca no entitlement, no gateway, no webhook ou no contrato de dados da assinatura.
- A evolucao operacional de cobranca diferida no gateway, se precisar de regra adicional alem do checkout existente, deve ser tratada em task propria para nao misturar mudanca visual com contrato de pagamento.

## Validacao

- `pnpm exec biome check --write src/app/app/professional/billing/logic.tsx`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local em `/app/professional/billing` com sessao real da conta em cortesia, conferindo ausencia do historico/faixa e presenca do campo/CTA de adicionar cartao.

## Pendencias

- Nenhuma pendencia externa para esta mudanca de UI.
