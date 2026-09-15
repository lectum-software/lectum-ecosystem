# ADR-0178: Política SEO e crawlers de IA para superfícies públicas

## Status

Accepted

## Task relacionada

TASK-39

## Contexto

A Lectum atua em saúde mental/psicologia, um domínio sensível em que conteúdo público precisa ser rastreável por buscadores sem expor áreas privadas, dados de pacientes, fluxos autenticados ou conteúdo sem governança editorial. A resposta inicial ao produto foi separar a fundação técnica de SEO/IA da futura publicação de perguntas reais.

Fontes externas consultadas para a decisão:

- Google Search Central: recursos de IA no Search não exigem arquivo ou markup especial além de SEO básico, rastreabilidade e elegibilidade para snippets.
- OpenAI Crawler docs: `OAI-SearchBot`, `ChatGPT-User` e `GPTBot` têm finalidades distintas e podem ser tratados separadamente em `robots.txt`.
- Google Search Central: `Google-Extended` é controle separado para uso por produtos generativos, distinto do rastreamento normal do Search.
- Perplexity crawler docs: `PerplexityBot` e agentes de usuário relacionados podem ser tratados por `robots.txt`.

## Decisão

1. A raiz `/` passa a ser uma landing pública indexável, mobile-first, sem números ou dados inventados.
2. A aplicação publica metadata canônica global (`metadataBase`, canonical, Open Graph, Twitter e robots).
3. `robots.txt` é gerado pelo Next App Router com três grupos:
   - buscadores/crawlers genéricos podem rastrear páginas públicas, mas não áreas privadas;
   - crawlers de busca/citação de IA (`OAI-SearchBot`, `ChatGPT-User`, `PerplexityBot`, `Perplexity-User`) podem rastrear páginas públicas, mas não áreas privadas;
   - crawlers usados para treinamento ou agregação ampla (`GPTBot`, `Google-Extended`, `ClaudeBot`, `anthropic-ai`, `CCBot`) ficam bloqueados até revisão legal/editorial explícita.
4. `sitemap.xml` lista apenas superfícies públicas indexáveis existentes. Nesta etapa, apenas `/`.
5. `llms.txt` é disponibilizado como nota informativa para IAs, mas não é tratado como padrão normativo nem substitui `robots.txt`, sitemap, metadata ou controles de privacidade.
6. Segmentos privados/autenticados (`/app`, `/auth`, `/dashboard`, `/patient`, `/psychologist`) recebem `noindex,nofollow` por metadata de layout e `X-Robots-Tag` via `next.config.ts`.

## Consequências

- Buscadores e IAs de resposta conseguem descobrir a superfície pública sem depender de conteúdo privado.
- A política é conservadora para saúde/psicologia: maximiza descoberta/citação pública, mas não autoriza treinamento de modelos com conteúdo da Lectum antes de termos, consentimento e governança editorial.
- Quando existirem páginas públicas de perguntas/respostas reais, elas devem entrar no sitemap somente se forem anonimizadas, consentidas, revisadas e exibirem autoria profissional/credenciais/datas.
- Futuras páginas públicas devem adicionar dados estruturados específicos (`QAPage`, `ProfilePage`, `MedicalWebPage`/`Article`) apenas quando o conteúdo visível sustentar esse markup.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação local via HTTP:
  - `GET /` retornou 200 com título, descrição e JSON-LD;
  - `GET /robots.txt` retornou grupos de crawlers e sitemap;
  - `GET /sitemap.xml` retornou `/`;
  - `GET /llms.txt` retornou nota textual;
  - `GET /auth/login` retornou header `X-Robots-Tag: noindex, nofollow`.

## Pendências

- Definir URL pública real em produção via `NEXT_PUBLIC_SITE_URL`.
- Criar task separada para publicação de perguntas públicas anonimizadas com consentimento, autoria profissional, CRP, datas de revisão e schema `QAPage`.
- Revisar com jurídico/LGPD se e quando a Lectum quiser permitir crawlers de treinamento como `GPTBot` ou `Google-Extended`.
