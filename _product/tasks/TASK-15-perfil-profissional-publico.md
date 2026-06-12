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
- Segundo refinamento visual complementar: o header `Perfil Profissional` recebeu linha fina inferior, a foto do hero passou a ser redonda, o chip `Disponível hoje` perdeu o fundo verde e o menu Sobre/Publicações/Avaliações perdeu a borda superior.
- As tags de benefícios abaixo da bio agora reutilizam a mesma lógica visual do card da listagem de psicólogos: tempo de experiência e selos reais de convênio, valor social e desconto na primeira sessão.
- Validações complementares executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local via Chrome headless/CDP em 390px.
- A capa do vídeo de apresentação deixou de usar a foto/avatar do perfil; o card agora renderiza um `<video>` sem controles como preview, usando o próprio arquivo público de vídeo e mantendo o play inline no mesmo local.
- Validações complementares executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local via Chrome headless/CDP confirmando ausência de `<img>` dentro do card de vídeo e `previewSrc` igual ao `video_url` real.
- A faixa azul promocional superior foi removida do perfil; os selos permanecem apenas nas tags abaixo da bio.
- A linha `PSICÓLOGO • CRP ...` passou a usar a mesma tipografia/cor do rótulo `Psicólogo` no card da listagem, e o espaçamento até `Disponível hoje` foi reduzido.
- Validações complementares executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e browser local via Chrome headless/CDP em 390px, confirmando ausência da faixa azul, tipografia `10.56px/800/uppercase` e gap de 4px.

## Registro de ajuste complementar em 2026-06-11

- Reestruturação visual final da tela `/app/psychologist/[id]` alinhada ao PDF de referência (`Perfil psicólogo (1).pdf`) com foco em `media` como elemento principal e card principal limpo, branco e de baixa elevação.
- Ajustes no header/hero:
  - botões de voltar e compartilhar no topo da mídia;
  - nome com selo verificado atrelado à última palavra para evitar selo isolado.
- Comportamento da bio:
  - texto em até 2 linhas inicialmente com ellipsis;
  - expansão/recolhimento inline no toque no próprio texto (sem modal);
  - apenas bio usa truncagem visual; nome sem ellipsis.
- Aba ativa e layout visual mantidos como solicitado em `Geral`, `Publicações` e `Avaliações`.
- Vídeo de apresentação com prévia (ou mídia de fallback) + CTA interno em destaque discreto; seção Sobre com cards compactos por tema e faixa informativa para WhatsApp.
- Validação executada:
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - validação manual de rota `/app/psychologist/[id]` em resolução mobile orientada no ambiente local.
- ADR atualizado: `adrs/0056-truncagem-interacao-bio-psicologos.md`.


## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Registro de ajuste complementar em 2026-06-12

- Ajuste visual solicitado para `/app/psychologist/[id]`, usando `Perfil psicólogo (1).pdf` e o texto anexado pelo usuário como referência de composição. O PDF foi tratado como referência visual, sem reconstrução pixel-perfect e sem substituir a arquitetura existente.
- Builder/Quick Copy não ficou exposto como ferramenta direta no ambiente desta sessão; a validação visual foi feita com a referência anexada, inspeção local e navegador local.
- Header/mídia superior ficou mais alto e proporcional, com `object-cover`, overlay suave e botões de voltar/compartilhar sobre a mídia.
- Card principal passou a sobrepor mais a mídia, com avatar maior parcialmente ancorado no card, nome mais forte, selo verificado junto da última palavra, metadados compactos de profissão/CRP/experiência/avaliação e disponibilidade discreta.
- Bio do hero e seção Sobre mantêm o comportamento de `Ver mais` existente para textos longos, sem modal/bottom sheet e sem alterar dados.
- Selos reais de experiência, convênio, valor social e desconto permaneceram compactos e condicionados aos dados persistidos do perfil.
- Aba Geral reorganizada em cards brancos sobre fundo cinza claro: Sobre, vídeo de apresentação, Especialidades, Atendimento e Formação & Títulos.
- Especialidades passaram a ser chips visuais usando `profile.specialties`; quando não há dados reais, a tela usa estado vazio em PT-BR, sem dado fake.
- Atendimento agora agrupa Modalidade, Abordagens, Serviços, Público atendido e Idiomas com os dados reais já expostos pelo contrato public-safe.
- Abas Publicações/Avaliações e CTA fixo de WhatsApp foram preservados com a lógica atual, apenas integrados ao novo respiro visual do perfil.
- Não houve alteração de backend, Prisma, contratos, packages ou dados persistidos.
- ADR atualizado: `adrs/0032-refinamento-perfil-profissional-publico.md`.
- Validações executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6` e Chrome headless mobile 390px.

## Registro de ajuste complementar em 2026-06-12 — capa independente do perfil

- Decisão de produto: a mídia superior do perfil público não é vídeo, thumbnail nem frame do vídeo. Foto de perfil, imagem de capa e vídeos do psicólogo são três mídias independentes.
- Banco/contrato recebeu `psychologist_profile.cover_image_url` como campo public-safe para a capa do perfil.
- `/app/psychologist/[id]` passou a renderizar a mídia superior apenas a partir de `cover_image_url`; quando não há capa, ou quando o arquivo público não carrega, exibe placeholder elegante da plataforma.
- `video_url` e `video_cover_url` continuam existindo somente para vídeo de apresentação/feed/publicações e não são usados como fallback da capa.
- ADR criado: `adrs/0060-capa-independente-perfil-psicologo.md`.
- Validações: `pnpm --dir backend db:migrate --name add_psychologist_profile_cover_image` executado e recusado pelo Prisma por drift antigo sem reset; migration aplicada de forma não destrutiva com `pnpm --dir backend db:migrate-prod`; `pnpm --dir backend exec prisma migrate status`; `pnpm --dir backend db:generate`; `pnpm --dir backend check`; `pnpm --dir backend build`; `pnpm --dir frontend check`; `pnpm --dir frontend build`; `pnpm check`; HTTP 200 no perfil público; Chrome headless mobile 390px.


## Registro de ajuste complementar em 2026-06-12 - navegacao sticky em chips

- Ajuste visual solicitado para `/app/psychologist/[id]`, usando a imagem anexada `WhatsApp Image 2026-06-12 at 12.05.46.jpeg` como referencia conceitual de abas flutuantes modernas, sem copiar o produto externo e sem alterar a arquitetura da rota.
- O menu `Geral/Publicacoes/Avaliacoes` foi substituido por um menu sticky mobile-first com duas linhas: nome do psicologo + selo verificado e chips `Sobre`, `Publicacoes`, `Avaliacoes`.
- A logica de abas existente foi preservada via `router.replace` e query params, sem reload, sem alterar dados, backend, CTA WhatsApp, card principal, imagem de capa, avatar ou conteudo das secoes.
- O nome no sticky usa uma unica linha com ellipsis (`truncate`) e mantem o selo verificado visivel e na mesma linha como item `shrink-0`.
- O container sticky usa fundo translucido com blur, borda inferior sutil, sombra discreta, `top: env(safe-area-inset-top, 0px)` e `z-index` menor que o CTA fixo de WhatsApp.
- Nao houve alteracao de banco, Prisma, contratos, packages ou dados persistidos.
- ADR atualizado: `adrs/0032-refinamento-perfil-profissional-publico.md`.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
  - Chrome headless/CDP em 390px confirmando menu abaixo do card antes do scroll, sticky no topo apos rolagem, chips renderizados e selo verificado visivel.

## Registro de ajuste complementar em 2026-06-12 (hierarquia e previews do perfil)

- Refinada a tela publica `/app/psychologist/[id]` a partir da solicitacao de produto e da referencia em PDF/anexo local; Builder/Quick Copy nao esteve exposto como ferramenta MCP nesta sessao, entao a validacao visual usou a implementacao atual e os artefatos locais.
- A imagem de capa foi reduzida para atuar como identidade visual sem consumir excesso da primeira dobra, mantendo botoes de voltar/compartilhar e o card principal sobreposto.
- Quando o psicologo autenticado visualiza o proprio perfil, a capa passa a exibir o botao discreto `Editar perfil`; pacientes/outros usuarios nao veem essa acao.
- A linha de metadados removeu o tempo de experiencia solto e mantem profissao, CRP e avaliacao `N,N` sem quantidade entre parenteses; a experiencia permanece apenas como chip real quando habilitada.
- A bio curta do card principal e o texto de apresentacao da aba Sobre passaram a ser exibidos integralmente, sem `Ver mais`, truncamento, ellipsis ou line-clamp, com tipografia mais discreta.
- O video de apresentacao da aba Sobre foi ajustado para proporcao vertical 9:16, com cantos arredondados e midia preenchida sem distorcao.
- A caixa informativa acima do WhatsApp fixo foi removida; permanece apenas o botao fixo verde `Chamar no WhatsApp` respeitando safe-area.
- A aba Geral agora ordena o conteudo como: Sobre, Especialidades, previa de Avaliacoes, Atendimento, Formacao & Titulos e previa de Publicacoes, usando dados reais dos endpoints ja existentes.
- Nao houve alteracao de backend, banco, contrato de dados, packages, rotas, favoritos, logica de WhatsApp ou sticky tabs/chips.
- Validacoes executadas para este ajuste:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `http://localhost:3000/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
  - Chrome headless/CDP em 360px, 375px e 390px confirmando ausencia de `Ver mais`/`Ver menos`, ausencia da caixa `Para consultar agenda...`, CTA fixo de WhatsApp, capa com 196px no mobile, sem overflow horizontal, metadados sem experiencia solta e sem contagem entre parenteses, video vertical com proporcao 9:16 (`214x379`) e secoes na ordem `Sobre`, `Especialidades`, `Avaliacoes`, `Atendimento`, `Formacao & Titulos`, `Publicacoes`.
