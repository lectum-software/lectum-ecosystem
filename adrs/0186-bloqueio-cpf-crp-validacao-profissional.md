# ADR-0186: Bloqueio de CPF/CRP após validação profissional ou cortesia administrativa ativa

## Status

Aceita em 2026-06-30. Complementada em 2026-07-11.

## Contexto

O perfil profissional gratuito permite que o psicólogo edite CPF e CRP como dados cadastrais. Porém, quando CPF/CRP são usados para consultar o CFP/InfoSimples e liberar uma assinatura profissional paga ou uma cortesia administrativa, esses dados deixam de ser apenas cadastrais: passam a ser a base da validação profissional.

A implementação anterior bloqueava CPF/CRP em cortesia administrativa ativa com campos preenchidos, mesmo sem `cfp_verified_at`. Isso antecipava uma exceção operacional, mas não representava a regra de domínio aprovada: a trava deve existir pelo uso do CPF na validação profissional real, não pelo fato de a assinatura ser cortesia.

Em 2026-07-10 o Admin passou a permitir que a equipe operacional edite CPF, Regional do CRP e Nº de registro CRP no próprio fluxo de concessão de cortesia, sobrescrevendo os dados informados pelo psicólogo sem preencher artificialmente `cfp_verified_at`. Com essa nova fonte operacional, produto definiu em 2026-07-11 que, durante uma cortesia administrativa ativa, esses campos não podem mais ser alterados pela edição do psicólogo.

## Decisão

- Expor no contrato privado do perfil profissional a flag derivada `profile.identity_fields_locked`.
- Calcular a flag como verdadeira quando houver assinatura profissional ativa não gratuita e uma das condições abaixo:
  - `psychologist_profile.cfp_verified_at` está preenchido por consulta real autorizada e CPF/CRP estão persistidos no perfil;
  - a assinatura ativa é uma cortesia administrativa `source="admin_grant"`.
- Para `admin_grant`, a trava independe de `cfp_verified_at`: esse timestamp continua exclusivo da consulta CFP/InfoSimples real, mas o Admin passa a ser a fonte operacional de CPF, Regional do CRP e Nº de registro CRP enquanto a cortesia estiver vigente.
- Manter CPF/CRP editáveis para psicólogos no Plano Gratuito ou sem validação CFP usada como base do entitlement, desde que não exista cortesia administrativa ativa.
- Quando `identity_fields_locked=true`, o backend ignora alterações de CPF/CRP no update do perfil, preservando os valores já validados.
- O frontend deixa de inferir bloqueio por `source="admin_grant"` e passa a respeitar exclusivamente a flag do backend.

## Consequências

- O painel administrativo pode consultar o CFP por CPF, confirmar o resultado e conceder assinatura/cortesia reaproveitando o mesmo contrato: após gravar `cfp_verified_at`, CPF e CRP ficam bloqueados no perfil.
- Cortesias administrativas ativas bloqueiam CPF, Regional do CRP e Nº de registro CRP na edição do psicólogo, mesmo quando não há `cfp_verified_at`, para impedir que o próprio psicólogo sobrescreva a correção operacional feita pelo Admin.
- Ao revogar uma cortesia, os dados de identidade permanecem no perfil como histórico operacional; sem cortesia ativa, a trava volta a depender da regra de validação CFP/InfoSimples real.
- Não há migration, novo modelo ou package novo.
- A UI mobile-first da edição de perfil permanece usando a fundação de formulários existente; o estado visual de bloqueio vem da flag do backend.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local headless em `http://localhost:3100/app/professional/profile/setup`, viewport 390x844, contra o build atual.

## Complemento 2026-07-11 - cortesia ativa bloqueia identidade no perfil

- `GET /api/private/psychologist/free-profile` passa a retornar `profile.identity_fields_locked=true` para perfil com cortesia administrativa ativa `source="admin_grant"`, ainda que `cfp_verified_at` esteja nulo.
- A tela `/app/professional/profile/setup` já consumia a flag e, por isso, renderiza CPF, Regional do CRP e Nº de registro CRP como `disabled` após a concessão.
- O `PUT /api/private/psychologist/free-profile` continua recalculando a flag antes de salvar e envia `undefined` para `cpf`/`crp` no repository quando a identidade está bloqueada, evitando overwrite por payload manipulado.
- Validação: API local real confirmou `identity_fields_locked=true` para `source="admin_grant"` com `cfp_verified_at=null`; Chrome/CDP headless mobile 390x844 confirmou os três campos desabilitados na edição do psicólogo.
