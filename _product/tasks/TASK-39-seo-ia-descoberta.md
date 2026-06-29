# TASK-39: SEO e descoberta por mecanismos de busca/IA

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-39 |
| Prioridade | P1 |
| EsforÃ§o | M |
| Fase | Descoberta pÃºblica e governanÃ§a |
| Status | Completed |
| DependÃªncias | TASK-01, TASK-12 |
| ADR alvo | ADR-0178 |

## Contexto

A Lectum Ã© uma plataforma web responsiva para psicÃ³logos e pacientes, com comunidade de perguntas e respostas sobre saÃºde mental. Para ganhar relevÃ¢ncia em mecanismos de busca e IAs sem expor dados privados, a aplicaÃ§Ã£o precisa separar superfÃ­cies pÃºblicas indexÃ¡veis das Ã¡reas autenticadas, declarar metadados canÃ´nicos, publicar `robots.txt`, `sitemap.xml` e uma polÃ­tica explÃ­cita de crawlers de IA.

Esta task nÃ£o transforma conteÃºdo privado em pÃºblico e nÃ£o cria pÃ¡ginas de perguntas indexÃ¡veis sem fluxo editorial/consentimento. Ela entrega a fundaÃ§Ã£o tÃ©cnica segura para as pÃ¡ginas pÃºblicas atuais e futuras.

ReferÃªncia visual: nÃ£o hÃ¡ tela de landing pÃºblica especÃ­fica no inventÃ¡rio. A implementaÃ§Ã£o mobile-first da pÃ¡gina inicial usa a linguagem visual auditada em `_product/proto/SeleÃ§Ã£o de Perfil.jpg` e `_product/proto/Boas-vindas Paciente - 1.jpg`: fundo limpo, foco em acolhimento, cartÃµes brancos, azul primÃ¡rio e hierarquia centrada. Builder/Quick Copy nÃ£o estava acessÃ­vel como ferramenta MCP neste ambiente; foram usadas as imagens locais.

## Objetivo

Ao acessar a raiz pÃºblica da Lectum, buscadores e usuÃ¡rios veem uma landing mobile-first indexÃ¡vel, com metadados descritivos, JSON-LD institucional, sitemap, robots e polÃ­tica para crawlers de IA. Ãreas privadas/autenticadas permanecem marcadas como nÃ£o indexÃ¡veis.

## PrÃ©-requisitos e bloqueios

- Arquitetura obrigatÃ³ria em `ARCHITECTURE.md`.
- PolÃ­tica de packages em `PACKAGES.md`.
- `PROTO-INVENTORY.md` consultado; imagens locais usadas como referÃªncia visual.
- Nenhuma credencial externa Ã© necessÃ¡ria.
- Nenhuma alteraÃ§Ã£o de banco Ã© necessÃ¡ria.
- NÃ£o instalar pacote novo.

## Escopo frontend

- Substituir redirect da raiz `/` por landing pÃºblica mobile-first, sem dados inventados.
- Configurar metadata global da aplicaÃ§Ã£o com `metadataBase`, canonical, Open Graph, Twitter e descriÃ§Ã£o Ãºtil.
- Criar `robots.txt` via App Router, bloqueando Ã¡reas privadas e diferenciando crawlers de busca/citaÃ§Ã£o vs treinamento.
- Criar `sitemap.xml` com superfÃ­cies pÃºblicas indexÃ¡veis atuais.
- Criar `llms.txt` informativo para IAs, sem tratÃ¡-lo como fonte normativa.
- Marcar `/app`, `/auth`, `/dashboard`, `/patient` e `/psychologist` como `noindex,nofollow` via metadata e headers.
- Documentar `NEXT_PUBLIC_SITE_URL` em `frontend/.env.example`.

## Escopo backend

- Sem alteraÃ§Ã£o backend.
- Sem endpoint novo.
- Sem modelo Prisma/migration.

## Fora do escopo

- PÃ¡ginas pÃºblicas de perguntas/respostas reais.
- IndexaÃ§Ã£o de perfis profissionais pÃºblicos fora da Ã¡rea autenticada.
- Schema `QAPage`, `ProfilePage` ou `MedicalWebPage` para conteÃºdo ainda inexistente como superfÃ­cie pÃºblica.
- MudanÃ§a de polÃ­tica LGPD/termos/consentimento.
- Permitir treinamento irrestrito de conteÃºdo por bots de IA.

## Contrato tÃ©cnico detalhado

ReferÃªncias obrigatÃ³rias:

- `ARCHITECTURE.md`, seÃ§Ãµes "Frontend", "Regras de UI" e "Anti-recriaÃ§Ã£o".
- `PACKAGES.md`, polÃ­tica de dependÃªncias.
- `PROTO-INVENTORY.md`, tela `SeleÃ§Ã£o de Perfil` e `Boas-vindas Paciente - 1`.

Frontend esperado:

- `frontend/src/app/page.tsx` renderiza landing pÃºblica server-side, mobile-first, usando tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `border-border`, `text-primary`) e sem `<img>`.
- `frontend/src/lib/seo.ts` centraliza URL canÃ´nica, descriÃ§Ã£o, rotas pÃºblicas, rotas privadas e listas de crawlers.
- `frontend/src/app/robots.ts` gera regras para buscadores e IAs.
- `frontend/src/app/sitemap.ts` lista apenas pÃ¡ginas pÃºblicas indexÃ¡veis.
- `frontend/src/app/llms.txt/route.ts` expÃµe nota textual informativa.
- Layouts simples em segmentos privados exportam metadata `noindex,nofollow`.
- `frontend/next.config.ts` adiciona `X-Robots-Tag` em Ã¡reas privadas/autenticadas.

Packages usados:

- Apenas pacotes jÃ¡ instalados (`next`, `react`, `lucide-react`).
- Nenhum pacote novo.

Regras anti-recriaÃ§Ã£o:

- NÃ£o criar design system paralelo.
- Reutilizar `Button` de `frontend/src/registry/new-york-v4/ui/button`.
- NÃ£o criar API client, endpoint ou store.
- ConteÃºdo da landing Ã© institucional e nÃ£o usa nÃºmeros, avaliaÃ§Ãµes ou dados fake.

Regras de UI obrigatÃ³rias:

- **Mobile-first**: layout comeÃ§a em coluna para ~390px e progride para grid em desktop.
- **Nunca usar `<img>`**: a landing nÃ£o usa imagem; metadados apontam para asset pÃºblico sem renderizar `<img>`.
- **Tema claro/escuro/sistema**: cores por tokens; sem novas cores hardcoded.
- NÃ£o hÃ¡ formulÃ¡rio/campo.

## CritÃ©rios de aceite

- [x] `/` deixou de redirecionar automaticamente e renderiza landing pÃºblica indexÃ¡vel.
- [x] Metadata global contÃ©m descriÃ§Ã£o Ãºtil, canonical, Open Graph, Twitter, robots e `metadataBase`.
- [x] `/robots.txt` existe, bloqueia Ã¡reas privadas e declara polÃ­tica de IA: crawlers de busca/citaÃ§Ã£o permitidos em pÃ¡ginas pÃºblicas; crawlers de treinamento bloqueados atÃ© revisÃ£o legal/editorial.
- [x] `/sitemap.xml` existe e lista apenas a superfÃ­cie pÃºblica indexÃ¡vel atual.
- [x] `/llms.txt` existe como nota informativa para IAs, com links para sitemap e robots.
- [x] `/app`, `/auth`, `/dashboard`, `/patient` e `/psychologist` tÃªm `noindex,nofollow` por metadata/headers.
- [x] UI mobile-first; nenhum `<img>` cru (somente `next/image` quando houver imagem renderizada).
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] NÃ£o houve alteraÃ§Ã£o de banco/schema/migrations; `db:migrate` nÃ£o se aplica.
- [x] FormulÃ¡rios/campos usam React Hook Form, Zod e controllers da `TASK-02` quando aplicÃ¡vel; nÃ£o se aplica porque nÃ£o hÃ¡ formulÃ¡rio.
- [x] Builder/Quick Copy nÃ£o estava acessÃ­vel; imagens locais `_product/proto/SeleÃ§Ã£o de Perfil.jpg` e `_product/proto/Boas-vindas Paciente - 1.jpg` foram usadas como referÃªncia visual.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0178-politica-seo-ia-crawlers.md`.
- [x] Commit criado com mensagem convencional.

## ValidaÃ§Ã£o mÃ­nima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- ValidaÃ§Ã£o local via HTTP em `http://localhost:3000/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` e `/auth/login`.

## Notas de execuÃ§Ã£o

- A primeira tentativa de `pnpm --dir frontend build` falhou porque outro `next build` jÃ¡ estava rodando. O executor aguardou os processos existentes finalizarem e repetiu o build com sucesso, sem encerrar processos manualmente.
- A polÃ­tica inicial Ã© conservadora para saÃºde/psicologia: permitir descoberta/citaÃ§Ã£o de pÃ¡ginas pÃºblicas por buscadores e agentes de resposta, mas bloquear treinamento atÃ© revisÃ£o legal/editorial explÃ­cita.
- PrÃ³xima evoluÃ§Ã£o recomendada: criar task separada para perguntas pÃºblicas anonimizadas com consentimento, autoria profissional, CRP, datas de revisÃ£o e schema `QAPage`.
- git push --porcelain foi tentado em 2026-06-29, mas falhou por credenciais ausentes no remoto HTTPS (could not read Username for 'https://github.com'). O commit ficou local ate autenticacao do GitHub neste ambiente.
