# TASK-15: Perfil profissional público

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-15 |
| Prioridade | P0 |
| Esforço | L |
| Fase | Perfil |
| Status | Completed |
| Dependências | TASK-13 |
| ADR alvo | ADR de perfil profissional público |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Perfil Profissional - Sobre.jpg` | `figma-design-frame-4-Perfil-Profissional---Sobre.html` |
| `_product/proto/Perfil Profissional - Publicações.jpg` | `figma-design-frame-6-Perfil-Profissional---Publica--es.html` |
| `_product/proto/Perfil Profissional - Avaliações.jpg` | `figma-design-frame-10-Perfil-Profissional---Avalia--es.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Esta é a vitrine do psicólogo. Precisa ser fiel aos protótipos, mas com dados reais e sem expor informações privadas.

## Objetivo

Criar perfil profissional público com abas Sobre, Publicações e Avaliações usando dados persistidos.

## Pré-requisitos e bloqueios

- Depende de profissional aprovado/publicável.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/psychologist/[id]` (detalhe do perfil, dentro do shell privado da TASK-12)

Implementação esperada:

- Criar rota dinâmica de perfil em `/app/psychologist/[id]`.
- Implementar abas Sobre, Publicações e Avaliações.
- Reutilizar componentes de card, avatar, badge e botões.
- Adicionar CTA WhatsApp condicionado a `psychologist_profile.whatsapp`/`whatsapp_verified_at` (fluxo de contato em TASK-16).
- Exibir erro 404/estado indisponível para perfil não publicado (`psychologist_profile.published = false`).

## Escopo backend

Implementação esperada:

- Endpoint de detalhe do perfil expondo apenas campos PUBLIC-safe (ver lista abaixo).
- Endpoint de publicações do profissional (`community_post` com `author_id` = profissional; ver `DATA-MODEL.md`).
- Endpoint de avaliações (`professional_review`, leitura) paginado conforme "Contrato padrão de API" do `DATA-MODEL.md` (`page`/`limit`).
- Não retornar `cpf`, `whatsapp` (antes do contato), e-mail, documentos, tokens ou campos de conta.

Campos PUBLIC-safe de `psychologist_profile` (ver `DATA-MODEL.md`):

- Expor: `headline`, `bio`, `video_url`, `crp`, `languages`, `modality`, especialidades/serviços/abordagens (via joins) e `rating_avg`/`rating_count`.
- NÃO expor: `cpf`, `whatsapp`/`whatsapp_verified_at` (liberados só no fluxo de contato da TASK-16), campos de conta/usuário e quaisquer dados sensíveis.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `psychologist_profile` (+ joins `psychologist_specialty`/`psychologist_service`/`psychologist_approach` e catálogos `specialty`/`service`/`approach`)
- `community_post` (aba Publicações)
- `professional_review` (aba Avaliações, leitura)

Guarda de papel (ver `DATA-MODEL.md`, "Camadas de autenticação e autorização" e ADR-0002):

- Estas são rotas de leitura caller-neutras, montadas sob `/api/private/directory/*`, guardadas apenas por `_auth` (qualquer autenticado) — **nunca** por `requireRole`. Pacientes precisam visualizar o perfil público do psicólogo, então o detalhe não pode ser psicólogo-only.
- Não usar `/api/private/psychologists` (confundível com a autogestão do psicólogo em `/api/private/psychologist/*`).
- Expor apenas os campos PUBLIC-safe do `psychologist_profile` listados acima; nunca `cpf`, `whatsapp` (liberado só no fluxo de contato da TASK-16) ou campos de conta.

Endpoints esperados (ver "Convenção de rotas" do `DATA-MODEL.md`; identificação por `id`):

- GET `/api/private/directory/psychologists/:id`
- GET `/api/private/directory/psychologists/:id/posts`
- GET `/api/private/directory/psychologists/:id/reviews`

## Contrato técnico detalhado

Arquitetura frontend obrigatória:

- Telas em `frontend/src/app/{rota}/page.tsx`, `logic.tsx` e `use-form.tsx` quando houver formulário.
- Chamadas HTTP em `frontend/src/api/req/{dominio}/index.ts` usando `callEndpoint` e `handleReq`.
- Hooks React Query em `frontend/src/api/callers/{dominio}/index.tsx`.
- Query keys em `frontend/src/api/cache/keys.ts`.
- Shells/templates em `frontend/src/templates`.
- Componentes existentes em `frontend/src/registry/new-york-v4/ui` e `frontend/src/components/ui` devem ser reutilizados antes de criar novos.
- Quando houver formulário ou campo, usar `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form e Zod conforme `TASK-02`.

Arquitetura backend obrigatória:

- Novas APIs em `backend/src/modules/api/{public|private}/{dominio}/{caso}`.
- Rotas registradas em `backend/src/main/server/imports/write.ts`.
- Validadores em `validator/index.ts` usando os helpers/pacote local de validação.
- Services e repositories separados quando houver regra de domínio ou persistência.
- Respostas usando `send`, `error500`, `error` e traduções em `backend/locales/pt/translation.json`.
- Prisma com nomes e padrões já definidos em `ARCHITECTURE.md`.

Packages permitidos nesta task:

- TanStack Query
- @radix-ui/react-tabs candidato
- Prisma

Regras anti-recriação específicas:

- Procurar componente, helper, model, endpoint e query key equivalente antes de criar estrutura nova.
- Não criar client HTTP paralelo, store paralela, autenticação paralela, validator paralelo ou design system paralelo.
- Não usar `sample/` como referência direta de implementação futura.
- Não instalar package novo sem consultar `PACKAGES.md` e registrar ADR.

## Estados obrigatórios

- Loading inicial.
- Erro de rede/API em PT-BR.
- Estado vazio quando não houver dado real.
- Sucesso com feedback visual discreto.
- Responsividade mobile-first baseada nas imagens exportadas.

## Fora do escopo

- Criar dados fake, seed artificial ou mock para preencher tela.
- Concluir integração externa ausente.
- Refatorar módulos não relacionados à task.
- Trocar package manager ou stack base.

## Critérios de aceite

- [x] As referências visuais desta task foram consultadas via Builder Quick Copy ou imagens locais citadas acima.
- [x] Rotas de descoberta sob `/api/private/directory/*` usam só `_auth` (neutras), nunca `requireRole`, conforme ADR-0002.
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Execução

- Builder/Quick Copy foi revalidado com `npx "@builder.io/dev-tools@latest" auth status`, mas o CLI retornou não autenticado nesta sessão; a validação visual usou as imagens locais obrigatórias da TASK-15.
- Backend criou os endpoints `GET /api/private/directory/psychologists/:id`, `/:id/posts` e `/:id/reviews` no namespace neutro `directory`, protegido apenas por `_auth` via `routes.use(middlewares)`, sem `requireRole`.
- O detalhe do perfil retorna apenas campos public-safe e a flag derivada `whatsapp_available`; `cpf`, `whatsapp`, `whatsapp_verified_at`, e-mail, tokens e documentos não são expostos.
- Prisma criou as tabelas persistentes `professional_review`, `community` e `community_post` conforme `DATA-MODEL.md`, sem seed artificial ou dado fake permanente.
- Frontend implementou `/app/psychologist/[id]` mobile-first dentro do shell privado, com abas Sobre, Publicações e Avaliações, estados de loading, erro, vazio, sucesso discreto, paginação e CTA WhatsApp condicionado.
- A rota não possui formulário/campo de submit; a fundação da TASK-02 não foi aplicável diretamente.
- ADR criado: `adrs/0021-perfil-profissional-publico.md`.
- Validações executadas:
  - `npx "@builder.io/dev-tools@latest" auth status`
  - `pnpm --dir backend db:migrate --name add_public_profile_posts_reviews`
  - `pnpm --dir backend db:generate`
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - smoke real de API com paciente/psicólogo temporários removidos ao final, confirmando detalhe public-safe, posts e avaliações paginados;
- browser local headless em Chrome com cookie real: mobile (~390px) validando abas e CTA; desktop `1440x1000` com `sectionWidth=1112`.

## Registro de ajuste complementar em 2026-06-08

- Ajuste visual solicitado sobre `/app/psychologist/[id]`, usando `_product/proto/Perfil Profissional - Sobre.jpg` como referência local. Builder/Quick Copy não ficou exposto como ferramenta MCP no ambiente desta sessão.
- Removidos da vitrine: navegação inferior do shell, card lateral de contato/agenda, subtítulo cinza do cabeçalho, ponto verde da foto, chips de dados públicos/especialidade e botão "Buscar mais".
- Faixa promocional alterada para `Desconto na 1ª sessão • aceita convênios • valor social`.
- Vídeo de apresentação passou a ter prévia com `next/image` e reprodução inline no mesmo card.
- Estatísticas abaixo do vídeo ajustadas para Experiência, Avaliação e Reviews.
- Atendimento presencial/híbrido exibe `Online e Presencial em CIDADE/UF` quando cidade/UF reais estão persistidos.
- Público atendido passou a aparecer como tags public-safe vindas de `psychologist_profile.target_audience`.
- Leituras do diretório/profile passaram a aceitar autenticação opcional; relações de favorito/seguindo só são marcadas quando há usuário autenticado, e o contato continua exigindo `_auth`.
- ADR criado: `adrs/0032-refinamento-perfil-profissional-publico.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e browser local via Chrome headless/CDP em 390px e desktop.

## Registro de ajuste complementar em 2026-06-09

- Inserida a seção `Formação e Títulos` entre `Sobre` e `Atendimento` na aba Sobre do perfil profissional público.
- O contrato public-safe do detalhe passou a expor `academic_formations` a partir de dados persistidos em `psychologist_profile.academic_formations`, com fallback para os campos legados `academic_title`, `academic_institution` e `academic_graduation_year`.
- A UI exibe estado vazio em PT-BR quando não houver formação pública cadastrada, sem seed/mock.
- ADR atualizado: `adrs/0032-refinamento-perfil-profissional-publico.md`.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm check` e browser local via Chrome headless/CDP em 390px.
- Refinamento visual complementar na mesma rota: removido o espaço cinza entre hero e menu, mantendo bloco superior e abas como superfície branca contínua.
- A faixa azul superior passou a ser dinâmica a partir de `discount_first_session`, `accepts_insurance` e `social_value`, com `sticky top-0` quando houver ao menos um selo marcado; no perfil local validado os três selos estavam desmarcados e a faixa ficou corretamente oculta.
- O vídeo de apresentação dentro da aba Sobre passou a usar proporção 16:9, preservando prévia e reprodução inline.
- Removido o chip "Sem avaliações" abaixo do nome quando `rating_count` é zero; a contagem continua aparecendo apenas nos cards de estatística.
- Layout visual ajustado para uma linguagem mais sóbria, com tags, cards e sombras menos chamativos, sem criar componente ou design system paralelo.
- Validações complementares executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local via Chrome headless/CDP em 390px e desktop 1440px.


## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.
