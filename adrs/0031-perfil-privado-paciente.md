# ADR-0031: Perfil privado do paciente e edição de dados pessoais

## Status

Accepted

## Task relacionada

TASK-21

## Contexto

Pacientes precisam consultar e editar dados básicos do próprio perfil sem misturar essa edição com autenticação sensível, como e-mail e senha. A fonte de schema já existe em `patient_profile` e `user`, conforme `DATA-MODEL.md`, e as rotas privadas de autogestão do paciente devem permanecer sob `/api/private/patient/*` com `requireRole("paciente")` aplicado no mount.

As referências visuais consultadas foram as imagens locais `_product/proto/Perfil do paciente.jpg` e `_product/proto/Editar Perfil - Paciente.jpg`. O Builder/Quick Copy não está exposto como ferramenta nesta sessão, então a execução usou as imagens exportadas como fallback auditável.

## Decisão

Implementar o perfil privado do paciente com:

- GET `/api/private/patient/profile` para leitura/criação sob demanda de `patient_profile` usando `req.auth.id`;
- PUT `/api/private/patient/profile` para atualizar apenas `user.name` e campos permitidos de `patient_profile` (`goal`, `gender`, `birthdate`, `phone`, `bio`);
- validação backend com o validator local e normalização real de telefone via `libphonenumber-js`, persistindo telefone em E.164 quando informado;
- telas mobile-first em `/app/profile` e `/app/profile/edit`, usando React Hook Form, Zod, `useFormList` e controllers da TASK-02;
- atualização da store/sessão frontend após alteração de nome e perfil retornada pelo backend.

`role`, e-mail e senha não entram no payload nem no formulário desta task. Exclusão de conta e e-mail/senha continuam separados para a task de configurações de conta.

## Consequências

- A edição do paciente fica isolada da autogestão do psicólogo e de configurações sensíveis de conta.
- A UI passa a exibir estado vazio para dados pessoais ainda não informados e mensagens em PT-BR para erro/loading/sucesso.
- Upload de avatar do paciente não foi implementado nesta task porque depende do bucket/credenciais Cloudflare R2 públicos definitivos; a tela mantém foto de login existente ou initials e registra a pendência de forma honesta.
- Nenhum package novo foi instalado.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local com Chrome headless via servidor Next local em `/app/profile` e `/app/profile/edit`, base mobile 394px, com screenshots salvos temporariamente em `.codex-tmp/task21-app-profile*.png`.

## Pendências

- Provisionar bucket/credenciais Cloudflare R2 públicos definitivos para habilitar upload de avatar de paciente em task futura, sem mockar storage.