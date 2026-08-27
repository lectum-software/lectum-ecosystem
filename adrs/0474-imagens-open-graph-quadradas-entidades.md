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

## Consequencias

- Compartilhamentos de perfil de psicologo exibem a foto publica do psicologo em formato quadrado.
- Compartilhamentos de comunidade exibem o avatar da comunidade em formato quadrado.
- A tela Admin continua editando o fallback do template, por isso nao precisa mostrar uma foto especifica quando a rota contem placeholder.
- A renderizacao acontece sob demanda no frontend, sem criar arquivos novos no storage e sem backfill.
- Crawlers externos ainda podem manter caches proprios; o versionamento por `updated_at` reduz, mas nao elimina, caches ja coletados antes do deploy ou da troca de imagem.

## Producao e rollout

- Compatibilidade com dados existentes: sem alterar dados persistidos; entidades sem foto/avatar mantem fallback atual.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada.
- Backend/API/Admin: sem contrato novo de backend e sem mudanca na tela Admin; o frontend consome os endpoints publicos de SEO ja existentes.
- Compatibilidade entre versoes: frontend novo funciona com backend atual. Durante rollout, frontend antigo continua apontando diretamente para `user.avatar`/`community.avatar_url`.
- Deploy: frontend em `homolog`. Rollback e reverter o commit, voltando ao `og:image` direto ou ao fallback configurado.

## Validacao

- `pnpm --dir frontend test` - OK, 111 testes.
- `pnpm --dir frontend check` - OK.
- `pnpm --dir frontend build` - OK, rotas dinamicas `/api/og/psicologos/[id]` e `/api/og/comunidades/[slug]` presentes.
- `pnpm version:bump` - OK, `0.1.221` -> `0.1.222`.
- `pnpm check:version` - OK.
- `pnpm check` - OK.
- Smoke local em `http://127.0.0.1:3063` - OK: `/version` retornou `frontend 0.1.222`; `/api/og/psicologos/smoke-invalid` e `/api/og/comunidades/smoke-invalid` retornaram `image/png` `1200x1200`.

## Pendencias

- Sem decisao externa pendente.
