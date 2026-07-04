# ADR-0198: Endereço de cobrança sincroniza o perfil do psicólogo

## Status

Accepted

## Task relacionada

Ajuste operacional no fluxo profissional de cobrança/endereço.

## Contexto

O fluxo `/app/professional/billing/address` já persistia o endereço informado em `billing_address`, mas o mesmo dado também precisa ficar disponível nos campos de endereço do `psychologist_profile`, usados pelo perfil profissional e pela descoberta de psicólogos.

Manter dois writes separados fora de transação poderia deixar o endereço de cobrança salvo sem atualizar o perfil, ou o inverso, em caso de falha intermediária.

## Decisão

Ao salvar o endereço de faturamento de um psicólogo com assinatura profissional ativa, o backend atualiza em uma única transação:

- o registro mais recente de `billing_address` do usuário, criando-o quando não existir;
- os campos `professional_address_*` do `psychologist_profile` correspondente.

Não houve alteração de schema porque os campos do perfil já existiam.

## Consequências

- O endereço informado após o pagamento passa a alimentar diretamente o perfil do psicólogo.
- O write transacional reduz risco de inconsistência entre billing e perfil.
- O endpoint continua retornando o contrato atual de endereço de cobrança, sem exigir mudança no frontend.
- Se no futuro billing e endereço profissional precisarem divergir, será necessária uma decisão de produto e possivelmente um contrato explícito de escolha.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm check`

## Pendências

- Nenhuma pendência externa para este ajuste.
