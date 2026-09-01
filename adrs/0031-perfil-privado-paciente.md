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

## Complemento 2026-06-17 - dropdown customizado de gênero

- O campo `gender` da tela `/app/profile/edit` passa a usar o modo customizado do `SelectController` (`useCustomSelect`) em vez do select nativo visível do navegador.
- A decisão preserva a fundação de formulários da TASK-02 (`useFormList`, React Hook Form, Zod e controllers compartilhados) e evita criar um componente paralelo específico para gênero.
- As opções continuam limitadas aos valores persistidos de `patient_profile.gender`: `feminino`, `masculino`, `nao_binario` e `prefiro_nao_dizer`, com opção vazia `Selecione seu gênero`.
- Não houve mudança de contrato, backend, Prisma, persistência, endpoints ou packages.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP local em mobile 390px confirmando ausência de `<select>` nativo visível, borda azul-clara, fundo branco, sombra leve, item selecionado em azul claro e ausência de overflow horizontal.

## Complemento 2026-06-17 - perfil bloqueado para usuário não autenticado

- O estado sem sessão de `/app/profile`, renderizado pelo `PrivateTemplate` para rotas públicas que ainda dependem de usuário autenticado, foi redesenhado como tela de onboarding/autenticação.
- A decisão mantém o bloqueio funcional e os destinos existentes (`/auth/profile-selection` para criar conta e `/auth/login` via `out` para login), mas substitui o `InlineAlert` por um card central premium com copy mais acolhedora.
- O card usa ícone `ShieldCheck`, título `Acesse sua conta`, texto orientado a perfil/preferências/continuidade e hierarquia visual clara: `Criar conta` como CTA primária e `Fazer login` como CTA secundária.
- Não houve mudança de contrato, backend, Prisma, persistência, endpoints ou packages.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP local em mobile 390px confirmando novo conteúdo, ausência da copy antiga, CTAs visíveis e card sem overflow horizontal.

## Complemento 2026-06-19 - consistência visual dos campos básicos

- O seletor `Gênero` em `/app/profile/edit` permanece no `SelectController` customizado para preservar acessibilidade, React Hook Form, Zod e a fundação da TASK-02.
- A decisão deste ajuste é remover o estilo local que deixava o seletor com borda azul específica, radius próprio, peso de fonte mais forte e sombra azul, adotando o mesmo padrão visual do campo `Nome de exibição` para a superfície fechada.
- O dropdown preserva as mesmas opções e o mesmo valor persistido em `patient_profile.gender`; apenas a camada visual do controle foi padronizada.
- Não houve mudança de contrato, backend, Prisma, persistência, endpoints ou packages.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile 390x844 em `/app/profile/edit`, confirmando consistência visual do seletor fechado com o input de nome.

## Complemento 2026-08-16 - copy de localização do paciente

- A descrição do campo `Estado` em `/app/profile/edit` deixa de comunicar opcionalidade como primeira informação e passa a orientar diretamente o benefício de proximidade regional: `Informe para aproximarmos psicólogos da sua região.`.
- A decisão preserva o campo como opcional no schema e no contrato: estado e cidade continuam podendo ficar ambos em branco, e a validação existente permanece exigindo ambos quando um deles for informado.
- O ajuste foi limitado à copy do formulário existente, sem mudança de backend, Prisma, persistência, endpoints, envs ou packages.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `pnpm check:version`, `git diff --check` e smoke local/homologação das rotas públicas de versão.

## Complemento 2026-08-31 - exclusao de conta fora da edicao pessoal

A separacao entre perfil pessoal e configuracoes sensiveis foi reforcada: `/app/perfil/editar` (alias `/app/profile/edit`) nao renderiza mais `AccountDeleteSection`. A exclusao self-service fica centralizada em `/app/configuracoes/conta`, junto de e-mail, senha e Google, preservando a fundacao segura da TASK-30 e sem alterar contratos de paciente.

Consequencias:

- A tela de edicao do paciente volta a tratar apenas dados pessoais permitidos.
- Pacientes e psicologos usam o mesmo ponto de entrada para exclusao de conta, reduzindo duplicidade de UI e risco de divergencia de fluxo.
- Sem mudanca de backend, banco, envs, providers, packages ou dados persistidos.
