# TASK-18: Perfil privado do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-18 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Psicólogo privado |
| Status | Pending |
| Dependências | TASK-02, TASK-11, TASK-12 |
| ADR alvo | ADR de edição de perfil profissional |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Perfil - Psicólogo.jpg` | `figma-design-frame-19-Perfil---Psic-logo.html` |
| `_product/proto/Editar Perfil - Psicólogo.jpg` | `figma-design-frame-1-Editar-Perfil---Psic-logo.html` |
| `_product/proto/Modal de Atualização de Perfil do Psicólogo.jpg` | `figma-design-frame-42-Modal-de-Atualiza--o-de-Perfil-do-Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

`Editar Perfil - Psicólogo.jpg` é uma tela longa e precisa ser quebrada em seções, não em um componente gigante. Alterações sensíveis devem preservar status e auditoria.

## Objetivo

Criar área privada do psicólogo para visualizar e editar dados profissionais sem quebrar validação/status.

## Pré-requisitos e bloqueios

- Alteração de documento profissional depende das regras da TASK-11.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/profile`
- `/app/professional/profile/edit`

Implementação esperada:

- Criar tela de perfil privado e edição por seções.
- Usar componentes reutilizáveis para avatar, campos, serviços, especialidades e disponibilidade.
- Validar formulários com Zod.
- Exibir modal de sucesso de atualização.
- Separar campos públicos e campos de conta/documento.

### Decomposição obrigatória por seção (uma seção = um componente)

A tela de edição é longa e **não pode ser um componente único**. Cada seção abaixo é um componente próprio que edita um subconjunto explícito dos campos de `psychologist_profile` / taxonomias / `professional_document` (ver `DATA-MODEL.md`). Nenhum campo fora desta tabela deve ser inventado.

| Seção (componente) | Modelo / tabela | Campos editados |
|---|---|---|
| Cabeçalho / avatar | `user` + `psychologist_profile` | `user.avatar`, `user.name`, `psychologist_profile.headline`, `crp` (somente leitura quando `crp_status="aprovado"`) |
| Sobre / vídeo | `psychologist_profile` | `bio`, `video_url` (somente Plano Profissional; manter `null` no gratuito) |
| Formação / experiência | `psychologist_profile` | `bio` (texto longo de experiência) — sem campo estruturado novo sem ADR |
| Especialidades | `specialty` + `psychologist_specialty` | seleção de catálogo `specialty` via join `psychologist_specialty` (Plano Gratuito limita a 3 — validar no service) |
| Serviços | `service` + `psychologist_service` | seleção de catálogo `service` via join `psychologist_service` |
| Abordagens | `approach` + `psychologist_approach` | seleção de catálogo `approach` via join `psychologist_approach` |
| Idiomas | `psychologist_profile` | `languages Json?` (`string[]`, ex.: `["pt","en"]`) |
| Modalidade | `psychologist_profile` | `modality` (`"online" \| "presencial" \| "hibrido"`) |
| WhatsApp | `psychologist_profile` | `whatsapp` (E.164; `whatsapp_verified_at` é somente leitura — verificação real por Twilio SMS/OTP, ver ADR-0006 e TASK-16) |
| Documentos / CRP | `professional_document` + `psychologist_profile` | upload/lista de `professional_document` (`type="crp"`, `file_key`, `status`); `crp`/`crp_status`/`cfp_verified_at` exibidos como somente leitura (fluxo de validação em TASK-10/11) |
| Publicação | `psychologist_profile` | `published Boolean` (só `true` aparece na busca, PRD §7) |

Campos sensíveis (`crp`, `crp_status`, `cfp_verified_at`, `whatsapp_verified_at`) **não** são editáveis livremente: alterar CRP aprovado reinicia o fluxo de validação (ver bloqueios).

## Escopo backend

Implementação esperada:

- Endpoints privados para ler/atualizar perfil profissional, alinhados à decomposição por seção acima.
- Validar campos com pacote local validator/Zod, respeitando os tipos/enums de `DATA-MODEL.md` (`modality`, `languages`, etc.).
- Não permitir alterar CRP aprovado sem reiniciar fluxo de validação (`crp`/`crp_status`/`cfp_verified_at` são controlados por TASK-10/11).
- Persistir auditoria mínima de alterações sensíveis.
- Gerenciar especialidades/serviços/abordagens via tabelas de junção, respeitando o limite de 3 especialidades do Plano Gratuito (PRD §13) no service.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `psychologist_profile`
- catálogos `specialty` / `service` / `approach`
- joins `psychologist_specialty` / `psychologist_service` / `psychologist_approach`
- `professional_document`

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- GET `/api/private/psychologist/profile`
- PUT `/api/private/psychologist/profile`
- PUT `/api/private/psychologist/profile/public-profile`

**Guarda de papel:** estes endpoints são exclusivos de psicólogo. Vivem sob `/api/private/psychologist/*` e são protegidos por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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
- @hookform/resolvers
- Prisma

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

- [ ] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
- [ ] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [ ] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [ ] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [ ] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [ ] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [ ] ADR criado ou atualizado em `adrs/`.
- [ ] Checks/builds relevantes foram executados sem erros.
- [ ] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
