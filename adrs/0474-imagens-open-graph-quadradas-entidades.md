# ADR-0474: Imagens Open Graph quadradas por entidade

## Status

Accepted

## Task relacionada

TASK-143

## Contexto

O Admin SEO/Metadados permite configurar uma imagem Open Graph por template de pagina publica. Para rotas dinamicas, como `/psicologos/[id]` e `/comunidades/[slug]`, essa imagem deve funcionar apenas como fallback: o compartilhamento de uma entidade especifica precisa priorizar a foto publica daquela entidade.

O ajuste anterior ja expunha `user.avatar` e `community.avatar_url` como origem dinamica de `og:image`, mas o link apontava diretamente para a midia original. Isso nao garantia que todo crawler receberia uma imagem quadrada real quando o arquivo de origem nao tivesse proporcao 1:1 ou quando uma plataforma cacheasse a URL sem variacao apos troca de avatar.

## Decisao

Criar rotas publicas de imagem no frontend para entidades compartilhaveis:

- `/api/og/psicologos/[id]`;
- `/api/og/comunidades/[slug]`.

Cada rota busca o SEO publico ja existente da entidade, resolve a foto/avatar apenas por fontes publicas confiaveis e renderiza uma imagem PNG quadrada `1200x1200` com `ImageResponse`. O enquadramento usa cobertura central, sem persistir nova midia e sem aceitar URL arbitraria em query string.

Os metadados de `/psicologos/[id]` e `/comunidades/[slug]` passam a apontar para essas rotas quando a entidade tem foto/avatar. A URL da imagem inclui `v=<updated_at>` para reduzir cache obsoleto de crawlers apos troca de avatar. Se a entidade nao tiver foto/avatar ou o SEO dinamico estiver indisponivel, a imagem configurada no Admin continua sendo o fallback.

Em 2026-08-28, a tela Admin de SEO/Metadados foi ajustada para comunicar essa regra nos templates `psychologist_profile` e `community_detail`. O campo **Imagem Open Graph** permanece editavel, mas passa a explicar que a foto/avatar da entidade e a imagem principal do compartilhamento real, enquanto o upload do template e usado como fallback.

## Consequencias

- Compartilhamentos de perfil de psicologo exibem a foto publica do psicologo em formato quadrado.
- Compartilhamentos de comunidade exibem o avatar da comunidade em formato quadrado.
- A tela Admin continua editando o fallback do template e informa quando a rota dinamica usara foto/avatar da entidade no link real.
- A renderizacao acontece sob demanda no frontend, sem criar arquivos novos no storage e sem backfill.
- Crawlers externos ainda podem manter caches proprios; o versionamento por `updated_at` reduz, mas nao elimina, caches ja coletados antes do deploy ou da troca de imagem.

## Producao e rollout

- Compatibilidade com dados existentes: sem alterar dados persistidos; entidades sem foto/avatar mantem fallback atual.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada.
- Backend/API: sem contrato novo de backend; o frontend consome os endpoints publicos de SEO ja existentes.
- Admin: ajuste apenas de comunicacao e previa do fallback, sem alterar payload ou persistencia.
- Compatibilidade entre versoes: frontend novo funciona com backend atual. Durante rollout, frontend antigo continua apontando diretamente para `user.avatar`/`community.avatar_url`; Admin antigo apenas nao exibe o aviso explicativo.
- Deploy: frontend/admin em `homolog`. Rollback e reverter o commit, voltando ao `og:image` direto ou ao fallback configurado e removendo o aviso explicativo.

## Validacao

- `pnpm --dir frontend test` - OK, 111 testes.
- `pnpm --dir frontend check` - OK.
- `pnpm --dir frontend build` - OK, rotas dinamicas `/api/og/psicologos/[id]` e `/api/og/comunidades/[slug]` presentes.
- `pnpm version:bump` - OK, `0.1.221` -> `0.1.222`.
- `pnpm check:version` - OK.
- `pnpm check` - OK.
- Smoke local em `http://127.0.0.1:3063` - OK: `/version` retornou `frontend 0.1.222`; `/api/og/psicologos/smoke-invalid` e `/api/og/comunidades/smoke-invalid` retornaram `image/png` `1200x1200`.
- `pnpm --dir admin test` - OK, 32 testes.
- `pnpm version:bump` - OK, `0.1.222` -> `0.1.223` para o ajuste de comunicacao do Admin.
- `pnpm --dir admin check` - OK, 32 testes.
- `pnpm --dir admin build` - OK, rota `/configuracoes/seo-metadados` presente.
- `pnpm check` - OK apos o ajuste do Admin.
- Smoke local do Admin em `http://127.0.0.1:3064` - OK: `/version` retornou `admin 0.1.223`; `/configuracoes/seo-metadados` redirecionou para login por ser rota protegida; textos "Imagem personalizada por perfil", "Imagem personalizada por comunidade" e "fallback do template" presentes no fonte validado.

## Pendencias

- Sem decisao externa pendente.
