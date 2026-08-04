# TASK-145: Rotas em PT-BR e SEO canonico

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-145 |
| Prioridade | P0 |
| Esforco | L |
| Fase | SEO / Rotas publicas e privadas |
| Status | Completed |
| Dependências | TASK-40, TASK-141, TASK-143, TASK-144 |
| ADR alvo | ADR-0412 |

## Contexto

Após a tela Admin **SEO / Metadados** expor as rotas públicas configuráveis, foi identificado que os caminhos canônicos visíveis para páginas brasileiras ainda estavam em inglês, como `/psychologists`, `/community` e `/community/top-mentors`.

A arquitetura da TASK-40 separou paginas publicas indexaveis de areas privadas em `/app`. Esta task migra rotas publicas canonicas e slugs privados visiveis para PT-BR, preservando endpoints de API existentes para evitar quebra operacional.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Esta task não altera layout visual; reutiliza as telas existentes e apenas publica novas rotas/canônicos.

## Objetivo

Tornar PT-BR os caminhos publicos indexaveis e os slugs privados visiveis da Lectum, mantendo compatibilidade por redirects permanentes das URLs antigas em ingles.

## Escopo frontend público

- Criar rotas públicas canônicas:
  - `/psicologos`;
  - `/psicologos/[id]`;
  - `/psicologos/[id]/contato`;
  - `/comunidades`;
  - `/comunidades/[slug]`;
  - `/comunidades/[slug]/publicacao/[id]`;
  - `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]`;
  - `/comunidades/top-mentores`.
- Manter as telas reais existentes, sem duplicar regra de domínio nem criar mocks.
- Atualizar links internos, navegação, CTA, compartilhamento e destinos pós-login para usar os caminhos canônicos em PT-BR.
- Atualizar sitemap, llms.txt, metadados server-side e helpers de SEO para os caminhos novos.
- Adicionar redirects permanentes das rotas antigas em inglês para as novas rotas em PT-BR.

## Escopo frontend privado

- Criar rotas canonicas privadas em PT-BR sob `/app`, mantendo `/app` como namespace noindex: `/app/notificacoes`, `/app/perfil`, `/app/favoritos`, `/app/comunidades-seguidas`, `/app/publicacoes/*`, `/app/avaliacoes/*`, `/app/configuracoes/*`, `/app/conta/redefinir-senha`, `/app/profissional/*`, `/app/comunidades/*` e `/app/psicologo/*`.
- Criar rota de onboarding do paciente em `/paciente/boas-vindas`.
- Atualizar navegacao privada, fluxos obrigatorios, notificacoes, view-as Admin e redirects retornados pelo backend para apontarem para as rotas privadas PT-BR.
- Adicionar redirects permanentes das rotas privadas antigas em ingles para as equivalentes em PT-BR.

## Escopo backend

- Atualizar defaults de `site_seo_setting` para rotas/canônicos PT-BR.
- Garantir que registros existentes de SEO atualizem `route_path` operacional e canônicos legados sem apagar customizações reais.
- Atualizar endpoints públicos dinâmicos de SEO para retornarem canônicos PT-BR.
- Atualizar classificação de analytics first-party para reconhecer tanto rotas PT-BR novas quanto rotas legadas em inglês.

## Escopo admin

- Ajustar placeholder da URL canônica para seguir a rota selecionada em PT-BR.
- O Admin continua usando os mesmos endpoints reais e a mesma tela mobile-first já entregue na TASK-141/TASK-144.

## Fora do escopo

- Renomear o prefixo tecnico `/app` ou os endpoints backend/API historicos.
- Renomear endpoints backend `/api/private/directory/psychologists`, `/api/private/community`, `/api/private/patient` ou similares.
- Migrar `page_key` interna (`psychologists`, `community`, etc.), porque é chave operacional e não URL pública.
- Backfill manual de eventos analíticos históricos.

## Critérios de aceite

- [x] Rotas PT-BR públicas renderizam as telas reais existentes.
- [x] Rotas antigas em inglês redirecionam permanentemente para as rotas PT-BR equivalentes.
- [x] Rotas privadas PT-BR renderizam as telas reais existentes sob `/app`/`/paciente`.
- [x] Links internos, destinos pos-login e fluxos obrigatorios usam slugs PT-BR quando apontam para paginas publicas ou privadas.
- [x] Sitemap, llms.txt e metadados server-side usam URLs canônicas PT-BR.
- [x] Admin SEO exibe `route_path` PT-BR e placeholder de canônica coerente com a página selecionada.
- [x] Endpoints públicos dinâmicos de SEO retornam canônicos PT-BR para comunidade, post/thread e perfil de psicólogo.
- [x] Analytics first-party reconhece rotas PT-BR sem perder compatibilidade com caminhos antigos.
- [x] Nenhum `<img>` cru foi introduzido.
- [x] Nenhum package novo foi instalado.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Browser/HTTP local validou rotas novas e redirects legados.
- [x] ADR criado/atualizado.
- [x] Commit criado e push executado.

## Validação mínima

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- HTTP/browser local em rotas novas e redirects antigos.

## Execução

Concluída em 2026-08-03.

- Rotas públicas canônicas criadas em PT-BR reutilizando as telas existentes: `/psicologos`, `/psicologos/[id]`, `/psicologos/[id]/contato`, `/comunidades`, `/comunidades/[slug]`, `/comunidades/[slug]/publicacao/[id]`, `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]` e `/comunidades/top-mentores`.
- Rotas privadas visíveis criadas em PT-BR sob `/app`/`/paciente`, incluindo favoritos, notificações, perfil, publicações, avaliações, configurações, área profissional, comunidades e perfil/contato de psicólogo.
- Redirects permanentes preservam compatibilidade das rotas antigas em inglês públicas e privadas.
- Links internos, navegação privada, fluxos pós-login/onboarding, notificações, view-as Admin, compartilhamento, sitemap, `llms.txt`, metadata SSR e SEO dinâmico foram atualizados para URLs canônicas PT-BR.
- Defaults de SEO no backend sincronizam `route_path`/`canonical_url` gerenciados para PT-BR sem sobrescrever canônicos customizados pelo Admin.
- Analytics first-party e resumos Admin reconhecem rotas PT-BR e mantêm compatibilidade com caminhos legados.
- Não houve mudança visual de layout; o `PROTO-INVENTORY.md` foi consultado e o Quick Copy ativo permaneceu como referência, mas nenhum código Builder foi usado.
- Nenhum package novo foi instalado e não houve alteração em Prisma schema/migrations; `db:migrate` não se aplicou.

Validações executadas:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- `git diff --check`
- Smoke HTTP local com `next start`:
  - `/psicologos` -> 200;
  - `/comunidades` -> 200;
  - `/psychologists` -> 308 `/psicologos`;
  - `/community/top-mentors` -> 308 `/comunidades/top-mentores`;
  - `/app/perfil` -> 200;
  - `/app/notificacoes` -> 200;
  - `/app/profile` -> 308 `/app/perfil`;
  - `/app/notifications` -> 308 `/app/notificacoes`;
  - `/app/professional/billing` -> 308 `/app/profissional/assinatura`;
  - `/patient/welcome` -> 308 `/paciente/boas-vindas`;
  - `/sitemap.xml` -> 200 com rotas PT-BR.
- Smoke HTTP local protegido:
  - `/app/profissional/assinatura` -> 307 login com callback PT-BR;
  - `/app/configuracoes/conta` -> 307 login com callback PT-BR;
  - `/app/comunidades/feed/publicacao/nova` -> 307 login com callback PT-BR;
  - `/paciente/boas-vindas` -> 307 login com callback PT-BR.
- Smoke HTTP local do backend:
  - `GET /api/public/seo/metadata` retorna `route_path`/`canonical_url` PT-BR para páginas gerenciadas;
  - `GET /api/public/seo/community/:slug` retorna canônico `/comunidades/:slug`;
  - `GET /api/public/seo/community-post/:slug/:id` retorna canônico `/comunidades/:slug/publicacao/:id`;
  - `GET /api/public/seo/community-post/:slug/:id/replies/:replyId` retorna canônico `/comunidades/:slug/publicacao/:id/resposta/:replyId`;
  - `GET /api/public/seo/psychologist/:id` retorna canônico `/psicologos/:id`.

## Ajuste pós-feedback 2026-08-03 - slug público de resposta compartilhável

- [x] O Admin SEO/Metadados passa a listar também **Resposta de comentário** com rota pública `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]`.
- [x] A chave operacional `community_post_reply` foi adicionada aos defaults reais de SEO, sem migration, porque `site_seo_setting.page_key` é string e `SeoMetadataRepository.ensureDefaults()` cria a linha ausente em bases existentes.
- [x] O fallback de metadata das páginas públicas de thread/resposta usa `community_post_reply`, enquanto posts raiz continuam usando `community_post`; o endpoint dinâmico real de SEO de respostas permanece o mesmo.
- [x] Revalidado com checks/builds de backend, frontend e admin, `pnpm check`, `git diff --check`, smoke HTTP de `GET /api/public/seo/metadata` confirmando a nova rota e Chrome headless mobile em `/configuracoes/seo-metadados` (sem sessão administrativa no perfil headless, exibindo o login do Admin).

## Ajuste pós-feedback 2026-08-03 - contenção da lista de páginas públicas

- [x] O seletor Admin **Páginas públicas** recebeu contenção com `min-w-0`, `overflow-hidden`, truncamento do caminho e badge sem encolhimento para que rotas longas, como a de resposta de comentário, não expandam a coluna.
- [x] A grade entre o seletor e o editor SEO passou a conter largura mínima zero nos wrappers relevantes, mantendo o editor no próprio bloco em telas desktop e preservando o empilhamento mobile-first.
- [x] Nenhum package novo foi instalado, nenhum mock foi criado e não houve alteração em Prisma schema/migrations; `db:migrate` não se aplicou.
- [x] Revalidado com `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `git diff --check` e browser local em Chrome em `http://localhost:3002/configuracoes/seo-metadados`, confirmando que a opção **Resposta de comentário** fica truncada dentro do card e não vaza para o editor.

## Ajuste pós-feedback 2026-08-03 - prévia Open Graph no Admin

- [x] A tela Admin **SEO / Metadados** ganhou o card **Prévia Open Graph**, renderizado a partir dos campos reais do formulário (`og_title`, `og_description`, `og_image_url`, canônica e fallbacks SEO).
- [x] A prévia usa `next/image`, respeita os hosts permitidos já usados no upload/miniatura Open Graph e exibe estado seguro quando não há imagem ou o host externo não está habilitado.
- [x] O layout permanece mobile-first: uma coluna em telas menores, duas colunas em desktop e três cards apenas em telas amplas, sem criar estrutura paralela.
- [x] Nenhum package novo foi instalado, nenhum mock foi criado e não houve alteração em Prisma schema/migrations; `db:migrate` não se aplicou.
- [x] Revalidado com `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `git diff --check` e browser local em Chrome em `http://localhost:3002/configuracoes/seo-metadados`, confirmando a prévia Open Graph ao lado da prévia de busca.

## Ajuste pós-feedback 2026-08-04 - alinhamento dos blocos e espaço das prévias

- [x] O seletor **Páginas públicas** e o bloco **Página selecionada** passaram a compor a mesma linha de grid, com bases alinhadas pelo item stretch dessa linha.
- [x] Os blocos **Prévia de busca**, **Prévia Open Graph** e **Publicação** foram movidos para uma grid própria abaixo, ocupando a largura completa da área de conteúdo em desktop amplo.
- [x] O layout continua mobile-first: a linha principal empilha em telas menores e as prévias passam de uma coluna para duas/três conforme a largura disponível.
- [x] Nenhum package novo foi instalado, nenhum mock foi criado e não houve alteração em Prisma schema/migrations; `db:migrate` não se aplicou.
- [x] Revalidado com `pnpm --dir admin check`, `pnpm --dir admin build`, `pnpm check`, `git diff --check` e browser local em Chrome em `http://localhost:3002/configuracoes/seo-metadados`, confirmando a base alinhada e as três prévias com mais largura útil.
