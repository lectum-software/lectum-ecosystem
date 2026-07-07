# ADR-0180 - Rotas publicas de psicologos e comunidades fora de /app

## Status

Accepted

## Contexto

A TASK-39 criou a fundacao tecnica de SEO/IA, mas as principais superficies de descoberta ainda estavam sob `/app`. Na pratica, busca de psicologos, perfis publicos e leitura de comunidades/posts nao sao areas autenticadas; a autenticacao e necessaria apenas para interagir, salvar, favoritar, publicar, comentar, votar, sugerir comunidade ou acessar preferencias pessoais.

Manter leitura publica em `/app` confundia a semantica do produto, obrigava excecoes no `proxy.ts` e reduzia clareza para mecanismos de busca, IAs e manutencao futura.

## Decisao

1. Tornar `/app` um namespace autenticado/noindex no frontend.
2. Definir rotas publicas canonicas sem `/app`:
   - `/psychologists`
   - `/psychologists/[id]`
   - `/psychologists/[id]/contact`
   - `/community`
   - `/community/feed`
   - `/community/[slug]`
   - `/community/[slug]/post/[id]`
   - `/community/[slug]/post/[id]/thread/[replyId]`
   - `/community/top-mentors`
3. Manter interacoes/autoria sob `/app`, incluindo `/app/community/suggest` e `/app/community/[slug]/post/new`.
4. Reaproveitar a logica existente das telas por wrappers publicos no App Router, sem duplicar dados, API clients ou componentes.
5. Atualizar links de leitura, compartilhamento, notificacoes/digests e `profile_url` de ranking para URLs publicas.
6. Migrar a etapa autenticada de CFP para `/app/professional/cfp`, mantendo `/psychologist/cfp` apenas como redirect legado/noindex.
7. Manter o namespace historico de APIs (`/api/private/directory`, `/api/private/community`, `/api/private/posts`) por compatibilidade, usando leitura publica/`optionalAuth` quando aplicavel e exigindo autenticacao nos comandos.
8. A navegacao publica de psicologos inclui listagem, perfil, pagina de contato e clique/abertura de WhatsApp sem exigir login/cadastro. Quando o visitante nao estiver autenticado, a intencao real de contato pode ser persistida com `contact_request.user_id=null`; prompts/tips de cadastro permanecem apenas como camada de conversao quando houver gatilho de produto definido, sem bloquear a leitura nem a abertura do contato. O CTA de WhatsApp em `/psychologists*` nao abre gate de conversao bloqueante.

## Consequencias

- `/app` deixa de precisar de excecoes publicas no `proxy.ts`.
- SEO/IA passa a ver rotas publicas sem ambiguidades, com sitemap e `llms.txt` apontando para `/psychologists` e `/community`.
- URLs antigas sob `/app` ficam privadas/noindex e podem ser preservadas apenas como compatibilidade para usuarios autenticados.
- A decisao nao cria aliases em portugues; isso fica para task futura se o produto quiser `/psicologos` e `/comunidades` como rotas adicionais.
- A separacao e de URL/shell, nao de dados: interacoes continuam protegidas no servidor.
- Acoes que dependem de identidade pessoal, como favoritar e avaliar, continuam autenticadas; a abertura publica do WhatsApp nao cria usuario, nao usa mock e nao força redirecionamento para login.

## Validacao

Planejada/executada na TASK-40:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Smoke HTTP/browser local em `/`, `/psychologists`, `/community`, `/community/feed`, `/app/psychologists` sem cookie e `/app/community/suggest` sem cookie.

Complemento de 2026-07-07 executado:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke API local sem `Authorization` em `POST /api/private/directory/psychologists/cmr6pzpbn000h5guht478a9l4/contact-click`, retornando `contact_request.user_id=null`; registro e notificacao de smoke removidos ao final.
- Browser local headless mobile `390x844` em `/psychologists`, `/psychologists/cmr6pzpbn000h5guht478a9l4/contact` e `/app/favorites`, validando descoberta/contato sem area restrita e favoritos ainda autenticado.
