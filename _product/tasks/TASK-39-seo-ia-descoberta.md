# TASK-39: SEO e descoberta por mecanismos de busca/IA

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-39 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Descoberta pública e governança |
| Status | Completed |
| Dependências | TASK-01, TASK-12 |
| ADR alvo | ADR-0178 |

## Contexto

A Lectum é uma plataforma web responsiva para psicólogos e pacientes, com comunidade de perguntas e respostas sobre saúde mental. Para ganhar relevância em mecanismos de busca e IAs sem expor dados privados, a aplicação precisa separar superfícies públicas indexáveis das áreas autenticadas, declarar metadados canônicos, publicar `robots.txt`, `sitemap.xml` e uma política explícita de crawlers de IA.

Esta task não transforma conteúdo privado em público e não cria páginas de perguntas indexáveis sem fluxo editorial/consentimento. Ela entrega a fundação técnica segura para as páginas públicas atuais e futuras.

Referência visual: não há tela de landing pública específica no inventário. A implementação mobile-first da página inicial usa a linguagem visual auditada em `_product/proto/Seleção de Perfil.jpg` e `_product/proto/Boas-vindas Paciente - 1.jpg`: fundo limpo, foco em acolhimento, cartões brancos, azul primário e hierarquia centrada. Builder/Quick Copy não estava acessível como ferramenta MCP neste ambiente; foram usadas as imagens locais.

## Objetivo

Ao acessar a raiz pública da Lectum, buscadores e usuários veem uma landing mobile-first indexável, com metadados descritivos, JSON-LD institucional, sitemap, robots e política para crawlers de IA. Áreas privadas/autenticadas permanecem marcadas como não indexáveis.

## Pré-requisitos e bloqueios

- Arquitetura obrigatória em `ARCHITECTURE.md`.
- Política de packages em `PACKAGES.md`.
- `PROTO-INVENTORY.md` consultado; imagens locais usadas como referência visual.
- Nenhuma credencial externa é necessária.
- Nenhuma alteração de banco é necessária.
- Não instalar pacote novo.

## Escopo frontend

- Substituir redirect da raiz `/` por landing pública mobile-first, sem dados inventados.
- Configurar metadata global da aplicação com `metadataBase`, canonical, Open Graph, Twitter e descrição útil.
- Criar `robots.txt` via App Router, bloqueando áreas privadas e diferenciando crawlers de busca/citação vs treinamento.
- Criar `sitemap.xml` com superfícies públicas indexáveis atuais.
- Criar `llms.txt` informativo para IAs, sem tratá-lo como fonte normativa.
- Marcar `/app`, `/auth`, `/dashboard`, `/patient` e `/psychologist` como `noindex,nofollow` via metadata e headers.
- Documentar `NEXT_PUBLIC_SITE_URL` em `frontend/.env.example`.

## Escopo backend

- Sem alteração backend.
- Sem endpoint novo.
- Sem modelo Prisma/migration.

## Fora do escopo

- Páginas públicas de perguntas/respostas reais.
- Indexação de perfis profissionais públicos fora da área autenticada.
- Schema `QAPage`, `ProfilePage` ou `MedicalWebPage` para conteúdo ainda inexistente como superfície pública.
- Mudança de política LGPD/termos/consentimento.
- Permitir treinamento irrestrito de conteúdo por bots de IA.

## Contrato técnico detalhado

Referências obrigatórias:

- `ARCHITECTURE.md`, seções "Frontend", "Regras de UI" e "Anti-recriação".
- `PACKAGES.md`, política de dependências.
- `PROTO-INVENTORY.md`, tela `Seleção de Perfil` e `Boas-vindas Paciente - 1`.

Frontend esperado:

- `frontend/src/app/page.tsx` renderiza landing pública server-side, mobile-first, usando tokens (`bg-background`, `bg-surface`, `text-foreground`, `text-muted`, `border-border`, `text-primary`) e sem `<img>`.
- `frontend/src/lib/seo.ts` centraliza URL canônica, descrição, rotas públicas, rotas privadas e listas de crawlers.
- `frontend/src/app/robots.ts` gera regras para buscadores e IAs.
- `frontend/src/app/sitemap.ts` lista apenas páginas públicas indexáveis.
- `frontend/src/app/llms.txt/route.ts` expõe nota textual informativa.
- Layouts simples em segmentos privados exportam metadata `noindex,nofollow`.
- `frontend/next.config.ts` adiciona `X-Robots-Tag` em áreas privadas/autenticadas.

Packages usados:

- Apenas pacotes já instalados (`next`, `react`, `lucide-react`).
- Nenhum pacote novo.

Regras anti-recriação:

- Não criar design system paralelo.
- Reutilizar `Button` de `frontend/src/registry/new-york-v4/ui/button`.
- Não criar API client, endpoint ou store.
- Conteúdo da landing é institucional e não usa números, avaliações ou dados fake.

Regras de UI obrigatórias:

- **Mobile-first**: layout começa em coluna para ~390px e progride para grid em desktop.
- **Nunca usar `<img>`**: a landing não usa imagem; metadados apontam para asset público sem renderizar `<img>`.
- **Tema claro/escuro/sistema**: cores por tokens; sem novas cores hardcoded.
- Não há formulário/campo.

## Critérios de aceite

- [x] `/` deixou de redirecionar automaticamente e renderiza landing pública indexável.
- [x] Metadata global contém descrição útil, canonical, Open Graph, Twitter, robots e `metadataBase`.
- [x] `/robots.txt` existe, bloqueia áreas privadas e declara política de IA: crawlers de busca/citação permitidos em páginas públicas; crawlers de treinamento bloqueados até revisão legal/editorial.
- [x] `/sitemap.xml` existe e lista apenas a superfície pública indexável atual.
- [x] `/llms.txt` existe como nota informativa para IAs, com links para sitemap e robots.
- [x] `/app`, `/auth`, `/dashboard`, `/patient` e `/psychologist` têm `noindex,nofollow` por metadata/headers.
- [x] UI mobile-first; nenhum `<img>` cru (somente `next/image` quando houver imagem renderizada).
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] Não houve alteração de banco/schema/migrations; `db:migrate` não se aplica.
- [x] Formulários/campos usam React Hook Form, Zod e controllers da `TASK-02` quando aplicável; não se aplica porque não há formulário.
- [x] Builder/Quick Copy não estava acessível; imagens locais `_product/proto/Seleção de Perfil.jpg` e `_product/proto/Boas-vindas Paciente - 1.jpg` foram usadas como referência visual.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado em `adrs/0178-politica-seo-ia-crawlers.md`.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Validação local via HTTP em `http://localhost:3000/`, `/robots.txt`, `/sitemap.xml`, `/llms.txt` e `/auth/login`.

## Notas de execução

- A primeira tentativa de `pnpm --dir frontend build` falhou porque outro `next build` já estava rodando. O executor aguardou os processos existentes finalizarem e repetiu o build com sucesso, sem encerrar processos manualmente.
- A política inicial é conservadora para saúde/psicologia: permitir descoberta/citação de páginas públicas por buscadores e agentes de resposta, mas bloquear treinamento até revisão legal/editorial explícita.
- Próxima evolução recomendada: criar task separada para perguntas públicas anonimizadas com consentimento, autoria profissional, CRP, datas de revisão e schema `QAPage`.
- git push --porcelain foi tentado em 2026-06-29, mas falhou por credenciais ausentes no remoto HTTPS (could not read Username for 'https://github.com'). O commit ficou local ate autenticacao do GitHub neste ambiente.
