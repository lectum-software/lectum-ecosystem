# TASK-146: Versionamento rastreável e promoção de produção por PR

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-146 |
| Prioridade | P0 |
| Esforço | M |
| Fase | Operação / Release |
| Status | Completed |
| Dependências | TASK-34, TASK-45, TASK-145 |
| ADR alvo | ADR-0441 |

## Contexto

Lectum possui `backend/`, `frontend/` e `admin/` no mesmo repositório, mas publica cada aplicação
separadamente. A branch de trabalho do desenvolvedor não técnico é sempre `homolog`; qualquer push
nessa branch inicia o CI/CD de homologação. A branch `main` publica produção e não pode receber
commit ou push direto.

Até esta task, os quatro `package.json` permaneciam em `0.1.0` e os ambientes publicados não
ofereciam uma forma simples de confirmar qual revisão estava em execução. Também faltava transformar
a solicitação explícita "coloque em produção" em um procedimento operacional objetivo executável
pelos agentes: abrir PR de `homolog` para `main`, aguardar checks, fazer merge e validar produção.

Não há referência visual aplicável. A entrega é um contrato operacional e HTTP discreto; Builder e
as imagens de `_product/proto` não devem gerar uma tela de produto para este caso.

## Objetivo

Permitir que uma pessoa não técnica consulte a versão efetivamente publicada de cada aplicação e
padronizar releases para que cada commit de desenvolvimento criado por agente incremente a versão
sincronizada antes de chegar a homologação.

## Escopo

### Política de versão

- Usar SemVer e manter a mesma versão em `package.json`, `backend/package.json`,
  `frontend/package.json` e `admin/package.json`.
- Fornecer comando raiz para incrementar o patch de todos os manifests em uma única operação.
- Bloquear commit quando os manifests estiverem dessincronizados ou quando a versão preparada não
  for superior à versão do `HEAD`.
- Incluir a verificação de sincronização no `pnpm check`.

### Contratos públicos de leitura

- Preservar o contrato existente de `GET /ping` no backend e adicionar `version` de forma aditiva.
- Criar `GET /version` no frontend e no admin, sem autenticação, retornando JSON com aplicação e
  versão do respectivo `package.json`.
- Ler o manifest no `next.config.ts` durante o build e injetar a versão como constante compilada nas
  rotas; Route Handlers não podem importar `package.json` diretamente nem depender dele em runtime.
- Responder sem cache e com diretiva `noindex`; não adicionar as rotas a navegação, sitemap ou
  qualquer listagem pública.
- Liberar somente `/version` no guard de autenticação do admin; as demais rotas continuam privadas.

### Fluxo dos agentes e produção

- Desenvolvimento, commits e pushes acontecem exclusivamente em `homolog`.
- Antes de cada commit criado por agente, executar o bump de versão e incluir os quatro manifests no
  mesmo commit.
- Quando o usuário pedir explicitamente para colocar em produção, o agente deve validar homologação,
  abrir ou reutilizar PR `homolog` -> `main` via GitHub CLI, aguardar checks obrigatórios, fazer merge
  sem excluir `homolog` e executar smoke de produção.
- Nunca fazer checkout para editar `main`, commit local em `main` ou push direto para `main`.

## Fora do escopo

- Criar dashboard visual de releases.
- Expor hash de commit, hostname, variáveis de ambiente ou informações internas de infraestrutura.
- Automatizar bump no merge remoto criado pelo GitHub.
- Criar tags ou GitHub Releases nesta etapa.
- Instalar packages novos.

## Impacto em produção e plano de rollout

- **Banco:** sem alteração de schema, migration ou dados.
- **Envs:** nenhuma variável operacional nova. `LECTUM_APP_VERSION` é definida internamente pelo
  `next.config.ts` com o manifest da própria aplicação e substituída no build; não deve ser cadastrada
  na Vercel, no Dokploy ou em arquivos `.env`.
- **Contratos:** `GET /ping` mantém `pong` e ganha apenas o campo aditivo `version`; consumidores
  antigos continuam compatíveis. As duas rotas `/version` são novas.
- **Compatibilidade entre aplicações:** cada deploy pode terminar em instante diferente; durante esse
  intervalo as rotas podem mostrar versões diferentes, o que representa corretamente o rollout.
- **Ordem de deploy:** não há dependência entre backend, frontend e admin.
- **Rollback:** restaurar a imagem/commit anterior de cada aplicação; a rota passa a mostrar a versão
  contida naquele artefato, sem efeito em dados.
- **Smoke de homologação:** consultar backend `/ping`, frontend `/version`, admin `/version`, além de
  backend `/health` e `/ready`.
- **Promoção:** somente depois do smoke, PR `homolog` -> `main`, checks verdes, merge e repetição do
  smoke nos domínios de produção.

## Contrato técnico detalhado

Referências: `ARCHITECTURE.md` (aplicações separadas, contratos aditivos e operação publicada) e
`PACKAGES.md` (nenhum package novo necessário).

Respostas esperadas:

```json
{"pong":"server ok!","version":"0.1.1"}
```

```json
{"application":"frontend","version":"0.1.1"}
```

```json
{"application":"admin","version":"0.1.1"}
```

Os números acima representam a primeira execução; próximas versões são obtidas dos manifests e não
devem ser hardcoded nas rotas.

## Critérios de aceite

- [x] Os quatro `package.json` possuem exatamente a mesma versão SemVer.
- [x] Existe comando raiz atômico para sincronizar os manifests ao incrementar o patch uma vez.
- [x] O hook de commit rejeita versão não incrementada ou manifests dessincronizados.
- [x] `pnpm check` valida a sincronização das versões.
- [x] O backend `GET /ping` mantém `pong` e retorna a versão real do `backend/package.json`.
- [x] Frontend `GET /version` é público, noindex, sem cache e retorna a versão real do manifest.
- [x] Admin `GET /version` é público, noindex, sem cache e não abre outras rotas administrativas.
- [x] Os Route Handlers não exigem o manifest em runtime e o Admin não sobrescreve
  `outputFileTracingRoot`.
- [x] Nenhuma rota de versão aparece em navegação ou sitemap.
- [x] Skills e instruções de Codex, Claude, Copilot e Cursor registram bump obrigatório e promoção por
  PR + merge quando o usuário pedir produção.
- [x] Nenhum package, env, migration ou dado foi adicionado/alterado.
- [x] Checks e builds de raiz, backend, frontend e admin foram executados sem erros.
- [x] Smoke HTTP local confirmou os três contratos e o guard do admin.
- [x] ADR-0441 criado e indexado.
- [x] Commit convencional criado em `homolog`, com bump, e push comunicado/executado.
- [x] Smoke de homologação registrou as versões publicadas e saúde do backend.

## Validação mínima

- `pnpm check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm --dir admin build`
- testes da política de versão
- smoke HTTP local em backend `/ping`, frontend `/version` e admin `/version`
- confirmação de que uma rota privada do admin ainda redireciona para `/login`
- smoke publicado em `/health`, `/ready`, `/ping` e nas duas rotas `/version`

## Notas de execução

- Não há formulário nem UI de produto; TASK-02 e protótipos não se aplicam.
- O GitHub CLI deve estar autenticado no ambiente que receber uma solicitação explícita de produção.
  Falha de autenticação/permissão bloqueia a promoção e nunca autoriza push direto em `main`.
- O PR de produção não deve excluir a branch permanente `homolog`.

## Execução

Concluída em 2026-08-08 com a primeira versão rastreável `0.1.1`.

- `scripts/release-version.mjs` centraliza `bump`, verificação de sincronização e validação do índice
  Git; o Lefthook chama o modo de commit antes de cada commit.
- A política possui testes unitários para formato, incremento, comparação e divergência.
- Backend lê `backend/package.json` no artefato compilado e preserva `pong` ao adicionar `version`.
- Frontend/admin leem seus próprios manifests no `next.config.ts` e injetam a versão como constante
  de build nos Route Handlers, que respondem sem cache e com `X-Robots-Tag` noindex.
- `/version` não foi adicionado ao sitemap nem à navegação. O proxy do Admin libera somente o caminho
  exato e mantém `/dashboard` protegido.
- `AGENTS.md`, Claude, Codex, Copilot, Cursor, arquitetura, task template e README registram a mesma
  regra de bump e promoção de produção por PR/merge via `gh`.
- Não houve mudança de banco, env, dependência ou dado; Builder/protótipo não se aplica a contratos
  JSON sem interface de produto.

Validações executadas:

- `pnpm check:version` e teste explícito do bloqueio quando a versão preparada não sobe;
- `pnpm --dir backend check` e `pnpm --dir backend build`;
- `pnpm --dir frontend check` e `pnpm --dir frontend build`;
- `pnpm --dir admin check` e `pnpm --dir admin build`;
- `pnpm check`;
- `git diff --check`;
- smoke dos builds locais: backend `/ping` 200 com `0.1.1`, frontend/admin `/version` 200 com
  `0.1.1`, headers `no-store`/`noindex`, ausência no sitemap e Admin `/dashboard` 307 para login.
- smoke publicado registrado depois do push em `homolog`.

### Correção pós-deploy da versão `0.1.1`

O empacotamento remoto do Admin na Vercel revelou uma diferença não reproduzida pelo build local: a
coleta tentou executar `lstat` em `/.next/package.json` e encerrou com `ENOENT`. Esse arquivo é parte
normal do artefato Next; a investigação mostrou que somente o Admin sobrescrevia
`outputFileTracingRoot: process.cwd()`. Na Vercel, o diretório de execução pode ser a raiz do checkout
em vez de `admin/`, deslocando os caminhos do trace. A versão `0.1.2` ancora o tracing no diretório
real de `admin/next.config.ts`, sem depender do CWD, e também remove a leitura do manifest em runtime
nas duas aplicações Next. Cada `next.config.ts` fornece `LECTUM_APP_VERSION` como constante compilada;
nenhuma env de deploy foi criada. O verificador de envs reconhece essa exceção somente enquanto a
declaração de build correspondente existir, evitando documentá-la incorretamente em `.env.example`.

Validação corretiva local: builds de backend, frontend e admin concluídos; o Admin compilou sem
warning de raiz inferida e registrou `outputFileTracingRoot` em `admin/`; os bundles Next continham
`0.1.2` como literal; `/health`, `/ready`, `/ping` e as duas rotas `/version` responderam 200, enquanto
`/dashboard` do Admin permaneceu protegido com redirecionamento 307. Essa evidência local não foi
suficiente: o deploy remoto de `0.1.2` repetiu exatamente o mesmo `ENOENT` no Admin, embora backend e
frontend tenham publicado a versão.

### Correção pós-deploy da versão `0.1.2`

O segundo deploy demonstrou que trocar o valor de `outputFileTracingRoot` não eliminava a causa: a
presença da sobrescrita continuava incompatível com a coleta da Vercel. A versão `0.1.3` remove a
propriedade por completo e usa somente `turbopack.root`, o mesmo padrão já publicado com sucesso pelo
frontend. O build do Admin com `VERCEL=1` foi repetido sem warning, gerou `.next/package.json` e
manteve o trace padrão do Next apontando para a própria aplicação. Checks e builds dos três projetos
passaram em `0.1.3`; o smoke local confirmou `/health`, `/ready`, `/ping`, frontend/admin `/version` e
o redirecionamento 307 da rota privada do Admin.
