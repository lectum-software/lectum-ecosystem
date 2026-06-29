# TASK-09: Cadastro inicial de psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-09 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Psicólogo |
| Status | Completed |
| Dependências | TASK-02, TASK-04, TASK-06 |
| ADR alvo | ADR de perfil psicólogo e status profissional |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Cadastro de Psicólogo.jpg` | `figma-design-frame-31-Cadastro-de-Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

A tela convida psicólogos a converter pacientes pelo WhatsApp, mas a conta profissional precisa passar por etapas posteriores. Esta task cria somente a identidade e o perfil inicial.

O cadastro de usuário **já existe** no backend (`POST /api/public/user/store`). Esta task adapta esse fluxo para criar um psicólogo: define `role="psicologo"` e cria o `psychologist_profile`, reaproveitando a criação de conta e a sessão existentes (mesmo padrão da TASK-07). A decisão de papel está em `DATA-MODEL.md` (campo `user.role` + `psychologist_profile` 1:1).

**Não crie `/api/public/psychologists/register` nem autenticação paralela.**

## Integração com backend existente (não recriar)

Fonte: `backend/src/modules/api/public/user/store`, registrado em `write.ts`.

- **`POST /api/public/user/store`** — body atual `{ name, email, password, password_confirm }` (validator: `email`, `password` mín. 10, máx. 128, sem composição obrigatória, relação `password == password_confirm`); header `x-device` obrigatório. Cria `user`, grava `log__user` em `$transaction`, **hidrata** (retorna `user` com token → já autenticado). **Não** marca `confirmed` (por isso vai para a verificação de e-mail da TASK-06 em seguida).

Adaptação esperada nesta task (extensão, não duplicação, espelhando a TASK-07):

- Estender o validator/DTO/service do `store` para aceitar `role="psicologo"` e, na mesma transação, criar o `psychologist_profile` correspondente (ver `DATA-MODEL.md`). A TASK-07 já introduz `role` opcional default `"paciente"`; aqui apenas passamos `"psicologo"` e ramificamos a criação do perfil.
- O `psychologist_profile` nasce com `crp_status="pendente"` e `published=false` (ver `DATA-MODEL.md`) — perfil não público até aprovação de CRP/CFP (TASK-10/11).
- Aceite de termos profissionais/LGPD: capturar o consentimento e persistir como timestamp/registro (preferir `user_background type:"terms_accept"` em vez de criar modelo novo; ver `DATA-MODEL.md`). O texto legal vem de TASK-03/TASK-34 — se indefinido, capturar o aceite e registrar a pendência.

Google: o login Google já existe (`GET /api/public/google/login/:deviceId` → callback → `/auth/redirect`). Para nascer como psicólogo, propagar o papel escolhido na "Seleção de Perfil" via `state` do OAuth e persistir no callback. Tratar como pequena extensão do callback existente, não como endpoint novo.

## Objetivo

Criar cadastro real de psicólogo com perfil profissional em status inicial, sem aprovar atuação antes da validação de CRP/CFP.

## Pré-requisitos e bloqueios

- Termos profissionais e LGPD precisam estar registrados como texto/versão antes do aceite definitivo.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/auth/register/psychologist`

Implementação esperada:

- Criar tela de cadastro de psicólogo com Google/e-mail, termos e CTA.
- Validar formulário com Zod.
- Usar caller próprio de auth/psychologist.
- Após cadastro, direcionar para consulta CFP/CRP quando e-mail estiver verificado.
- Não exibir perfil como público antes de status aprovado.

## Escopo backend

Implementação esperada:

- Estender `public/user/store` (validator/DTO/service/repository) para aceitar `role="psicologo"` e criar o `psychologist_profile` na mesma `$transaction` de criação do usuário — **não** criar endpoint de cadastro paralelo.
- Adicionar `user.role` (se ainda não existir via TASK-07) e o modelo `psychologist_profile` ao schema conforme `DATA-MODEL.md`, com migração Prisma aditiva.
- `psychologist_profile` nasce com `crp_status="pendente"` e `published=false`; separar cadastro de aprovação profissional (CRP/CFP em TASK-10/11).
- Preservar `hidrate`, `log__user` e o comportamento de não-confirmação automática (verificação de e-mail segue na TASK-06).
- Retornar próximo passo do onboarding profissional (consulta CFP/CRP).

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `user` (+`role`) (ver `DATA-MODEL.md`)
- `psychologist_profile` (ver `DATA-MODEL.md`) — campos iniciais `crp_status`, `published`, mais `headline`/`bio` opcionais; **não inventar campos** fora do `DATA-MODEL.md`.
- `user_background` (aceite de termos) (ver `DATA-MODEL.md`)
- `user_token` (sessão, já existente) (ver `DATA-MODEL.md`)

Endpoints esperados:

- `POST /api/public/user/store` (estendido para `role="psicologo"`, **não** novo).
- Fluxo Google existente (estendido para `role`).

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- React Hook Form
- Zod
- Prisma
- argon2

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Cadastro reaproveita `POST /api/public/user/store` (estendido para `role="psicologo"`), sem endpoint/auth paralelo.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Execução TASK-09

- Referência visual consultada pela imagem local `_product/proto/Cadastro de Psicólogo.jpg`; Builder/Quick Copy não está exposto como ferramenta direta neste ambiente.
- Implementado `/auth/register/psychologist` com UI mobile-first, Google, e-mail/senha, aceite de termos profissionais e formulário via fundação da TASK-02.
- Criado caller `registerPsychologist` reaproveitando `POST /api/public/user/store`.
- Estendido `user/store` para criar `psychologist_profile` na mesma transação do usuário quando `role="psicologo"`.
- `psychologist_profile` nasce com `crp_status="pendente"` e `published=false`.
- Fluxo Google existente continua usando o callback atual; o `state` recebe `role=psicologo`, `terms_accepted` e `terms_version` para novos usuários.
- Criada rota de handoff `/psychologist/cfp` para o destino pós-verificação do psicólogo, sem consulta automática, mock ou scraping; a integração CFP/CRP real permanece no escopo da TASK-10.

## Validação executada

- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local headless em `http://localhost:3000/auth/register/psychologist`.
- Cadastro real via `POST /api/public/user/store` validou retorno `role="psicologo"`, `confirmed=false`, token, `psychologist_profile.crp_status="pendente"`, `psychologist_profile.published=false` e aceite em `user_background type="terms_accept"`. O usuário temporário de validação foi removido ao final.
- `GET /api/public/google/login/:deviceId?role=psicologo...` retornou redirect real ao Google com `role` e aceite preservados no `state`.

## Pendências

- Texto legal profissional/LGPD definitivo permanece pendente das tasks legais; o aceite foi registrado com `terms_version="task09-professional-terms-pending-legal-copy"`.
- Consulta CFP/CRP automática permanece dependente da TASK-10 e de fonte/API autorizada.

## Ajuste visual posterior em 2026-06-05

- Pedido direto de produto: alinhar `/auth/register/psychologist` à imagem
  `_product/proto/Cadastro de Psicólogo.jpg`, mantendo os campos de nome completo e
  confirmação de senha.
- Builder/Quick Copy não está exposto como ferramenta direta nesta sessão; a imagem
  local do inventário foi usada como referência auditável.
- A tela foi reestruturada de forma mobile-first com card estreito, header com logo/tag,
  copy do protótipo, botão Google, divisor, formulário e rodapé interno.
- O formulário continua usando a fundação da TASK-02, Zod e o endpoint real
  `POST /api/public/user/store`; nenhum mock, endpoint paralelo ou dado fake foi criado.
- A métrica visual sem fonte persistida foi evitada; o rodapé mantém a regra real de
  perfil protegido até validação profissional.
- O script de build do frontend foi alinhado para `next build --webpack`, mantendo o
  mesmo bundler já usado em `next dev --webpack`, após OOM do Turbopack na validação.

### Validação do ajuste visual

- `pnpm --dir frontend check`
- `pnpm check`
- `pnpm --dir frontend build` tentou usar Turbopack e falhou por OOM do processo
  (`FATAL ERROR: Zone Allocation failed - process out of memory`), inclusive com
  `NODE_OPTIONS=--max-old-space-size=4096`.
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm --dir frontend exec next build --webpack`
  passou.
- `pnpm --dir frontend build` passou após o ajuste do script para webpack.
- Browser local via Chrome headless em
  `http://localhost:3000/auth/register/psychologist`, viewport mobile, retornou 200 e
  gerou captura visual de conferência.

## Ajuste posterior em 2026-06-05: captura de identidade Google

- Pedido direto de produto: cadastros de psicologo e paciente devem capturar o nome do
  usuario; quando feitos com Google, tambem devem capturar a foto de perfil.
- O cadastro de psicologo por e-mail ja preservava `name` e `password_confirm`; o fluxo
  foi mantido.
- O callback Google agora garante persistencia de `user.name` e `user.avatar` a partir do
  perfil Google para novos usuarios e atualizacao controlada para usuarios existentes.
- Nenhum endpoint paralelo, mock ou novo modelo foi criado.

### Validacao do ajuste

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=4096 pnpm check`
