# ADR-0030: Data de inscrição CRP como fonte do tempo de experiência

## Status

Accepted

## Task relacionada

TASK-31C

## Contexto

O card de psicólogo assinante exibe a tag de tempo de experiência. Essa informação não deve ser derivada de formação acadêmica, porque a formação é editável pelo usuário e não representa, necessariamente, o tempo de registro profissional no Conselho.

No fluxo profissional pago, a consulta real ao CFP/InfoSimples retorna `data_inscricao`. Em concessões administrativas de cortesia (`source="admin_grant"`), a operação pode liberar todos os benefícios de assinante sem executar a consulta CFP no momento da concessão. Para manter a mesma regra de exibição, a operação precisa informar manualmente a data de inscrição no CRP.

## Decisão

Adicionar `psychologist_profile.crp_registration_date` como campo interno e não editável pelo psicólogo.

Esse campo passa a ser preenchido por duas fontes autorizadas:

1. confirmação de resultado real da consulta CFP/InfoSimples, usando `data_inscricao`;
2. comando operacional `subscription:grant`, por meio da flag `--crp-registration-date <YYYY-MM-DD ou DD/MM/YYYY>`, quando a cortesia administrativa substitui o fluxo pago/CFP no momento da liberação.

Os contratos públicos continuam retornando apenas `formation_years`, calculado no backend por anos completos desde `crp_registration_date` em `America/Sao_Paulo`. A data bruta de inscrição não é exposta no contrato público nem aparece na edição de perfil.

## Consequências

- O tempo de experiência deixa de depender de campos acadêmicos editáveis.
- Psicólogos em cortesia podem exibir a mesma tag de experiência dos assinantes, desde que a operação informe a data correta.
- A auditoria operacional fica concentrada no comando de concessão e nos campos de assinatura já criados na TASK-31A.
- Profissionais antigos sem `crp_registration_date` não exibem tag de experiência até que a data seja preenchida por consulta CFP confirmada ou operação explícita.

## Validação

- `pnpm --dir backend db:migrate -- --name add_crp_registration_date_for_experience`
- `pnpm --dir backend subscription:grant -- --help`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Pendências

- Não há interface admin no MVP; a inserção manual permanece via CLI operacional.

## Complemento 2026-07-11: dados públicos do registro profissional

Com a evolução do Admin na TASK-66, `crp_registration_date` deixa de ser tratado
como dado exclusivamente interno: Regional CRP, Nº CRP e data de inscrição passam
a poder ser corrigidos pela equipe administrativa e exibidos no perfil público do
psicólogo como dados do conselho profissional. A edição continua bloqueada para o
psicólogo e não altera sozinha `crp_status`, `cfp_verified_at`, assinatura,
gateway ou cortesia.

O cálculo de `formation_years` pode continuar existindo para compatibilidade com
contratos antigos, mas o card Admin de registro profissional não exibe mais tempo
de experiência e prioriza os três dados públicos do registro.
