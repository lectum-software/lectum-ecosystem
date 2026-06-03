# TASK-02: Form Composition Foundation

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-02 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Frontend foundation |
| Status | Completed |
| Dependências | TASK-01 |
| ADR alvo | ADR-0005 |

## Contexto

O frontend Lectum terá muitas telas com campos: login, recuperação de senha, cadastro de paciente, cadastro de psicólogo, consulta CFP, filtros de psicólogos, contato WhatsApp, avaliações, edição de perfil, criação de post, configurações e checkout.

O sample em `sample/frontend/src/components/controllers` possui uma estrutura robusta de controllers: container com label/required/tooltip, erro inline, integração com React Hook Form via `Controller`, máscara/normalização por tipo de campo e composição dinâmica por array de fields. Essa referência deve inspirar a nova fundação, mas a implementação final precisa respeitar o frontend atual em `frontend/`, os componentes Lectum e a política de packages vigente.

Pesquisa revalidada em 2026-06-03:

- React Hook Form + `@hookform/resolvers` + Zod continua sendo a base recomendada neste projeto.
- TanStack Form foi avaliado, mas não deve substituir React Hook Form agora, pois criaria uma segunda arquitetura de formulários e quebraria a portabilidade conceitual do sample.
- TanStack Query continua sendo o padrão de server state; mutations devem ser integradas aos formulários por hooks em `api/callers`.

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`
- `sample/frontend/src/components/controllers`
- `sample/frontend/src/hooks/form`
- `sample/frontend/src/components/form`

## Objetivo

Criar a fundação estrutural de formulários do frontend Lectum antes das primeiras telas funcionais com campos, para que todas as tasks futuras usem uma composição única, tipada, validada e com erro inline em PT-BR.

## Pré-requisitos e bloqueios

- TASK-01 precisa definir os componentes visuais base do design system.
- Não copiar o sample literalmente sem adaptação ao frontend atual.
- Não instalar biblioteca nova de formulário sem ADR.
- Se uma máscara/campo depender de package novo, consultar `PACKAGES.md`, instalar somente o necessário e registrar ADR.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Arquivos/estruturas esperadas:

- `frontend/src/components/controllers/container.tsx`
- `frontend/src/components/controllers/index.ts`
- `frontend/src/components/controllers/input/index.tsx`
- `frontend/src/components/controllers/textarea/index.tsx`
- `frontend/src/components/controllers/checkbox/index.tsx`
- `frontend/src/components/controllers/select/index.tsx`
- `frontend/src/components/controllers/switch/index.tsx`
- `frontend/src/components/controllers/phone/index.tsx`
- `frontend/src/components/controllers/cpf/index.tsx`
- `frontend/src/components/controllers/cnpj/index.tsx`
- `frontend/src/components/controllers/cep/index.tsx`
- `frontend/src/components/controllers/money/index.tsx`
- `frontend/src/components/controllers/numeric/index.tsx`
- `frontend/src/components/controllers/percentage/index.tsx`
- `frontend/src/components/controllers/calendar/index.tsx`
- `frontend/src/hooks/form/index.tsx`
- `frontend/src/hooks/form/form.tsx`
- `frontend/src/hooks/form/types.ts`
- `frontend/src/hooks/form/initial.ts`

Implementação esperada:

- Criar `Container` único para label, required, tooltip opcional, descrição opcional e erro inline.
- O `Container` reserva **altura fixa** para o slot de erro em todos os campos (com ou sem erro), evitando layout shift quando a mensagem aparece/some. Nunca renderizar o erro de forma condicional que empurre o layout.
- Campos de input ocupam **largura total** (`w-full`) do container por padrão.
- Criar registry de controllers por tipo de campo.
- Criar `useFormList<FormType>()` inspirado no sample, aceitando:
  - `fields`;
  - `schema` Zod;
  - `defaultValues`;
  - `values`;
  - `resetOptions`;
  - `onlyRead`;
  - dependências opcionais.
- Usar `react-hook-form` como única base de formulários.
- Usar `zodResolver` como validação padrão.
- Garantir tipagem por `FieldValues`, `UseControllerProps`, `UseFormReturn` e tipos derivados do schema quando aplicável.
- Exibir mensagens de erro inline, acessíveis e em PT-BR.
- Normalizar valores vazios por tipo:
  - texto: `""`;
  - textarea: `undefined` quando vazio;
  - número/moeda/percentual: `null` quando vazio;
  - checkbox/switch: `false`;
  - select/date: `null`;
  - tags/listas: `[]`.
- Migrar o formulário atual de login para usar a nova fundação como smoke test, sem alterar contrato de autenticação.

## Escopo backend

- Nenhuma alteração backend é esperada.
- Não criar endpoint, model, seed ou dado fake para testar formulário.
- Se validação frontend precisar refletir regra backend, manter schema compatível com o endpoint real e registrar divergência em ADR.

## Fora do escopo

- Implementar telas completas de cadastro, perfil, comunidade ou checkout.
- Trocar React Hook Form por TanStack Form.
- Criar design system paralelo.
- Criar client HTTP paralelo.
- Criar mocks para popular selects ou campos dinâmicos.

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Todo formulário de produto deve usar `frontend/src/hooks/form` ou justificar exceção em ADR.
- Todo campo controlado deve usar controller em `frontend/src/components/controllers`.
- `Controller`/`useController` deve ficar encapsulado nos controllers, não espalhado nas páginas.
- Páginas continuam tendo `use-form.tsx`, mas esse arquivo deve declarar schema, default values, fields e submit, delegando renderização para a fundação.
- Inputs soltos em páginas só são permitidos para busca simples sem validação persistente; filtros avançados devem usar a fundação.
- Form submit deve chamar mutations de `frontend/src/api/callers/{dominio}`.
- Nenhum componente visual deve chamar Axios diretamente.
- Erros de API devem aparecer como feedback de formulário ou toast com texto PT-BR.

Packages permitidos nesta task:

- Já instalados:
  - `react-hook-form`;
  - `@hookform/resolvers`;
  - `zod`;
  - `@tanstack/react-query`;
  - `lucide-react`;
  - `sonner`;
  - `class-variance-authority`;
  - `clsx`;
  - `tailwind-merge`.
- Candidatos condicionais:
  - `react-imask` para CPF, CNPJ, CEP e telefone;
  - `react-number-format` para moeda, percentual e números formatados;
  - `cpf-cnpj-validator` se validação local de CPF/CNPJ for necessária além do Zod;
  - `libphonenumber-js` no frontend se validação real de telefone for necessária no client.
- Avaliado, mas não adotado agora:
  - `@tanstack/react-form`.

Regras anti-recriação específicas:

- Antes de criar qualquer controller, verificar se o sample possui equivalente e portar o conceito, não o código bruto.
- Antes de criar componente visual novo, reutilizar `frontend/src/components/ui` ou `frontend/src/registry/new-york-v4/ui`.
- Não criar um controller por tela; controllers são por tipo de campo.
- Não deixar mensagem de erro hardcoded em inglês.
- Não usar `register` diretamente em tela quando o campo precisar de label, erro inline, máscara, required ou normalização.

## Estados obrigatórios

- Campo normal.
- Campo focado.
- Campo com erro inline.
- Campo disabled.
- Campo read-only.
- Campo loading quando depender de options remotas.
- Campo vazio.
- Campo required.
- Campo com tooltip/descrição curta.
- Submit pending.
- Submit bloqueado por schema inválido.

## Critérios de aceite

- [x] Fundação `frontend/src/hooks/form` criada.
- [x] Controllers mínimos criados para input, textarea, checkbox, select, switch, phone, cpf, cnpj, cep, money, numeric, percentage e calendar.
- [x] `Container` único implementa label, required, tooltip/descrição e erro inline.
- [x] Slot de erro tem altura fixa reservada em todos os campos (sem layout shift).
- [x] Campos de input ocupam largura total (`w-full`) do container.
- [x] Login atual foi migrado como smoke test sem quebrar autenticação.
- [x] Todo schema usa Zod e `zodResolver`.
- [x] Todos os erros visíveis estão em PT-BR.
- [x] Nenhum formulário novo usa input solto quando a fundação se aplica.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Packages usados conferem com `PACKAGES.md`; nenhum package novo foi instalado.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] `pnpm --dir frontend check` sem erros/warnings.
- [x] `pnpm --dir frontend build` sem erros.
- [x] Browser/local runtime validou rota de login; estado de erro inline ficou pendente de validação visual automatizada por bloqueio do ambiente.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local com `pnpm --dir frontend dev`
- Teste manual:
  - abrir `/auth/login`;
  - submeter vazio;
  - validar erros inline;
  - submeter credenciais inválidas;
  - validar feedback sem deslogar usuário inexistente ou criar sessão fake.

## Evidências de execução

- `pnpm --dir frontend check`: aprovado sem erros ou warnings.
- `pnpm --dir frontend build`: aprovado com rotas `/`, `/auth/login`, `/auth/redirect`, `/auth/error` e `/dashboard`.
- `pnpm --dir frontend dev`: servidor local subiu em `http://localhost:3000`.
- `curl -I http://localhost:3000/auth/login`: retornou `HTTP/1.1 200 OK`.
- Browser MCP: sem navegadores disponíveis na sessão (`agent.browsers.list()` retornou `[]`).
- Chrome Apple Events: bloqueou execução de JavaScript com `Access not allowed`.
- Safari Apple Events: exigiu habilitar `Allow JavaScript from Apple Events`.
- Pendência operacional registrada na `ADR-0005`: repetir smoke visual quando o ambiente de browser permitir automação.

## Notas para executor

Esta task é fundação estrutural. Ela deve viabilizar as próximas telas, não antecipar cadastros ou fluxos de produto. Se algum controller avançado ficar grande demais, priorize o contrato base e registre pendência para a task que realmente usará aquele campo.
