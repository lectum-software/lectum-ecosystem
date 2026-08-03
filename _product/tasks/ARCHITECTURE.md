# Arquitetura de Execução Lectum

Este documento é obrigatório para qualquer task de produto. Ele existe para impedir que o executor recrie o projeto do zero ou ignore padrões já existentes.

## Princípio

Frontend e backend estão no mesmo repositório apenas para desenvolvimento. Em código, decisões e validação, trate-os como aplicações separadas.

## Escopo profissional V1

Ver `adrs/0187-escopo-v1-psicologia-expansao-multiprofissional.md`.

A V1 da Lectum e explicitamente focada em psicologos. A arquitetura atual mantem `user.role` com `"paciente" | "psicologo"`, `psychologist_profile`, rotas publicas canonicas `/psicologos` e validacao CFP/CRP real.

Não generalize o produto para outras categorias de saúde dentro de tasks da V1. Nutricionistas, médicos, cardiologistas e demais profissionais devem entrar em versão futura por task própria, com ADR, migração de dados e contratos novos ou compatíveis. Até lá, não crie suporte parcial, mockado ou antecipado para CRM, CRN, CREFITO ou outros conselhos.

Quando uma nova decisão for naturalmente transversal (assinatura, billing, LGPD, analytics operacional, avaliação de profissional), prefira nomes/documentação genéricos somente para código novo. Não renomeie contratos `psychologist_*` existentes sem uma task de migração multiprofissional aprovada.

## Backend

Stack atual:

- Express 5;
- Prisma 7 com PostgreSQL;
- Passport/JWT/Google OAuth;
- Zod por meio do pacote local `src/packages/validator`;
- Swagger/Scalar por meio do pacote local `src/packages/swagger`;
- i18next em `locales/pt`;
- Socket.IO para eventos em tempo real.

### Estrutura obrigatória de módulos

Novas features de API devem seguir a estrutura atual:

```text
backend/src/modules/api/{public|private}/{dominio}/{caso}/
  DTOs/
  index.ts
  repositories/
  repositories/interfaces/
  use-cases/controller.ts
  use-cases/services.ts
  validator/index.ts
```

Para rotas simples de listagem, é aceitável começar com menos arquivos, mas a task deve justificar. Fluxos com regra de domínio, persistência ou autenticação devem usar controller/service/repository.

### Registro de rotas

- Registrar novas rotas em `backend/src/main/server/imports/write.ts`.
- Manter prefixos:
  - público: `/api/public/...`;
  - privado: `/api/private/...`.
- Rotas privadas devem usar o middleware de autenticação existente quando exigirem usuário autenticado.

### Resposta e erro

- Usar `send`, `error500`, `error` e `msg`.
- Não retornar formatos ad hoc de resposta.
- Erros visíveis ao usuário devem ter chave em `backend/locales/pt/translation.json`.
- Não criar mensagem em inglês em resposta pública.

### Validação

- Usar `backend/src/utils/validator.ts` e `src/packages/validator`.
- Não validar payload manualmente em service quando puder ser validado no `validator/index.ts`.
- O pacote local tem funções internas chamadas `mocks`; elas são mocks de geração/validação do pacote, não autorização para usar dados fake no produto.

### Prisma

- Modelos atuais usam nomes snake_case e `@@map` para tabela plural.
- Novos modelos devem manter campos padrão quando aplicável:
  - `id`;
  - `deleted`;
  - `deletedAt`;
  - `createdAt`;
  - `updatedAt`.
- Criar índices para filtros usados em listagens e relações.
- Atualizar `backend/src/interfaces/objects` quando o frontend/backend dependerem dos tipos.
- Quando uma task alterar `backend/prisma/schema.prisma` ou arquivos em `backend/prisma/migrations`, rodar obrigatoriamente `pnpm --dir backend db:migrate` durante a execução da task. O usuário não-dev não deve precisar aplicar migrations manualmente.
- Depois da migration, rodar checks/builds relevantes (`pnpm --dir backend check`, `pnpm --dir backend build` quando estrutural).
- Se `prisma migrate dev` falhar por conflito com dados ou estado preexistente no banco de desenvolvimento, não resetar automaticamente. Perguntar ao usuário se pode apagar os dados do ambiente de desenvolvimento antes de executar qualquer comando destrutivo, como `pnpm --dir backend exec prisma migrate reset`.
- Rodar `prisma generate` via scripts existentes quando necessário; `prisma migrate dev` e os scripts de check/build já geram o client.

### Autenticação e sessão

- Fluxos privados dependem de token JWT e header `x-device`.
- Não contornar `getDevice`, `passToken`, `LoginRepository.hidrate` ou cookies/store no frontend.
- Login Google precisa preservar token real retornado pelo backend.

### Documentação de API

- Manter estrutura compatível com `src/packages/swagger`, que lê rotas, validators e arquivos.
- Se um endpoint novo não aparecer em docs, corrigir a estrutura em vez de criar documentação paralela manual.

## Frontend

Stack atual:

- Next.js 16 App Router;
- React 19;
- Tailwind CSS 4;
- TanStack Query 5;
- Redux Toolkit + Redux Persist;
- Axios;
- React Hook Form + Zod;
- Sonner;
- Socket.IO client;
- Lucide React;
- componentes base em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui`.

### Estrutura obrigatória

Novas chamadas de API devem seguir:

```text
frontend/src/api/req/{dominio}/index.ts        # chamada HTTP usando callEndpoint + handleReq
frontend/src/api/callers/{dominio}/index.tsx   # hooks React Query/useMutation/useQuery
frontend/src/api/cache/keys.ts                 # query keys
```

Novas telas devem seguir:

```text
frontend/src/app/{rota}/page.tsx
frontend/src/app/{rota}/logic.tsx
frontend/src/app/{rota}/use-form.tsx           # quando houver formulário
```

Templates/shells devem viver em `frontend/src/templates`.

### Regras de UI

- **Mobile-first obrigatório**: projetar e implementar primeiro para mobile (base ~390px dos protótipos) e progredir para telas maiores com breakpoints. Toda task com UI deve tornar isso explícito na execução.
- **Nunca usar `<img>`**: sempre o componente `Image` de `next/image` (otimização e estabilidade de layout). `<img>` cru é proibido.
- **Tema claro/escuro/sistema** via `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`). Cores SEMPRE por tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `text-subtle`, `border-border`, `text-primary`/`bg-primary`/`bg-primary-soft`…), **nunca valores hardcoded** (`zinc-*`, `#fff`, `bg-[#...]`). A paleta dark vive em `.dark` no `frontend/src/app/globals.css`; toda tela deve funcionar nos dois temas.
- Primeiro ajustar e reutilizar componentes existentes.
- Não criar um design system paralelo.
- Design foundation deve transformar `registry/new-york-v4` e `components/ui` no padrão Lectum.
- Componentes de interface devem usar ícones `lucide-react` quando houver equivalente.
- Telas devem consultar `PROTO-INVENTORY.md` antes da implementação.
- Quando Builder/Quick Copy estiver disponível no cliente, usar o Quick Copy ativo para complementar a leitura visual.
- Quando Builder/Quick Copy não estiver acessível no ambiente, usar as imagens exportadas em `_product/proto` e registrar a limitação.
- Imagens de protótipo não autorizam copiar arquitetura, criar mocks ou aceitar código gerado automaticamente.
- Não manter URLs temporárias de ferramentas visuais como assets finais.

### Estado, sessão e guards

- Sessão real usa cookie de token e Redux Persist.
- `proxy.ts` protege rotas privadas.
- Apos a TASK-145, `/app` e namespace autenticado/noindex: paginas publicas de descoberta/leitura vivem fora de
  `/app` (`/`, `/psicologos`, `/psicologos/[id]`, `/comunidades`, `/comunidades/[slug]`,
  `/comunidades/[slug]/publicacao/[id]`, `/comunidades/top-mentores`). Rotas antigas em ingles existem apenas
  como compatibilidade por redirect permanente. Interacoes que exigem conta podem continuar sob `/app`, como criacao de post,
  sugestao de comunidade, favoritos, notificacoes, perfil, posts do usuario e area profissional.
- Os slugs privados visiveis tambem usam PT-BR sob `/app`: `/app/notificacoes`, `/app/perfil`,
  `/app/favoritos`, `/app/publicacoes/*`, `/app/avaliacoes/*`, `/app/configuracoes/*`,
  `/app/profissional/*`, `/app/comunidades/*` e `/app/psicologo/*`. Rotas privadas antigas em ingles
  existem apenas por redirect de compatibilidade.
- `useUserSet` é o caminho para gravar usuário/token pós-login.
- Não criar usuário fake em store para passar por rota privada.

### Forms

- `TASK-02` é a fundação obrigatória de formulários.
- Usar React Hook Form como única base de formulários do produto.
- Validar com Zod e `@hookform/resolvers`.
- Renderizar campos por `frontend/src/components/controllers`, não por inputs soltos em páginas.
- Usar `frontend/src/hooks/form` para composição dinâmica de fields, default values, schema, estado dirty/error e read-only.
- Encapsular `Controller`/`useController` nos controllers.
- Arquivos `use-form.tsx` de páginas devem declarar schema, fields, valores iniciais e submit; a renderização deve delegar para a fundação.
- Todo erro visível deve estar em PT-BR e aparecer inline quando for erro de campo.
- Campos de formulário ocupam **largura total** do container (`w-full`) por padrão.
- O slot de mensagem de erro tem **altura fixa reservada em todos os campos** (com ou sem erro), evitando layout shift quando o erro aparece/some. Já implementado no `Container` dos controllers (TASK-02) — não reintroduzir erro condicional que empurre o layout.
- Campos com máscara/normalização devem transformar valor visual em valor de domínio antes do submit.
- Inputs soltos só são aceitáveis para busca simples sem persistência nem validação; filtros avançados, edição e submit usam a fundação.

### Data fetching

- Usar TanStack Query nos callers.
- Mutations para comandos; queries para leitura.
- Keys em `api/cache/keys.ts`.
- Não chamar Axios diretamente em componentes.
- Invalidar queries por `queryClient.invalidateQueries` depois de mutations que alteram listas/detalhes.
- Preferir optimistic UI somente quando houver rollback claro e baixo risco de inconsistência.
- Para filtros em URL no Next App Router, usar `searchParams` da page ou `useSearchParams` em client component; se a task exigir tipagem/serialização complexa, avaliar `nuqs` com ADR.
- Para listas muito longas, avaliar `@tanstack/react-virtual`.
- Para tabelas/datagirds complexos, avaliar `@tanstack/react-table`.
- Não instalar TanStack Router enquanto Next App Router for a arquitetura vigente.

## Anti-recriação

Antes de criar arquivo novo, o executor deve procurar:

- componente equivalente;
- template equivalente;
- caller/req equivalente;
- helper de backend equivalente;
- modelo Prisma existente;
- tradução existente;
- pacote local em `backend/src/packages`.

Se for necessário criar estrutura nova, registrar a decisão em ADR.

Para modelos Prisma e contratos de API ainda não implementados, `DATA-MODEL.md` é a fonte única: campos, enums, relações, papel do usuário (`user.role`), paginação e convenção de rotas. Uma task deve referenciar a seção correspondente em vez de inventar schema; se faltar um campo, adicioná-lo primeiro em `DATA-MODEL.md`.

## Builder e protótipos

O Builder MCP e as imagens exportadas existem para reduzir ambiguidade visual. Eles não substituem:

- `ARCHITECTURE.md`;
- `PACKAGES.md`;
- padrões atuais de `frontend/src/api`;
- padrões atuais de `backend/src/modules/api`;
- decisões externas registradas em ADR.

Regras obrigatórias:

- não rodar Builder CLI a partir da raiz do repositório para geração de UI;
- quando necessário, rodar a partir de `frontend/` ou com `--cwd frontend`;
- respeitar `.builderignore` e `frontend/.builder/rules/lectum-frontend.mdc`;
- revisar qualquer código sugerido antes de aplicar;
- tratar Builder output como rascunho visual, não como implementação final.

## Integracoes externas de validacao documental

- CFP/CRP automatico: usar provider backend isolado para InfoSimples `cfp-cadastro` (ADR-0026), com token em `DOCUMENT_TOKEN`.
- A camada de controller/service nao deve conhecer detalhes do fornecedor; criar interface de provider para permitir troca futura sem mudar contratos das rotas `/api/private/psychologist/cfp/*`.
- Falhas de configuracao, rate limit, timeout ou resultado ambiguo devem falhar de forma honesta, sem mock e sem aprovar profissional automaticamente.
- O token `DOCUMENT_TOKEN` nunca pode sair do backend nem aparecer em logs, respostas HTTP, traces ou codigo frontend.
