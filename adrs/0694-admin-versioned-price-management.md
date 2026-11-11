# ADR-0694 - Gestao de precos para novas adesoes, sem reprecificar contratos

Data: 2026-11-11
Status: Aceita e validada localmente
Task: [TASK-329](../_product/tasks/TASK-329-admin-versioned-price-management.md)

## Decisao

Manter Price e snapshots contratados imutaveis. O Admin cria uma nova versao
ligada ao produto existente, depois vincula/publica conscientemente a oferta.
Preco diferente pausa por padrao e nao altera assinaturas nem reservas vigentes.
A vitrine exibe a mesma oferta efetivamente cotada, separada do plano legado MP.

Operacao de catalogo propria persiste escopo/fingerprint/idempotencia e estado
antes de chamar a Stripe. Recuperacao verifica correlacao e contrato da Price;
fora da janela de replay nao se cria outra por adivinhacao. Transacoes SQL apenas
para persistencia local, sem SDK dentro. Pausa local nao depende do provider.

Sem criar produto novo, gateway novo, SDK ou package paralelo. Factory/adapter
existentes, validacao RHF/Zod e componentes do Admin preservados. Permissao live
Prices Write nao e inferida da implementacao; validacao somente local/sandbox.

## Referencias primarias

- [Precos imutaveis e novas versoes](https://docs.stripe.com/products-prices/manage-prices).
- [Criar Price em produto existente](https://docs.stripe.com/api/prices/create).
- [Janela de idempotencia e replay](https://docs.stripe.com/api/idempotent_requests).
- [Limites de valores e BRL](https://docs.stripe.com/currencies).

## Compatibilidade e operacao

Schema expansivo sem obrigar dados antigos/backfill ficticio. Novos contratos
fixam a versao; antigos conservam snapshot. Oferta/preco nao muda por deploy.
Criar Price nao e uma cobranca; nenhuma assinatura, nota, Radar ou dado live e
alterado por esta task. Taxas/operacao financeira liquida continuam fontes
separadas e nao sao estimadas pela edicao de preco.

Validacoes executadas e decisoes finais registradas na task.

## Evidencia tecnica

Duas Prices de teste reais39,90/49,90 criadas sem cobranca; replay/conflito CAS e
recuperacao apos interrupcao conferidos. Recuperacao usou somente lookupGET, sem
novoPOST; objetos remotos corresponderam aos checkpoints. Publicacao positiva
em processo tecnico sem workers provou vitrine/cotacao na mesma versao3990.
Pausa em processo novo sem segredo foi positiva; oferta2990 voltou pausada.
Autenticacoes QA e fatos financeiros/fiscais preservados, sem alteracao live.

Contexto de catalogo e aditivo e independente do gateway selecionado para novas
vendas: permite gestao/pausa local mesmo com checkout globaldisabled ou segredo
indisponivel. A leitura antiga de checkout nao e usada como falsa revisaozero.
Campos pendentes sao isolados por ator/plan/modo, recuperam a mesma chave e nao
inventam nova solicitacao depois de falha ou estado local corrompido.

Bump unico0.1.822, check integral e tres builds aprovados e registrados na task;
nenhum push/deploy automatico. Limite maximo de99999999centavos e defensivo da
Lectum, nao alegacao sobre o maximo atual da rede de cartoes Stripe.
