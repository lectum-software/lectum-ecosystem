# ADR-0186: Bloqueio de CPF/CRP somente após validação profissional com entitlement

## Status

Aceita em 2026-06-30.

## Contexto

O perfil profissional gratuito permite que o psicólogo edite CPF e CRP como dados cadastrais. Porém, quando CPF/CRP são usados para consultar o CFP/InfoSimples e liberar uma assinatura profissional paga ou uma cortesia administrativa, esses dados deixam de ser apenas cadastrais: passam a ser a base da validação profissional.

A implementação anterior bloqueava CPF/CRP em cortesia administrativa ativa com campos preenchidos, mesmo sem `cfp_verified_at`. Isso antecipava uma exceção operacional, mas não representava a regra de domínio aprovada: a trava deve existir pelo uso do CPF na validação profissional real, não pelo fato de a assinatura ser cortesia.

## Decisão

- Expor no contrato privado do perfil profissional a flag derivada `profile.identity_fields_locked`.
- Calcular a flag como verdadeira somente quando:
  - há assinatura/cortesia profissional ativa não gratuita;
  - `psychologist_profile.cfp_verified_at` está preenchido por consulta real autorizada;
  - CPF e CRP estão persistidos no perfil.
- Manter CPF/CRP editáveis para psicólogos no Plano Gratuito ou sem validação CFP usada como base do entitlement.
- Quando `identity_fields_locked=true`, o backend ignora alterações de CPF/CRP no update do perfil, preservando os valores já validados.
- O frontend deixa de inferir bloqueio por `source="admin_grant"` e passa a respeitar exclusivamente a flag do backend.

## Consequências

- O futuro painel administrativo pode consultar o CFP por CPF, confirmar o resultado e conceder cortesia reaproveitando o mesmo contrato: após gravar `cfp_verified_at`, CPF e CRP ficam bloqueados no perfil.
- Cortesias antigas criadas sem validação CFP real não bloqueiam CPF/CRP apenas por serem `admin_grant`.
- Não há migration, novo modelo ou package novo.
- A explicação visual ao psicólogo fica centralizada na tela de edição de perfil, sem criar fluxo de suporte ou admin nesta etapa.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local headless em `http://localhost:3100/app/professional/profile/setup`, viewport 390x844, contra o build atual.
