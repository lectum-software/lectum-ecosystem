# Arquitetura de Execução Lectum

Este documento é obrigatório para qualquer task de produto. Ele existe para impedir que o executor recrie o projeto do zero ou ignore padrões já existentes.

## Princípio

Frontend, backend, admin e o serviço de vídeo estão no mesmo repositório apenas para
desenvolvimento. Em código, decisões, deploy e validação, trate-os como aplicações separadas.

## Operação em ambientes publicados

Desde **2026-08-07**, `frontend/`, `backend/` e `admin/` possuem homologação e produção publicadas. A arquitetura deve assumir dados persistentes e deploys independentes, não um projeto descartável de desenvolvimento.

### Branches e rollout

- `homolog` dispara automaticamente o ambiente de homologação.
- `main` dispara automaticamente produção.
- Toda mudança nasce e é publicada primeiro em `homolog`. Se o trabalho estiver em `main`, interromper antes de editar/commitar e orientar o usuário a trocar de branch.
- Push direto em `main` é proibido. A promoção ocorre por merge revisado após checks, builds e smoke test de homologação.
- O desenvolvedor não técnico permanece em `homolog`. Uma solicitação explícita para colocar em produção é executada pelo agente como PR `homolog` → `main` via `gh`, espera dos checks, merge sem excluir `homolog` e smoke de produção; não há commit/push direto em `main` nem etapa manual delegada ao usuário salvo bloqueio real de acesso.
- Backend, frontend, admin e video podem permanecer temporariamente em versões diferentes. Contratos novos devem ser aditivos, consumidores devem tolerar campos ausentes e remoções só podem ocorrer depois que nenhum consumidor antigo depender delas.
- Um push em `homolog` já é uma operação de deploy e deve ser comunicado como tal.

### Versão dos artefatos

- `package.json`, `backend/package.json`, `frontend/package.json`, `admin/package.json` e
  `video/package.json` mantêm a mesma versão SemVer.
- Cada novo commit criado por agente deve executar `pnpm version:bump` exatamente uma vez antes de ser preparado; uma repetição do mesmo commit após falha não recebe outro bump.
- O Lefthook bloqueia commit sem incremento ou com manifests dessincronizados; `pnpm check:version` valida a sincronização.
- Backend expõe sua versão de forma aditiva em `/ping`; frontend, admin e video expõem `/version`
  sem autenticação, cache ou indexação e sem links/sitemap.
- A versão é incorporada por cada build. Divergência temporária entre aplicações durante rollout é esperada e observável; não usar env manual para sobrescrever a versão.

### Evolução segura do banco

Usar o padrão **expandir → migrar → contrair**:

1. expandir com tabela/campo/índice compatível com registros e código existentes;
2. publicar backend que aceite os formatos antigo e novo;
3. executar backfill pequeno, observável, retomável e seguro para repetição;
4. validar contagens e comportamento em homologação;
5. somente em task/deploy posterior tornar campo obrigatório, remover fallback ou contrair schema.

Regras:

- migration aplicada é imutável; correções entram em uma migration nova;
- não adicionar coluna `NOT NULL` sem default seguro ou backfill prévio de todas as linhas;
- não renomear/remover tabela, coluna ou enum no mesmo deploy que remove seu uso;
- não usar `prisma db push` em homologação/produção;
- não executar reset, truncate, seed destrutivo ou exclusão em massa em ambiente publicado;
- alteração de banco exige ADR com compatibilidade, volume esperado, ordem de deploy, verificação e rollback;
- `pnpm --dir backend db:migrate` continua obrigatório no banco local quando schema/migrations mudarem; isso não substitui `prisma migrate deploy` do pipeline publicado.

### Evolução segura de configuração

- Preferir env opcional/default seguro no primeiro deploy e só exigir o valor depois de provisioná-lo em todos os ambientes.
- Se uma env precisar nascer obrigatória, emitir **ALERTA DE DEPLOY** antes do commit/push com: nome da chave, app afetado, se é segredo, ordem de cadastro em homologação e produção, comportamento se faltar e forma de validar. Nunca registrar o valor.
- Variável backend-only nunca usa prefixo `NEXT_PUBLIC_`; segredos nunca entram no bundle, Git, logs ou relatório.
- Remover env também exige rollout em duas etapas: primeiro código deixa de depender dela; depois a configuração é removida.

### Segurança operacional

- Não retornar nem exibir stack trace, SQL, nomes internos, mensagens cruas de provider, URLs internas, token, segredo ou PII.
- Logs devem usar contexto mínimo, identificadores de correlação e dados sanitizados.
- Jobs, campanhas e migrações de dados que possam produzir efeitos reais começam desabilitados e exigem ativação explícita depois de inspecionar registros pendentes.
- Para mudança backend, validar `/health` (processo) e `/ready` (dependências) após deploy em homologação.
- Toda task deve declarar riscos de deploy, rollback e ações manuais; “nenhum” também deve ser registrado quando confirmado.

### Observabilidade de aplicações

- Frontend, backend e admin usam projetos Sentry separados e mantêm SDK, DSN, release, build e
  configuração próprios. O repositório compartilhado não autoriza um runtime ou projeto Sentry
  único para as três aplicações.
- O rollout inicial é somente de erros. Tracing/performance, Replay, Logs, User Feedback e profiling
  permanecem desabilitados até task e ADR específicos avaliarem custo, consentimento e privacidade.
- DSN ou environment explícito ausente/inválido desabilita a integração sem impedir boot,
  build, navegação, jobs, `/health`, `/ready`, `/ping` ou `/version`. Não existe fallback de
  ativação para `NODE_ENV`, evitando misturar eventos de homolog e produção. Observabilidade é
  degradável; produto e deploy não dependem da disponibilidade do provider.
- Eventos nunca incluem usuário, e-mail, CPF, telefone, cookies, headers, request/response body,
  query string, token, segredo, SQL, variáveis de stack, context lines, breadcrumbs ou mensagens
  cruas de provider. A allowlist mantém tipo genérico/controlado da exceção, frames com
  identificadores sintéticos sem segmentos ou símbolos da origem, tags operacionais literais e
  metadados técnicos validados necessários à simbolicação, como event id, timestamp, level,
  platform, release, environment e debug ids; caminho absoluto de filesystem não pode sair da
  aplicação.
- Erros 4xx, autenticação recusada, rate limit, health/readiness degradado e demais respostas
  esperadas não viram issues. Falhas 5xx e catches operacionais inesperados podem ser capturados
  depois de sanitização.
- Nos apps Next, `NEXT_PUBLIC_SENTRY_DSN` e o environment público explícito são incorporados no
  build; o token de upload de source maps é segredo exclusivo do CI/build. Upload exige também
  DSN, environment, organização e projeto válidos; uma limpeza pós-build verificada impede publicar
  mapas externos ou inline mesmo se o provider falhar. A CSP permite apenas o origin HTTPS validado
  do DSN, nunca o DSN completo ou uma origem ampla.
- No backend, a inicialização do SDK precede Express, Prisma e demais integrações instrumentadas;
  o middleware de erro fica depois das rotas e antes do handler público existente. Source maps
  locais são consumidos com `--enable-source-maps`, sem expô-los por rota pública. Handlers fatais
  próprios imprimem somente mensagem genérica mesmo quando a DSN estiver ausente ou inválida.
- Falha no upload de source maps não bloqueia o build. O rollback completo remove/desativa DSN,
  environment e credenciais de upload da aplicação afetada; nenhuma alteração de banco, contrato
  de API ou dado persistido depende da integração.

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

### Divisão de responsabilidades no backend

O `sample/backend` pode ser consultado **somente quando a task ou o usuário o citar como referência técnica**, principalmente para entender divisão de responsabilidades. Ele não é fonte de versões, contratos, regras de negócio, mocks ou código a ser copiado. No código atual:

- `index.ts` registra middleware, validator e rota; não contém regra de negócio;
- `controller.ts` traduz HTTP para o caso de uso e devolve a resposta padronizada;
- `services.ts` é uma fachada/orquestrador: coordena autorização, repositórios e módulos de domínio, sem concentrar milhares de linhas de cálculo;
- `repositories/` concentra persistência e não importa controller ou composição HTTP;
- cálculos, agregações, builders e regras extensas vivem abaixo do próprio caso de uso, por domínio, por exemplo `use-cases/services/{perfil,trafego,assinaturas}` ou `application/{calculators,services}`;
- interfaces e DTOs ficam próximos do limite que representam, sem um arquivo genérico crescente;
- imports seguem uma direção única: rota/controller → service/orquestrador → domínio → repository/infra. Um módulo interno não importa de volta sua fachada.

Arquivos `index.ts`, `controller.ts` e `services.ts` são limites públicos/composição, não depósitos de implementação. Preserve seus exports durante extrações para evitar breaking changes em rotas, Swagger, validator e packages portados.

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

- Fluxos privados dependem de JWT, cookie de sessão `HttpOnly` e header `x-device`.
- Em produção, o frontend usa `lectum_user_session` (`HttpOnly`, `Secure`, `SameSite=Lax`) e o admin
  usa `lectum_admin_session` (`HttpOnly`, `Secure`, `SameSite=Strict`, restrito a `/api/admin`).
- O backend aceita temporariamente `Authorization: Bearer` antes do cookie para permitir rollout
  independente e sessões de clientes antigos. Esse fallback é compatibilidade de deploy, não o
  padrão para código novo.
- Os headers de capacidade `X-Requested-With: Lectum-User-Cookie-Auth` e
  `X-Requested-With: Lectum-Admin-Cookie-Auth` permitem ao backend omitir JWTs do JSON somente para
  clientes que já entendem cookie. Não remover o fallback bearer antes de confirmar que versões
  antigas não estão mais em uso.
- No transporte do usuário, a conversão para cookie só pode sobrescrever `allowAuthTokens` quando a
  resposta realmente trouxer o contrato de sessão top-level `user_tokens`. Respostas sem
  `user_tokens` permanecem sob a política padrão do `send`; uma exceção `allowAuthTokens: true`
  exige DTO mínimo, token transitório curto e escopado e ADR específico. Nunca liberar essa exceção
  globalmente nem usá-la para devolver JWT de sessão ao cliente compatível com cookie.
- O cookie legível pelo frontend é apenas um marcador de navegação. Ele nunca substitui a validação
  da API e não pode conter JWT no cliente atual.
- Não contornar `getDevice`, `passToken`, `LoginRepository.hidrate`, cookies de sessão ou o fluxo de
  logout/revogação.
- Login Google e “visualizar como” devem trocar o token transitório por cookie `HttpOnly`; nunca
  persistir o JWT em URL, `localStorage` ou Redux.

### Documentação de API

- Manter estrutura compatível com `src/packages/swagger`, que lê rotas, validators e arquivos.
- O backend é compilado como CommonJS: a geração deve continuar válida tanto sobre `src` no
  desenvolvimento quanto sobre `dist` no container. Preserve a resolução dos nomes compilados dos
  validators e não troque o import dinâmico de caminho absoluto por URL `file://` sem mudar e testar
  todo o runtime.
- Se um endpoint novo não aparecer em docs, corrigir a estrutura em vez de criar documentação paralela manual.

## Frontend

Stack atual:

- Next.js 16 App Router;
- React 19;
- Tailwind CSS 4;
- TanStack Query 5;
- Redux Toolkit;
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

Em telas complexas, essa estrutura mínima deve crescer **dentro da própria rota**, seguindo a forma de composição observada no `sample/frontend` quando ele for referência técnica explícita:

```text
frontend/src/app/{rota}/
  page.tsx                  # entrada da rota e dados de servidor, quando houver
  logic.tsx                 # composição dos hooks e do view model
  use-form.tsx              # schema/fields/submit da fundação de formulários
  components/               # partes visuais exclusivas da rota
  hooks/                    # estado, efeitos e ações por responsabilidade
  modules/                  # funções puras, formatadores e regras locais
  context/ ou *-context.tsx # estado compartilhado somente quando necessário
  types.ts                  # contrato local compartilhado
```

No admin, `client.tsx` tem o mesmo papel de composição de `logic.tsx`. `page.tsx`, `logic.tsx` e `client.tsx` não devem concentrar ao mesmo tempo fetching, estado, regras, eventos e milhares de linhas de JSX. Componentes filhos recebem contratos explícitos; hooks não importam a view; módulos puros não dependem de React.

Templates/shells devem viver em `frontend/src/templates`.

### Limites arquiteturais automatizados

- `pnpm check:source-size` limita novas raízes de composição (`page.tsx`, `logic.tsx`, `client.tsx`, `controller.ts` e `services.ts`) a **600 linhas** e demais fontes a **700 linhas**. O objetivo recomendado é manter raízes perto de 300 linhas; 600 é teto, não meta.
- Arquivo legado acima do teto só pode permanecer no baseline no tamanho atual ou menor. Ao cair abaixo do teto, sua entrada deve ser removida; nunca aumente o baseline para acomodar código novo.
- `pnpm check:cycles` impede ciclos de imports locais em backend, frontend, admin e video.
- Extrair apenas por contagem não basta: cada arquivo novo deve ter responsabilidade nomeável, direção de dependência clara e contrato tipado.
- `index.ts` pode expor a API pública de uma pasta, mas não deve ocultar dependências circulares nem virar implementação central.

### Regras de UI

- **Mobile-first obrigatório**: projetar e implementar primeiro para mobile (base ~390px dos protótipos) e progredir para telas maiores com breakpoints. Toda task com UI deve tornar isso explícito na execução.
- **Nunca usar `<img>`**: sempre o componente `Image` de `next/image` (otimização e estabilidade de layout). `<img>` cru é proibido.
- **Tema claro/escuro/sistema** via `next-themes` (`attribute="class"`, `defaultTheme="system"`, `enableSystem`). Cores SEMPRE por tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `text-subtle`, `border-border`, `text-primary`/`bg-primary`/`bg-primary-soft`…), **nunca valores hardcoded** (`zinc-*`, `#fff`, `bg-[#...]`) nem cores nominais da paleta Tailwind (`white`, `black`, `red-*`, `emerald-*` etc.). A paleta dark vive em `.dark` no `frontend/src/app/globals.css`; toda tela deve funcionar nos dois temas. O Admin segue a mesma regra com tokens `--admin-*` em `admin/src/app/globals.css`.
- Exceções técnicas de cor ficam isoladas: manifests PWA exigem literais serializáveis; canvas pode manter fallbacks no adaptador de tema; e cores configuráveis de comunidades podem ser persistidas como hexadecimal apenas em módulos de paleta. Essas exceções não autorizam cores cruas em JSX, componentes ou estilos inline. `pnpm check:source-safety` fiscaliza essa fronteira.
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

- A sessão real é validada pelo backend por cookie `HttpOnly` + `x-device`; Redux mantém apenas o
  usuário da aba em memória e é reidratado pela API.
- O frontend mantém somente um marcador não sensível para decidir se tenta hidratar. `proxy.ts` e
  esse marcador melhoram navegação, mas não são controle de autorização; a API é a autoridade.
- O admin não persiste usuário ou JWT em `localStorage`. Durante o rollout, um bearer legado pode
  existir apenas em memória/`sessionStorage` e deve desaparecer depois da hidratação por cookie.
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
- `useUserSet` é o caminho para gravar o usuário pós-login; o JWT é responsabilidade do cookie
  `HttpOnly` emitido pelo backend.
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

### Plano de controle e plano de dados de vídeo

- O backend Lectum é o **plano de controle**: autoriza o dono, persiste `video_asset`, valida a
  associação com perfil/post/resposta, recebe webhook assinado e emite playback curto.
- Cloudflare Stream é o **plano de dados** dos novos vídeos: o navegador envia por TUS diretamente
  para `upload.videodelivery.net` e reproduz HLS diretamente de `cloudflarestream.com`. Next e
  Express não transportam partes nem fazem proxy de manifestos/segmentos.
- `CLOUDFLARE_STREAM_API_TOKEN`, signing private key e webhook secret existem somente no backend.
  A URL TUS é uma capability temporária devolvida apenas ao dono e nunca é persistida/logada.
- Todo vídeo Stream nasce com `requiresignedurls` e `allowedorigins`. O player solicita uma URL
  assinada no endpoint público com autenticação opcional: associação a conteúdo público autoriza
  qualquer visitante; a sessão autoriza a prévia do dono. Rascunho, conteúdo removido/inativo e
  ativo sem vínculo público falham como `404`. A URL assinada fica apenas em memória/cache curto e
  nunca em banco, Redux, storage, analytics, export ou toast.
- O token Cloudflare é um JWT assinado, não criptografado. Portanto, seu payload técnico pode ser
  decodificado pelo cliente; o UID do provider não é uma credencial e jamais deve ser usado como
  autorização. A segurança vem da assinatura RS256, expiração, allowed origins e decisão do backend.
- Campos legados (`video_url`, `media_url`) armazenam somente a referência estável Lectum
  `/api/private/video-assets/:id/playback`. Vídeos R2 antigos seguem legíveis durante rollout.
- Exceção operacional das TASK-171/TASK-173: enquanto os endpoints legados de vídeo de
  apresentação, posts e respostas existirem, o frontend pode cair para upload multipart/R2 somente
  quando a provisão inicial da URL TUS do Stream falhar antes de qualquer byte ser enviado ao
  provider. A exceção vale para `profile_presentation`, `community_post` e `community_reply`, não
  mascara erros 400/401/403/413/422 nem falhas de upload/processamento TUS, e deve ser removida
  após a provisão Stream ficar estável.
- O endpoint canônico de emissão é `GET /api/public/video-assets/:id/playback`. O path privado
  persistido é tratado como identificador opaco e alias read-only temporário para compatibilidade;
  uploads, status e exclusão permanecem sob autenticação obrigatória.
- Safari/iPhone usa HLS nativo; Chrome/Android/Admin usa `hls.js` quando MSE está disponível. Em
  nenhum caso o download/original é habilitado pelo token.
- A feature flag pública e a flag backend começam desativadas. Rollout: migration/backend →
  credenciais/signing/webhook/origens → backend flag → frontend flag. Depois que o primeiro ativo
  Stream for associado, rollback de escrita desliga somente a flag pública; o backend/configuração
  Stream deve continuar ativo para reproduzir referências existentes. Nunca apagar ativos Stream
  ou objetos R2 no rollback.
- O backfill de referências R2 existentes pertence à TASK-165 e nunca roda no boot/deploy. Usar a
  operação compilada `video:migrate-r2-to-stream` em dry-run e lotes pequenos, com confirmação
  explícita do ambiente para qualquer escrita.
- A importação por link reconstrói a origem com o `BASE` atual, valida o objeto no R2 e exige
  `HEAD`/`GET Range` antes de chamar Stream. `creator` e `migration_key` determinísticos permitem
  retomada; resposta ambígua do provider falha fechada.
- A origem desse backfill usa o endpoint técnico extensionless e no-store da TASK-166, não a URL
  legada com extensão. Isso preserva `HEAD` + `GET Range` quando o Cloudflare Proxy converte uma
  requisição cacheável antes de consultar a origem e mantém a reprodução final fora do backend.
- Campos de perfil/post/resposta só recebem a referência Lectum depois de `ready` e por
  compare-and-swap da origem observada. A operação não apaga vídeo/capa R2; retenção e contração
  futuras exigem task própria depois de homologação e inventário zero.


### Serviço isolado de processamento de vídeo

- `video/` é uma quarta aplicação Node independente; não importa código nem lockfile de
  `backend/`, `frontend/` ou `admin/` e não participa do caminho crítico do Cloudflare Stream.
- A API privada recebe uploads autenticados de serviços internos, grava bytes em volume não
  público e enfileira somente metadados opacos no BullMQ/Redis. O browser nunca recebe sua chave.
- Workers executam FFmpeg/ffprobe por `spawn` com argumentos fechados e `shell: false`. MediaBunny,
  FFmpeg no browser, Chromium e execução de shell interpolado não são permitidos.
- API, worker e Redis são processos separados. Redis fica em rede privada com persistência; API e
  worker compartilham o mesmo volume no deployment inicial e usam concorrência `1` por worker.
- A saída de compressão é MP4 H.264/AAC validada e publicada por rename atômico. Download exige
  Bearer interno, suporta Range único e nunca usa `express.static`.
- Novas operações, como marca d'água ou thumbnail, entram como job/processador explícito com ADR,
  limites e retenção próprios; não devem ser adicionadas ao backend HTTP.
- `pnpm --dir video check` e `pnpm --dir video build` são obrigatórios quando a aplicação mudar.

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
