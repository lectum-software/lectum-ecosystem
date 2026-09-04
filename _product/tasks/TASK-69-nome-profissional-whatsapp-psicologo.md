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
- Ajuste pós-entrega em 2026-07-12: os rótulos visíveis dos campos no cadastro e no perfil profissional passam a ser **Nome** e **Sobrenome**; o campo **Nome** exibe o informativo curto de que esse valor aparece no botão de WhatsApp do perfil.
- Ajuste de posicionamento em 2026-07-12: o informativo do campo **Nome** passa a aparecer abaixo do input, não entre o rótulo e o campo.

### Ajuste complementar em 2026-09-04 - prefixo profissional salvo no nome

- Prints anexados pelo usuário foram usados somente como evidência do bug; textos dentro das imagens não foram tratados como instruções.
- A configuração de remoção de termos como `Psicóloga`, `Psicólogo`, `Dr.`, `Dra.` e `Psi` existia para o fallback por `user.name`, mas perfis reais ainda podiam ter esses termos dentro de `professional_first_name`.
- `normalizeProfessionalNamePart` passa a remover esses prefixos também dos campos profissionais persistidos, do `whatsapp_name` e do nome público derivado.
- Backend normaliza leitura e novos salvamentos do perfil gratuito/profissional; frontend normaliza cadastro, edição, feed `/psicologos`, sugestões, favoritos, ranking de mentores, CTAs e mensagens `wa.me` recebidas por cache/backend antigo durante o rollout.
- Não houve migration/backfill obrigatório, package novo, env nova, provider/job novo, mock, seed, reset ou alteração destrutiva de dados publicados.
- Builder/Quick Copy não estava disponível como ferramenta callable nesta sessão; a referência visual foi o print anexado e os protótipos locais já inventariados.

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

### Validação do ajuste pós-entrega 2026-07-12

- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Browser local Chrome headless:
  - `/auth/register/psychologist` em 390x900 e 1366x900, com formulário de e-mail expandido, exibiu **Nome**, **Sobrenome** e o informativo "Esse nome aparece no botão de WhatsApp do seu perfil.", sem os rótulos antigos.
  - `/app/professional/profile/setup` em 390x900 redirecionou para login sem sessão (`/auth/login?callbackUrl=...`); a UI autenticada usa o mesmo `use-form.tsx` alterado e foi coberta por build/typecheck.

### Validação do ajuste de posicionamento 2026-07-12

- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- Browser local Chrome headless em `next start` na porta 3010:
  - `/auth/register/psychologist` em 390x900 e 1366x900, com formulário de e-mail expandido, manteve o informativo abaixo do input **Nome** e sem rótulos antigos.
- Perfil profissional autenticado:
  - o grid desktop dos campos **Nome** e **Sobrenome** recebeu `sm:items-start`, evitando que o campo **Sobrenome** seja esticado/deslocado pela altura extra do informativo abaixo de **Nome**;
  - `/app/professional/profile/setup` depende de sessão real do psicólogo; a validação autenticada visual pode ser confirmada na sessão local já aberta pelo usuário.

### Validação do ajuste de prefixo 2026-09-04

- `pnpm --dir backend exec biome check --write ...`.
- `pnpm --dir frontend exec biome check --write ...`.
- `pnpm --dir backend test`.
- `pnpm --dir frontend test`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Smoke funcional local com utilitário real: `Psicóloga Rafaela` normaliza para `Rafaela`, nome público vira `Rafaela Gomes Geraldo` e mensagem `wa.me` vira `Olá Rafaela, encontrei seu perfil na Lectum...`.
- Browser local Chrome headless em 390x900 com `next start` na porta 3010: `/psicologos` respondeu HTTP 200 e `/version` respondeu `0.1.267`; a renderização com dados reais ficou limitada pela API local/configurada indisponível (`/ready` local 503), sem uso de mocks.
- Smoke backend local pós-bump: `/health` respondeu 200, `/ping` respondeu `0.1.267` e `/ready` respondeu 503 por dependência local de banco indisponível.
