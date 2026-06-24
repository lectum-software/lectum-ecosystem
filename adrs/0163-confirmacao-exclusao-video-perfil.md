# ADR 0163 — Confirmacao antes de excluir video do perfil profissional

Data: 2026-06-24
Status: Aceita

## Contexto

O video de apresentacao e obrigatorio para que o perfil do psicologo seja exibido publicamente na pagina de psicologos. A acao `Excluir video` podia remover o video e tirar o profissional da listagem publica sem um aviso explicito no momento da acao.

## Decisao

Antes de executar a mutation de remocao do video, a UI de `/app/professional/profile/setup` abre uma modal de confirmacao informando que a exclusao removera o perfil da pagina de psicologos ate o envio de um novo video de apresentacao. A exclusao so ocorre apos confirmacao explicita do psicologo.

## Consequencias

- Reduz risco de perda acidental de presenca publica do psicologo.
- Mantem a regra de dominio existente: perfil profissional publico depende de video de apresentacao.
- Nao altera API, schema Prisma, storage, contratos ou packages.
- Enquanto a remocao esta pendente, fechamento por backdrop/Escape e nova confirmacao ficam bloqueados para evitar estado ambiguo.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
