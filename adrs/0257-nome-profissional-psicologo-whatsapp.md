# ADR-0257 - Nome profissional separado do psicologo para WhatsApp

## Status

Accepted - 2026-07-12

## Contexto

A Lectum usava apenas `user.name` para o nome completo/profissional do psicologo. O CTA de WhatsApp e a mensagem pronta derivavam o primeiro nome por parsing, o que reduzia controle para nomes compostos, titulos profissionais e cadastro via Google.

Pacientes usam nome de exibicao como identidade publica na comunidade. Criar sobrenome de exibicao para pacientes aumentaria complexidade sem resolver o problema do CTA profissional.

## Decisao

- Persistir `professional_first_name` e `professional_last_name` em `psychologist_profile`, mantendo `user.name` como nome completo derivado para compatibilidade.
- Aplicar migration com fallback a partir de `user.name` para psicologos existentes, sem reset destrutivo.
- No cadastro manual de psicologo, coletar nome profissional e sobrenome profissional via React Hook Form/Zod/controllers.
- No cadastro/login Google de psicologo, usar `given_name` e `family_name` quando disponiveis; se ausentes, dividir `displayName` como fallback.
- Na UI do cadastro e do perfil profissional, exibir os campos como "Nome" e "Sobrenome" para reduzir complexidade visual, mantendo o significado de dominio em `professional_first_name` e `professional_last_name`.
- Manter pacientes com campo unico de nome de exibicao.
- Expor `whatsapp_name` nos DTOs de descoberta, perfil, favoritos e comunidade quando o autor/alvo for psicologo.
- Usar o mesmo nome profissional do CTA `Fale com [nome]` na saudacao da mensagem `wa.me`.

## Consequencias

- Psicologos passam a controlar o nome curto usado no WhatsApp sem criar um terceiro campo de exibicao.
- O campo "Nome" informa explicitamente que esse valor aparece no botao de WhatsApp do perfil.
- Links legados continuam funcionando: se os novos campos estiverem vazios, o fallback deriva o primeiro nome util de `user.name`.
- O frontend passa a renderizar CTAs textuais como `Fale com [nome profissional]` onde ha espaco para texto.
- O backend continua sem expor telefone bruto fora da URL publica de intencao.

## Task relacionada

- TASK-69 - Nome profissional separado para WhatsApp do psicologo.

## Validacoes

- `pnpm --dir backend db:migrate`.
- `pnpm --dir backend check`.
- `pnpm --dir frontend check`.
- Builds e browser local registrados no arquivo da task.
- Ajuste de copy 2026-07-12: `pnpm --dir frontend check`, `pnpm --dir frontend build` e browser local Chrome headless em 390x900/1366x900.
