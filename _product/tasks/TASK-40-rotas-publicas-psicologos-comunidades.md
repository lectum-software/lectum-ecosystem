# TASK-40: Rotas públicas de psicólogos e comunidades fora de /app

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-40 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Descoberta pública e roteamento |
| Status | Completed |
| Dependências | TASK-12, TASK-13, TASK-22, TASK-23, TASK-25, TASK-26, TASK-39 |
| ADR alvo | ADR-0180 |

## Contexto

A Lectum usa `/app` como shell de navegação e também hospedava páginas que, pelo produto, são públicas: busca/listagem de psicólogos, perfil público do psicólogo, exploração de comunidades, feed e leitura de posts. Isso dificulta a semântica de SEO/IA criada na TASK-39 e confunde a fronteira mental de autenticação: a comunidade só deve exigir conta para interações, como publicar, sugerir comunidade, seguir, votar, comentar, salvar ou favoritar.

Esta task separa a URL pública da URL autenticada sem recriar telas nem APIs. As telas públicas passam a responder fora de `/app`, enquanto `/app` fica reservado para áreas que exigem sessão ou ações autenticadas.

## Objetivo

Disponibilizar as superfícies públicas principais em rotas canônicas sem `/app`:

- `/psychologists`
- `/psychologists/[id]`
- `/psychologists/[id]/contact`
- `/community`
- `/community/feed`
- `/community/[slug]`
- `/community/[slug]/post/[id]`
- `/community/[slug]/post/[id]/thread/[replyId]`
- `/community/top-mentors`

Áreas autenticadas permanecem sob `/app`, incluindo favoritos, notificações, perfil, configurações, posts do usuário, área profissional e fluxos de interação/autoria de comunidade (`/app/community/suggest`, `/app/community/[slug]/post/new`).

## Pré-requisitos e bloqueios

- Arquitetura obrigatória em `ARCHITECTURE.md`.
- Política de packages em `PACKAGES.md`; nenhum pacote novo.
- `PROTO-INVENTORY.md` consultado; não há tela nova, apenas roteamento das telas já implementadas. Builder/Quick Copy não está disponível como ferramenta callable neste ambiente.
- Sem requisito externo.
- Sem alteração de banco/schema/migrations.

## Escopo frontend

- Criar wrappers públicos no App Router para reaproveitar a lógica existente das páginas de psicólogos e comunidades.
- Alterar navegação, links, compartilhamentos e redirecionamentos para as rotas públicas canônicas.
- Manter rotas de interação/autoria de comunidade sob `/app` e protegidas pelo `proxy.ts`.
- Ajustar `proxy.ts` para remover exceções públicas em `/app`.
- Atualizar SEO: sitemap, robots, `llms.txt`, noindex e homepage redirecionando para `/psychologists`.
- Ajustar manifest PWA para iniciar/escopar as rotas públicas atuais.

## Escopo backend

- Atualizar deep-links gerados pelo backend para notificações/digests e `profile_url` do ranking de mentores, apontando para rotas públicas.
- Sem endpoint novo.
- Sem alteração de banco/schema/migrations.

## Fora do escopo

- Criar aliases em português (`/psicologos`, `/comunidades`).
- Criar páginas estáticas editoriais ou `QAPage` com curadoria/consentimento.
- Alterar contratos de API ou modelos de dados.
- Tornar comandos de interação anônimos.

## Contrato técnico detalhado

- `/app` deve ser tratado como namespace autenticado pelo `frontend/src/proxy.ts`.
- As rotas públicas devem reutilizar as telas existentes sem duplicar lógica, dados ou mocks.
- Links de leitura devem apontar para rotas públicas (`/psychologists`, `/community`).
- Links de interação que exigem conta devem permanecer sob `/app` ou acionar conversão/login antes do comando.
- `robots.txt`/`sitemap.xml` devem listar apenas superfícies públicas indexáveis e manter `/app`, `/auth`, `/dashboard`, `/patient`, `/api` e onboarding profissional sensível fora da indexação.
- Nenhum pacote novo deve ser instalado.

## Critérios de aceite

- [x] `/psychologists`, `/psychologists/[id]`, `/community`, `/community/feed`, `/community/[slug]` e `/community/[slug]/post/[id]` existem fora de `/app`.
- [x] `/` redireciona para a página pública de psicólogos, conforme preferência de produto.
- [x] `/app` não possui exceções públicas no `proxy.ts`; rotas sob `/app` sem token redirecionam para login.
- [x] Navegação, cards, links de perfil, links de posts, compartilhamentos, notificações/digests e ranking de mentores usam URLs públicas quando a leitura é pública.
- [x] Criar post e sugerir comunidade continuam sob `/app` por exigirem autenticação.
- [x] `robots.txt`, `sitemap.xml`, `llms.txt`, headers e metadata refletem a nova separação público/autenticado.
- [x] Arquitetura e modelo de dados documentam a nova convenção de rotas.
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos seguem a fundação da TASK-02 quando aplicável; nesta task não foram criados formulários novos.
- [x] UI permanece mobile-first e sem `<img>` cru; a task só reendereça telas existentes.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0180-rotas-publicas-psicologos-comunidades.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke HTTP/browser local em `/`, `/psychologists`, `/community`, `/community/feed`, `/app/psychologists` sem cookie e `/app/community/suggest` sem cookie.

## Notas de execução

- A decisão de manter nomes em inglês nas URLs (`/psychologists`, `/community`) evita uma migração semântica maior nesta task. Aliases em português podem ser avaliados em task futura.
- Os arquivos de lógica permanecem fisicamente sob `frontend/src/app/app/...` para reduzir risco de regressão e duplicação; os novos segmentos públicos são wrappers canônicos. A movimentação física pode ser feita depois, se necessário, sem mudar URLs.

## Evidencias de validacao

- 2026-06-29: `pnpm --dir frontend check` executado com sucesso.
- 2026-06-29: `pnpm --dir frontend build` executado com sucesso.
- 2026-06-29: `pnpm --dir backend check` executado com sucesso.
- 2026-06-29: `pnpm --dir backend build` executado com sucesso.
- 2026-06-29: `pnpm check` executado com sucesso.
- 2026-06-29: smoke HTTP local com `next start --port 3000`:
  - `/` -> 307 `/psychologists`;
  - `/psychologists`, `/community`, `/community/feed`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` -> 200;
  - `/app/psychologists` -> 307 `/auth/login?callbackUrl=%2Fapp%2Fpsychologists`;
  - `/app/community/suggest` -> 307 `/auth/login?callbackUrl=%2Fapp%2Fcommunity%2Fsuggest`;
  - `/psychologist/cfp` -> 307 `/app/professional/cfp`.

## Notas finais

- `db:migrate` nao se aplica: nao houve alteracao em Prisma schema/migrations.
- Builder/Quick Copy nao estava acessivel como ferramenta callable; nao houve tela nova, apenas reenderecamento de telas existentes.

## Execucao complementar: navegacao livre em psicologos e contato sem login (2026-07-07)

- Pedido do usuario: a navegacao na pagina de psicologos deve ser livre, sem necessidade de login/cadastro, apenas com exibicao das tips de cadastro quando definido.
- Referencia visual ativa consultada: `PROTO-INVENTORY.md`; nao houve tela nova, apenas correcao de gate/fluxo nas superficies publicas ja previstas. Builder/Quick Copy nao esta exposto como ferramenta callable neste ambiente.
- Frontend: a rota publica `/psychologists/[id]/contact` passou a usar `PrivateTemplate allowAnonymous`, preservando navegação e formulario real de contato sem mostrar o card de area restrita para visitantes.
- Backend: `POST /api/private/directory/psychologists/:id/contact` e `POST /api/private/directory/psychologists/:id/contact-click` passaram para `optionalAuth`; visitantes anonimos geram `contact_request` real com `user_id=null` quando houver registro de contato, sem usuario fake e sem redirecionar para login.
- Frontend: chamadas publicas de contato/WhatsApp deixam de acionar sign-out/redirecionamento em 401 residual, preservando o fallback seguro do fluxo; o CTA de WhatsApp em `/psychologists*` tambem deixa de abrir gate de conversao que bloqueie a saida para o WhatsApp.
- `DATA-MODEL.md` e `ADR-0180` foram atualizados para explicitar que leitura, contato e WhatsApp em psicologos sao publicos; favoritos/avaliacoes continuam autenticados.
- Nao houve alteracao de Prisma schema/migrations nem package novo.

### Criterios complementares

- [x] `/psychologists` permanece navegavel sem cookie de sessao e sem redirecionar para login/cadastro.
- [x] `/psychologists/[id]/contact` renderiza a tela de contato sem exigir login/cadastro.
- [x] Clique/abertura de WhatsApp na descoberta/perfil nao exige login/cadastro nem modal bloqueante de conversao; quando a API registra contato anonimo, `contact_request.user_id` fica `null`.
- [x] As tips/prompts de cadastro continuam separadas da autorizacao e aparecem somente quando houver gatilho de produto definido.
- [x] Favoritos e avaliacoes permanecem autenticados.
- [x] Nenhum mock, seed artificial, endpoint simulado, package novo ou `<img>` cru foi usado.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR relevante atualizado.

### Validacoes do complemento

- `pnpm --dir backend exec biome check --write src/modules/api/private/directory/psychologists/index.ts src/modules/api/private/directory/psychologists/DTOs/IContactDTO.ts src/modules/api/private/directory/psychologists/repositories/ContactRepository.ts src/modules/api/private/directory/psychologists/use-cases/services.ts`
- `pnpm --dir frontend exec biome check --write src/api/req/directory/index.ts 'src/app/app/psychologist/[id]/contact/logic.tsx' src/components/conversion/progressive-conversion-provider.tsx`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build` com `NODE_OPTIONS=--max-old-space-size=4096`
- `pnpm check`
- Smoke API local sem `Authorization` em `POST /api/private/directory/psychologists/cmr6pzpbn000h5guht478a9l4/contact-click`: retornou HTTP 200 e `contact_request.user_id=null`; o registro e a notificacao gerados pelo smoke foram removidos ao final.
- Browser local headless em viewport mobile `390x844`:
  - `/psychologists` sem cookie renderizou sem card de area restrita;
  - `/psychologists/cmr6pzpbn000h5guht478a9l4/contact` sem cookie renderizou a tela de contato (`Contato seguro`/`Confirmar WhatsApp`) sem card de area restrita;
  - `/app/favorites` sem cookie continuou exibindo a area restrita de favoritos.
