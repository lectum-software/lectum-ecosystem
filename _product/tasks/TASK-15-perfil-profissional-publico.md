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

## Registro de ajuste complementar em 2026-06-12 - menu sticky leve

- Ajustado apenas o menu sticky/chips do perfil publico `/app/psychologist/[id]`, sem alterar card principal, capa, avatar, WhatsApp, conteudo, dados ou logica das abas.
- No estado inicial abaixo do card principal, o menu mostra somente os chips `Sobre`, `Publicacoes` e `Avaliacoes`; a linha com nome + selo verificado fica oculta para reduzir excesso de informacao no topo.
- Quando o menu fica sticky no topo durante o scroll, a linha superior com nome + selo verificado passa a aparecer, com nome truncado em uma linha e selo preservado como item `shrink-0`.
- A faixa branca solida foi removida do estado inicial; os chips agora ficam sobre fundo transparente, com aparencia flutuante, glass leve, borda sutil e sombra minima.
- No estado sticky, o container usa fundo translucido (`rgba(255,255,255,0.72)`), blur e sombra discreta para parecer camada leve, nao barra tradicional.
- Validacoes executadas para o menu sticky leve:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
  - Chrome headless/CDP em 390px confirmando estado inicial com `hasName=false`, apenas 3 chips, fundo transparente e sem faixa branca solida; apos scroll, `hasName=true`, selo verificado visivel, `top=0`, fundo `rgba(255,255,255,0.72)` e `backdrop-filter: blur(12px)`.

## Registro de ajuste complementar em 2026-06-12 - capa compacta e navegacao segmentada

- Ajustado apenas o visual de `/app/psychologist/[id]`, sem mudar rotas, dados, contratos, favoritos, WhatsApp ou logica das abas.
- A imagem de capa foi reduzida novamente para atuar apenas como identidade visual, preservando botao voltar, compartilhar e card principal sobreposto.
- O botao `Editar perfil` do proprio psicologo deixou de exibir texto e passou a ser um botao circular apenas com icone de lapis, alinhado aos controles da capa.
- A bio do card principal permanece completa e sem truncamento, conforme decisao de produto deste ajuste.
- O texto longo da secao `Sobre` passou a ser o unico texto expansivel: inicia com 3 linhas e exibe `Ver mais`/`Ver menos` quando ha conteudo excedente.
- A navegacao `Sobre/Publicacoes/Avaliacoes` foi transformada em controle segmentado unico com glass, bordas arredondadas, sombra leve e estado ativo destacado, mantendo comportamento sticky.
- Validacoes executadas para capa compacta/navegacao segmentada:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
  - Chrome headless/CDP em 390px confirmando capa com 118px, card sobreposto, sem `Ver mais` no hero, texto `Sobre` com `line-clamp: 3` e botao `Ver mais`, controle segmentado unico com 3 botoes, sem nome no sticky inicial, sem overflow horizontal, e sticky no topo com nome+selo, fundo translucido e blur.

## Registro de ajuste complementar em 2026-06-12 - hierarquia visual premium tipo LinkedIn

- Ajuste visual solicitado para `/app/psychologist/[id]` com foco em legibilidade profissional inspirada na hierarquia de leitura do LinkedIn, sem copiar layout externo e sem alterar funcionalidades, rotas, dados, contratos ou backend.
- O nome no card principal foi aumentado para ser o elemento textual dominante, mantendo o selo verificado junto da ultima palavra e sem transforma-lo em linha isolada.
- A linha de profissao, CRP e avaliacao foi ampliada e ganhou contraste de subtitulo, permanecendo na mesma linha de metadados public-safe.
- A bio do topo foi ampliada com line-height mais confortavel para comunicar rapidamente a proposta de valor do psicologo; os chips superiores foram mantidos compactos e complementares.
- O card principal passou a aproveitar melhor a largura util no mobile, com margens laterais menores e padding interno mais confortavel.
- A secao `Sobre` teve texto editorial maior, line-height ampliado e manteve o comportamento existente de 3 linhas com `Ver mais`/`Ver menos` apenas para o texto longo da secao.
- Os titulos de secoes deixaram de parecer rotulos de formulario: ganharam escala, peso 600 e contraste maior em `Sobre`, `Especialidades`, `Avaliacoes`, `Atendimento`, `Formacao & Titulos` e `Publicacoes`.
- O conteudo dos cards foi ampliado aproximadamente 10%, enquanto os cards de `Atendimento` e `Formacao & Titulos` foram compactados verticalmente para parecerem linhas informativas, no estilo de leitura profissional.
- Estados sem avaliacoes foram refinados para um empty state compacto com icone discreto, removendo o bloco visual de `0,0` + estrelas vazias.
- Nao houve alteracao de banco, Prisma, contratos, packages, rotas, favoritos, WhatsApp, sticky tabs ou dados persistidos.
- Validacoes executadas:
  - `pnpm --dir frontend biome:fix`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`

## Registro de ajuste complementar em 2026-06-12 - estado vazio compacto de Avaliações

- A seção `Avaliações` do perfil público `/app/psychologist/[id]` passou a seguir a mesma lógica visual da seção `Publicações` quando não há conteúdo.
- Quando `rating_count` é zero e não há avaliações carregadas, a UI exibe apenas `Este profissional ainda não possui avaliações.`, sem nota `0,0`, sem estrelas vazias, sem contador e sem ícone de rating.
- Quando existem avaliações, a seção preserva o comportamento atual com nota média, estrelas, quantidade e prévia/card de avaliação.
- O ajuste foi aplicado tanto na prévia da aba Geral quanto na aba Avaliações, sem alterar dados, rotas, endpoints, contratos, WhatsApp, sticky tabs ou backend.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; a referência auditável permanece o protótipo local `_product/proto/Perfil Profissional - Avaliações.jpg` e a consistência visual com a seção `Publicações` já implementada.

Validações executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://localhost:3000/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
- Verificação estática confirmou que os blocos vazios de Avaliações renderizam apenas a mensagem textual, enquanto `formatRatingNumber` e `StarRating` permanecem restritos aos ramos com avaliações.

## Registro de ajuste complementar em 2026-06-12 - composicao mobile do card principal

- Reavaliada a composicao do card principal de `/app/psychologist/[id]` no mobile para preservar o conceito visual do PDF, com avatar sobreposto a capa e texto principal ao lado da foto.
- O avatar foi levemente reduzido apenas no mobile e manteve o tamanho anterior em `sm+`, reduzindo seu impacto sobre a largura textual sem abandonar a identidade visual do layout original.
- O botao de favorito saiu do fluxo horizontal do cabecalho e passou a flutuar no canto superior do card, liberando largura util para nomes longos sem deslocar o nome para baixo nem criar vazio ao lado da foto.
- O card principal ganhou margens/padding mobile mais eficientes e o nome passou a usar escala responsiva por `clamp`, mantendo hierarquia forte e reduzindo quebras excessivas em 360px, 375px e 390px.
- O wrapper da rota passou a controlar overflow horizontal e usar `w-screen` no container mobile para evitar cortes laterais do card e preservar a composicao dentro da viewport.
- Nao houve alteracao de dados, rotas, APIs, favoritos, WhatsApp, sticky tabs, backend, Prisma ou packages.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel permanece o PDF/anexo conceitual informado pelo usuario e os prototipos locais `_product/proto/Perfil Profissional - Sobre.jpg`, `_product/proto/Perfil Profissional - Publicacoes.jpg` e `_product/proto/Perfil Profissional - Avaliacoes.jpg`.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://localhost:3000/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
- Chrome headless gerou screenshots em 360px, 375px e 390px contra a rota local disponivel; o servidor local em 3000 ainda servia a instancia ja aberta do app, enquanto a build validou a alteracao final de codigo.

## Registro de ajuste complementar em 2026-06-12 - menu lateral desktop no perfil publico

- A pagina publica `/app/psychologist/[id]` passou a usar o mesmo menu lateral do shell da aplicacao apenas em desktop (`>=1024px`).
- O mobile permanece sem menu lateral e sem bottom nav nessa pagina, preservando o comportamento anterior do perfil publico.
- No desktop, o menu inicia recolhido por padrao quando nao existe preferencia salva em `localStorage`, mostrando apenas icones para manter o foco no perfil profissional.
- O usuario pode expandir/recolher o menu pelo botao no proprio menu; apos interacao, a preferencia passa a ser compartilhada com as demais telas que usam o shell.
- O conteudo principal do perfil respeita automaticamente a largura expandida ou recolhida do menu, sem alterar card, capa, WhatsApp, secoes, tabs, dados ou rotas.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel permanece a familia de prototipos locais de perfil profissional e a decisao de navegacao desktop solicitada pelo usuario.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local em `http://localhost:3000/app/psychologist/cmq5m0vse000ftkuhybmagcn6` respondeu `200`.
- HTTP local em `http://localhost:3000/app/psychologists` respondeu `200`.

## Registro de ajuste complementar em 2026-06-16 - fullscreen do video de apresentacao

- Pedido do usuario: corrigir a expansao do video de apresentacao do psicologo no perfil publico, que estava bloqueada/desabilitada.
- O player compartilhado `VerticalVideoPlayer` deixou de bloquear fullscreen via `controlsList` e agora tenta abrir o proprio elemento de video pela Fullscreen API antes de recorrer ao lightbox de fallback.
- Durante a tela cheia, o video usa fundo preto, `object-fit: contain`, `object-position: center` e dimensoes da viewport para preservar videos verticais sem esticar ou converter para horizontal.
- O comportamento do card de perfil, dados public-safe, abas, WhatsApp, favoritos e layout do perfil nao foi alterado.
- ADR atualizado: `adrs/0103-player-video-vertical-unificado.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e `pnpm check`.

## Registro de ajuste complementar em 2026-06-16 - refinamento premium das se��es do perfil

- Ajustado o perfil p�blico `/app/psychologist/[id]` conforme solicita��o de produto para elevar a leitura mobile/desktop sem alterar dados, rotas, endpoints, favoritos, WhatsApp ou l�gica de envio/contato.
- No mobile, foi criado um header fixo pr�prio com nome + selo verificado e abas `Geral`, `Publica��es` e `Avalia��es`, exibido somente ap�s o usu�rio passar pelo conte�do inicial do perfil/v�deo. A navega��o mant�m os mesmos query params e faz scroll suave para o conte�do.
- O menu sticky anterior permanece apenas no desktop, evitando uma barra concorrente no topo mobile antes do momento correto de fixa��o.
- Se��es `Sobre`, `Especialidades`, `Avalia��es`, `Atendimento`, `Forma��o & T�tulos` e `Publica��es` ganharam superf�cie, espa�amento, contraste e hierarquia mais premium, preservando a compacta��o vertical.
- Cards de Atendimento foram refinados para parecerem linhas informativas premium, com �cones maiores, fundo branco suave, sombra discreta e r�tulos menos administrativos.
- Forma��o, avalia��es e publica��es receberam melhor hierarquia entre t�tulo, institui��o/data, autor, estrelas, comunidade, data, t�tulo e conte�do, sem adicionar dados artificiais.
- Bot�es `Ver todas` foram convertidos em chips menores e discretos, com borda azul suave, fundo quase branco, texto azul e hover leve.
- O v�deo de apresenta��o permanece no `VerticalVideoPlayer`, mantendo suporte a fullscreen, fundo preto e propor��o preservada sem nova altera��o funcional neste recorte.
- A anima��o flutuante do bot�o WhatsApp desktop passou a ter keyframe global `lectum-desktop-create-float`, mantendo o uso de `motion-safe` para respeitar `prefers-reduced-motion`.
- Builder/Quick Copy n�o est� exposto como ferramenta direta neste ambiente; a refer�ncia audit�vel permanece nos prot�tipos locais de perfil (`_product/proto/Perfil Profissional - Sobre.jpg`, `Publica��es.jpg`, `Avalia��es.jpg`) e na solicita��o anexada.

Valida��es executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local `200` em `http://localhost:3002/app/psychologist/demo-psychologist-camila-rocha`.
- Chrome headless/CDP em 390px validando dados reais da API local, se��es `Sobre`, `Especialidades`, `Avalia��es`, `Atendimento`, `Forma��o & T�tulos`, `Publica��es`, header mobile fixo ap�s scroll com `top=0`, aba ativa `Geral`, sem estado `Perfil indispon�vel`, e chips `Ver todas` com texto azul e fonte inline de 13px.

## Registro de ajuste complementar em 2026-06-16 - sticky complementar, contato e atendimento

- Ajuste visual solicitado para `/app/psychologist/[id]`, mantendo dados reais, rotas, endpoints, favoritos, contato/WhatsApp e regras de avaliações/publicações sem alteração.
- O menu fixo mobile original do shell voltou a permanecer disponível na rota de perfil do psicólogo; a rota dinâmica `/app/psychologist/:id` agora participa da navegação mobile com `Psicólogos` como item ativo.
- O header sticky mobile com nome, selo e abas continua aparecendo apenas após rolagem, mas foi reposicionado como camada complementar, com z-index abaixo do menu fixo da aplicação para evitar substituição visual.
- O CTA fixo de WhatsApp no mobile passou a respeitar a variável `--lectum-mobile-nav-aware-fab-bottom`, ficando acima do menu fixo sem encobrir a navegação.
- O card `Quer falar com o profissional?` abaixo do vídeo ganhou padding, escala tipográfica e superfície alinhada à família visual dos demais cards do perfil.
- Os cards de `Atendimento` foram refinados para priorizar informação, depois categoria e por último ícone: valor em destaque, rótulo abaixo e ícone discreto à direita, sem fundo circular/sombra azul competindo com o texto.
- Não houve alteração de backend, banco, Prisma, contratos, packages ou persistência.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; a referência auditável permanece nos protótipos locais de perfil (`_product/proto/Perfil Profissional - Sobre.jpg`, `Publicações.jpg`, `Avaliações.jpg`) e na solicitação do usuário.

Validações executadas:

- `pnpm --dir frontend exec biome check --write -- 'src/app/app/psychologist/[id]/logic.tsx' 'src/templates/private/index.tsx'`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local `200` em `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha`.
- Chrome headless/CDP mobile 390px confirmando: menu fixo mobile visível antes e após scroll, sticky mobile com `opacity=1` após rolagem, CTA WhatsApp acima do menu, card de contato com padding/fonte ampliados, ícones de Atendimento sem fundo/sombra e valor antes do rótulo.
- Chrome headless/CDP desktop 1440px confirmando menu lateral desktop preservado, sticky desktop ativo, card de contato renderizado e bottom nav oculto em `lg`.

## Registro de ajuste complementar em 2026-06-16 - Publicações como posts reais no perfil

- Ajuste solicitado para `/app/psychologist/[id]` nas seções `Avaliações` e `Publicações`, mantendo a experiência mobile-first e sem criar layout paralelo para publicações.
- Os chips `Ver todas` de `Avaliações` e `Publicações` foram movidos para a mesma linha do título da seção, preservando a variação compacta/premium já usada no perfil.
- O texto de `Publicações` passou para o formato `X publicações deste profissional`, com espaçamento reduzido em relação ao título para formar um único bloco de informação.
- A prévia da seção `Publicações` e a aba completa `Publicações` agora reutilizam `CommunityPostCard`, mantendo o mesmo padrão visual de feed/comunidade: comunidade, data, autoria, título, conteúdo, resposta profissional destacada, mídia e ações de upvote, downvote, comentários, salvar e compartilhar.
- O endpoint `GET /api/private/directory/psychologists/:id/posts` passou a retornar posts originais e respostas do profissional no formato de card de comunidade (`CommunityPostDTO`) com o campo adicional `contribution_type`, sem mocks e sem inventar dados.
- Para contribuições do tipo resposta, o card mostra o post original e destaca a resposta profissional persistida do psicólogo como `highlighted_professional_reply`, incluindo mídia quando existir.
- A ordenação permanece por recência da contribuição do profissional, combinando posts e respostas persistidos antes da paginação; regras de comunidade, destaque profissional, votos, salvos e WhatsApp seguem as primitivas existentes.
- Builder/Quick Copy não está exposto como ferramenta direta neste ambiente; a referência auditável permaneceu a família visual local de perfil/comunidade e a validação no browser local com dados reais.
- ADR criado: `adrs/0108-publicacoes-perfil-como-posts-comunidade.md`.

Validações executadas:

- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- API local `200` em `http://localhost:3001/api/private/directory/psychologists/demo-psychologist-camila-rocha/posts?limit=2`, retornando `contribution_type`, comunidade, post original e resposta profissional com mídia.
- Chrome/CDP mobile 390px em `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha` confirmou `Avaliações`/`Publicações` com `Ver todas` na linha do título, texto `3 publicações deste profissional` e card real com resposta profissional destacada.
- Chrome/CDP desktop 1440px confirmou o mesmo card com mídia em vídeo e barra de ações completa.

## Registro de ajuste complementar em 2026-06-16 - Publicacoes compactas e WhatsApp mobile unico

- Ajuste solicitado para a aba `Publicacoes` do perfil publico e para o comportamento mobile da rota `/app/psychologist/[id]`, sem alterar backend, banco, Prisma, contratos, ordenacao de publicacoes ou regras de destaque.
- O cabecalho de `Publicacoes` deixou de exibir a frase `X publicacoes deste profissional` e agora usa um chip numerico discreto ao lado do titulo.
- `CommunityPostCard` ganhou o modo opcional `profilePublicationMode` para reutilizar o card real de comunidade no perfil removendo ruidos especificos: chip `Resposta`, rotulo `Resposta profissional em destaque`, titulo interno de respostas e CTA de WhatsApp dentro do card.
- Em contribuicoes do tipo resposta, o card passa a priorizar a autoria e o texto real da resposta do psicologo, com selo verificado preenchido e Top Mentor na mesma linha do nome, usando truncamento do nome quando necessario.
- Textos de posts e respostas no perfil ficaram limitados a duas linhas com acao inline `... ver mais`, mantendo o padrao compacto do feed.
- No mobile, a navegacao inferior do shell privado foi ocultada apenas no perfil do psicologo; o CTA fixo de WhatsApp permanece como acao principal no rodape e o conteudo recebeu padding inferior extra para evitar sobreposicao.
- Os cards de `Atendimento` agora colocam a label acima do valor principal, com icone lateral discreto, reforcando a hierarquia `categoria -> informacao`.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a validacao visual foi feita no browser local com dados reais do perfil demo e consistencia com a familia visual de perfil/comunidade.
- ADR criado: `adrs/0110-publicacoes-perfil-mobile-whatsapp-unico.md`.

Validacoes executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless mobile 390px em `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha?tab=publicacoes` confirmou chip numerico em `Publicacoes`, ausencia da nav inferior mobile, CTA fixo de WhatsApp e card com nome/selo/Top Mentor na mesma linha.
- Chrome headless desktop 1440px confirmou layout desktop preservado, titulo `Publicacoes` com chip e publicacao no padrao de card real da comunidade.
- Chrome headless mobile 390px em `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha` confirmou `Atendimento` com labels acima dos valores e CTA fixo sem encobrir a leitura.

## Registro de ajuste complementar em 2026-06-16 - WhatsApp alinhado ao video

- Pedido do usuario: alinhar corretamente o botao de WhatsApp abaixo do video de apresentacao, inclusive no desktop, respeitando a mesma largura util e centralizacao do video.
- A secao `PresentationVideo` passou a agrupar video e CTA inline de WhatsApp em um wrapper unico centralizado, com largura total no mobile e `sm:max-w-[260px]` no desktop.
- O botao inline usa o mesmo alvo seguro de redirecionamento/rastreamento do `PsychologistWhatsAppRedirectButton`, sem duplicar fluxo de contato nem alterar backend.
- O CTA fixo mobile e o botao flutuante desktop foram preservados; o novo CTA contextual fica imediatamente abaixo do video com espacamento vertical consistente.
- Nao houve alteracao de banco, Prisma, contratos, endpoints, packages, favoritos, avaliacoes ou publicacoes.
- ADR atualizado: `adrs/0110-publicacoes-perfil-mobile-whatsapp-unico.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, Chrome headless local em 390px e 1440px na rota `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha`, confirmando video e botao alinhados/centralizados com mesma largura util.

## Registro de ajuste complementar em 2026-06-16 - diferenciacao entre post e resposta no perfil

- Pedido do usuario: diferenciar visualmente post original e resposta/comentario nas publicacoes do perfil do psicologo.
- O componente compartilhado `CommunityPostCard`, ja usado na aba `Publicacoes` e na previa de publicacoes da aba `Geral`, agora usa `contribution_type` para definir o contexto do card.
- Quando `contribution_type="post"`, o card mantem icone de documento e o texto `Postado em {comunidade}`.
- Quando `contribution_type="reply"`, o card usa icone de comentario/resposta e o texto `Respondido em {comunidade}`.
- A comunidade continua exibida como link depois do texto de contexto, sem alterar autoria, conteudo, midia, acoes, ordenacao ou logica de envio/interacao.
- Nao houve alteracao de backend, banco, Prisma, contratos, packages ou dados persistidos.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel permanece a familia visual local de perfil/comunidade e a validacao no browser local com dados reais.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write -- 'src/components/community/community-post-card.tsx'`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless/CDP mobile 390px em `/app/psychologist/demo-psychologist-camila-rocha` confirmou a previa da aba Geral com `Respondido em`.
- Chrome headless/CDP mobile 390px em `/app/psychologist/demo-psychologist-camila-rocha?tab=publicacoes` confirmou cards da aba Publicacoes com `Respondido em` e `Postado em` conforme `contribution_type`.

## Registro de ajuste complementar em 2026-06-16 - navegacao de abas do perfil

- Pedido do usuario: adicionar seta de voltar nas abas completas de `Publicacoes` e `Avaliacoes`, voltando para a aba `Geral`, e remover a barra fixa desktop `Geral/Publicacoes/Avaliacoes`.
- A aba `Publicacoes` agora usa cabecalho premium com seta a esquerda, titulo e chip numerico lado a lado; a seta chama a mesma navegacao por query params e remove `tab`, voltando para `Geral`.
- A aba `Avaliacoes` passou a usar a mesma estrutura visual e espacamento de `Publicacoes`, com seta de retorno e chip de quantidade baseado em `summary.rating_count`.
- A navegacao sticky desktop do perfil foi removida; no desktop permanecem os links diretos `?tab=publicacoes` e `?tab=avaliacoes` e a navegacao contextual por seta nas abas.
- O comportamento mobile existente foi preservado, mantendo o sticky mobile atual e adicionando apenas a seta de retorno nos cabecalhos das abas completas.
- Nao houve alteracao de backend, banco, Prisma, contratos, endpoints, packages, favoritos, avaliacoes ou publicacoes.
- Builder/Quick Copy nao esta exposto como ferramenta direta neste ambiente; a referencia auditavel permanece a familia visual local de perfil e a validacao no browser local com dados reais.

Validacoes executadas:

- `pnpm --dir frontend exec biome check --write -- 'src/app/app/psychologist/[id]/logic.tsx'`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless/CDP mobile 390px em `/app/psychologist/demo-psychologist-camila-rocha?tab=publicacoes` confirmou seta visivel no cabecalho e retorno para `/app/psychologist/demo-psychologist-camila-rocha`.
- Chrome headless/CDP mobile 390px em `/app/psychologist/demo-psychologist-camila-rocha?tab=avaliacoes` confirmou seta visivel no cabecalho e chip de avaliacoes.
- Chrome headless/CDP desktop 1440px em `/app/psychologist/demo-psychologist-camila-rocha?tab=publicacoes` confirmou ausencia de `data-profile-sticky-navigation` e de navegacao segmentada fixa visivel, mantendo o cabecalho com seta e chip.
