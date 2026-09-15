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
- Posicionar o informativo do campo "Nome" abaixo do input para preservar leitura natural do campo antes da explicacao contextual.
- Manter pacientes com campo unico de nome de exibicao.
- Expor `whatsapp_name` nos DTOs de descoberta, perfil, favoritos e comunidade quando o autor/alvo for psicologo.
- Usar o mesmo nome profissional do CTA `Fale com [nome]` na saudacao da mensagem `wa.me`.

## Consequencias

- Psicologos passam a controlar o nome curto usado no WhatsApp sem criar um terceiro campo de exibicao.
- O campo "Nome" informa explicitamente, abaixo do input, que esse valor aparece no botao de WhatsApp do perfil.
- Links legados continuam funcionando: se os novos campos estiverem vazios, o fallback deriva o primeiro nome util de `user.name`.
- O frontend passa a renderizar CTAs textuais como `Fale com [nome profissional]` onde ha espaco para texto.
- O backend continua sem expor telefone bruto fora da URL publica de intencao.

## Atualizacao 2026-09-04 - prefixo salvo dentro do nome

Perfis reais podem ter salvo termos como `Psicologa`, `Psicologo`, `Dr.`, `Dra.` ou `Psi` dentro de `professional_first_name`. A normalizacao anterior removia esses prefixos do fallback baseado em `user.name`, mas nao garantia a limpeza do proprio campo de nome profissional persistido nem de todos os pontos de UI durante rollout.

Decidimos:

- Aplicar a remocao de prefixos tambem em `normalizeProfessionalNamePart`, tornando a regra canonica para `professional_first_name`, `professional_last_name`, `whatsapp_name` e nome publico derivado.
- Normalizar no backend tanto a leitura quanto novos salvamentos do perfil profissional, mantendo `user.name` derivado sem prefixo quando o psicologo editar/cadastrar novamente.
- Manter a correcao sem migration/backfill obrigatorio para nao tocar dados publicados; a leitura ja corrige listagem, perfil, favoritos, comunidade, ranking e `wa.me`, e a proxima edicao salva os campos limpos.
- Repetir a normalizacao no frontend para tolerar backend antigo/cache durante o deploy independente de frontend e backend, inclusive texto preservado em links `wa.me` ja recebidos pelo cliente.

Impacto de deploy: sem env nova, sem package novo, sem schema/migration, sem provider/job novo e sem reset/backfill destrutivo. Rollback simples reverte o commit; registros que ainda contiverem prefixo seguem preservados e voltam a depender do comportamento anterior ate nova correcao.

## Task relacionada

- TASK-69 - Nome profissional separado para WhatsApp do psicologo.

## Validacoes

- `pnpm --dir backend db:migrate`.
- `pnpm --dir backend check`.
- `pnpm --dir frontend check`.
- Builds e browser local registrados no arquivo da task.
- Ajuste de copy 2026-07-12: `pnpm --dir frontend check`, `pnpm --dir frontend build` e browser local Chrome headless em 390x900/1366x900.
- Ajuste de posicionamento/alinhamento 2026-07-12: `pnpm --dir frontend check`, `pnpm --dir frontend build` e validacoes registradas na TASK-69.
- Ajuste de prefixo 2026-09-04: validacoes registradas na TASK-69.
