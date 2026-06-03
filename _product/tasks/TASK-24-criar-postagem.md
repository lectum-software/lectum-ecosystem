# TASK-24: Criar postagem

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-24 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Comunidades |
| Status | Pending |
| Dependências | TASK-02, TASK-23 |
| ADR alvo | ADR de criação de posts |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Criar Nova Postagem - Pacientes.jpg` | `figma-design-frame-38-Criar-Nova-Postagem---Pacientes.html` |
| `_product/proto/Criar Nova Postagem - Psicólogo.jpg` | `figma-design-frame-29-Criar-Nova-Postagem---Psic-logo.html` |
| `_product/proto/Confirmação de Postagem.jpg` | `figma-design-frame-28-Confirma--o-de-Postagem.html` |
| `_product/proto/post_add_24dp_64748B_FILL0_wght400_GRAD0_opsz24 1.jpg` | `figma-design-frame-62-post-add-24dp-64748B-FILL0-wght400-GRAD0-opsz24-1.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Os protótipos mostram variações por tipo de usuário. A implementação precisa respeitar role, comunidade selecionada e regras de publicação.

## Objetivo

Permitir criação real de post por paciente e psicólogo, com diferenças de perfil e confirmação.

## Pré-requisitos e bloqueios

- Anexos usam Cloudflare R2 via API S3-compatible (decisão da TASK-03 / ADR-0006); sem credenciais/bucket no ambiente, implementar texto sem upload e registrar pendência.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas (convenção canônica de `DATA-MODEL.md`):

- `/app/community/[slug]/post/new`
- `/app/community/[slug]/post/success`

Implementação esperada:

- Criar formulário de post com comunidade, título, conteúdo e anexos se permitidos.
- Usar variação visual por paciente/psicólogo sem duplicar lógica.
- Criar tela/modal de confirmação.
- Usar ícone de adicionar via lucide ou asset estável.
- Invalidar feed após criação.

## Escopo backend

Implementação esperada:

- Endpoint privado para criar post.
- Validar comunidade existente (por `slug`) e usuário autenticado.
- Persistir `community_post.status` segundo a decisão de moderação abaixo.
- Se anexos forem usados, depender de storage real R2.
- Registrar `author_id`; o tipo de perfil deriva de `user.role`, não é coluna nova do post.

Decisão de moderação (ADR desta task): adotar o default de `DATA-MODEL.md` — criar post diretamente como `status = "publicado"` com **moderação reativa** (remoção posterior para `"removido"`), pois o PRD §16 só prevê moderação por IA na V3. O valor `"pendente"` fica reservado para quando uma regra de pré-moderação for aprovada em ADR; não implementar fila de aprovação agora. Registrar esta decisão no ADR alvo.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `community_post` (`status`: `"publicado" | "pendente" | "removido"`)
- `community`

Endpoints esperados (convenção canônica de `DATA-MODEL.md`):

- POST `/api/private/community/:slug/posts`

Request/response: seguir o "Contrato padrão de API" de `DATA-MODEL.md` (envelope de sucesso/erro; validação via `validator/index.ts`). Após criar, invalidar a query key do feed da comunidade.

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
- TanStack Query
- multer/R2 S3-compatible apenas se credenciais reais estiverem disponíveis

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
- [ ] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [ ] Rotas seguem a convenção canônica do `DATA-MODEL.md`.
- [ ] Decisão de moderação (publicar vs pré-moderar) registrada no ADR alvo.
- [ ] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [ ] Backend implementado nos endpoints/modelos esperados quando aplicável.
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
