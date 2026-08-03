# ADR-0412: Rotas publicas e privadas canonicas em PT-BR

## Status

Aceita em 2026-08-03.

## Contexto

A tela Admin de SEO/Metadados mostrou que URLs publicas indexaveis da Lectum ainda estavam em ingles (`/psychologists`, `/community`, `/community/top-mentors`), apesar do produto, copy e publico-alvo serem pt-BR. Na revisao de produto, o mesmo criterio foi estendido para os slugs privados visiveis ao usuario, como `/app/notifications` e `/app/profile`.

As rotas antigas ja podiam estar em backlinks, compartilhamentos e eventos analiticos. Ao mesmo tempo, os namespaces privados (`/app/community`, `/app/psychologist`) e APIs (`/api/private/community`, `/api/private/directory/psychologists`) sao contratos operacionais internos.

## Decisao

- Usar PT-BR como caminho canonico publico:
  - `/psicologos`, `/psicologos/[id]`, `/psicologos/[id]/contato`;
  - `/comunidades`, `/comunidades/[slug]`;
  - `/comunidades/[slug]/publicacao/[id]`;
  - `/comunidades/[slug]/publicacao/[id]/resposta/[replyId]`;
  - `/comunidades/top-mentores`.
- Usar PT-BR tambem nos slugs privados visiveis, mantendo `/app` como namespace tecnico/noindex:
  - `/app/notificacoes`, `/app/perfil`, `/app/perfil/editar`;
  - `/app/favoritos`, `/app/comunidades-seguidas`;
  - `/app/publicacoes/minhas`, `/app/publicacoes/salvas`;
  - `/app/avaliacoes`, `/app/avaliacoes/nova`, `/app/avaliacoes/sucesso`;
  - `/app/configuracoes/conta`, `/app/configuracoes/notificacoes`;
  - `/app/profissional/*`, `/app/comunidades/*`, `/app/psicologo/*`;
  - `/paciente/boas-vindas`.
- Manter as paginas antigas em ingles apenas como compatibilidade por redirect permanente.
- Preservar namespaces privados e APIs em ingles quando forem contratos internos existentes.
- Sincronizar `site_seo_setting.route_path` gerenciado para PT-BR e trocar `canonical_url` somente quando o valor ainda for um legado conhecido, sem sobrescrever customizacoes reais do Admin.
- Fazer analytics first-party aceitar tanto os caminhos PT-BR quanto os legados.

## Consequencias

- Sitemap, `llms.txt`, metadata SSR, compartilhamentos e links publicos passam a divulgar slugs em portugues.
- Backlinks e URLs ja compartilhadas continuam funcionando via redirect permanente.
- Historico analitico antigo nao precisa de backfill; a classificacao reconhece os dois formatos.
- Chaves internas como `page_key="psychologists"` permanecem estaveis para evitar migration sem ganho de produto.

## Validacao

Registrada na TASK-145, incluindo checks/builds de backend, frontend e admin, `pnpm check`, `git diff --check`,
smoke HTTP local das rotas PT-BR, redirects legados e endpoints dinamicos de SEO.
