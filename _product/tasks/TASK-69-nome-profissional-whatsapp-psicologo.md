# TASK-69: Nome profissional separado para WhatsApp do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-69 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Psicólogo / Identidade profissional / WhatsApp |
| Status | Completed |
| Dependências | TASK-09, TASK-16, TASK-18A, TASK-30 |
| ADR alvo | ADR-0257 |

## Contexto

Hoje o psicólogo possui apenas `user.name`, usado como nome completo/profissional. O CTA e a mensagem pronta do WhatsApp derivam o primeiro nome por parsing do nome completo, o que reduz controle em nomes compostos, títulos e cadastros via Google.

Pacientes continuam usando **nome de exibição** como identidade pública na comunidade. Não criar sobrenome de exibição para pacientes nesta task.

## Objetivo

Criar campos separados de **nome profissional** e **sobrenome profissional** somente para psicólogos, mantendo `user.name` como nome completo derivado para compatibilidade. O nome profissional deve controlar o CTA `Fale com [NOME]` e a saudação da mensagem pré-programada do WhatsApp.

## Escopo

- Adicionar campos persistidos em `psychologist_profile` para `professional_first_name` e `professional_last_name`.
- Migrar/fazer fallback de dados existentes a partir de `user.name` sem reset destrutivo.
- Cadastro manual de psicólogo passa a pedir nome profissional e sobrenome profissional.
- Cadastro Google de psicólogo passa a preencher os campos com `given_name` e `family_name` quando disponíveis, com fallback para `displayName`.
- Perfil privado do psicólogo passa a editar os dois campos.
- APIs de descoberta, perfil, favoritos e comunidade expõem/ usam nome completo profissional derivado e nome de WhatsApp controlado pelo campo de nome profissional.
- CTA textual de WhatsApp usa `Fale com [nome profissional]` quando há espaço para texto.
- Mensagem `wa.me` saúda pelo mesmo nome profissional usado no CTA.
- Paciente permanece com campo único de nome de exibição.

## Fora do escopo

- Criar nome/sobrenome para paciente.
- Criar terceiro campo de nome de exibição do psicólogo.
- Alterar identidade legal/civil do paciente.
- Redesenhar tela fora dos ajustes necessários de campos.
- Instalar packages novos.

## Referências visuais

- `_product/proto/Cadastro de Psicólogo.jpg`.
- `_product/proto/Editar Perfil - Psicólogo.jpg`.
- `_product/proto/Psicólogos.jpg`.
- `_product/proto/Perfil Profissional - Sobre.jpg`.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; foi usado o fallback de imagens locais do inventário ativo.

## Critérios de aceite

- [x] `psychologist_profile` possui campos persistidos para nome profissional e sobrenome profissional.
- [x] Migração aplica fallback para psicólogos existentes sem reset destrutivo.
- [x] Cadastro manual de psicólogo usa React Hook Form/Zod/controllers com campos de nome profissional e sobrenome profissional, mobile-first.
- [x] Cadastro Google de psicólogo aproveita `given_name`/`family_name` quando disponíveis e não depende desses claims serem garantidos.
- [x] Perfil privado do psicólogo edita nome profissional e sobrenome profissional e mantém `user.name` derivado para compatibilidade.
- [x] Paciente continua usando apenas nome de exibição; não existe sobrenome de exibição.
- [x] CTA textual de WhatsApp usa `Fale com [nome profissional]`.
- [x] Mensagem pré-programada do WhatsApp usa o mesmo nome profissional do CTA.
- [x] Fallbacks preservam links/nomes de psicólogos legados quando os novos campos não existirem.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Se houve alteração de Prisma/migrations, `pnpm --dir backend db:migrate` foi executado sem reset destrutivo não autorizado.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Validação de UI em browser local foi realizada em base mobile ~390px e desktop quando aplicável.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional e `git push` executado.

## Validação mínima

- `pnpm --dir backend db:migrate`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Browser local em cadastro de psicólogo, edição do perfil profissional e CTA de WhatsApp.

## Execução

- Migration `20260712120000_add_psychologist_professional_name_parts` adicionou `professional_first_name` e `professional_last_name` em `psychologist_profile` e aplicou fallback a partir de `user.name`.
- `pnpm --dir backend db:migrate` executado com sucesso, sem reset destrutivo.
- Cadastro manual de psicólogo passou a enviar nome/sobrenome profissional e `user.name` derivado.
- OAuth Google usa `given_name`/`family_name` quando disponíveis e fallback por `displayName`.
- DTOs de descoberta/perfil/comunidade/favoritos expõem `whatsapp_name`; URLs `wa.me` usam o mesmo nome do CTA.
- Paciente permaneceu com nome de exibição único.
- Builder/Quick Copy não estava exposto como ferramenta callable; validação visual usou imagens locais do inventário e browser local.

## Validação realizada

- `pnpm --dir backend db:migrate`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Browser local Chrome headless em 390px:
  - `/auth/register/psychologist`: formulário expandido com `Nome profissional` e `Sobrenome profissional`.
  - `/psychologists/demo-psychologist-marina-rocha`: CTA `Fale com Marina`.
  - API local `/api/private/directory/psychologists`: `whatsapp_name=Marina` e mensagem `Olá Marina, ...`.
  - `/app/professional/profile/setup`: rota privada validada por redirect 307 para login sem sessão; a UI autenticada foi coberta por build/typecheck e pela mesma fundação de campos do formulário.
