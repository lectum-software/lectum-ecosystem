# ADR-0178: PolÃ­tica SEO e crawlers de IA para superfÃ­cies pÃºblicas

## Status

Accepted

## Task relacionada

TASK-39

## Contexto

A Lectum atua em saÃºde mental/psicologia, um domÃ­nio sensÃ­vel em que conteÃºdo pÃºblico precisa ser rastreÃ¡vel por buscadores sem expor Ã¡reas privadas, dados de pacientes, fluxos autenticados ou conteÃºdo sem governanÃ§a editorial. A resposta inicial ao produto foi separar a fundaÃ§Ã£o tÃ©cnica de SEO/IA da futura publicaÃ§Ã£o de perguntas reais.

Fontes externas consultadas para a decisÃ£o:

- Google Search Central: recursos de IA no Search nÃ£o exigem arquivo ou markup especial alÃ©m de SEO bÃ¡sico, rastreabilidade e elegibilidade para snippets.
- OpenAI Crawler docs: `OAI-SearchBot`, `ChatGPT-User` e `GPTBot` tÃªm finalidades distintas e podem ser tratados separadamente em `robots.txt`.
- Google Search Central: `Google-Extended` Ã© controle separado para uso por produtos generativos, distinto do rastreamento normal do Search.
- Perplexity crawler docs: `PerplexityBot` e agentes de usuÃ¡rio relacionados podem ser tratados por `robots.txt`.

## DecisÃ£o

1. A raiz `/` passa a ser uma landing pÃºblica indexÃ¡vel, mobile-first, sem nÃºmeros ou dados inventados.
2. A aplicaÃ§Ã£o publica metadata canÃ´nica global (`metadataBase`, canonical, Open Graph, Twitter e robots).
3. `robots.txt` Ã© gerado pelo Next App Router com trÃªs grupos:
   - buscadores/crawlers genÃ©ricos podem rastrear pÃ¡ginas pÃºblicas, mas nÃ£o Ã¡reas privadas;
   - crawlers de busca/citaÃ§Ã£o de IA (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`) podem rastrear pÃ¡ginas pÃºblicas, mas nÃ£o Ã¡reas privadas;
   - crawlers usados para treinamento ou agregaÃ§Ã£o ampla (`GPTBot`, `Google-Extended`, `ClaudeBot`, `anthropic-ai`, `CCBot`) ficam bloqueados atÃ© revisÃ£o legal/editorial explÃ­cita.
4. `sitemap.xml` lista apenas superfÃ­cies pÃºblicas indexÃ¡veis existentes. Nesta etapa, apenas `/`.
5. `llms.txt` Ã© disponibilizado como nota informativa para IAs, mas nÃ£o Ã© tratado como padrÃ£o normativo nem substitui `robots.txt`, sitemap, metadata ou controles de privacidade.
6. Segmentos privados/autenticados (`/app`, `/auth`, `/dashboard`, `/patient`, `/psychologist`) recebem `noindex,nofollow` por metadata de layout e `X-Robots-Tag` via `next.config.ts`.

## ConsequÃªncias

- Buscadores e IAs de resposta conseguem descobrir a superfÃ­cie pÃºblica sem depender de conteÃºdo privado.
- A polÃ­tica Ã© conservadora para saÃºde/psicologia: maximiza descoberta/citaÃ§Ã£o pÃºblica, mas nÃ£o autoriza treinamento de modelos com conteÃºdo da Lectum antes de termos, consentimento e governanÃ§a editorial.
- Quando existirem pÃ¡ginas pÃºblicas de perguntas/respostas reais, elas devem entrar no sitemap somente se forem anonimizadas, consentidas, revisadas e exibirem autoria profissional/credenciais/datas.
- Futuras pÃ¡ginas pÃºblicas devem adicionar dados estruturados especÃ­ficos (`QAPage`, `ProfilePage`, `MedicalWebPage`/`Article`) apenas quando o conteÃºdo visÃ­vel sustentar esse markup.

## ValidaÃ§Ã£o

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- ValidaÃ§Ã£o local via HTTP:
  - `GET /` retornou 200 com tÃ­tulo, descriÃ§Ã£o e JSON-LD;
  - `GET /robots.txt` retornou grupos de crawlers e sitemap;
  - `GET /sitemap.xml` retornou `/`;
  - `GET /llms.txt` retornou nota textual;
  - `GET /auth/login` retornou header `X-Robots-Tag: noindex, nofollow`.

## PendÃªncias

- Definir URL pÃºblica real em produÃ§Ã£o via `NEXT_PUBLIC_SITE_URL`.
- Criar task separada para publicaÃ§Ã£o de perguntas pÃºblicas anonimizadas com consentimento, autoria profissional, CRP, datas de revisÃ£o e schema `QAPage`.
- Revisar com jurÃ­dico/LGPD se e quando a Lectum quiser permitir crawlers de treinamento como `GPTBot` ou `Google-Extended`.
