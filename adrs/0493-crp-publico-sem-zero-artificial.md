# ADR-0493: CRP sem zero artificial no registro

## Status

Accepted

## Task relacionada

TASK-15, TASK-55

## Contexto

Em 2026-09-10, o usuario identificou primeiro que o perfil publico de uma
psicologa exibia `CRP 07/029112`, enquanto o registro profissional correto era
`29112`. No ajuste seguinte, apontou que a regra precisava ser geral: o Admin
tambem exibia `21/03324` no header e `03324` nos cards de assinatura/cortesia,
mas o registro correto desse perfil era `3324`.

A causa deixou de ser apenas visual no frontend. Havia pontos do Admin que ainda
preenchiam ou preservavam zeros a esquerda no numero do registro, e respostas do
backend podiam repassar CRPs legados ja armazenados com zero artificial para
superficies publicas, privadas e administrativas.

## Decisao

- Centralizar no backend a normalizacao de saida de CRP em
  `backend/src/utils/professional-registry.ts`.
- Manter a regional numerica com 2 digitos (`7a Regiao - RS` continua
  renderizando `07` quando exibida como numero curto).
- Nao aplicar padding no numero do registro.
- Remover zeros artificiais a esquerda do numero do registro em contratos de
  leitura e em gravacoes administrativas/CFP feitas a partir deste deploy.
- Manter guards de compatibilidade no frontend e no Admin para tolerar, durante o
  rollout, respostas antigas do backend ou dados legados ja persistidos com zero
  artificial.
- Nao fazer backfill ou migration agora: dados publicados permanecem intactos, e
  a correcao e aplicada na borda de leitura/escrita segura.

## Consequencias

- `7a Regiao - RS/029112`, `7/029112` e `07/029112` passam a ser exibidos como
  `07/29112`.
- `21a Regiao - PI/03324` e `21/03324` passam a ser exibidos como `21/3324`.
- Header publico, header Admin, aba `Perfil e cadastro`, aba `Assinatura`,
  cortesia ativa, revisao de CRP, rankings/comunidades, favoritos/seguindo,
  avaliacoes e dashboards/financeiro recebem a mesma regra.
- APIs continuam com os mesmos campos (`crp`, `regional_crp`,
  `registration_number`), sem mudanca quebravel de contrato.
- Se for necessario preservar algum registro que legalmente comece com zero, a
  origem devera passar a armazenar esse numero como decisao operacional auditada
  especifica; a regra geral atual trata zeros a esquerda como artificiais, em
  linha com os casos reais reportados.

## Producao e rollout

- Compatibilidade com dados existentes: aditiva/tolerante; o backend novo limpa
  respostas legadas e frontend/admin novos tambem protegem contra backend antigo.
- Banco/migration: sem alteracao de schema, migration, seed, reset ou backfill.
- Envs: nenhuma env nova ou obrigatoria; sem **ALERTA DE DEPLOY**.
- Ordem de deploy: push em `homolog` publica backend, frontend e admin em
  homologacao. Validar `/ping`, `/health`, `/ready`, `/version` e os perfis
  reais reportados antes de recomendar promocao.
- Rollback: reverter o commit restaura a regra anterior de exibicao/escrita sem
  migracao reversa.

## Validacao

- `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/` falhou por
  cache local `ENOENT`; a evidencia visual usou os prints do usuario e as
  referencias locais de `_product/proto`.
- `pnpm --dir backend exec node --import tsx --test src/utils/professional-registry.test.ts`
- `pnpm --dir frontend exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/utils/crp.test.mjs`
- `pnpm --dir admin exec node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON --experimental-strip-types --test src/lib/crp-formatters.test.mjs`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm version:bump`
- `pnpm check:version`
- `pnpm check`

## Pendencias

- Nenhuma pendencia externa nova.
