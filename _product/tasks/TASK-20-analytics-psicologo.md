# TASK-20: Analytics do psicólogo

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-20 |
| Prioridade | P1 |
| Esforço | L |
| Fase | Psicólogo privado |
| Status | Completed |
| Dependências | TASK-16, TASK-17, TASK-18A, TASK-19, TASK-31 |
| ADR alvo | ADR-0033 |

## Referências obrigatórias

- `_product/tasks/ARCHITECTURE.md`
- `_product/tasks/PACKAGES.md`
- `_product/tasks/DATA-MODEL.md`
- `_product/tasks/PROTO-INVENTORY.md`
- `_product/tasks/ROADMAP-REVALIDADO.md`

## Referências visuais

| Imagem local | Artefato Builder |
|---|---|
| `_product/proto/Meus Analytics - Psicólogo.jpg` | `figma-design-frame-18-Meus-Analytics---Psic-logo.html` |

As referências visuais são norte de produto e layout. Elas não autorizam recriar arquitetura, aceitar código gerado sem revisão, usar mock ou ignorar os padrões atuais do projeto.

## Contexto

Analytics não pode ser decorativo. Cada número precisa vir de evento ou tabela persistida. Analytics é recurso **exclusivo do Plano Profissional** (PRD §13): gatear o acesso por `professional_subscription` ativa.

## Objetivo

Exibir analytics reais de perfil, contatos, posts e avaliações do psicólogo.

## Pré-requisitos e bloqueios

- Métricas sem evento persistido devem ficar ausentes/zeradas com explicação, não simuladas.

Se qualquer bloqueio obrigatório estiver ativo, pare a implementação, registre ADR/pendência e não marque a task como concluída.

## Escopo frontend

Rotas esperadas:

- `/app/professional/analytics`

Implementação esperada:

- Criar tela de métricas com cards e períodos.
- Usar dados reais e mostrar vazio quando não houver eventos.
- Não inventar crescimento percentual.
- Adicionar filtros de período.
- Reutilizar componentes de cards e charts simples sem pacote novo se possível.

## Escopo backend

Implementação esperada:

- Criar endpoint agregado de analytics do psicólogo, gateado por Plano Profissional (`professional_subscription` ativa).
- Cada card lê **exatamente** o modelo/consulta mapeado abaixo (ver `DATA-MODEL.md`). Não derivar número de fonte fora desta tabela.
- Se visualização de perfil ainda não for rastreada (`profile_view_event` não criado), **omitir a métrica honestamente** (ausente/zerada com explicação) — nunca simular.
- Garantir escopo do usuário autenticado (`psychologist_id` = usuário logado).

### Mapeamento métrica → fonte (card → modelo/consulta)

| Card / métrica | Modelo (ver `DATA-MODEL.md`) | Consulta |
|---|---|---|
| Cliques em WhatsApp | `contact_request` | `count` por `psychologist_id` + janela `createdAt` (filtro de período) |
| Avaliações recebidas / média | `professional_review` (+ `psychologist_profile.rating_avg`/`rating_count`) | `count` por `psychologist_id, status="publicada"`; média já materializada em `psychologist_profile` |
| Posts publicados / engajamento | `community_post` | `count` por `author_id` (= usuário logado); somar `upvotes_count`/`replies_count` denormalizados |
| Visualizações de perfil | `profile_view_event` (opcional) | `count` por `psychologist_id` + período; **se o modelo não existir, omitir o card** (sem fabricar) |

- Variações percentuais (crescimento) só aparecem se houver dois períodos reais comparáveis nas fontes acima; caso contrário, **não exibir %**.

Modelos/tabelas envolvidos (ver `DATA-MODEL.md`):

- `contact_request`
- `professional_review`
- `community_post`
- `profile_view_event` (opcional)
- `professional_subscription` (gate de Plano Profissional)

Endpoints esperados (autogestão do psicólogo, sob `/api/private/psychologist/*`):

- GET `/api/private/psychologist/analytics`

**Guarda de papel:** este endpoint é exclusivo de psicólogo. Vive sob `/api/private/psychologist/*` e é protegido por `requireRole("psicologo")` (criado na TASK-12), aplicado no mount em `write.ts`, **fail-closed** (papel divergente → `403`, sem `next()`). O escopo de ownership é feito por `req.auth.id`. Ver `DATA-MODEL.md` "Camadas de autenticação e autorização" e `adrs/0002-arquitetura-auth-roles.md`.

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
- date-fns
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
- [x] Frontend implementado nas rotas esperadas, seguindo a arquitetura de `ARCHITECTURE.md`.
- [x] Backend implementado nos endpoints/modelos esperados quando aplicável.
- [x] Modelos e endpoints seguem `DATA-MODEL.md` (sem inventar schema).
- [x] Rotas sob `/api/private/psychologist/*` exigem `requireRole("psicologo")` (fail-closed), conforme ADR-0002.
- [x] Todos os estados obrigatórios existem e usam textos em PT-BR.
- [x] Formulários e campos usam a fundação da `TASK-02` quando aplicável.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Nenhum código gerado por Builder foi aceito sem revisão e adequação à arquitetura.
- [x] Packages usados conferem com `PACKAGES.md`; qualquer novo package tem ADR.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação mínima

- `pnpm --dir frontend check` quando frontend mudar.
- `pnpm --dir frontend build` quando mudar rota ou UI.
- `pnpm --dir backend check` quando backend mudar.
- `pnpm --dir backend build` quando backend estrutural mudar.
- `pnpm check` quando a task tocar frontend e backend.
- Browser local na rota principal da task quando houver interface.

## Notas para executor

Esta task deve ser concluída em um commit próprio. Se houver bloqueio externo, registre claramente o bloqueio e não avance para a próxima task.

## Execução 2026-06-09

- Builder/Quick Copy não estava disponível como ferramenta neste ambiente; a referência visual `_product/proto/Meus Analytics - Psicólogo.jpg` foi consultada localmente.
- Implementado `GET /api/private/psychologist/analytics` com mount `requireRole("psicologo")` fail-closed e gate por assinatura/cortesia profissional ativa em `professional_subscription`.
- As métricas exibidas vêm somente de fontes persistidas: `contact_request`, `professional_review`, `psychologist_profile` e `community_post`.
- `profile_view_event` não existe no schema atual; visualizações de perfil foram omitidas/explicadas na UI para evitar simulação.
- Não houve alteração em `backend/prisma/schema.prisma` ou migrations; `db:migrate` não se aplica a esta execução.
- A rota `/app/professional/analytics` foi criada com filtros de período, loading, erro, vazio, sucesso discreto, CTA de assinatura quando o plano profissional não existe e aviso de métricas indisponíveis sem fonte persistida.
- Não houve formulário nesta task; a fundação TASK-02 não foi necessária.
- Validações executadas:
  - `pnpm --dir backend check`
  - `pnpm --dir backend build`
  - `pnpm --dir frontend check`
  - `pnpm --dir frontend build`
  - `pnpm check`
  - Browser local via Chrome headless em `http://localhost:3000/app/professional/analytics`; sem sessão autenticada, a rota carregou e redirecionou corretamente para login.

## Ajuste visual complementar em 2026-06-09

- Tela `/app/professional/analytics` realinhada à referência `Meus Analytics - Psicólogo.jpg`: header mobile, tabs de período, grid 2x3, card de link, bloco de busca por especialidades e dica Pro.
- Métricas sem fonte persistida (`resultados de busca`, `abertura de perfil`, `video views`, `favoritado` e percentuais de especialidade) permanecem sem número real e são exibidas com `—`/mensagem discreta, sem simulação.
- Conversões WhatsApp e avaliações seguem usando os dados persistidos retornados pelo endpoint da TASK-20.
- Validações do ajuste: `pnpm --dir frontend check`, `pnpm check`, `pnpm --dir frontend exec next build --turbo`, `pnpm --dir frontend build` e browser local em `/app/professional/analytics` (sem sessão autenticada, validando resposta da rota e gate de login).
- ADR complementar: ADR-0034.

## Ajuste de demonstração premium em 2026-06-18

- Decisão de produto: psicólogos no Plano Gratuito não devem mais encontrar bloqueio/erro ao abrir `/app/professional/analytics`; a tela passa a demonstrar valor mantendo a estrutura visual disponível.
- `GET /api/private/psychologist/analytics` agora retorna `200` para psicólogos autenticados sem Plano Profissional/cortesia, preservando dados reais agregados e adicionando `access.has_professional_entitlement=false` e `access.mode="preview"`.
- Frontend ajustado para exibir banner premium `Desbloqueie seus Analytics`, CTA `Fazer upgrade` para `/app/professional/billing/subscription`, abas de período, cards e demais seções já existentes, com valores/dados sensíveis desfocados e labels legíveis.
- Erros técnicos reais continuam usando estado de erro em PT-BR; a mensagem antiga de bloqueio por plano deixou de ser exibida no fluxo normal do Plano Gratuito.
- O layout recebeu ajuste mobile-first (`grid-cols-[minmax(0,1fr)]` nos wrappers principais) para evitar trilhas implícitas maiores que a viewport e cortes laterais em 390px.
- Builder/Quick Copy não esteve acessível como ferramenta direta neste ambiente; validação visual usou `_product/proto/Meus Analytics - Psicólogo.jpg`, tela de assinatura e browser local/headless.
- Nenhum schema Prisma, migration, package novo, mock, seed ou métrica simulada foi criado. Métricas sem evento persistido continuam ausentes/zeradas com tratamento honesto.
- ADR complementar: ADR-0118.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless 390x844 em `/app/professional/analytics`.

## Refinamento visual premium em 2026-06-18

- As telas `/app/professional/analytics` e `/app/professional/reviews` foram refinadas para compartilhar a linguagem visual da tela `/app/professional/billing/subscription`.
- Analytics recebeu header em card, tabs em pílulas, banner premium azul-claro, métricas em cards de uma coluna no mobile e duas colunas em desktop, valores desfocados com tratamento intencional de prévia premium e card de link de avaliações no mesmo padrão visual.
- Minhas Avaliações recebeu header consistente e estado premium central com ícone, selo, benefícios em cards e CTA `Fazer upgrade` para `/app/professional/billing/subscription`.
- Responsividade revisada em 390x844 e 1024x768: sem overflow horizontal real (`scrollWidth` igual à largura da viewport), tabs cabendo no mobile, métricas em uma coluna no mobile e duas colunas no desktop.
- Nenhum mock, dado fake, schema, migration ou package novo foi criado.
- Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, API real com psicólogo temporário gratuito e browser local/headless em `/app/professional/analytics` e `/app/professional/reviews`.

## Extensão de analytics do vídeo de apresentação em 2026-06-18

- Adicionado tracking real do vídeo de apresentação público por sessão (`profile_video_watch_session`), consolidando heartbeats por `session_key` sem criar visualizações duplicadas.
- O player público do perfil profissional envia métricas reais de reprodução: visualização, tempo único assistido, maior posição, conclusão, replays e marcos 25/50/75/100%.
- O endpoint `GET /api/private/psychologist/analytics` passou a agregar `presentation_video` com data de atualização, métricas principais e retenção por marcos; valores continuam desfocados no modo prévia para Plano Gratuito.
- A tela `/app/professional/analytics` recebeu seção exclusiva do vídeo antes do card `Link da minha página de avaliações`, com cards de métricas e bloco de retenção alinhando reprodução do vídeo e gráfico por marcos.
- A referência visual adicional usada foi a imagem fornecida pelo usuário `c:/Users/tulio/Downloads/WhatsApp Image 2026-06-18 at 15.04.58.jpeg`, inspirada em analytics de retenção de vídeo; não houve uso de mock ou dados simulados.

- Migration aplicada com `pnpm --dir backend exec prisma migrate dev --name add_profile_video_watch_sessions` após tentativa inicial de `pnpm --dir backend db:migrate` ficar presa aguardando lock/prompt e ser encerrada sem criar migration.
- Validações executadas: `pnpm --dir backend check`, `pnpm --dir backend build`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, `Invoke-WebRequest` em `/app/professional/analytics` e POST de validação 404 em `/api/private/directory/psychologists/non-existent/video-watch`.

## Refinamento de retenção sincronizada em 2026-06-18

- A retenção do vídeo passou a persistir buckets internos de 5% em `profile_video_watch_session.retention_buckets`, calculados pelo backend a partir da maior posição alcançada e duração real do player.
- O endpoint `GET /api/private/psychologist/analytics` agora agrega uma curva de 5% em 5%, mantém os cards de 25/50/75/100% como resumo e identifica o maior trecho estimado de abandono com tempo inicial/final.
- O gráfico de retenção na tela `/app/professional/analytics` ficou sincronizado com o player: ao reproduzir o vídeo, a linha do playhead avança; ao clicar na curva, nos marcos ou no destaque de maior abandono, o player busca o trecho correspondente.
- A estratégia evita eventos por segundo e mantém no máximo 20 buckets por sessão, preservando performance e armazenamento previsível sem mockar dados.
- Migration aplicada com `pnpm --dir backend db:migrate -- --name add_profile_video_retention_buckets`.

## Execucao complementar: isolamento de versoes do video no analytics (2026-06-18)

- Para apoiar testes de diferentes videos de apresentacao, as sessoes de analytics passaram a usar `session_key` por perfil e versao do video, derivada da URL atual do video.
- A agregacao da secao `presentation_video` em `GET /api/private/psychologist/analytics` agora considera apenas sessoes cujo `video_url` corresponde ao video atual do perfil.
- Sessoes de videos anteriores permanecem preservadas para historico interno e janela de aprendizado do ranking, mas nao contaminam as metricas exibidas do video atual.
- Nao houve schema, migration, package novo, mock, seed ou evento simulado.
- ADR criado: `adrs/0125-ranking-psicologos-video-learning.md`.

## Execucao complementar: origem do trafego em Analytics (2026-06-18)

- Pedido do usuario: remover a secao `Busca por especialidades` e inserir `Origem do trafego` imediatamente antes de `Link da minha pagina de avaliacoes`.
- A ordem da tela `/app/professional/analytics` ficou: indicadores principais, video de apresentacao, origem do trafego e link da pagina de avaliacoes.
- O backend passou a expor `traffic_sources` no contrato de `GET /api/private/psychologist/analytics`, com as origens Explorar, Busca e filtros, Comunidades, Link direto e Favoritos.
- Como ainda nao existe fonte persistida de visualizacao de perfil com origem nem origem em `contact_request`, os valores por origem permanecem zerados de forma honesta, sem numeros ficticios ou distribuicao simulada.
- A UI foi preparada para dados reais futuros: desktop com layout tabular premium ordenado por visualizacoes e mobile em lista com barras de progresso e acordeao por origem.
- Nenhum schema Prisma, migration, package novo, seed, dado fake ou endpoint simulado foi criado.
- ADR complementar: `adrs/0126-analytics-origem-trafego-zerada.md`.

## Refinamento contextual da dica de video em Analytics (2026-06-18)

- Pedido do usuario: remover a dica isolada do final da pagina e integrar a recomendacao ao contexto da secao `Video de apresentacao`.
- A dica passou a aparecer dentro do card principal de video, logo apos o bloco de retencao, com icone de lampada, fundo azul suave e altura compacta.
- Texto atualizado: `Videos de apresentacao com alto engajamento geram mais conversoes para o WhatsApp. Faca testes e descubra o que funciona melhor para voce.`
- A ordem da tela permanece: indicadores principais, video de apresentacao, origem do trafego e link da pagina de avaliacoes.
- Nenhum schema Prisma, migration, package novo, mock, seed ou evento simulado foi criado.

## Refinamento do player de video em Analytics (2026-06-18)

- Pedido do usuario: remover o menu nativo de tres pontinhos do video exibido na secao `Video de apresentacao` em `/app/professional/analytics`.
- `VerticalVideoPlayer` recebeu a variante opt-in `controlsVariant="minimal"`, com controles proprios apenas para play/pause e barra de progresso.
- A tela de Analytics passou a usar essa variante somente na previa analitica do video, mantendo os players publicos/posts com comportamento nativo existente.
- A variante minimal desativa controles nativos, aplica `controlsList` com restricoes, bloqueia Picture-in-Picture/remote playback e impede o menu de contexto do navegador para evitar velocidade, PiP, tela cheia e opcoes avancadas.
- Nenhum schema Prisma, migration, package novo, mock, seed ou evento simulado foi criado.
- ADR complementar: `adrs/0128-analytics-video-player-controles-essenciais.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Ajuste de copy em Origem do trafego (2026-06-18)

- Pedido do usuario: ajustar as descricoes das origens `Busca e filtros` e `Favoritos` na secao `Origem do trafego`.
- Textos atualizados no contrato real do backend e no fallback visual do frontend, sem alterar metricas, schema, migration, package ou regra de agregacao.
- ADR novo nao foi necessario por se tratar apenas de copy de produto sem decisao arquitetural.
- Validacoes executadas: `pnpm --dir backend check`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Refinamento do filtro de periodo personalizado em Analytics (2026-06-19)

- Pedido do usuario: ao clicar em `Periodo`, os campos `Inicio` e `Fim` nao devem mais criar uma secao fixa abaixo das tabs.
- O filtro personalizado agora abre como popover/balao contextual ancorado ao controle de periodo, com fundo branco, borda suave, sombra discreta, cantos arredondados e CTA `Aplicar periodo`.
- O popover fecha ao clicar fora, mantem o botao `Periodo` ativo enquanto esta aberto e nao empurra os cards de metricas para baixo.
- Mobile-first: no mobile o popover ocupa quase toda a largura util; no desktop mantem largura compacta.
- Nenhum schema, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava disponivel como ferramenta direta; a referencia visual consultada foi `_product/proto/Meus Analytics - Psicologo.jpg`.
- ADR criado: `adrs/0131-analytics-periodo-personalizado-popover.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Refinamento do player analitico sem progresso sobreposto (2026-06-19)

- Pedido do usuario: remover a barra de progresso azul sobreposta ao video na secao `Video de apresentacao` de `/app/professional/analytics`.
- A variante minimal do `VerticalVideoPlayer` agora exibe somente o botao play/pause sobre a imagem do video.
- O grafico de retencao permanece como referencia visual de progresso/analise abaixo do video; nao ha mais controle de seek sobreposto ao video.
- Players nativos usados em posts, perfil publico e demais telas permanecem inalterados; a mudanca segue restrita ao `controlsVariant="minimal"` dos Analytics.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava disponivel como ferramenta direta; a validacao visual usou a captura enviada pelo usuario e a referencia local `_product/proto/Meus Analytics - Psicologo.jpg`.
- ADR criado: `adrs/0132-analytics-video-player-sem-progresso-overlay.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e rota local `/app/professional/analytics` via `Invoke-WebRequest` sem sessao autenticada retornando `307` para o fluxo privado.

## Ajuste complementar em 2026-06-22 - remocao do link de avaliacoes dos Analytics

- Pedido de produto: a secao `Link da minha pagina de avaliacoes` pertence ao contexto de reputacao/depoimentos e foi movida para `/app/professional/reviews`.
- `/app/professional/analytics` nao renderiza mais o card de link/copia de avaliacoes; a tela permanece focada em indicadores, video de apresentacao e origem do trafego.
- Nenhum contrato de analytics, endpoint, schema, migration, package, mock, seed ou dado simulado foi alterado.
- ADR relacionado atualizado: `adrs/0025-bloqueio-task19-dependencia-task18.md`.
- Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build` e Chrome/CDP autenticado confirmando ausencia da secao em `/app/professional/analytics`.


## Ajuste complementar em 2026-06-29 - copy e curva do video nos Analytics

- Pedido do usuario: ajustar a secao de video em `/app/professional/analytics` para reduzir redundancia visual e simplificar a leitura mobile.
- Copy do card de video atualizada para `Acompanhe como os visitantes assistem seu video de apresentacao.`
- A faixa azul `Atualizado em` foi removida da UI; o contrato `presentation_video.updated_at` permanece disponivel no backend para auditoria/futuros usos, sem alterar schema ou API.
- O grafico de retencao deixou de desenhar a leitura em patamares/degraus e passou a usar uma curva SVG continua estimada, partindo de 100% e encerrando visualmente em 0%, preservando os buckets reais para metricas e identificacao do trecho de maior abandono.
- O destaque de maior abandono passou a exibir somente o intervalo: `Entre X e Y% do video (mm:ss - mm:ss).`, sem `Ver trecho` e sem percentual de queda em p.p. na UI.
- Nenhum schema Prisma, migration, package novo, mock, seed ou endpoint simulado foi criado.
- Builder/Quick Copy nao estava exposto como ferramenta MCP direta; a validacao visual usou as capturas enviadas pelo usuario e a referencia local `_product/proto/Meus Analytics - Psicologo.jpg`.
- ADR atualizado: `adrs/0124-retencao-video-buckets-sincronizados.md`.
- Validacoes executadas: `pnpm --dir frontend exec biome check src/app/app/professional/analytics/logic.tsx`, `pnpm --dir frontend check`, `pnpm --dir frontend build` e `Invoke-WebRequest` em `/app/professional/analytics` (307 para login sem sessao).
