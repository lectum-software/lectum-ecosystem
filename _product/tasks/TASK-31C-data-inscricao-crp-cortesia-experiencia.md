# TASK-31C: Data de inscrição CRP para experiência em cortesia

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-31C |
| Prioridade | P1 |
| Esforço | S |
| Fase | Assinatura |
| Status | Completed |
| Dependências | TASK-10, TASK-13, TASK-31A, TASK-31B |
| ADR alvo | ADR-0030 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/TASK-31A-concessao-administrativa-assinatura.md`
- `_product/tasks/TASK-31B-assinatura-cortesia-ui-perfil-profissional.md`
- `adrs/0028-concessao-administrativa-assinatura.md`
- `adrs/0029-cortesia-profissional-ui-perfil.md`

## Referências visuais

- `_product/proto/Psicólogos.jpg`
- Imagem de referência de card enviada pelo usuário em 2026-06-08.

Builder/Quick Copy não está exposto como ferramenta direta nesta execução; a validação visual usa os arquivos locais e os prints enviados pelo usuário.

## Contexto

O tempo de experiência exibido no card do psicólogo assinante deve ser calculado pela data de inscrição no CRP, não pelo ano de formação acadêmica editável. No fluxo pago, a data vem da consulta real ao CFP/InfoSimples. Em concessões administrativas de cortesia (`source="admin_grant"`), a operação precisa informar manualmente essa data para que o card exiba a experiência do profissional com a mesma regra do assinante.

## Objetivo

Persistir uma data interna de inscrição no CRP em `psychologist_profile`, preenchida pela consulta CFP real ou pelo comando operacional de cortesia, e usar essa data para calcular `formation_years` nos contratos públicos de descoberta/favoritos.

## Escopo

- Adicionar `psychologist_profile.crp_registration_date`.
- Salvar a data de inscrição retornada pela InfoSimples ao confirmar resultado CFP.
- Adicionar `--crp-registration-date` ao comando `subscription:grant`.
- Calcular anos de experiência a partir de `crp_registration_date`, com aniversário em `America/Sao_Paulo`.
- Manter a data interna fora da edição de perfil e fora do contrato público bruto.
- Manter o card exibindo a tag de experiência apenas quando o profissional tiver entitlement profissional/cortesia ativo.

## Fora do escopo

- Criar interface admin.
- Permitir que o psicólogo edite a data de inscrição.
- Reconsultar CFP para profissionais antigos sem solicitação explícita.
- Simular dados de Conselho/InfoSimples.

## Critérios de aceite

- [x] `psychologist_profile` possui `crp_registration_date` persistido via migration aplicada no Supabase.
- [x] Confirmação de resultado CFP salva `data_inscricao` normalizada em `crp_registration_date`.
- [x] `subscription:grant` aceita `--crp-registration-date <YYYY-MM-DD ou DD/MM/YYYY>` e valida data inválida/futura.
- [x] Concessão administrativa com data informada atualiza a data interna do perfil sem expor campo editável ao psicólogo.
- [x] Listagem, detalhe e favoritos calculam `formation_years` por `crp_registration_date`, não por formação acadêmica editável.
- [x] Frontend continua exibindo a tag de experiência somente para assinantes/cortesias ativos.
- [x] Nenhum package novo foi instalado.
- [x] ADR criado ou atualizado.
- [x] Checks/builds relevantes foram executados.
- [x] Commit criado e push executado.

## Uso operacional

```powershell
pnpm --dir backend subscription:grant -- --psychologist-email psi@example.com --days 90 --reason "Cortesia" --actor "Operação Lectum" --crp-registration-date 2014-03-18
```

## Validação mínima

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend subscription:grant -- --help`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`

## Execução

- Migration aplicada no Supabase configurado em `DATABASE_URL`: `20260608201748_add_crp_registration_date_for_experience`.
- Novo campo interno: `psychologist_profile.crp_registration_date`, não retornado como campo editável na tela de perfil.
- Confirmação CFP/InfoSimples agora normaliza `data_inscricao` e persiste a data no perfil.
- Comando operacional atualizado:
  - `pnpm --dir backend subscription:grant -- --psychologist-email psi@example.com --days 90 --reason "Cortesia" --actor "Operação Lectum" --crp-registration-date 2014-03-18`
- Listagem, detalhe público e favoritos deixaram de calcular experiência por formação acadêmica editável e usam `crp_registration_date`.
- O frontend manteve o mesmo contrato `formation_years` e a mesma regra visual já existente: a tag de experiência aparece apenas quando `verified=true`, que representa assinatura/cortesia profissional ativa.
- Validações executadas:
  - `pnpm --dir backend db:migrate -- --name add_crp_registration_date_for_experience`
  - `pnpm --dir backend db:generate`
  - `pnpm --dir backend biome:fix`
  - `pnpm --dir backend subscription:grant -- --help`
  - validação negativa sem mutação com `--crp-registration-date 2999-01-01`
  - validação negativa sem mutação com alvo inexistente e data válida
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
